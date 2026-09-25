/**
 * Pyth market-evidence boundary for KEYS.
 *
 * Pyth is external market reality, not a maturity oracle. Any missing credential,
 * entitlement failure, stale update, unavailable price, or over-wide confidence band
 * must remain visible to the policy engine so KEYS can fail closed.
 */

export const PYTH_PRO_EQUITY_FEEDS = Object.freeze({
  AAPL: Object.freeze({
    symbol: 'Equity.US.AAPL/USD',
    feedId: 922,
    exponent: -5,
    minChannel: 'fixed_rate@50ms'
  }),
  TSLA: Object.freeze({
    symbol: 'Equity.US.TSLA/USD',
    feedId: 1435,
    exponent: -5,
    minChannel: 'fixed_rate@50ms'
  })
});

export function normalizePythSnapshot({
  feedId,
  price,
  confidence,
  expo,
  publishTime,
  receivedAt,
  maxAgeSeconds = 30,
  maxConfidenceBps = 100
}) {
  const normalizedPrice = Number(price) * Math.pow(10, Number(expo));
  const normalizedConfidence = Number(confidence) * Math.pow(10, Number(expo));
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.parse(receivedAt) - Number(publishTime) * 1000) / 1000)
  );
  const confidenceBps =
    normalizedPrice === 0
      ? Infinity
      : Math.abs(normalizedConfidence / normalizedPrice) * 10000;

  return {
    source: 'PYTH',
    feedId,
    price: normalizedPrice,
    confidence: normalizedConfidence,
    confidenceBps,
    maxConfidenceBps,
    publishTime: new Date(Number(publishTime) * 1000).toISOString(),
    receivedAt,
    ageSeconds,
    status: ageSeconds <= maxAgeSeconds ? 'FRESH' : 'STALE'
  };
}

export function normalizePythProSnapshot({
  feed,
  priceFeed,
  receivedAt,
  maxAgeSeconds = 30,
  maxConfidenceBps = 100
}) {
  const feedUpdateTimestampUs = Number(priceFeed?.feedUpdateTimestamp);
  const price = Number(priceFeed?.price);
  const confidence = Number(priceFeed?.confidence);
  const exponent = Number(priceFeed?.exponent);

  if (
    !Number.isFinite(feedUpdateTimestampUs) ||
    !Number.isFinite(price) ||
    !Number.isFinite(confidence) ||
    !Number.isFinite(exponent) ||
    price === 0
  ) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_PRICE_UNAVAILABLE',
      receivedAt,
      maxAgeSeconds,
      maxConfidenceBps
    };
  }

  const normalizedPrice = price * Math.pow(10, exponent);
  const normalizedConfidence = Math.abs(confidence * Math.pow(10, exponent));
  const confidenceBps =
    Math.abs(normalizedConfidence / normalizedPrice) * 10000;
  const publishTimeMs = Math.floor(feedUpdateTimestampUs / 1000);
  const ageSeconds = Math.max(
    0,
    Math.floor((Date.parse(receivedAt) - publishTimeMs) / 1000)
  );

  return {
    source: 'PYTH_PRO',
    symbol: feed.symbol,
    feedId: feed.feedId,
    price: normalizedPrice,
    confidence: normalizedConfidence,
    confidenceBps,
    maxConfidenceBps,
    publishTime: new Date(publishTimeMs).toISOString(),
    receivedAt,
    ageSeconds,
    publisherCount: priceFeed.publisherCount ?? null,
    marketSession: priceFeed.marketSession ?? null,
    status: ageSeconds <= maxAgeSeconds ? 'FRESH' : 'STALE'
  };
}

