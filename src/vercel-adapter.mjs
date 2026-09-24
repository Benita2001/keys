import { routeKeysHttp } from './http-api.mjs';

const DEFAULT_CORS_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? 'https://cresco-lac.vercel.app'
    : '*';

async function readRequestBody(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req?.method)) return null;

  if (req.body != null) {
    if (typeof req.body === 'string') {
      return req.body.length ? JSON.parse(req.body) : null;
    }
    if (Buffer.isBuffer(req.body)) {
      const text = req.body.toString('utf8');
      return text.length ? JSON.parse(text) : null;
    }
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function setResponseHeaders(res, headers = {}) {
  const corsOrigin = process.env.KEYS_CORS_ORIGIN || DEFAULT_CORS_ORIGIN;
  res.setHeader('access-control-allow-origin', corsOrigin);
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'access-control-allow-headers',
    'content-type,idempotency-key'
  );

  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
}

export function vercelApiPathFromQuery(query = {}) {
  const raw = query.path;
  const parts = Array.isArray(raw)
    ? raw
    : raw == null
      ? []
      : String(raw).split('/');

  return '/api/' + parts.filter(Boolean).join('/');
}

export async function handleKeysVercelRequest({
  req,
  res,
  path,
  services = {}
}) {
  try {
    const body = await readRequestBody(req);
    const result = await routeKeysHttp({
      method: req.method,
      path,
      body,
      services
    });

    setResponseHeaders(res, result.headers);
    res.statusCode = result.status;

    if (result.body == null) {
      res.end();
      return;
    }

    res.end(JSON.stringify(result.body));
  } catch (error) {
    setResponseHeaders(res, {
      'content-type': 'application/json; charset=utf-8'
    });
    res.statusCode = 400;
    res.end(JSON.stringify({
      error: 'BAD_REQUEST',
      message: error?.message ?? 'Invalid request'
    }));
  }
}
