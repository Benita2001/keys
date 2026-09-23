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

test('HTTP adapter exposes fail-closed backend capabilities', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/capabilities'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.mode, 'LOCAL_DEMO');
  assert.equal(
    ['BLOCKED_API_KEY', 'PYTH_CONFIGURED'].includes(result.body.marketEvidence.status),
    true
  );
  assert.equal(result.body.authorityCommit.status, 'RUNTIME_UNAVAILABLE');
  assert.equal(result.body.executionEligibility.status, 'UNKNOWN_DEFAULT');
  assert.equal(result.body.simulation.status, 'AVAILABLE');
});

test('HTTP adapter reports injected providers as ready capabilities', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/capabilities',
    services: {
      marketEvidenceProvider: async () => freshMarket,
      eligibilityProvider: async () => ({ status: 'UNKNOWN' }),
      authorityTransitionProvider: {
        commitTransition: async () => ({ ok: false, reasonCode: 'TEST_ONLY' })
      }
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.marketEvidence.status, 'PROVIDER_READY');
  assert.equal(result.body.authorityCommit.status, 'RUNTIME_READY');
  assert.equal(result.body.executionEligibility.status, 'PROVIDER_READY');
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
  assert.equal(result.body.marketEvidence.status, 'UNAVAILABLE');
  assert.equal(result.body.marketEvidence.reasonCode, 'PYTH_API_KEY_REQUIRED');
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
  assert.equal(result.body.marketEvidence.status, 'FRESH');
  assert.equal(result.body.eligibility.status, 'UNKNOWN');
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
  assert.equal(result.body.marketEvidence.status, 'FRESH');
  assert.equal(result.body.decision, 'ESCALATE');
  assert.equal(result.body.reasonCode, 'GUARDIAN_REVIEW_REQUIRED');
});

test('HTTP transition preview refuses missing authorization without committing authority', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/mandates/transition/preview',
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
  assert.equal(result.body.preview, true);
  assert.equal(result.body.authorityCommitted, false);
});

test('HTTP committed transition fails closed when authority runtime is unavailable', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/mandates/transition',
    body: {
      fromStage: Stage.PROPOSE,
      toStage: Stage.BOUNDED,
      expectedNonce: 0
    }
  });

  assert.equal(result.status, 503);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.authorityCommitted, false);
  assert.equal(result.body.reasonCode, 'AUTHORITY_RUNTIME_UNAVAILABLE');
});

test('HTTP committed transition returns normalized proof from authority provider', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.1/mandates/transition',
    body: {
      fromStage: Stage.PROPOSE,
      toStage: Stage.BOUNDED,
      expectedNonce: 0
    },
    services: {
      authorityTransitionProvider: {
        commitTransition: async () => ({
          ok: true,
          mandate: {
            stage: Stage.BOUNDED,
            version: 2,
            nonce: 1
          },
          proof: {
            signature: 'local-signature',
            programId: 'local-program',
            mandateAddress: 'local-mandate',
            version: 2,
            nonce: 1
          }
        })
      }
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.authorityCommitted, true);
  assert.equal(result.body.mandate.stage, Stage.BOUNDED);
  assert.equal(result.body.proof.signature, 'local-signature');
  assert.equal(result.body.proof.version, 2);
  assert.equal(result.body.proof.nonce, 1);
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
