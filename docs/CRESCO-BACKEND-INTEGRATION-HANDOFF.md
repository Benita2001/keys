# Cresco — Backend Integration Handoff

Audience: Benita + KEYS backend owner.  
Updated: 2026-09-24.  
Contract: **v0.2 FROZEN** — `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`.

## Current integration truth

The Cresco Family journey is now connected to the hosted KEYS backend for the hackathon demo. The browser is **not** the authority source.

```text
Cresco web
   │
   ├── role-scoped demo session
   ├── shared Family state
   ├── boundary requests
   ├── test funding / learning / portfolio
   │
Cloudflare Worker
   │
   ├── FamilyState Durable Object (SQLite)
   │      ├── serialized reservations
   │      ├── balances / period spend
   │      ├── requests + ALLOW_ONCE consumption
   │      ├── learning + portfolio
   │      └── child / guardian demo sessions
   │
   ├── server-owned Mandate evaluation
   ├── Pyth Pro market truth
   └── Solana Devnet execution
          └── KEYS program ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk
```

**Money Mode truth:** the proven AAPL lane executes bounded capital actions on **Solana Devnet using a demo SPL token**, with live Pyth market truth. This is not brokerage, custody, xStocks settlement, real share ownership, fiat funding, mainnet, or live minor securities execution.

## Implemented routes

| Route | Current role |
|---|---|
| `POST /api/v0.2/auth/demo-session` | Issues temporary child/guardian demo session token |
| `POST /api/v0.2/family/link` | Links demo Family context; child session required |
| `GET /api/v0.2/family/state` | Shared Family state; family session required |
| `GET /api/v0.2/mandates/current` | Reads current on-chain/server Mandate |
| `POST /api/v0.2/mandates/transition` | On-chain limits/status change; guardian session required |
| `POST /api/v0.2/actions/evaluate` | Server-owned bounded evaluation; child session required |
| `POST /api/v0.2/actions/execute` | Durable reservation → Devnet execution → proof; child session required |
| `POST /api/v0.2/boundary-requests` | Persists child request |
| `GET /api/v0.2/boundary-requests` | Shared request queue |
| `POST /api/v0.2/boundary-requests/:id/decision` | ALLOW_ONCE / WIDEN / REFUSE; guardian required |
| `POST /api/v0.2/funding/deposits` | **Devnet/test credit only**; guardian required |
| `GET /api/v0.2/balances` | Shared test balance |
| `POST /api/v0.2/learning/progress` | Persists learning; authority effect = NONE |
| `GET /api/v0.2/learning/summary` | Shared progress/minutes |
| `GET /api/v0.2/portfolio?mode=money` | Persisted Money holdings/activity |
| `GET /api/v0.2/market/quotes?symbols=...` | Pyth quote surface; only FRESH evidence is live |
| `GET /api/v0.2/market/series?... ` | Authenticated Pyth Pro History for configured entitled feeds; fail-closed otherwise |
| `POST /api/v0.2/proofs/concurrency` | Guardian-only no-trade hosted proof of shared Durable Object reservation serialization |
| `GET /api/v0.2/integrations/prestocks` | Live PreStocks catalog, fail-closed for execution eligibility |
| `GET /api/v0.2/integrations/prestocks/:symbol` | One PreStocks representation |

Production backend:
`https://keys-api-stocklana.faadil-casecraft.workers.dev`

CORS origin:
`https://cresco-lac.vercel.app`

## Authority and concurrency guarantees

1. The client no longer submits a Mandate or AssetRule as authority. It submits the intended action plus an expected nonce for freshness.
2. Current authority is loaded from the server/on-chain runtime.
3. Guardian-only mutations require a role-scoped backend demo session.
4. Durable Object reservations serialize family-wide balance/period checks across tabs/devices.
5. Every execution intent uses an idempotency key.
6. `ALLOW_ONCE` is bound to the **exact request id**, asset, approved amount ceiling and Mandate nonce, and is consumed after successful use.
7. Widen/pause/resume are on-chain transitions and advance Mandate version/nonce where the Solana program requires it.
8. Pyth may stop/restrict execution. It never widens authority.
9. Learning/XP never enters a Mandate-changing path.

## Market-data truth

The 10-symbol UI universe has an API surface. This does **not** mean 10 live feeds are claimed.

- A symbol is labeled live only when the backend returns Pyth `FRESH`.
- A configured but stale feed is labeled delayed.
- A missing/unentitled feed returns `UNAVAILABLE`; it is never converted to zero and never falsely labeled live.
- Frontend sample data remains visibly sample when live evidence is unavailable.
- AAPL historical chart data is now served from Pyth Pro History when entitled; unavailable/unconfigured history still falls back to clearly labeled sample data.

AAPL is the current proven Money/Pyth execution asset. TSLA remains valid historical proof.

## Frontend wiring

`apps/web/src/services/keys-backend.ts` is the HTTP boundary. In production it falls back to the hosted Cloudflare API, so the deployment does not depend on exposing backend secrets in Vercel.

`apps/web/src/state/store.tsx` is now a UI cache, not the authority source. When a backend session exists, shared Family state is re-synced from Cloudflare.

The UI already supports:
- confirmed Devnet transaction proof + Solana Explorer link;
- pending/unknown execution states without false success;
- boundary request / guardian decision flow;
- pause/resume and limits;
- 7/30-day parent view;
- synced lesson-minute bars;
- Practice/Money arrow-key navigation.

## QA / fail-closed behavior

- Node/API tests lock session authorization, market truth, Durable Object reservations and authority semantics.
- Web unit/integration tests cover runtime execution, idempotency, pending/unknown outcomes and UI truth labels.
- WebKit iPhone QA is part of the web workflow and checks core routes for horizontal overflow plus keyboard mode switching.
- Network/runtime failure never becomes ALLOW.
- A malformed or unconfirmed execution response is never displayed as a confirmed purchase.

## Deliberately outside the hackathon demo

These are **not bugs or unfinished demo requirements** and must not be faked:

- production authentication / identity verification / KYC;
- embedded user wallet or production key management;
- real card/bank deposit provider;
- brokerage, custody, real securities execution or mainnet settlement;
- live Pyth entitlement/feed mapping for every UI symbol;
- broader live/history entitlement coverage for every UI symbol;
- legal minor-account/compliance rollout by jurisdiction.

They belong to a production architecture pass after the hackathon.

## Benita integration rule

Do not rebuild these backend mechanics in the frontend. Keep the judge-facing order:

`MY KEY → LEARN/PRACTICE → ALLOW → REFUSE → MARKET CHANGE → ASK FOR MORE ROOM → HUMAN WIDEN → ALLOW → STALE REFUSE`

The hero remains the young person’s understandable freedom. Solana/Pyth/Cloudflare are proof layers, not the homepage story.
