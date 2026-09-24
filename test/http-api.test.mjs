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
  assert.equal(result.body.contractVersion, '0.2');
  assert.equal(result.body.legacyContractVersion, '0.1');
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
  assert.equal(result.body.liveDemoProof.selectedEquity, 'TSLA');
  assert.equal(result.body.liveDemoProof.route, '/api/v0.1/demo/live-proof');
  assert.equal(
    ['BLOCKED_API_KEY', 'LIVE_EVIDENCE_READY'].includes(result.body.liveDemoProof.status),
    true
  );
});

test('HTTP adapter advertises frozen v0.2 runtime proof', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/capabilities'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.v2.status, 'FROZEN_RUNTIME_PROVEN');
  assert.equal(result.body.v2.onchainPythVerification, true);
  assert.equal(result.body.v2.demoRoute, '/api/v0.2/demo/maya');
  assert.equal(
    result.body.v2.canonicalDevnetProofRun,
    'https://github.com/Faadil1/keys/actions/runs/35959137364'
  );
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
  assert.equal(result.body.liveDemoProof.status, 'PROVIDER_READY');
  assert.equal(result.body.liveDemoProof.selectedEquity, 'TSLA');
});

test('HTTP adapter exposes canonical Maya fixture', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/demo/maya'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.beneficiary.displayName, 'Maya');
  assert.equal(result.body.mandate.stage, Stage.PROPOSE);
  assert.equal(result.body.marketEvidence.mode, 'SIMULATION');
  assert.equal(result.body.marketEvidence.live.status, 'UNAVAILABLE');
  assert.equal(result.body.authorizedTransition.authorityCommitted, false);
});


test('live demo proof surface exposes live evidence plus public devnet proof without secrets', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/demo/live-proof',
    services: {
      marketEvidenceProvider: async ({ asset }) => ({
        source: 'PYTH_PRO',
        symbol: `Equity.US.${asset}/USD`,
        feedId: 1435,
        status: 'FRESH',
        price: 379.696,
        confidence: 0.019,
        confidenceBps: 0.5004,
        maxConfidenceBps: 100,
        publishTime: '2026-09-23T19:36:42.000Z',
        receivedAt: '2026-09-23T19:36:42.000Z',
        ageSeconds: 0,
        marketSession: 'regular',
        publisherCount: 19
      })
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.type, 'LIVE_DEMO_PROOF');
  assert.equal(result.body.mode, 'LIVE_BACKEND_EVIDENCE');
  assert.equal(result.body.beneficiary.displayName, 'Maya');
  assert.equal(result.body.scenario.asset, 'TSLA');
  assert.equal(result.body.evaluation.marketEvidence.status, 'FRESH');
  assert.equal(result.body.evaluation.decision, 'ESCALATE');
  assert.equal(result.body.evaluation.reasonCode, 'GUARDIAN_REVIEW_REQUIRED');
  assert.equal(result.body.proofs.solana.network, 'devnet');
  assert.equal(
    result.body.proofs.solana.programId,
    'ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk'
  );
  assert.equal(result.body.proofs.pyth.secretExposedToFrontend, false);
  assert.equal(result.body.truthBoundary.marketEvidenceCreatesAuthority, false);
  assert.equal(result.body.truthBoundary.realSecuritiesExecution, false);
});

test('live demo proof fails closed when live market evidence is unavailable', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.1/demo/live-proof',
    services: {
      marketEvidenceProvider: async () => ({
        source: 'PYTH_PRO',
        symbol: 'Equity.US.TSLA/USD',
        status: 'UNAVAILABLE',
        reasonCode: 'PYTH_NOT_ENTITLED'
      })
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.evaluation.decision, 'REFUSE');
  assert.equal(
    result.body.evaluation.reasonCode,
    'MARKET_EVIDENCE_UNAVAILABLE'
  );
  assert.equal(result.body.evaluation.marketEvidence.status, 'UNAVAILABLE');
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


test('v0.2 demo exposes frozen bounded-autonomy semantics', async () => {
  const result = await routeKeysHttp({
    method: 'GET',
    path: '/api/v0.2/demo/maya'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.contractVersion, '0.2');
  assert.equal(result.body.currentMandate.status, 'ACTIVE');
  assert.equal(result.body.truthBoundary.realMinorSecuritiesExecution, false);
  assert.equal(result.body.truthBoundary.onchainPythVerification, true);
});

test('v0.2 action endpoint allows an in-bounds action with backend-owned market evidence', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.2/actions/evaluate',
    body: {
      mandate: {
        status: 'ACTIVE',
        version: 4,
        nonce: 3,
        expiresAt: '2026-12-01T00:00:00Z'
      },
      assetRule: {
        enabled: true,
        asset: 'TSLA',
        allowedActions: ['BUY'],
        quoteUnit: 'USD',
        maxActionNotional: 250,
        maxPeriodNotional: 1000,
        spentThisPeriod: 0,
        requiresMarketEvidence: true,
        maxMarketAgeSeconds: 30,
        maxConfidenceBps: 100
      },
      action: {
        type: 'BUY',
        asset: 'TSLA',
        amount: 0.5,
        expectedNonce: 3
      },
      now: '2026-09-23T22:00:00Z'
    },
    services: {
      marketEvidenceProvider: async () => ({
        status: 'FRESH',
        price: 200,
        ageSeconds: 0,
        confidenceBps: 10
      })
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.decision, 'ALLOW');
  assert.equal(result.body.reasonCode, 'WITHIN_MANDATE');
  assert.equal(result.body.requestedNotional, 100);
  assert.equal(result.body.guardianApprovalRequired, false);
  assert.equal(result.body.runtimeProofStatus, 'CANONICAL_DEVNET_RUNTIME_PROVEN');
});

test('v0.2 action endpoint exposes the boundary instead of auto-escalating every action', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.2/actions/evaluate',
    body: {
      mandate: {
        status: 'ACTIVE',
        version: 4,
        nonce: 3
      },
      assetRule: {
        enabled: true,
        asset: 'TSLA',
        allowedActions: ['BUY'],
        quoteUnit: 'USD',
        maxActionNotional: 250,
        maxPeriodNotional: 1000,
        spentThisPeriod: 0,
        requiresMarketEvidence: true
      },
      action: {
        type: 'BUY',
        asset: 'TSLA',
        amount: 3,
        expectedNonce: 3
      }
    },
    services: {
      marketEvidenceProvider: async () => ({
        status: 'FRESH',
        price: 100,
        ageSeconds: 0,
        confidenceBps: 10
      })
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.decision, 'REFUSE');
  assert.equal(result.body.reasonCode, 'MANDATE_LIMIT_EXCEEDED');
  assert.equal(result.body.boundaryRequestAvailable, true);
});

test('v0.2 boundary request remains a pending human decision', async () => {
  const result = await routeKeysHttp({
    method: 'POST',
    path: '/api/v0.2/boundary-requests',
    body: {
      mandate: { version: 4, nonce: 3 },
      assetRule: { maxActionNotional: 250 },
      action: {
        type: 'BUY',
        asset: 'TSLA',
        amount: 3,
        notional: 300
      },
      reasoningCommitmentHash: 'hash-only-not-private-reasoning',
      condition: { maxPrice: 105 },
      now: '2026-09-23T22:00:00Z'
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'PENDING_HUMAN_DECISION');
  assert.deepEqual(
    result.body.decisions,
    ['ALLOW_ONCE', 'WIDEN_MANDATE', 'REFUSE']
  );
  assert.equal(result.body.mandateNonce, 3);
});
