# Cresco web (`apps/web`)

Consumer frontend for Cresco, the family-facing experience on top of the KEYS bounded-autonomy backend in this repository.

> Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # typecheck + lint + test + build
```

Optional: get Money Mode decisions from the real KEYS draft API.

```bash
(cd ../.. && npm install && npm run api)                          # 127.0.0.1:8787
echo "NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8787" > .env.local
```

## Layout

| Path | What |
|---|---|
| `src/app` | Routes (child app in `(child)`, parent area in `parent/(dash)`, full-screen flows `lesson`, `invest`, `onboarding`, `start`) |
| `src/components` | Design-system components and SVG illustrations |
| `src/domain` | Types (KEYS contract vocabulary), policy preview, formatting |
| `src/services` | Service interfaces, demo implementations, KEYS HTTP adapter |
| `src/mocks` | The only place sample prices and demo family data live |
| `src/state` | Local demo session store (localStorage) |

## Truth labels

Prices are samples unless tagged **Live · Pyth**. Money Mode is a demo: no funding, custody or on-chain execution happens from this app, and every Money balance says **Demo money**.

Docs: [design system](../../docs/CRESCO-FRONTEND-DESIGN-SYSTEM.md) · [backend handoff](../../docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md) · [implementation summary](../../docs/CRESCO-FRONTEND-IMPLEMENTATION-SUMMARY.md)

Deploy as its own Vercel project with root directory `apps/web`.
