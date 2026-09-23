/**
 * Boundary adapter for live market evidence.
 * v0.1 intentionally does not fake a Pyth network call. The production adapter must
 * provide the same normalized shape from a verified Pyth source.
 */
export function normalizePythSnapshot({ feedId, price, confidence, expo, publishTime, receivedAt, maxAgeSeconds = 30, maxConfidenceBps = 100 }) {
  const normalizedPrice = Number(price) * Math.pow(10, Number(expo));
  const normalizedConfidence = Number(confidence) * Math.pow(10, Number(expo));
  const ageSeconds = Math.max(0, Math.floor((Date.parse(receivedAt) - Number(publishTime) * 1000) / 1000));
  const confidenceBps = normalizedPrice === 0 ? Infinity : Math.abs(normalizedConfidence / normalizedPrice) * 10000;
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
