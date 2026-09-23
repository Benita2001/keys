import { Stage, makeCharter, makeMandate, makeProposal } from '../src/model.mjs';
import { evaluateProposal, summarizeEvidence, mandateReviewEligibility, transitionMandate } from '../src/engine.mjs';

const charter = makeCharter({
  familyId: 'keys-demo-family', beneficiaryId: 'maya', guardianId: 'guardian', jurisdiction: 'CA-QC',
  assetUniverse: ['AAPL', 'NVDA', 'SPY'], maxProposalNotional: 50, maxBoundedNotional: 25
});
let mandate = makeMandate({ stage: Stage.PROPOSE, effectiveAt: '2026-09-23T14:00:00Z' });
const proposal = makeProposal({
  id: 'demo-001', asset: 'AAPL', amount: 25,
  rationale: 'I use the products and want to understand long-term ownership.',
  counterargument: 'A familiar brand can still be overpriced or face slowing demand.',
  horizonDays: 180,
  invalidation: 'Review if the original long-term business assumption materially changes.',
  createdAt: '2026-09-23T14:05:00Z'
});

console.log('\nKEYS v0.1 — deterministic vertical slice');
console.log('1) Maya proposes $25 of Apple under PROPOSE mandate.');
let result = evaluateProposal({
  charter, mandate, proposal,
  market: { status: 'FRESH', confidenceBps: 7, maxConfidenceBps: 100 },
  eligibility: { status: 'UNKNOWN' },
  now: '2026-09-23T14:06:00Z'
});
console.log('   ', result.decision, result.reasonCode);

console.log('2) Evidence accumulates through proposals, reviews and market-event reviews.');
const evidence = summarizeEvidence([
  {type:'PROPOSAL'}, {type:'PROPOSAL'}, {type:'PROPOSAL'},
  {type:'REVIEW_COMPLETED'}, {type:'REVIEW_COMPLETED'}, {type:'REVIEW_COMPLETED'},
  {type:'MARKET_EVENT_REVIEW'}
]);
const review = mandateReviewEligibility({ mandate, evidence, thresholds: { minReviews: 3, minProposals: 3, minMarketEventReviews: 1, maxScopeViolations: 0 } });
console.log('   eligibleForMandateReview =', review.eligibleForReview);

console.log('3) KEYS refuses to auto-promote real financial authority.');
let transition = transitionMandate({ mandate, toStage: Stage.BOUNDED, authorizedBy: null, at: '2026-09-24T14:00:00Z', evidenceSummary: evidence, reviewEligibility: review });
console.log('   ', transition.ok ? 'PROMOTED' : 'REFUSED', transition.reasonCode ?? '');

console.log('4) An authorized guardian explicitly signs the new mandate.');
transition = transitionMandate({ mandate, toStage: Stage.BOUNDED, authorizedBy: 'guardian', at: '2026-09-24T14:00:00Z', evidenceSummary: evidence, reviewEligibility: review });
mandate = transition.mandate;
console.log('   new mandate =', mandate.stage);

console.log('5) Real execution still fails closed when eligibility is unknown.');
result = evaluateProposal({
  charter, mandate, proposal,
  market: { status: 'FRESH', confidenceBps: 7, maxConfidenceBps: 100 },
  eligibility: { status: 'UNKNOWN' },
  now: '2026-09-24T14:01:00Z'
});
console.log('   ', result.decision, result.reasonCode);
console.log('\nTruth boundary: no real minor execution, no live Pyth call, no brokerage/custody claim.\n');
