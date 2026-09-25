import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSnapshot,
  fetchPythProHistory,
  normalizePythProCatalogRow,
  fetchPythProCatalog,
  discoverPythProMarkets,
  fetchPythProSolanaPayload,
  normalizePythProSnapshot,
  normalizePythSnapshot
} from '../src/pyth-adapter.mjs';

test('normalizes Core-style freshness and confidence without network assumptions', () => {
  const publish = Math.floor(Date.parse('2026-09-23T14:00:00Z') / 1000);
  const out = normalizePythSnapshot({
    feedId: 'fixture-feed',
    price: 25000,
    confidence: 20,
    expo: -2,
    publishTime: publish,
    receivedAt: '2026-09-23T14:00:10Z',
    maxAgeSeconds: 30,
    maxConfidenceBps: 100
  });
  assert.ok(Math.abs(out.price - 250) < 1e-9);
  assert.equal(out.status, 'FRESH');
  assert.ok(out.confidenceBps < 100);
});

test('normalizes Pyth Pro feedUpdateTimestamp in microseconds and detects staleness', () => {
  const receivedAt = '2026-09-23T15:30:20Z';
  const publishUs = Date.parse('2026-09-23T15:30:00Z') * 1000;

  const fresh = normalizePythProSnapshot({
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    priceFeed: {
      priceFeedId: 922,
      price: '25000000',
      confidence: 2500,
      exponent: -5,
      publisherCount: 3,
      marketSession: 'regular',
      feedUpdateTimestamp: publishUs
    },
    receivedAt,
    maxAgeSeconds: 30,
    maxConfidenceBps: 100
  });

  assert.ok(Math.abs(fresh.price - 250) < 1e-9);
  assert.equal(fresh.status, 'FRESH');
  assert.equal(fresh.ageSeconds, 20);
  assert.equal(fresh.publisherCount, 3);

  const stale = normalizePythProSnapshot({
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    priceFeed: {
      priceFeedId: 922,
      price: '25000000',
      confidence: 2500,
      exponent: -5,
      feedUpdateTimestamp: Date.parse('2026-09-23T15:28:00Z') * 1000
    },
    receivedAt,
    maxAgeSeconds: 30
  });

  assert.equal(stale.status, 'STALE');
  assert.equal(stale.ageSeconds, 140);
});

test('fails closed when the Pyth API key is absent', async () => {
  const out = await fetchPythProSnapshot({
    apiKey: '',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    receivedAt: '2026-09-23T15:30:20Z'
  });

  assert.equal(out.status, 'UNAVAILABLE');
  assert.equal(out.reasonCode, 'PYTH_API_KEY_REQUIRED');
});

test('fails closed on Pyth entitlement refusal', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 403,
    async json() {
      return {};
    }
  });

  const out = await fetchPythProSnapshot({
    apiKey: 'test-token',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    fetchImpl: fakeFetch,
    receivedAt: '2026-09-23T15:30:20Z'
  });

  assert.equal(out.status, 'UNAVAILABLE');
  assert.equal(out.reasonCode, 'PYTH_NOT_ENTITLED');
  assert.equal(out.httpStatus, 403);
});

test('parses a successful latest-price response', async () => {
  const publishUs = Date.parse('2026-09-23T15:30:15Z') * 1000;
  const fakeFetch = async (_url, options) => {
    assert.match(options.headers.Authorization, /^Bearer /);
    const request = JSON.parse(options.body);
    assert.deepEqual(request.priceFeedIds, [922]);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          parsed: {
            timestampUs: String(publishUs),
            priceFeeds: [
              {
                priceFeedId: 922,
                price: '25000000',
                confidence: 2500,
                exponent: -5,
                publisherCount: 3,
                marketSession: 'regular',
                feedUpdateTimestamp: publishUs
              }
            ]
          }
        };
      }
    };
  };

  const out = await fetchPythProSnapshot({
    apiKey: 'test-token',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    fetchImpl: fakeFetch,
    receivedAt: '2026-09-23T15:30:20Z'
  });

  assert.equal(out.status, 'FRESH');
  assert.ok(Math.abs(out.price - 250) < 1e-9);
  assert.equal(out.ageSeconds, 5);
});


test('requests and returns a signed Solana payload for the on-chain path', async () => {
  const publishUs = Date.parse('2026-09-23T15:30:15Z') * 1000;
  const fakeFetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.deepEqual(request.formats, ['solana']);
    assert.ok(request.properties.includes('feedUpdateTimestamp'));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          parsed: {
            timestampUs: String(publishUs),
            priceFeeds: [
              {
                priceFeedId: 922,
                price: '25000000',
                confidence: 2500,
                exponent: -5,
                publisherCount: 3,
                marketSession: 'regular',
                feedUpdateTimestamp: publishUs
              }
            ]
          },
          solana: {
            encoding: 'hex',
            data: 'aabbccdd'
          }
        };
      }
    };
  };

  const out = await fetchPythProSolanaPayload({
    apiKey: 'test-token',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    fetchImpl: fakeFetch,
    receivedAt: '2026-09-23T15:30:20Z'
  });

  assert.equal(out.status, 'FRESH');
  assert.equal(out.solanaPayload.status, 'AVAILABLE');
  assert.equal(out.solanaPayload.encoding, 'hex');
  assert.equal(out.solanaPayload.data, 'aabbccdd');
  assert.equal(out.solanaPayload.byteLength, 4);
});

