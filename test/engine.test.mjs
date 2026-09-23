import test from 'node:test';
import assert from 'node:assert/strict';
import { Stage, makeCharter, makeMandate, makeProposal } from '../src/model.mjs';
import { evaluateProposal, summarizeEvidence, mandateReviewEligibility, transitionMandate } from '../src/engine.mjs';

const charter = makeCharter({
  familyId: 'family-1',
  beneficiaryId: 'maya',
  guardianId: 'guardian-1',
  jurisdiction: 'CA-QC',
  assetUniverse: ['AAPL', 'NVDA', 'SPY'],
  maxProposalNotional: 50,
  maxBoundedNotional: 25
});

const completeProposal = makeProposal({
  id: 'p1',
  asset: 'AAPL',
  amount: 25,
  rationale: 'I understand the business and want long-term exposure.',
  counterargument: 'Hardware demand can slow and concentration can be risky.',
  horizonDays: 180,
  invalidation: 'Review if services growth materially slows.',
  createdAt: '2026-09-23T14:00:00Z'
});

const market = { status: 'FRESH', confidenceBps: 8, maxConfidenceBps: 100 };

test('practice stage never creates execution authority', () => {
  const mandate = makeMandate({ stage: Stage.PRACTICE, effectiveAt: '2026-09-23T14:00:00Z' });
  const r = evaluateProposal({ charter, mandate, proposal: completeProposal, market, eligibility: { status: 'ELIGIBLE' }, now: '2026-09-23T14:01:00Z' });
  assert.equal(r.decision, 'ESCALATE');
  assert.equal(r.reasonCode, 'PRACTICE_ONLY');
});

test('stale market evidence fails closed', () => {
  const mandate = makeMandate({ stage: Stage.BOUNDED, effectiveAt: '2026-09-23T14:00:00Z' });
  const r = evaluateProposal({ charter, mandate, proposal: completeProposal, market: { status: 'STALE' }, eligibility: { status: 'ELIGIBLE' }, now: '2026-09-23T14:01:00Z' });
  assert.equal(r.decision, 'REFUSE');
  assert.equal(r.reasonCode, 'MARKET_EVIDENCE_UNAVAILABLE');
});

test('bounded authority refuses unknown eligibility', () => {
  const mandate = makeMandate({ stage: Stage.BOUNDED, effectiveAt: '2026-09-23T14:00:00Z' });
  const r = evaluateProposal({ charter, mandate, proposal: completeProposal, market, eligibility: { status: 'UNKNOWN' }, now: '2026-09-23T14:01:00Z' });
  assert.equal(r.decision, 'REFUSE');
  assert.equal(r.reasonCode, 'ELIGIBILITY_UNKNOWN');
});

test('evidence can make a mandate eligible for human review, not auto-promote it', () => {
  const mandate = makeMandate({ stage: Stage.PROPOSE, effectiveAt: '2026-09-23T14:00:00Z' });
  const evidence = summarizeEvidence([
    { type: 'PROPOSAL' }, { type: 'PROPOSAL' }, { type: 'PROPOSAL' },
    { type: 'REVIEW_COMPLETED' }, { type: 'REVIEW_COMPLETED' }, { type: 'REVIEW_COMPLETED' },
    { type: 'MARKET_EVENT_REVIEW' }
  ]);
  const eligibility = mandateReviewEligibility({ mandate, evidence, thresholds: { minReviews: 3, minProposals: 3, minMarketEventReviews: 1, maxScopeViolations: 0 } });
  assert.equal(eligibility.eligibleForReview, true);

  const denied = transitionMandate({ mandate, toStage: Stage.BOUNDED, authorizedBy: null, at: '2026-09-24T14:00:00Z', evidenceSummary: evidence, reviewEligibility: eligibility });
  assert.equal(denied.ok, false);
  assert.equal(denied.reasonCode, 'AUTHORIZED_TRANSITION_REQUIRED');

  const approved = transitionMandate({ mandate, toStage: Stage.BOUNDED, authorizedBy: 'guardian-1', at: '2026-09-24T14:00:00Z', evidenceSummary: evidence, reviewEligibility: eligibility });
  assert.equal(approved.ok, true);
  assert.equal(approved.mandate.stage, Stage.BOUNDED);
});
