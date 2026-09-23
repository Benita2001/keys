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
