# KEYS — Benita Frontend Handoff

Date: 2026-09-24  
Status: **V0.2 FROZEN / ALL CURRENT HACKATHON TECHNICAL GATES PASS**

## Ownership

Benita owns the judge-facing frontend, interaction/visual system, responsive behavior and final frontend hosting. Faadil owns KEYS backend/Solana/Pyth proof maintenance and integration support.

The core product remains:

> **Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.**

Inside the current Mandate, the young person acts without per-action guardian approval. Outside it, KEYS refuses or offers a boundary request. Only an authorized guardian transition can widen standing authority.

## Important change from the earlier handoff

The broader Family Money path is **no longer browser-only**.

The current hackathon implementation now has:

- Cloudflare-hosted KEYS API;
- role-scoped child/guardian demo sessions;
- shared Family state via Durable Object/SQLite;
- server/on-chain Mandate as the authority source;
- persistent boundary requests and guardian decisions;
- exact single-use `ALLOW_ONCE`, deployed and proven on Solana Devnet;
- durable family-wide reservation/idempotency protection;
- guardian test funding;
- persisted learning and Money portfolio;
- current Mandate read + on-chain limits/status transitions;
- AAPL Money execution through the KEYS Solana Devnet program;
- confirmed Devnet transaction proof surfaced to the UI;
- Pyth market quote API with explicit FRESH/STALE/UNAVAILABLE truth;
- automated iPhone/WebKit QA.

Production backend:

`https://keys-api-stocklana.faadil-casecraft.workers.dev`

Frontend:

`https://cresco-lac.vercel.app`

## Runtime truth

Current proof lane:

- network: **Solana Devnet**;
- KEYS program: `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`;
- capital asset: **demo SPL token**;
- current proof equity: **AAPL**;
- Pyth feed: `Equity.US.AAPL/USD`, id `922`;
- Pyth verification: on-chain Pyth Lazer;
- signer model: server-held **Devnet demo signer**.

Final ALLOW_ONCE proof: **PASS**
- program upgrade run: `36079506597`;
- deployed slot: `503748084`;
- final bridge run: `36082140600`;
- grant signature: `574BuAQxEtMCgZ6PWhv9F681qqZBfioopNPqUzHKFSYjetR8gtTpTgEFBXwC8YxgMDYrr8WYznGSqVUr2CZFTEm5`;
- execution signature: `5463is82CjnnTxAA6ZLFzyoAhQ9v1yLQvfYGqWfNoFKX6KodrnZLoREHaV6oA3Px7H3BX5Ms4uBKWcFEu5RukA8t`;
- reuse: **REFUSE — AllowanceAlreadyUsed**.

This is test capital. It is **not** brokerage, custody, fiat funding, xStocks settlement, conventional-share ownership, mainnet, KYC, or real minor securities execution.

## Product routes Benita may rely on

Core Family/runtime:

- `POST /api/v0.2/auth/demo-session`
- `POST /api/v0.2/family/link`
- `GET /api/v0.2/family/state`
- `GET /api/v0.2/mandates/current`
- `POST /api/v0.2/mandates/transition`
- `POST /api/v0.2/actions/evaluate`
- `POST /api/v0.2/actions/execute`
- `POST /api/v0.2/boundary-requests`
- `GET /api/v0.2/boundary-requests`
- `POST /api/v0.2/boundary-requests/:id/decision`
- `POST /api/v0.2/funding/deposits`
- `GET /api/v0.2/balances`
- `POST /api/v0.2/learning/progress`
- `GET /api/v0.2/learning/summary`
- `GET /api/v0.2/portfolio?mode=money`
- `GET /api/v0.2/market/quotes?symbols=...`
- `GET /api/v0.2/market/series?symbol=...&period=...`

Proof/bootstrap compatibility:

- `GET /api/v0.2/demo/maya`
- `GET /api/v0.2/demo/runtime`

