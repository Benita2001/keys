import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  Stage,
  makeCharter,
  makeMandate,
  makeProposal
} from '../src/model.mjs';

import {
  FRONTEND_CONTRACT_VERSION,
  MANDATE_REVIEW_LABEL,
  evaluateProposalForFrontend,
  mandateReviewForFrontend,
  transitionMandateForFrontend,
  executionEligibilityForFrontend
} from '../src/frontend-api.mjs';

const snapshot = JSON.parse(
  await readFile(new URL('../fixtures/frontend-maya-contract.json', import.meta.url), 'utf8')
);

function demoCharter() {
  return makeCharter({
    familyId: 'keys-demo-family',
    beneficiaryId: 'maya-demo',
    guardianId: 'guardian-demo',
    jurisdiction: snapshot.beneficiary.jurisdiction,
    assetUniverse: ['AAPL'],
    maxProposalNotional: 50,
    maxBoundedNotional: 25
  });
}

function demoProposal() {
  return makeProposal(snapshot.proposal);
}

const freshMarket = {
  status: 'FRESH',
  confidenceBps: 10,
  maxConfidenceBps: 100
};

test('frontend facade matches the canonical Maya proposal response', () => {
  const response = evaluateProposalForFrontend({
    charter: demoCharter(),
    mandate: makeMandate({
      stage: Stage.PROPOSE,
      effectiveAt: snapshot.proposal.createdAt
    }),
    proposal: demoProposal(),
    market: freshMarket,
    eligibility: { status: 'UNKNOWN' },
    now: snapshot.proposal.createdAt
  });

  assert.equal(response.contractVersion, FRONTEND_CONTRACT_VERSION);
  assert.equal(response.contractVersion, snapshot.contractVersion);
  assert.equal(response.type, 'PROPOSAL_EVALUATION');
  assert.equal(response.decision, snapshot.evaluation.decision);
  assert.equal(response.reasonCode, snapshot.evaluation.reasonCode);
  assert.equal(response.mandate.stage, Stage.PROPOSE);
  assert.equal(response.proposal.asset, 'AAPL');
  assert.equal(response.proposal.amount, 25);
});

test('frontend facade exposes review eligibility without maturity language', () => {
  const response = mandateReviewForFrontend({
    mandate: makeMandate({
      stage: Stage.PROPOSE,
      effectiveAt: snapshot.proposal.createdAt
    }),
    events: [
      { type: 'PROPOSAL' },
      { type: 'PROPOSAL' },
      { type: 'PROPOSAL' },
      { type: 'REVIEW_COMPLETED' },
      { type: 'REVIEW_COMPLETED' },
      { type: 'REVIEW_COMPLETED' },
      { type: 'MARKET_EVENT_REVIEW' }
    ],
    thresholds: {
      minReviews: 3,
      minProposals: 3,
      minMarketEventReviews: 1,
      maxScopeViolations: 0
    }
  });

  assert.equal(response.reviewEligibility.label, MANDATE_REVIEW_LABEL);
  assert.equal(response.reviewEligibility.label, snapshot.reviewEligibility.label);
  assert.equal(response.reviewEligibility.eligibleForReview, true);
  assert.deepEqual(response.reviewEligibility.unmet, []);
});

test('frontend facade refuses unauthorized mandate widening', () => {
  const mandate = makeMandate({
    stage: Stage.PROPOSE,
    effectiveAt: snapshot.proposal.createdAt
  });

  const response = transitionMandateForFrontend({
    mandate,
    toStage: Stage.BOUNDED,
    authorizedBy: null,
    at: snapshot.proposal.createdAt,
    evidenceSummary: {},
    reviewEligibility: { eligibleForReview: true }
  });

  assert.equal(response.ok, false);
  assert.equal(response.reasonCode, snapshot.unauthorizedTransition.reasonCode);
  assert.equal(response.transition.fromStage, Stage.PROPOSE);
  assert.equal(response.transition.toStage, Stage.BOUNDED);
  assert.equal(response.mandate.stage, Stage.PROPOSE);
});

test('frontend facade allows explicit authorized PROPOSE -> BOUNDED transition', () => {
  const mandate = makeMandate({
    stage: Stage.PROPOSE,
    effectiveAt: snapshot.proposal.createdAt
  });

  const response = transitionMandateForFrontend({
    mandate,
    toStage: Stage.BOUNDED,
    authorizedBy: 'guardian-demo',
    at: '2026-09-24T16:00:00Z',
    evidenceSummary: {},
    reviewEligibility: { eligibleForReview: true }
  });

  assert.equal(response.ok, true);
  assert.equal(response.reasonCode, null);
  assert.equal(response.transition.fromStage, Stage.PROPOSE);
  assert.equal(response.transition.toStage, Stage.BOUNDED);
  assert.equal(response.mandate.stage, Stage.BOUNDED);
});

test('frontend facade preserves UNKNOWN fail-closed execution behavior', () => {
  const response = executionEligibilityForFrontend({
    charter: demoCharter(),
    mandate: makeMandate({
      stage: Stage.BOUNDED,
      effectiveAt: snapshot.proposal.createdAt
    }),
    proposal: demoProposal(),
    market: freshMarket,
    eligibility: { status: 'UNKNOWN' },
    now: snapshot.proposal.createdAt
  });

  assert.equal(response.type, 'EXECUTION_ELIGIBILITY');
  assert.equal(response.decision, snapshot.executionEligibility.decision);
  assert.equal(response.reasonCode, snapshot.executionEligibility.reasonCode);
});
