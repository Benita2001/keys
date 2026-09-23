import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSnapshot,
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
