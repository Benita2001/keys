# Cresco — Backend Integration Handoff

> **Network architecture correction (2026-09-25):** Practice = Solana Devnet (the proven KEYS lane, practice capital, no real value). Money = Solana Mainnet (real value, parent-supervised), **setup required**. The Devnet AAPL lane below is the **Practice** lane. See `docs/CRESCO-NETWORK-ARCHITECTURE.md`.

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

## Final ALLOW_ONCE Devnet proof

The final single-use authority lane is no longer pending. It is deployed and proven on the canonical KEYS Devnet program.

- upgrade run: `36079506597` — **PASS**;
- deployment signature: `54d7EgdAgk7TQz6a4ReH5FxdETLxHAzQeo6T3W9gbXrSMPNECMAyShfZuvdCxKVKL1oaAWNQodFTf5LVrNm7z8C8`;
- final bridge run: `36082140600` — **PASS**;
- grant signature: `574BuAQxEtMCgZ6PWhv9F681qqZBfioopNPqUzHKFSYjetR8gtTpTgEFBXwC8YxgMDYrr8WYznGSqVUr2CZFTEm5`;
- consumed execution: `5463is82CjnnTxAA6ZLFzyoAhQ9v1yLQvfYGqWfNoFKX6KodrnZLoREHaV6oA3Px7H3BX5Ms4uBKWcFEu5RukA8t`;
- second use: **REFUSE — `AllowanceAlreadyUsed`**.

This proof shows that ALLOW_ONCE is an exact, nonce-bound, single-use on-chain authorization rather than a UI exception.

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
| `GET /api/v0.2/integrations/tessera` | Live Tessera T-Token catalog; Learn/Practice; execution fail-closed |
| `GET /api/v0.2/integrations/tessera/:asset` | One Tessera representation by id/code/company |

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

## Tessera representation truth

The hosted backend now exposes live Tessera T-Token data for T-OpenAI, T-Kalshi and T-SpaceX. These are modeled as loan participation rights, not direct equity. The KEYS adapter defaults to `executionEligible=false`, `practiceAvailable=true`, and `authorityEffect=NONE`.

Hosted proof: `36112229684` — PASS.

This is a representation/learning integration. It does not extend the current AAPL Money execution lane.

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

`MY KEY → SOURCE-BACKED LEARN/PRACTICE → ALLOW → REFUSE → ASK FOR MORE ROOM → GUARDIAN ALLOW_ONCE → EXACT ALLOW → REPLAY REFUSE / AllowanceAlreadyUsed → RECEIPT`

Standing WIDEN remains supported, but the canonical judge path uses ALLOW_ONCE because it proves a precise exception without silently expanding standing authority.

The hero remains the young person’s understandable freedom. Solana/Pyth/Cloudflare are proof layers, not the homepage story.

## Frontend integration matrix (2026-09-25)

All calls go through the single adapter `apps/web/src/services/keys-backend.ts`. Pages never call `fetch()` directly. Local dev uses the same-origin relay `/keys-api/*` → `KEYS_API_UPSTREAM` (`next.config.ts`) because Worker CORS only allows `https://cresco-lac.vercel.app`.

| Surface | Source of truth | Route(s) | Status |
|---|---|---|---|
| Session bootstrap | Worker demo session (role-scoped bearer) | `POST /auth/demo-session` (auto-renew once on 401) | BACKEND |
| Family state (balance, holdings, requests, activity, learning, reservations) | Family Durable Object | `GET /family/state` (poll 15s visible, focus, after every mutation) | BACKEND |
| Current Mandate (limits, status, version/nonce) | DO + Devnet mandate/asset rule | `GET /family/state` + `GET /demo/runtime` (chain spend, ≤1 read / 2 min unless a mutation just happened) | BACKEND |
| Money gating | Sync status | UI waits for first sync; fails closed on `error`, `PAUSED`, missing parent link | BACKEND |
| Evaluate | Server | `POST /actions/evaluate` (micro-USD normalized to dollars) | BACKEND |
| Execute (AAPL only) | Solana Devnet via Worker | `POST /actions/execute` with `idempotency-key`; 5xx/429/upstream-400 → UNKNOWN, re-check reuses the key | BACKEND · DEVNET |
| Receipts / proof drawer | DO `activity` MONEY_EXECUTION | from `/family/state` | BACKEND · DEVNET |
| Boundary request (child) | DO | `POST /boundary-requests` | BACKEND |
| Guardian decision ALLOW_ONCE / WIDEN / REFUSE | DO + Devnet | `POST /boundary-requests/{id}/decision` (60s chain-write timeout; `*_PENDING_CHAIN` shown as "Finishing on Solana…") | BACKEND · DEVNET |
| Limits change / pause | Devnet mandate transition | `POST /mandates/transition` then refresh | BACKEND · DEVNET |
| Add test money | DO ledger (`realPaymentTaken: false`) | `POST /funding/deposits` then refresh | BACKEND (Devnet test credit) |
| Learning progress | DO (authorityEffect NONE) | `POST /learning/progress` then refresh | BACKEND |
| Explore quotes | Pyth Pro | `GET /market/quotes` FRESH→"Live · Pyth", STALE→"Delayed", UNAVAILABLE→"Sample" (never $0) | BACKEND (AAPL, TSLA live) |
| Explore discovery | Pyth Pro | `GET /market/discovery` (equity FRESH overlays NVDA/MSFT; crypto/FX/metals/commodities shown as "Explore how markets move") | BACKEND |
| Company history chart | Pyth Pro history | `GET /market/series` → "Pyth history" or "Sample chart" | BACKEND (AAPL, TSLA) |
| Private companies | PreStocks, Tessera | `GET /integrations/prestocks`, `GET /integrations/tessera` → Learn/Practice only, never Money | BACKEND |
| Practice portfolio | Browser (virtual money) | local reducer; valued with the same live/sample prices | LOCAL (by design) |
| Embedded wallet | Privy (env-gated `NEXT_PUBLIC_PRIVY_APP_ID`) | email/Google/Apple + Solana embedded wallet; identity only, **never** KEYS authority | FRONTEND · needs Privy app ID |

