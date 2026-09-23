import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ActionDecision,
  MandateStatus,
  buildBoundaryRequest,
  evaluateBoundedAction,
  learningCueForAction
} from '../src/bounded-autonomy.mjs';

const mandate = {
  status: MandateStatus.ACTIVE,
  version: 4,
  nonce: 3,
  expiresAt: '2026-12-01T00:00:00Z'
};

const rule = {
  enabled: true,
  asset: 'TSLA',
  allowedActions: ['BUY'],
  quoteUnit: 'USD',
  maxActionNotional: 250,
  maxPeriodNotional: 1000,
  spentThisPeriod: 100,
  requiresMarketEvidence: true,
  maxMarketAgeSeconds: 30,
  maxConfidenceBps: 100
};

const market = {
  status: 'FRESH',
  price: 100,
  ageSeconds: 1,
  confidenceBps: 10
};

test('v0.2 allows an in-bounds action with no guardian approval', () => {
  const out = evaluateBoundedAction({
    mandate,
    assetRule: rule,
    action: {
      type: 'BUY',
      asset: 'TSLA',
      amount: 2,
      expectedNonce: 3
    },
    market,
    now: '2026-09-23T22:00:00Z'
  });

  assert.equal(out.decision, ActionDecision.ALLOW);
  assert.equal(out.reasonCode, 'WITHIN_MANDATE');
  assert.equal(out.guardianApprovalRequired, false);
  assert.equal(out.requestedNotional, 200);
});

test('v0.2 refuses an out-of-bounds action and exposes a boundary request', () => {
  const out = evaluateBoundedAction({
    mandate,
    assetRule: rule,
    action: {
      type: 'BUY',
      asset: 'TSLA',
      amount: 5,
      expectedNonce: 3
    },
    market,
    now: '2026-09-23T22:00:00Z'
  });

  assert.equal(out.decision, ActionDecision.REFUSE);
  assert.equal(out.reasonCode, 'MANDATE_LIMIT_EXCEEDED');
  assert.equal(out.boundaryRequestAvailable, true);
  assert.equal(out.requestedNotional, 500);
  assert.equal(out.standingLimit, 250);
});

test('v0.2 refuses stale authorization material', () => {
  const out = evaluateBoundedAction({
    mandate,
    assetRule: rule,
    action: {
      type: 'BUY',
      asset: 'TSLA',
      amount: 1,
      expectedNonce: 2
    },
    market
  });

  assert.equal(out.decision, ActionDecision.REFUSE);
  assert.equal(out.reasonCode, 'STALE_NONCE');
});

test('v0.2 fails closed when required market evidence is stale', () => {
  const out = evaluateBoundedAction({
    mandate,
    assetRule: rule,
    action: {
      type: 'BUY',
      asset: 'TSLA',
      amount: 1,
      expectedNonce: 3
    },
    market: {
      ...market,
      status: 'STALE',
      ageSeconds: 60
    }
  });

  assert.equal(out.decision, ActionDecision.REFUSE);
  assert.equal(out.reasonCode, 'MARKET_EVIDENCE_UNAVAILABLE');
});

test('v0.2 market conditions may restrict but never widen authority', () => {
  const out = evaluateBoundedAction({
    mandate,
    assetRule: {
      ...rule,
      maxPrice: 90
    },
    action: {
      type: 'BUY',
      asset: 'TSLA',
      amount: 1,
      expectedNonce: 3
    },
    market
  });

  assert.equal(out.decision, ActionDecision.REFUSE);
  assert.equal(out.reasonCode, 'MARKET_CONDITION_INVALIDATED');
});

test('boundary request stays a human-decision object rather than authority', () => {
  const request = buildBoundaryRequest({
    mandate,
    assetRule: rule,
    action: {
      type: 'BUY',
      asset: 'TSLA',
      amount: 5,
      notional: 500
    },
    reasoningCommitmentHash: 'demo-hash',
    condition: { maxPrice: 105 },
    now: '2026-09-23T22:00:00Z'
  });

  assert.equal(request.status, 'PENDING_HUMAN_DECISION');
  assert.deepEqual(request.decisions, ['ALLOW_ONCE', 'WIDEN_MANDATE', 'REFUSE']);
  assert.equal(request.mandateNonce, 3);
});

test('learning stays contextual and does not produce an authority decision', () => {
  const cue = learningCueForAction({
    assetRule: rule,
    action: { asset: 'TSLA' },
    market,
    reasonCode: 'MANDATE_LIMIT_EXCEEDED'
  });

  assert.equal(cue.kind, 'BOUNDARY');
  assert.equal('decision' in cue, false);
  assert.equal('stage' in cue, false);
});
