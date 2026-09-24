import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // App code only. Tests (including the parity test that imports the root
    // backend module) are typechecked by `npm run typecheck`, which runs with
    // the full repository present. Standalone deploys upload only apps/web.
    tsconfigPath: "tsconfig.build.json",
  },
};

export default nextConfig;
