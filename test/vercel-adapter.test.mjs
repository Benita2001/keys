import test from 'node:test';
import assert from 'node:assert/strict';

import {
  handleKeysVercelRequest,
  vercelApiPathFromQuery
} from '../src/vercel-adapter.mjs';

function responseRecorder() {
  const headers = {};
  return {
    statusCode: null,
    payload: null,
    headers,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end(value = '') {
      this.payload = value;
    }
  };
}

test('Vercel catch-all reconstructs KEYS API paths', () => {
  assert.equal(
    vercelApiPathFromQuery({ path: ['v0.1', 'demo', 'live-proof'] }),
    '/api/v0.1/demo/live-proof'
  );
  assert.equal(
    vercelApiPathFromQuery({ path: 'v0.1/capabilities' }),
    '/api/v0.1/capabilities'
  );
});

test('Vercel adapter preserves deterministic frontend route and CORS', async () => {
  const req = {
    method: 'GET',
    body: null
  };
  const res = responseRecorder();

  await handleKeysVercelRequest({
    req,
    res,
    path: '/api/v0.1/demo/maya'
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['access-control-allow-origin'], '*');

  const body = JSON.parse(res.payload);
  assert.equal(body.beneficiary.displayName, 'Maya');
  assert.equal(body.mandate.stage, 'PROPOSE');
});

test('Vercel adapter exposes health without secrets', async () => {
  const req = {
    method: 'GET',
    body: null
  };
  const res = responseRecorder();

  await handleKeysVercelRequest({
    req,
    res,
    path: '/health'
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.ok, true);
  assert.equal(body.service, 'keys-backend');
});
