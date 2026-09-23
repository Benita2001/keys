import { readFile } from 'node:fs/promises';

import {
  FRONTEND_CONTRACT_VERSION,
  evaluateProposalForFrontend,
  mandateReviewForFrontend,
  transitionMandateForFrontend,
  executionEligibilityForFrontend
} from './frontend-api.mjs';

import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSnapshot
} from './pyth-adapter.mjs';

import {
  commitMandateTransitionForFrontend
} from './authority-runtime.mjs';

const mayaFixture = JSON.parse(
  await readFile(new URL('../fixtures/frontend-maya-contract.json', import.meta.url), 'utf8')
);

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8'
});

export const CANONICAL_DEVNET_PROGRAM_ID =
  'ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk';

export const CANONICAL_DEVNET_EXPLORER =
  `https://explorer.solana.com/address/${CANONICAL_DEVNET_PROGRAM_ID}?cluster=devnet`;

export const CANONICAL_DEVNET_PROOF_RUN =
  'https://github.com/Faadil1/keys/actions/runs/35905841296';

export const CANONICAL_PYTH_PROOF_RUN =
  'https://github.com/Faadil1/keys/actions/runs/35910460176';

async function defaultMarketEvidenceProvider({ asset, now }) {
  const feed = PYTH_PRO_EQUITY_FEEDS[asset];

  if (!feed) {
    return {
      source: 'PYTH_PRO',
      symbol: asset ?? null,
      status: 'UNAVAILABLE',
      reasonCode: 'PYTH_FEED_NOT_CONFIGURED',
      receivedAt: now
    };
  }

  return fetchPythProSnapshot({
    apiKey: process.env.PYTH_PRO_API_KEY,
    feed,
    receivedAt: now
  });
}

async function defaultEligibilityProvider() {
  return { status: 'UNKNOWN' };
}

function liveDemoAsset() {
  const requested = process.env.KEYS_DEMO_LIVE_EQUITY || 'TSLA';
  return PYTH_PRO_EQUITY_FEEDS[requested] ? requested : 'TSLA';
}

function buildMayaLiveScenario(asset) {
  return {
    beneficiary: { ...mayaFixture.beneficiary },
    charter: {
      expiresAt: null,
      assetUniverse: [asset],
      maxProposalNotional: 50,
      maxBoundedNotional: 25
    },
    mandate: {
      stage: mayaFixture.mandate.stage,
      version: mayaFixture.mandate.version,
      nonce: mayaFixture.mandate.nonce
    },
    proposal: {
      ...mayaFixture.proposal,
      id: `maya-${asset.toLowerCase()}-live-001`,
      asset,
      rationale: 'I want to study a company I can explain before any authority changes.',
      counterargument: 'A compelling company story can still be a poor investment at the wrong price.',
      invalidation: 'I would reconsider if the original business thesis materially changes.'
    }
  };
}

function publicProofEnvelope() {
  return {
    solana: {
      network: 'devnet',
      status: 'VERIFIED',
      programId: CANONICAL_DEVNET_PROGRAM_ID,
      explorerUrl: CANONICAL_DEVNET_EXPLORER,
      canonicalProofRun: CANONICAL_DEVNET_PROOF_RUN
    },
    pyth: {
      status: 'VERIFIED_LIVE_EQUITY',
      canonicalProofRun: CANONICAL_PYTH_PROOF_RUN,
      secretExposedToFrontend: false
    }
  };
}

function capabilitiesForServices(services = {}) {
  return {
    contractVersion: FRONTEND_CONTRACT_VERSION,
    mode: 'LOCAL_DEMO',
    marketEvidence: {
      status: services.marketEvidenceProvider
        ? 'PROVIDER_READY'
        : process.env.PYTH_PRO_API_KEY
          ? 'PYTH_CONFIGURED'
          : 'BLOCKED_API_KEY'
    },
    authorityCommit: {
      status: services.authorityTransitionProvider
        ? 'RUNTIME_READY'
        : 'RUNTIME_UNAVAILABLE'
    },
    executionEligibility: {
      status: services.eligibilityProvider
        ? 'PROVIDER_READY'
        : 'UNKNOWN_DEFAULT'
    },
    simulation: {
      status: 'AVAILABLE'
    }
  };
}

async function resolveBackendEvidence({ body, services }) {
  const now = body?.now ?? new Date().toISOString();
  const marketEvidenceProvider =
    services?.marketEvidenceProvider ?? defaultMarketEvidenceProvider;
  const eligibilityProvider =
    services?.eligibilityProvider ?? defaultEligibilityProvider;

  const market = await marketEvidenceProvider({
    asset: body?.proposal?.asset,
    proposal: body?.proposal,
    charter: body?.charter,
    mandate: body?.mandate,
    now
  });

  const eligibility = await eligibilityProvider({
    proposal: body?.proposal,
    charter: body?.charter,
    mandate: body?.mandate,
    now
  });

  return { now, market, eligibility };
}