export async function fetchPythProSnapshot({
  apiKey,
  feed = PYTH_PRO_EQUITY_FEEDS.AAPL,
  channel,
  receivedAt = new Date().toISOString(),
  maxAgeSeconds = 30,
  maxConfidenceBps = 100,
  fetchImpl = globalThis.fetch,
  endpoint = 'https://pyth-lazer.dourolabs.app/v1/latest_price'
} = {}) {
  if (!apiKey) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_API_KEY_REQUIRED',
      receivedAt
    };
  }

  if (typeof fetchImpl !== 'function') {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_FETCH_UNAVAILABLE',
      receivedAt
    };
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceFeedIds: [feed.feedId],
        properties: [
          'price',
          'confidence',
          'exponent',
          'feedUpdateTimestamp',
          'publisherCount',
          'marketSession'
        ],
        formats: ['leUnsigned'],
        channel: channel ?? feed.minChannel
      })
    });
  } catch (error) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_UPSTREAM_UNREACHABLE',
      detail: error instanceof Error ? error.message : String(error),
      receivedAt
    };
  }

  if (!response.ok) {
    const reasonCode =
      response.status === 401
        ? 'PYTH_AUTH_REQUIRED'
        : response.status === 403
          ? 'PYTH_NOT_ENTITLED'
          : 'PYTH_UPSTREAM_ERROR';

    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode,
      httpStatus: response.status,
      receivedAt
    };
  }

  const body = await response.json();
  const parsed = body?.parsed ?? body;
  const priceFeed =
    parsed?.priceFeeds?.find((item) => Number(item.priceFeedId) === feed.feedId) ??
    parsed?.priceFeeds?.[0];

  if (!priceFeed) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_FEED_MISSING_FROM_RESPONSE',
      receivedAt
    };
  }

  return normalizePythProSnapshot({
    feed,
    priceFeed,
    receivedAt,
    maxAgeSeconds,
    maxConfidenceBps
  });
}


/**
 * Fetch authenticated Pyth Pro OHLC history and project it to KEYS price points.
 * The Pro API key remains server-side. Auth, entitlement, upstream, malformed,
 * or empty responses fail closed with no fabricated points.
 */
