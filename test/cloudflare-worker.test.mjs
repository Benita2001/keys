import test from 'node:test';
import assert from 'node:assert/strict';

import { handleKeysCloudflareRequest } from '../src/cloudflare-worker.mjs';

test('Cloudflare adapter serves KEYS health at root with Cresco CORS', async () => {
  const response = await handleKeysCloudflareRequest(
    new Request('https://keys-api-stocklana.example/', {
      headers: {
        Origin: 'https://cresco-lac.vercel.app'
      }
    }),
    {
      KEYS_CORS_ORIGIN: 'https://cresco-lac.vercel.app'
    }
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://cresco-lac.vercel.app'
  );

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'keys-backend');
  assert.equal(body.contractVersion, '0.2');
});

test('Cloudflare adapter handles CORS preflight without touching runtime secrets', async () => {
  const response = await handleKeysCloudflareRequest(
    new Request('https://keys-api-stocklana.example/api/v0.2/actions/execute', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://cresco-lac.vercel.app'
      }
    }),
    {
      KEYS_CORS_ORIGIN: 'https://cresco-lac.vercel.app'
    }
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get('access-control-allow-methods'),
    'GET,POST,OPTIONS'
  );
});
