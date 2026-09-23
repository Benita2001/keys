import { evaluateProposal } from '../src/engine.mjs';
import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSnapshot,
  fetchPythProSolanaPayload
} from '../src/pyth-adapter.mjs';

const proofSymbol = process.env.PYTH_PRO_EQUITY_SYMBOL || 'TSLA';
const feed = PYTH_PRO_EQUITY_FEEDS[proofSymbol];

if (!feed) {
  throw new Error(`Unsupported PYTH_PRO_EQUITY_SYMBOL: ${proofSymbol}`);
}

const assetTicker = feed.symbol.split('.')[2]?.split('/')[0] || proofSymbol;
const proofChannel = process.env.PYTH_PRO_CHANNEL || 'fixed_rate@1000ms';
const receivedAt = new Date().toISOString();

const snapshot = await fetchPythProSolanaPayload({
  apiKey: process.env.PYTH_PRO_API_KEY,
  feed,
  channel: proofChannel,
  receivedAt,
  maxAgeSeconds: 30,
  maxConfidenceBps: 100
});

console.log(JSON.stringify({
  proof: 'PYTH_LIVE_EVIDENCE',
  symbol: feed.symbol,
  feedId: feed.feedId,
  channel: proofChannel,
  status: snapshot.status,
  reasonCode: snapshot.reasonCode ?? null,
  price: snapshot.price ?? null,
  confidence: snapshot.confidence ?? null,
  confidenceBps: snapshot.confidenceBps ?? null,
  publishTime: snapshot.publishTime ?? null,
  receivedAt: snapshot.receivedAt,
  ageSeconds: snapshot.ageSeconds ?? null,
  marketSession: snapshot.marketSession ?? null,
  publisherCount: snapshot.publisherCount ?? null,
  solanaPayloadStatus: snapshot.solanaPayload?.status ?? 'UNAVAILABLE',
  solanaPayloadBytes: snapshot.solanaPayload?.byteLength ?? null
}));

if (snapshot.solanaPayload?.status === 'AVAILABLE') {
  console.log(`PYTH_SIGNED_SOLANA_PAYLOAD=PASS encoding=${snapshot.solanaPayload.encoding} bytes=${snapshot.solanaPayload.byteLength ?? 'unknown'}`);
} else {
  console.log(`PYTH_SIGNED_SOLANA_PAYLOAD=BLOCKED reason=${snapshot.solanaPayload?.reasonCode ?? 'UNKNOWN'}`);
}

if (snapshot.status === 'UNAVAILABLE') {
  if (snapshot.reasonCode === 'PYTH_NOT_ENTITLED') {
    const diagnosticFeed = {
      symbol: 'Crypto.BTC/USD',
      feedId: 1,
      exponent: -8,
      minChannel: 'fixed_rate@200ms'
    };
    const diagnostic = await fetchPythProSnapshot({
      apiKey: process.env.PYTH_PRO_API_KEY,
      feed: diagnosticFeed,
      channel: 'fixed_rate@1000ms',
      receivedAt: new Date().toISOString(),
      maxAgeSeconds: 30,
      maxConfidenceBps: 100
    });

    console.log(JSON.stringify({
      proof: 'PYTH_ENTITLEMENT_DIAGNOSTIC',
      symbol: diagnosticFeed.symbol,
      feedId: diagnosticFeed.feedId,
      channel: 'fixed_rate@1000ms',
      status: diagnostic.status,
      reasonCode: diagnostic.reasonCode ?? null,
      priceAvailable: diagnostic.price != null,
      publishTimeAvailable: diagnostic.publishTime != null
    }));
  }

  console.log(`PYTH_LIVE_PROOF=BLOCKED reason=${snapshot.reasonCode}`);
  process.exit(0);
}

const charter = {
  expiresAt: null,
  assetUniverse: [assetTicker],
  maxProposalNotional: 50,
  maxBoundedNotional: 25
};

const mandate = {
  stage: 'PROPOSE',
  transitionHistory: []
};

const proposal = {
  asset: assetTicker,
  amount: 25,
  rationale: 'Long-term business thesis recorded before the outcome is known.',
  counterargument: 'Valuation and execution risk can invalidate an otherwise strong narrative.',
  invalidation: 'Revisit if the long-term thesis materially changes.'
};

const decision = evaluateProposal({
  charter,
  mandate,
  proposal,
  market: snapshot,
  eligibility: { status: 'UNKNOWN' },
  now: receivedAt
});

console.log(JSON.stringify({
  proof: 'PYTH_LOAD_BEARING_DECISION',
  marketStatus: snapshot.status,
  decision: decision.decision,
  reasonCode: decision.reasonCode
}));

if (snapshot.status === 'FRESH' && snapshot.confidenceBps <= snapshot.maxConfidenceBps) {
  if (decision.reasonCode !== 'GUARDIAN_REVIEW_REQUIRED') {
    throw new Error(`Fresh acceptable Pyth evidence should reach guardian review, got ${decision.reasonCode}`);
  }
  console.log('PYTH_LIVE_PROOF=PASS fresh_market_evidence_reached_guardian_review');
} else {
  if (!['MARKET_EVIDENCE_UNAVAILABLE', 'MARKET_CONFIDENCE_TOO_WIDE'].includes(decision.reasonCode)) {
    throw new Error(`Unacceptable Pyth evidence must fail closed, got ${decision.reasonCode}`);
  }
  console.log(`PYTH_LIVE_PROOF=PASS fail_closed reason=${decision.reasonCode}`);
}
