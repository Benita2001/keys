import { routeKeysHttp } from './http-api.mjs';
import { handleFamilyApi } from './cloudflare-family-api.mjs';
import { FamilyState } from './cloudflare-family-state.mjs';
export { FamilyState };

const DEFAULT_CRESCO_ORIGIN = 'https://cresco-lac.vercel.app';

function allowedOrigin(request, env = {}) {
  const configured =
    env.KEYS_CORS_ORIGIN ||
    process.env.KEYS_CORS_ORIGIN ||
    DEFAULT_CRESCO_ORIGIN;
  const origin = request.headers.get('origin');

  if (!origin) return configured;
  return origin === configured ? origin : configured;
}

function withCors(headers, request, env) {
  const next = new Headers(headers ?? {});
  next.set('access-control-allow-origin', allowedOrigin(request, env));
  next.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  next.set(
    'access-control-allow-headers',
    'content-type,idempotency-key'
  );
  next.set('vary', 'Origin');
  return next;
}

async function readJsonBody(request) {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) return null;

  const text = await request.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function handleKeysCloudflareRequest(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname === '/' ? '/health' : url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: withCors({}, request, env)
    });
  }

  try {
    const familyResponse = await handleFamilyApi(request, env);
    if (familyResponse) {
      return new Response(await familyResponse.text(), {
        status: familyResponse.status,
        headers: withCors(familyResponse.headers, request, env)
      });
    }

    const body = await readJsonBody(request);
    const result = await routeKeysHttp({
      method: request.method,
      path,
      body
    });

    return new Response(
      result.body == null ? null : JSON.stringify(result.body),
      {
        status: result.status,
        headers: withCors(result.headers, request, env)
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'BAD_REQUEST',
        message: error?.message ?? 'Invalid request'
      }),
      {
        status: 400,
        headers: withCors(
          { 'content-type': 'application/json; charset=utf-8' },
          request,
          env
        )
      }
    );
  }
}

export default {
  async fetch(request, env) {
    return handleKeysCloudflareRequest(request, env);
  }
};