Sponsor extensions:

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`
- `GET /api/v0.2/integrations/tessera`
- `GET /api/v0.2/integrations/tessera/:asset`

The semantic contract remains frozen in `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`.

## What the frontend must not do

- do not send a client Mandate/AssetRule and treat it as authority;
- do not simulate guardian widening as committed unless the backend returns the transition/proof;
- do not label an unavailable Pyth symbol as live;
- do not show an unconfirmed/unknown execution as success;
- do not let learning, XP, P&L or AI scoring change limits;
- do not make sponsor integrations the homepage story;
- do not turn the parent dashboard into a surveillance feed.

## Market-data rule

The 10-company Explore universe may contain a mix of live and sample values.

- `FRESH` Pyth → **Live · Pyth**
- `STALE` → delayed
- `UNAVAILABLE` → retain clearly labeled sample value
- AAPL history now comes from authenticated Pyth Pro History when entitled; unavailable/unconfigured history may remain clearly labeled sample fallback.

AAPL is the current proven Money/Pyth lane. TSLA remains historical valid proof.

## Judge-facing order

1. **My Key** — current freedom/bounds.
2. **Learn / Practice** — contextual, short, age-respectful.
3. **In-bounds action** — immediate, no guardian approval.
4. **Boundary refusal**.
5. **Pyth market condition / evidence**.
6. **Ask for more room**.
7. **Guardian decision** — allow once / widen / refuse.
8. **Same action after widen** — success.
9. **Stale authorization** — old nonce refuses.
10. **Proof drawer / receipt** — Devnet signature, program, version/nonce, Pyth evidence.

The hero is the child’s understandable freedom. Solana and Pyth prove it; they should not dominate the first screen.

## Production-only items — do not block the hackathon

These are intentionally deferred and must not be faked:

- production authentication / identity verification / KYC;
- embedded production wallet/key-management model;
- real bank/card deposit rails;
- brokerage/custody/real-security execution/mainnet;
- live feed entitlement + historical provider for every Explore symbol;
- jurisdiction-specific minor-account compliance.

For the current Stocklana submission, the Family Devnet/test-money path is the correct truthful implementation.


## Tessera frontend rule

Tessera is now an active sponsor integration and is live through the KEYS Cloudflare backend.

In Cresco it belongs in **Learn / Practice / representation understanding**, not in the current Money execution lane.

Required labels/invariants:
- “Loan participation right · not direct equity”;
- eligibility is not inferred from wallet possession;
- `executionEligible=false` by default;
- `authorityEffect=NONE`;
- do not imply shareholder, voting, dividend or cap-table rights;
- do not make Tessera the homepage hero or a sponsor dashboard.

The Explore surface may show live T-OpenAI, T-Kalshi and T-SpaceX representation cards as secondary learning context. AAPL remains the current proven Money execution asset.


## Multi-market exploration rule

Benita's broader-market exploration request is now implemented through the KEYS Pyth Market Discovery layer.

Route:
- `GET /api/v0.2/market/discovery`

Current **live/proven** classes:
- Stocks & ETFs — AAPL, NVDA, MSFT sample from current entitlement;
- Crypto — BTC, ETH, SOL;
- FX — EUR/USD, USD/JPY, GBP/USD;
- Metals — Gold/XAU, Silver/XAG, Aluminium 3M;
- Commodities / Energy — current entitled Brent future(s).

Rates are not currently proven and must not be labeled live.

Frontend rule:
- AAPL = **Primary Money proof**;
- every other discovered market = **Learn / Practice**;
- “Live · Pyth” means the hosted backend actually verified current entitlement;
- feed entitlement never implies Money eligibility;
- do not add Buy/Money affordances to non-AAPL discovery feeds.

The Explore page now surfaces these market classes above the original company universe.

Canonical proof: `36115570744`  
Hosted proof: `36115973480`  
Web: `36115749327`  
WebKit/iPhone: `36115749387`.
