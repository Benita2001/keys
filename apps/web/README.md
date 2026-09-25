# Cresco web (`apps/web`)

Consumer frontend for Cresco, the family-facing experience on top of the KEYS bounded-autonomy backend in this repository.

> Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # typecheck + lint + test + build
npx playwright test  # WebKit iPhone e2e (needs @playwright/test + `npx playwright install webkit`)
```

Production uses the hosted KEYS v0.2 Cloudflare API by default. The hosted Worker only allows the production origin (CORS), so local dev goes through a same-origin relay in `next.config.ts` (`/keys-api/*` → `KEYS_API_UPSTREAM`):

```bash
cp .env.example .env.local   # NEXT_PUBLIC_KEYS_API_URL=/keys-api, NEXT_PUBLIC_KEYS_EXECUTION=runtime
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_KEYS_API_URL` | KEYS API base (`/keys-api` locally, hosted Worker URL in production) |
| `KEYS_API_UPSTREAM` | Relay target for `/keys-api` (server-side only) |
| `NEXT_PUBLIC_KEYS_EXECUTION` | `runtime` = in-bounds AAPL actions execute on Solana Devnet (demo tokens) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Optional embedded wallet (email/Google/Apple + Solana). Unset = hidden. Identity only, never Money authority |

Never put `PYTH_PRO_API_KEY`, signer material or any server secret in a `NEXT_PUBLIC_*` variable.

Or point the frontend at a local API:

```bash
(cd ../.. && npm install && npm run api)                          # 127.0.0.1:8787
echo "NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8787" > .env.local
```

### Execute integration (local simulated test server)

```bash
npm run mock:keys                                   # mock KEYS API on 127.0.0.1:8788
MOCK_EXECUTE_SCENARIO=pending-once npm run mock:keys # or: slow | error500-once | malformed
printf "NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8788\nNEXT_PUBLIC_KEYS_EXECUTION=runtime\n" >> .env.local
```

Mock proofs are `simulated: true` with `MOCK…` signatures and are labeled "Test run (simulated)" in the UI. Contract: `docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md` §3.3.

## Layout

| Path | What |
|---|---|
| `src/app` | Routes (child app in `(child)`, parent area in `parent/(dash)`, full-screen flows `lesson`, `invest`, `onboarding`, `start`) |
| `src/components` | Design-system components and SVG illustrations |
| `src/domain` | Types (KEYS contract vocabulary), policy preview, formatting |
| `src/services` | Service interfaces + hosted KEYS v0.2 HTTP adapter |
| `src/mocks` | Practice/sample data only; live evidence overlays are explicitly tagged |
| `src/state` | UI cache + local preferences; Family authority/state re-syncs from Cloudflare |

## Truth labels

- **Practice · Solana Devnet**: real market conditions, practice capital, no real financial value. Apple practice runs through the KEYS Devnet program (Key-enforced, real Devnet receipts); other companies and PreStocks/Tessera practice in a local sandbox labeled "not on-chain".
- **Money · Solana Mainnet**: real money, parent-supervised. **Setup required**: no Mainnet KEYS program, verified guardian account, execution route or USDC funding yet. Money never falls back to Devnet.
- Prices are samples unless tagged **Live · Pyth** (or **Delayed**). A live price never makes anything available in Money.

See [network architecture](../../docs/CRESCO-NETWORK-ARCHITECTURE.md).

Docs: [design system](../../docs/CRESCO-FRONTEND-DESIGN-SYSTEM.md) · [backend handoff](../../docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md) · [implementation summary](../../docs/CRESCO-FRONTEND-IMPLEMENTATION-SUMMARY.md)

Live demo: https://cresco-lac.vercel.app (standalone Vercel project `cresco`, deployed from `apps/web`; separate from the KEYS backend project).

Deploy as its own Vercel project with root directory `apps/web`. `next build` typechecks app code via `tsconfig.build.json`; tests (including the backend parity test, which needs the full repo) are typechecked by `npm run typecheck`.
