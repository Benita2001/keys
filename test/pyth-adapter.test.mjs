import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePythSnapshot } from '../src/pyth-adapter.mjs';

test('normalizes freshness and confidence without network assumptions', () => {
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
  assert.equal(out.price, 250);
  assert.equal(out.status, 'FRESH');
  assert.ok(out.confidenceBps < 100);
});
