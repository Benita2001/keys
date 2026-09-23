import test from 'node:test';
import assert from 'node:assert/strict';

import { Stage, makeCharter, makeMandate, makeProposal } from '../src/model.mjs';
import { routeKeysHttp } from '../src/http-api.mjs';

const createdAt = '2026-09-23T16:00:00Z';

function charter() {
  return makeCharter({
    familyId: 'keys-demo-family',
    beneficiaryId: 'maya-demo',
    guardianId: 'guardian-demo',
    jurisdiction: 'CA-QC',
    assetUniverse: ['AAPL'],
    maxProposalNotional: 50,
    maxBoundedNotional: 25
  });
}

function proposal() {
  return makeProposal({
    id: 'maya-aapl-001',
    asset: 'AAPL',
    amount: 25,
    rationale: 'I can explain the business and want long-term exposure.',
    counterargument: 'A strong business can still be overpriced.',
    horizonDays: 365,
    invalidation: 'Reconsider if the business thesis materially changes.',
    createdAt,
    mode: 'PRACTICE'
  });
}

const freshMarket = {
  status: 'FRESH',
  confidenceBps: 10,
  maxConfidenceBps: 100
};

const unavailableMarket = {
  status: 'UNAVAILABLE',
  reasonCode: 'PYTH_API_KEY_REQUIRED'
};

const backendServices = {
  marketEvidenceProvider: async () => freshMarket,
  eligibilityProvider: async () => ({ status: 'UNKNOWN' })
};

function proposalBody() {
  return {
    charter: charter(),
    mandate: makeMandate({ stage: Stage.PROPOSE, effectiveAt: createdAt }),
    proposal: proposal(),
    now: createdAt
  };
}

test('HTTP adapter exposes health and contract version', async () => {
  const result = await routeKeysHttp({ method: 'GET', path: '/health' });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.contractVersion, '0.1');
});

test('HTTP adapter exposes canonical Maya fixture', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/demo/maya'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.beneficiary.displayName, 'Maya');
  assert.equal(result.body.mandate.stage, Stage.PROPOSE);
});

test('normal proposal endpoint uses backend-owned evidence', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/proposals/evaluate',
    body: {
      ...proposalBody(),
      market: { status: 'FRESH', confidenceBps: 1, maxConfidenceBps: 100 }
    },
    services: {
      marketEvidenceProvider: async () => unavailableMarket,
      eligibilityProvider: async () => ({ status: 'UNKNOWN' })
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.decision, 'REFUSE');
  assert.equal(result.body.reasonCode, 'MARKET_EVIDENCE_UNAVAILABLE');
});

test('normal proposal endpoint reaches guardian review with trusted backend evidence', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/proposals/evaluate',
    body: proposalBody(),
    services: backendServices
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.decision, 'ESCALATE');
  assert.equal(result.body.reasonCode, 'GUARDIAN_REVIEW_REQUIRED');
});

test('simulation endpoint accepts explicit simulated evidence and labels the response', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/simulations/proposals/evaluate',
    body: {
      ...proposalBody(),
      market: freshMarket,
      eligibility: { status: 'UNKNOWN' }
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.simulation, true);
  assert.equal(result.body.type, 'SIMULATION_PROPOSAL_EVALUATION');
  assert.equal(result.body.decision, 'ESCALATE');
  assert.equal(result.body.reasonCode, 'GUARDIAN_REVIEW_REQUIRED');
});

test('HTTP transition endpoint refuses missing authorization', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/mandates/transition',
    body: {
      mandate: makeMandate({ stage: Stage.PROPOSE, effectiveAt: createdAt }),
      toStage: Stage.BOUNDED,
      authorizedBy: null,
      at: createdAt,
      evidenceSummary: {},
      reviewEligibility: { eligibleForReview: true }
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.reasonCode, 'AUTHORIZED_TRANSITION_REQUIRED');
});

test('HTTP execution endpoint preserves UNKNOWN fail-closed behavior', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/execution/evaluate',
    body: {
      charter: charter(),
      mandate: makeMandate({ stage: Stage.BOUNDED, effectiveAt: createdAt }),
      proposal: proposal(),
      now: createdAt
    },
    services: backendServices
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.decision, 'REFUSE');
  assert.equal(result.body.reasonCode, 'ELIGIBILITY_UNKNOWN');
});

test('HTTP adapter returns 404 envelope for unknown routes', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/nope'
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.error, 'NOT_FOUND');
});
