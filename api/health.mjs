import { handleKeysVercelRequest } from '../src/vercel-adapter.mjs';

export const config = {
  maxDuration: 30
};

export default async function handler(req, res) {
  return handleKeysVercelRequest({
    req,
    res,
    path: '/health'
  });
}