export async function routeKeysHttp({
  method,
  path,
  body = null,
  services = {}
}) {
  if (method === 'OPTIONS') {
    return {
      status: 204,
      headers: JSON_HEADERS,
      body: null
    };
  }

  if (method === 'GET' && path === '/health') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: {
        ok: true,
        service: 'keys-backend',
        contractVersion: FRONTEND_CONTRACT_VERSION
      }
    };
  }

  if (method === 'GET' && path === '/api/v0.1/capabilities') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: capabilitiesForServices(services)
    };
  }

  if (method === 'GET' && path === '/api/v0.1/demo/maya') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: mayaFixture
    };
  }

  if (method === 'GET' && path === '/api/v0.1/demo/live-proof') {
    const asset = liveDemoAsset();
    const scenario = buildMayaLiveScenario(asset);
    const now = new Date().toISOString();
    const marketEvidenceProvider =
      services?.marketEvidenceProvider ?? defaultMarketEvidenceProvider;

    const market = await marketEvidenceProvider({
      asset,
      proposal: scenario.proposal,
      charter: scenario.charter,
      mandate: scenario.mandate,
      now
    });

    const evaluation = evaluateProposalForFrontend({
      charter: scenario.charter,
      mandate: scenario.mandate,
      proposal: scenario.proposal,
      market,
      eligibility: { status: 'UNKNOWN' },
      now
    });

    return {
      status: 200,
      headers: JSON_HEADERS,
      body: {
        contractVersion: FRONTEND_CONTRACT_VERSION,
        type: 'LIVE_DEMO_PROOF',
        mode: 'LIVE_BACKEND_EVIDENCE',
        beneficiary: scenario.beneficiary,
        scenario: {
          asset,
          proposal: scenario.proposal,
          mandate: scenario.mandate
        },
        evaluation,
        proofs: publicProofEnvelope(),
        truthBoundary: {
          marketEvidenceCreatesAuthority: false,
          executionEligibility: 'UNKNOWN',
          realSecuritiesExecution: false,
          liveEvidenceAsset: asset
        }
      }
    };
  }

  if (method === 'POST' && path === '/api/v0.1/proposals/evaluate') {
    const resolved = await resolveBackendEvidence({ body, services });

    return {
      status: 200,
      headers: JSON_HEADERS,
      body: evaluateProposalForFrontend({
        charter: body?.charter,
        mandate: body?.mandate,
        proposal: body?.proposal,
        market: resolved.market,
        eligibility: resolved.eligibility,
        now: resolved.now
      })
    };
  }

  if (
    method === 'POST' &&
    path === '/api/v0.1/simulations/proposals/evaluate'
  ) {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: {
        ...evaluateProposalForFrontend({
          charter: body?.charter,
          mandate: body?.mandate,
          proposal: body?.proposal,
          market: body?.market,
          eligibility: body?.eligibility ?? { status: 'UNKNOWN' },
          now: body?.now
        }),
        type: 'SIMULATION_PROPOSAL_EVALUATION',
        simulation: true
      }
    };
  }

  if (method === 'POST' && path === '/api/v0.1/mandates/review') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: mandateReviewForFrontend(body ?? {})
    };
  }

  if (
    method === 'POST' &&
    path === '/api/v0.1/mandates/transition/preview'
  ) {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: {
        ...transitionMandateForFrontend(body ?? {}),
        type: 'MANDATE_TRANSITION_PREVIEW',
        preview: true,
        authorityCommitted: false
      }
    };
  }

  if (method === 'POST' && path === '/api/v0.1/mandates/transition') {
    const result = await commitMandateTransitionForFrontend({
      request: body ?? {},
      authorityTransitionProvider: services?.authorityTransitionProvider
    });

    const unavailable = [
      'AUTHORITY_RUNTIME_UNAVAILABLE',
      'AUTHORITY_RUNTIME_ERROR'
    ].includes(result.reasonCode);

    return {
      status: unavailable ? 503 : 200,
      headers: JSON_HEADERS,
      body: result
    };
  }

  if (method === 'POST' && path === '/api/v0.1/execution/evaluate') {
    const resolved = await resolveBackendEvidence({ body, services });

    return {
      status: 200,
      headers: JSON_HEADERS,
      body: executionEligibilityForFrontend({
        charter: body?.charter,
        mandate: body?.mandate,
        proposal: body?.proposal,
        market: resolved.market,
        eligibility: resolved.eligibility,
        now: resolved.now
      })
    };
  }

  return {
    status: 404,
    headers: JSON_HEADERS,
    body: {
      error: 'NOT_FOUND',
      path
    }
  };
}
