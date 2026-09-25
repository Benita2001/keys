import type { NextConfig } from "next";

/**
 * Same-origin relay to the hosted KEYS API.
 *
 * The KEYS Worker only allows CORS from the production origin
 * (https://cresco-lac.vercel.app). Local dev and Vercel preview URLs set
 * NEXT_PUBLIC_KEYS_API_URL=/keys-api so the browser calls this origin and Next
 * forwards server-side. Headers (Authorization, Idempotency-Key) pass through
 * unchanged; no secrets are added here.
 */
const KEYS_API_UPSTREAM = (process.env.KEYS_API_UPSTREAM || "https://keys-api-stocklana.faadil-casecraft.workers.dev").replace(/\/$/, "");

const nextConfig: NextConfig = {
  typescript: {
    // App code only. Tests (including the parity test that imports the root
    // backend module) are typechecked by `npm run typecheck`, which runs with
    // the full repository present. Standalone deploys upload only apps/web.
    tsconfigPath: "tsconfig.build.json",
  },
  async rewrites() {
    return [{ source: "/keys-api/:path*", destination: `${KEYS_API_UPSTREAM}/:path*` }];
  },
};

export default nextConfig;
