import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Decision, Stage, makeCharter, makeMandate, makeProposal } from '../src/model.mjs';
import { evaluateProposal, transitionMandate } from '../src/engine.mjs';

const snapshot = JSON.parse(
  await readFile(new URL('../fixtures/frontend-maya-contract.json', import.meta.url), 'utf8')
);

test('frontend Maya contract uses canonical stage and decision enums', () => {
  assert.equal(snapshot.contractVersion, '0.1');
  assert.equal(snapshot.mandate.stage, Stage.PROPOSE);
  assert.equal(snapshot.evaluation.decision, Decision.ESCALATE);
  assert.equal(snapshot.evaluation.reasonCode, 'GUARDIAN_REVIEW_REQUIRED');
});

test('Maya PROPOSE scenario resolves to guardian review required', () => {
  const charter = makeCharter({
    familyId: 'keys-demo-family',
    beneficiaryId: 'maya-demo',
    guardianId: 'guardian-demo',
    jurisdiction: snapshot.beneficiary.jurisdiction,
    assetUniverse: ['AAPL'],
    maxProposalNotional: 50,
    maxBoundedNotional: 25
  });

  const mandate = makeMandate({
    stage: snapshot.mandate.stage,
    effectiveAt: snapshot.proposal.createdAt
  });

  const proposal = makeProposal(snapshot.proposal);

  const result = evaluateProposal({
    charter,
    mandate,
    proposal,
    market: { status: 'FRESH', confidenceBps: 10, maxConfidenceBps: 100 },
    eligibility: { status: 'UNKNOWN' },
    now: snapshot.proposal.createdAt
  });

  assert.equal(result.decision, Decision.ESCALATE);
  assert.equal(result.reasonCode, 'GUARDIAN_REVIEW_REQUIRED');
});

test('mandate widening without authorization remains refused', () => {
  const mandate = makeMandate({
    stage: Stage.PROPOSE,
    effectiveAt: snapshot.proposal.createdAt
  });

  const result = transitionMandate({
    mandate,
    toStage: Stage.BOUNDED,
    authorizedBy: null,
    at: snapshot.proposal.createdAt,
    evidenceSummary: {},
    reviewEligibility: { eligibleForReview: true }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'AUTHORIZED_TRANSITION_REQUIRED');
  assert.equal(result.mandate.stage, Stage.PROPOSE);
});

test('UNKNOWN execution eligibility fails closed in BOUNDED', () => {
  const charter = makeCharter({
    familyId: 'keys-demo-family',
    beneficiaryId: 'maya-demo',
    guardianId: 'guardian-demo',
    jurisdiction: snapshot.beneficiary.jurisdiction,
    assetUniverse: ['AAPL'],
    maxProposalNotional: 50,
    maxBoundedNotional: 25
  });

  const mandate = makeMandate({
    stage: Stage.BOUNDED,
    effectiveAt: snapshot.proposal.createdAt
  });

  const proposal = makeProposal(snapshot.proposal);
  const result = evaluateProposal({
    charter,
    mandate,
    proposal,
    market: { status: 'FRESH', confidenceBps: 10, maxConfidenceBps: 100 },
    eligibility: { status: 'UNKNOWN' },
    now: snapshot.proposal.createdAt
  });

  assert.equal(result.decision, Decision.REFUSE);
  assert.equal(result.reasonCode, 'ELIGIBILITY_UNKNOWN');
});
