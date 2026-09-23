import { readFile } from 'node:fs/promises';

import {
  FRONTEND_CONTRACT_VERSION,
  evaluateProposalForFrontend,
  mandateReviewForFrontend,
  transitionMandateForFrontend,
  executionEligibilityForFrontend
} from './frontend-api.mjs';

const mayaFixture = JSON.parse(
  await readFile(new URL('../fixtures/frontend-maya-contract.json', import.meta.url), 'utf8')
);

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8'
});

export async function routeKeysHttp({ method, path, body = null }) {
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
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: evaluateProposalForFrontend(body ?? {})
    };
  }

  if (method === 'POST' && path === '/api/v0.1/mandates/review') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: mandateReviewForFrontend(body ?? {})
    };
  }

  if (method === 'POST' && path === '/api/v0.1/mandates/transition') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: transitionMandateForFrontend(body ?? {})
    };
  }

  if (method === 'POST' && path === '/api/v0.1/execution/evaluate') {
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: executionEligibilityForFrontend(body ?? {})
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
