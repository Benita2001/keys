import http from 'node:http';
import { routeKeysHttp } from '../src/http-api.mjs';

const host = process.env.KEYS_API_HOST || '127.0.0.1';
const port = Number(process.env.KEYS_API_PORT || 8787);
const corsOrigin = process.env.KEYS_CORS_ORIGIN || '*';

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  try {
    const body = req.method === 'POST' ? await readJson(req) : null;
    const result = await routeKeysHttp({
      method: req.method,
      path: new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname,
      body
    });

    res.statusCode = result.status;
    res.setHeader('access-control-allow-origin', corsOrigin);
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');

    for (const [name, value] of Object.entries(result.headers ?? {})) {
      res.setHeader(name, value);
    }

    if (result.body == null) {
      res.end();
      return;
    }

    res.end(JSON.stringify(result.body));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('access-control-allow-origin', corsOrigin);
    res.end(JSON.stringify({
      error: 'BAD_REQUEST',
      message: error?.message ?? 'Invalid request'
    }));
  }
});

server.listen(port, host, () => {
  console.log(`KEYS_API=http://${host}:${port}`);
  console.log('KEYS_API_MODE=LOCAL_DEMO_ONLY');
});