Remaining SAMPLE data: prices for the 6 companies without a configured or discoverable Pyth price (AMZN, NFLX, META, MCD, SPY, QQQ), their charts, and day change for discovery-only equities (shown without a change figure rather than a fake one).

## Backend issues found during integration (for the KEYS owner)

1. **Solana RPC rate limits break execute.** The Worker's public Devnet RPC (OnFinality) returns `429 Too Many Requests`; the Worker surfaces it as `400 BAD_REQUEST` (`failed to get info about account … 429`). Use a dedicated RPC key (Helius/Triton/QuickNode) plus retry with backoff. Frontend treats these as UNKNOWN, never as a refusal.
2. **Orphaned reservations.** `handleExecute` calls `/reserve` and then `provider.execute`; if execute throws (e.g. the 429 above), `/finalize` never runs. The key then replays `EXECUTION_PENDING` forever and its notional stays held against balance and period. Fix: wrap `provider.execute` in try/catch and call `/finalize` with `success:false` (or add `/release`) when the chain call fails before a transaction was sent; add a TTL sweep for stale reservations. Two orphaned $5 reservations exist in the shared demo family from 2026-09-25 (keys `8eb43413-5fae-4f82-a804-8b26d55bda57` and one more); on-chain spend confirms neither executed. The frontend subtracts held reservations from available balance/period and offers "Stop waiting and start over" after 2 minutes.
3. **Stuck guardian decision.** Request `br_b1275d09-84ac-4bea-87e9-bedfb8b4b718` is in `WIDEN_PENDING_CHAIN` although the widen landed on-chain (Mandate v6 / nonce 5, max period $100). Needs a reconcile path (`complete-widen` retry or a sweep that reads the chain).
4. **Ledger vs chain period spend.** DO ledger says $15 spent; the Devnet asset rule says $52.997 (30-day rolling window started 2026-09-24 17:35 UTC). The frontend shows `max(ledger + held, chain)` so it never offers room the chain will refuse. Please expose `periodStartedAt` / `periodSeconds` in `/demo/runtime` and reconcile the ledger from chain.
5. **Shared demo state was changed during QA:** guardian widened the period limit from $50 to $100 through the UI (committed on Devnet).

## Network correction status (2026-09-25)

Items 1–4 in the list above are **fixed in code** on `feat/cresco-devnet-practice-mainnet-money` (see the reliability table in `docs/CRESCO-NETWORK-ARCHITECTURE.md`, 10 new backend tests). They go live when the Worker is redeployed; item 1 also needs a dedicated Devnet RPC secret:

```bash
npx wrangler secret put SOLANA_DEVNET_RPC_URL            # e.g. an authenticated Helius/Triton/QuickNode Devnet URL
npx wrangler secret put SOLANA_DEVNET_RPC_FALLBACK_URLS  # optional, comma-separated
```

`/family/state` now also returns explicit namespaces:

- `practice`: `{ mode: "practice", network: "solana-devnet", realValue: false, programId, capital: "DEMO_TOKEN", balance, availableBalance, holdings, activity, period }`
- `money`: `{ network: "solana-mainnet", realValue: true, status: "SETUP_REQUIRED", balance: null, requirements }`

The historical `balances.money` / `moneyHoldings` / `MONEY_EXECUTION` storage names hold **Devnet practice capital**; new records are tagged `mode: "practice", network: "solana-devnet", realValue: false`. Nothing Mainnet is stored in the Durable Object.

Observed 2026-09-25: CI smoke runs execute on the shared Devnet Mandate without going through the Family ledger (e.g. 13:27–14:55 UTC), and the Key was later narrowed to a $50 period (v7). The chain-authoritative period rule keeps the UI truthful through both.

Live proof from the Cresco UI (2026-09-25, Practice on Devnet):

- boundary refusal: `$5 AAPL` → `PERIOD_LIMIT_EXCEEDED` (Key v7, period used on-chain);
- request `br_ea50b50f-4160-4aea-8edc-6b10c4b46f68` → guardian **ALLOW_ONCE**; grant `4TFtKrEKmBQeFTnmmaRnYd4ykimsbQjq2CBBMFhEYFFspobCUhQkstbgV1cvrj4eBgWpyX5F4C5uQcEBR5UtTRsp`, receipt `HLBPr57qA3rbNgsMDv54aijNgcYcxPd6Z1E8HNYZPg6n`;
- one execution `H4cXXyFtE9Ug5LL9eZjsdLP6V1bbm8b2qm8ozLrKbYh1LTqAo4THkC5AwKxnEsqAefw5epatDvBkyXZ1HhPFvgi` (`ExecuteOnceWithPyth`, slot 504044487, Pyth feed 922 at $337.45), standing Key unchanged (v7);
- reuse with the same allowance → **REFUSE / AllowanceAlreadyUsed**; receipt account `used = true` on-chain.
