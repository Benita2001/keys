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

  if (method === 'GET' && path === '/api/v0.1/demo/maya') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: mayaFixture
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