export async function fetchPythProHistory({
  apiKey,
  feed = PYTH_PRO_EQUITY_FEEDS.AAPL,
  channel = 'fixed_rate@1000ms',
  from,
  to,
  resolution = 'D',
  fetchImpl = globalThis.fetch,
  endpointBase = 'https://pyth.dourolabs.app/v1'
} = {}) {
  const base = {
    source: 'PYTH_PRO_HISTORY',
    symbol: feed.symbol,
    feedId: feed.feedId,
    channel,
    resolution,
    from,
    to
  };

  if (!apiKey) {
    return { ...base, status: 'UNAVAILABLE', points: [], reasonCode: 'PYTH_API_KEY_REQUIRED' };
  }
  if (typeof fetchImpl !== 'function') {
    return { ...base, status: 'UNAVAILABLE', points: [], reasonCode: 'PYTH_FETCH_UNAVAILABLE' };
  }
  if (!Number.isFinite(Number(from)) || !Number.isFinite(Number(to)) || Number(from) >= Number(to)) {
    return { ...base, status: 'UNAVAILABLE', points: [], reasonCode: 'PYTH_HISTORY_WINDOW_INVALID' };
  }

  const url = new URL(
    `${String(endpointBase).replace(/\/$/, '')}/${encodeURIComponent(channel)}/history`
  );
  url.searchParams.set('symbol', feed.symbol);
  url.searchParams.set('from', String(Math.floor(Number(from))));
  url.searchParams.set('to', String(Math.floor(Number(to))));
  url.searchParams.set('resolution', resolution);

  let response;
  try {
    response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` }
    });
  } catch (error) {
    return {
      ...base,
      status: 'UNAVAILABLE',
      points: [],
      reasonCode: 'PYTH_HISTORY_UPSTREAM_UNREACHABLE',
      detail: error instanceof Error ? error.message : String(error)
    };
  }

  if (!response.ok) {
    const reasonCode =
      response.status === 401
        ? 'PYTH_AUTH_REQUIRED'
        : response.status === 403
          ? 'PYTH_NOT_ENTITLED'
          : response.status === 404
            ? 'PYTH_HISTORY_FEED_NOT_FOUND'
            : 'PYTH_HISTORY_UPSTREAM_ERROR';
    return {
      ...base,
      status: 'UNAVAILABLE',
      points: [],
      reasonCode,
      httpStatus: response.status
    };
  }

  const body = await response.json().catch(() => null);
  if (!body || body.s !== 'ok' || !Array.isArray(body.t) || !Array.isArray(body.c)) {
    return {
      ...base,
      status: 'UNAVAILABLE',
      points: [],
      reasonCode: body?.s === 'no_data' ? 'PYTH_HISTORY_NO_DATA' : 'PYTH_HISTORY_MALFORMED_RESPONSE'
    };
  }

  const points = body.t
    .map((timestamp, index) => ({
      t: Number(timestamp) * 1000,
      v: Number(body.c[index])
    }))
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v));

  if (points.length === 0) {
    return { ...base, status: 'UNAVAILABLE', points: [], reasonCode: 'PYTH_HISTORY_NO_DATA' };
  }

  return {
    ...base,
    status: 'AVAILABLE',
    points,
    candleCount: points.length
  };
}


/**
 * Fetches the same authenticated Pyth Pro evidence together with a signed
 * Solana-format payload suitable for the future on-chain verification path.
 *
 * This function only proves that a signed payload is available from Pyth Pro.
 * KEYS does not claim on-chain verification until the Anchor execution path
 * parses/verifies this payload.
 */
export async function fetchPythProSolanaPayload({
  apiKey,
  feed = PYTH_PRO_EQUITY_FEEDS.AAPL,
  channel,
  receivedAt = new Date().toISOString(),
  maxAgeSeconds = 30,
  maxConfidenceBps = 100,
  fetchImpl = globalThis.fetch,
  endpoint = 'https://pyth-lazer.dourolabs.app/v1/latest_price'
} = {}) {
  if (!apiKey) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_API_KEY_REQUIRED',
      receivedAt,
      solanaPayload: {
        status: 'UNAVAILABLE',
        reasonCode: 'PYTH_API_KEY_REQUIRED'
      }
    };
  }

  if (typeof fetchImpl !== 'function') {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_FETCH_UNAVAILABLE',
      receivedAt,
      solanaPayload: {
        status: 'UNAVAILABLE',
        reasonCode: 'PYTH_FETCH_UNAVAILABLE'
      }
    };
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceFeedIds: [feed.feedId],
        properties: [
          'price',
          'confidence',
          'exponent',
          'feedUpdateTimestamp',
          'publisherCount',
          'marketSession'
        ],
        formats: ['solana'],
        channel: channel ?? feed.minChannel
      })
    });
  } catch (error) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_UPSTREAM_UNREACHABLE',
      detail: error instanceof Error ? error.message : String(error),
      receivedAt,
      solanaPayload: {
        status: 'UNAVAILABLE',
        reasonCode: 'PYTH_UPSTREAM_UNREACHABLE'
      }
    };
  }

  if (!response.ok) {
    const reasonCode =
      response.status === 401
        ? 'PYTH_AUTH_REQUIRED'
        : response.status === 403
          ? 'PYTH_NOT_ENTITLED'
          : 'PYTH_UPSTREAM_ERROR';

    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode,
      httpStatus: response.status,
      receivedAt,
      solanaPayload: {
        status: 'UNAVAILABLE',
        reasonCode
      }
    };
  }

  const body = await response.json();
  const parsed = body?.parsed ?? body;
  const priceFeed =
    parsed?.priceFeeds?.find((item) => Number(item.priceFeedId) === feed.feedId) ??
    parsed?.priceFeeds?.[0];

  if (!priceFeed) {
    return {
      source: 'PYTH_PRO',
      symbol: feed.symbol,
      feedId: feed.feedId,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_FEED_MISSING_FROM_RESPONSE',
      receivedAt,
      solanaPayload: {
        status: 'UNAVAILABLE',
        reasonCode: 'PYTH_FEED_MISSING_FROM_RESPONSE'
      }
    };
  }

  const snapshot = normalizePythProSnapshot({
    feed,
    priceFeed,
    receivedAt,
    maxAgeSeconds,
    maxConfidenceBps
  });

  const candidate = body?.solana ?? body?.binary?.solana ?? null;
  const payloadData =
    typeof candidate === 'string'
      ? candidate
      : candidate?.data ?? candidate?.value ?? null;
  const payloadEncoding =
    typeof candidate === 'object' && candidate
      ? candidate.encoding ?? 'hex'
      : 'hex';

  return {
    ...snapshot,
    solanaPayload: payloadData
      ? {
          status: 'AVAILABLE',
          encoding: payloadEncoding,
          data: payloadData,
          byteLength:
            payloadEncoding === 'hex'
              ? Math.floor(String(payloadData).length / 2)
              : null
        }
      : {
          status: 'UNAVAILABLE',
          reasonCode: 'PYTH_SOLANA_PAYLOAD_MISSING'
        }
  };
}


export const PYTH_PRO_MARKET_CLASSES = Object.freeze({
  equity: Object.freeze({
    id: 'equity',
    label: 'Stocks & ETFs',
    learningAngle: 'Companies, sectors, diversification and public-market trading sessions'
  }),
  crypto: Object.freeze({
    id: 'crypto',
    label: 'Crypto',
    learningAngle: '24/7 markets, volatility and digital-asset market structure'
  }),
  fx: Object.freeze({
    id: 'fx',
    label: 'FX',
    learningAngle: 'Currency pairs, exchange rates and global purchasing power'
  }),
  metal: Object.freeze({
    id: 'metal',
    label: 'Metals',
    learningAngle: 'Precious metals, macro risk and non-company assets'
  }),
  rates: Object.freeze({
    id: 'rates',
    label: 'Rates',
    learningAngle: 'Interest rates, fixed income and the cost of capital'
  }),
  commodity: Object.freeze({
    id: 'commodity',
    label: 'Commodities & Energy',
    learningAngle: 'Real-world inputs, futures and cyclical supply/demand markets'
  })
});

const PYTH_MARKET_DISCOVERY_PREFERENCES = Object.freeze({
  equity: [
    'Equity.US.AAPL/USD',
    'Equity.US.NVDA/USD',
    'Equity.US.MSFT/USD',
    'Equity.US.SPY/USD',
    'Equity.US.QQQ/USD',
    'Equity.US.TSLA/USD'
  ],
  crypto: ['Crypto.BTC/USD', 'Crypto.ETH/USD', 'Crypto.SOL/USD'],
  fx: ['FX.EUR/USD', 'FX.USD/JPY', 'FX.GBP/USD'],
  metal: ['Metal.XAU/USD', 'Metal.XAG/USD'],
  rates: ['Rates.US10Y/USD', 'Rates.US2Y/USD'],
  commodity: ['Commodities.WTI/USD', 'Commodities.BRENT/USD', 'Commodities.NGD/USD']
});

function catalogRows(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.symbols)) return body.symbols;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function pythCatalogFeedId(row) {
  const candidate =
    row?.pyth_lazer_id ??
    row?.price_feed_id ??
    row?.priceFeedId ??
    row?.feed_id ??
    row?.feedId ??
    row?.id;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePythProCatalogRow(row, fallbackAssetType = null) {
  const symbol = String(
    row?.symbol ?? row?.ticker ?? row?.display_symbol ?? row?.name ?? ''
  ).trim();
  const feedId = pythCatalogFeedId(row);
  if (!symbol || feedId == null) return null;

  const assetType = String(
    row?.asset_type ?? row?.assetType ?? fallbackAssetType ?? ''
  ).toLowerCase();

  return {
    symbol,
    feedId,
    assetType,
    description: row?.description ?? row?.name ?? null,
    state: row?.state ?? null,
    minChannel:
      row?.min_channel ??
      row?.minChannel ??
      row?.minimum_channel ??
      'fixed_rate@1000ms'
  };
}

export async function fetchPythProCatalog({
  assetTypes = Object.keys(PYTH_PRO_MARKET_CLASSES),
  fetchImpl = globalThis.fetch,
  endpoint = 'https://pyth.dourolabs.app/v1/symbols'
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('PYTH_CATALOG_FETCH_UNAVAILABLE');
  }

  const classes = [...new Set(assetTypes.map((item) => String(item).toLowerCase()))]
    .filter((item) => PYTH_PRO_MARKET_CLASSES[item]);

  const grouped = {};
  await Promise.all(
    classes.map(async (assetType) => {
      const url = new URL(endpoint);
      url.searchParams.set('asset_type', assetType);
      const response = await fetchImpl(url.toString(), {
        headers: { accept: 'application/json' }
      });
      if (!response?.ok) {
        grouped[assetType] = {
          status: 'UNAVAILABLE',
          reasonCode: `PYTH_CATALOG_HTTP_${response?.status ?? 'UNKNOWN'}`,
          feeds: []
        };
        return;
      }

      const body = await response.json();
      const feeds = catalogRows(body)
        .map((row) => normalizePythProCatalogRow(row, assetType))
        .filter(Boolean);

      grouped[assetType] = {
        status: 'AVAILABLE',
        feeds
      };
    })
  );

  return grouped;
}

function symbolScore(symbol, preferences = []) {
  const upper = String(symbol).toUpperCase();
  for (let index = 0; index < preferences.length; index += 1) {
    if (upper === String(preferences[index]).toUpperCase()) {
      return index;
    }
  }
  return 10_000;
}

function shortMarketSymbol(symbol) {
  const raw = String(symbol ?? '');
  const tail = raw.includes('.') ? raw.split('.').slice(-1)[0] : raw;
  return tail.replace(/\/USD$/i, '').replace(/\/EUR$/i, '');
}

export async function discoverPythProMarkets({
  apiKey,
  perClass = 3,
  assetTypes = Object.keys(PYTH_PRO_MARKET_CLASSES),
  catalogProvider = fetchPythProCatalog,
  snapshotProvider = fetchPythProSnapshot
} = {}) {
  const catalog = await catalogProvider({ assetTypes });
  const classes = [];

  for (const assetType of assetTypes) {
    const definition = PYTH_PRO_MARKET_CLASSES[assetType];
    if (!definition) continue;
    const catalogEntry = catalog?.[assetType] ?? {
      status: 'UNAVAILABLE',
      feeds: []
    };
    const preferences = PYTH_MARKET_DISCOVERY_PREFERENCES[assetType] ?? [];
    const ranked = [...(catalogEntry.feeds ?? [])]
      .filter((feed) =>
        !['coming_soon', 'inactive', 'deprecated'].includes(
          String(feed.state ?? '').toLowerCase()
        )
      )
      .sort((a, b) => {
        const score = symbolScore(a.symbol, preferences) - symbolScore(b.symbol, preferences);
        return score || a.symbol.localeCompare(b.symbol);
      });

    const selected = ranked.slice(0, Math.max(1, Number(perClass) || 1));
    const feeds = await Promise.all(
      selected.map(async (feed) => {
        const snapshot = await snapshotProvider({
          apiKey,
          feed: {
            symbol: feed.symbol,
            feedId: feed.feedId,
            exponent: -5,
            minChannel: feed.minChannel
          }
        });
        const accessible = ['FRESH', 'STALE'].includes(snapshot?.status);
        const primaryMoneyProof = feed.symbol === 'Equity.US.AAPL/USD';

        return {
          marketClass: assetType,
          symbol: feed.symbol,
          displaySymbol: shortMarketSymbol(feed.symbol),
          feedId: feed.feedId,
          minChannel: feed.minChannel,
          catalogStatus: 'AVAILABLE',
          entitlementStatus: accessible ? 'ACCESSIBLE' : 'UNAVAILABLE',
          priceStatus: snapshot?.status ?? 'UNAVAILABLE',
          price: snapshot?.price ?? null,
          publishTime: snapshot?.publishTime ?? null,
          marketSession: snapshot?.marketSession ?? null,
          reasonCode: snapshot?.reasonCode ?? null,
          productMode: primaryMoneyProof
            ? 'PRIMARY_MONEY_PROOF'
            : 'LEARN_PRACTICE_ONLY',
          moneyExecutionProven: primaryMoneyProof,
          authorityEffect: 'NONE'
        };
      })
    );

    classes.push({
      id: definition.id,
      label: definition.label,
      learningAngle: definition.learningAngle,
      catalogStatus: catalogEntry.status,
      catalogFeedCount: catalogEntry.feeds?.length ?? 0,
      accessibleFeedCount: feeds.filter(
        (feed) => feed.entitlementStatus === 'ACCESSIBLE'
      ).length,
      feeds
    });
  }

  return {
    source: 'PYTH_PRO',
    status: 'AVAILABLE',
    primaryMoneyAsset: 'AAPL',
    primaryMoneySymbol: 'Equity.US.AAPL/USD',
    classes,
    truthBoundary: {
      catalogPresenceDoesNotImplyEntitlement: true,
      entitlementDoesNotImplyMoneyExecution: true,
      onlyAaplMoneyExecutionProven: true,
      marketEvidenceAuthorityEffect: 'NONE'
    }
  };
}