test('fails closed for the signed-payload path when the payload is absent', async () => {
  const publishUs = Date.parse('2026-09-23T15:30:15Z') * 1000;
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        parsed: {
          priceFeeds: [
            {
              priceFeedId: 922,
              price: '25000000',
              confidence: 2500,
              exponent: -5,
              feedUpdateTimestamp: publishUs
            }
          ]
        }
      };
    }
  });

  const out = await fetchPythProSolanaPayload({
    apiKey: 'test-token',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    fetchImpl: fakeFetch,
    receivedAt: '2026-09-23T15:30:20Z'
  });

  assert.equal(out.status, 'FRESH');
  assert.equal(out.solanaPayload.status, 'UNAVAILABLE');
  assert.equal(out.solanaPayload.reasonCode, 'PYTH_SOLANA_PAYLOAD_MISSING');
});


test('fetches Pyth Pro history and maps close candles to KEYS price points', async () => {
  const fakeFetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/v1/fixed_rate%401000ms/history');
    assert.equal(parsed.searchParams.get('symbol'), 'Equity.US.AAPL/USD');
    assert.equal(parsed.searchParams.get('from'), '1700000000');
    assert.equal(parsed.searchParams.get('to'), '1700600000');
    assert.equal(parsed.searchParams.get('resolution'), 'D');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          s: 'ok',
          t: [1700000000, 1700086400, 1700172800],
          o: [190, 191, 192],
          h: [192, 193, 194],
          l: [189, 190, 191],
          c: [191.5, 192.5, 193.5],
          v: [1, 1, 1]
        };
      }
    };
  };

  const out = await fetchPythProHistory({
    apiKey: 'test-token',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    from: 1700000000,
    to: 1700600000,
    resolution: 'D',
    fetchImpl: fakeFetch
  });

  assert.equal(out.status, 'AVAILABLE');
  assert.equal(out.source, 'PYTH_PRO_HISTORY');
  assert.equal(out.candleCount, 3);
  assert.deepEqual(out.points[0], { t: 1700000000000, v: 191.5 });
});

test('Pyth Pro history fails closed on entitlement refusal', async () => {
  const out = await fetchPythProHistory({
    apiKey: 'test-token',
    feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
    from: 1700000000,
    to: 1700600000,
    fetchImpl: async () => ({ ok: false, status: 403 })
  });

  assert.equal(out.status, 'UNAVAILABLE');
  assert.equal(out.reasonCode, 'PYTH_NOT_ENTITLED');
  assert.deepEqual(out.points, []);
});


test('normalizes Pyth Pro catalog rows without assuming one response casing', () => {
  const out = normalizePythProCatalogRow({
    symbol: 'Crypto.BTC/USD',
    price_feed_id: 1,
    asset_type: 'crypto',
    min_channel: 'fixed_rate@200ms'
  });
  assert.equal(out.symbol, 'Crypto.BTC/USD');
  assert.equal(out.feedId, 1);
  assert.equal(out.assetType, 'crypto');
  assert.equal(out.minChannel, 'fixed_rate@200ms');
});

test('fetches public Pyth catalog by asset class', async () => {
  const requested = [];
  const out = await fetchPythProCatalog({
    assetTypes: ['equity', 'crypto'],
    fetchImpl: async (url) => {
      requested.push(new URL(url).searchParams.get('asset_type'));
      return {
        ok: true,
        status: 200,
        async json() {
          const assetType = new URL(url).searchParams.get('asset_type');
          return [{
            symbol: assetType === 'equity' ? 'Equity.US.AAPL/USD' : 'Crypto.BTC/USD',
            price_feed_id: assetType === 'equity' ? 922 : 1,
            asset_type: assetType,
            min_channel: 'fixed_rate@50ms'
          }];
        }
      };
    }
  });

  assert.deepEqual(requested.sort(), ['crypto', 'equity']);
  assert.equal(out.equity.feeds[0].feedId, 922);
  assert.equal(out.crypto.feeds[0].symbol, 'Crypto.BTC/USD');
});

test('market discovery keeps AAPL primary while other entitled markets remain Learn/Practice only', async () => {
  const out = await discoverPythProMarkets({
    apiKey: 'test-token',
    perClass: 2,
    assetTypes: ['equity', 'crypto'],
    catalogProvider: async () => ({
      equity: {
        status: 'AVAILABLE',
        feeds: [
          { symbol: 'Equity.US.NVDA/USD', feedId: 100, minChannel: 'fixed_rate@50ms' },
          { symbol: 'Equity.US.AAPL/USD', feedId: 922, minChannel: 'fixed_rate@50ms' }
        ]
      },
      crypto: {
        status: 'AVAILABLE',
        feeds: [
          { symbol: 'Crypto.ETH/USD', feedId: 2, minChannel: 'fixed_rate@50ms' },
          { symbol: 'Crypto.BTC/USD', feedId: 1, minChannel: 'fixed_rate@50ms' }
        ]
      }
    }),
    snapshotProvider: async ({ feed }) => ({
      status: 'FRESH',
      price: feed.feedId === 922 ? 335 : 100,
      publishTime: '2026-09-25T08:00:00.000Z'
    })
  });

  const aapl = out.classes.flatMap((group) => group.feeds)
    .find((feed) => feed.symbol === 'Equity.US.AAPL/USD');
  const btc = out.classes.flatMap((group) => group.feeds)
    .find((feed) => feed.symbol === 'Crypto.BTC/USD');

  assert.equal(aapl.productMode, 'PRIMARY_MONEY_PROOF');
  assert.equal(aapl.moneyExecutionProven, true);
  assert.equal(btc.productMode, 'LEARN_PRACTICE_ONLY');
  assert.equal(btc.moneyExecutionProven, false);
  assert.equal(btc.entitlementStatus, 'ACCESSIBLE');
  assert.equal(out.truthBoundary.entitlementDoesNotImplyMoneyExecution, true);
});
