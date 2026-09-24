# Benita — Frontend Start Here

Date: 2026-09-24  
Status: **V0.2 FROZEN / DEVNET FAMILY INTEGRATION READY**

KEYS Family is bounded autonomy:

> **Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.**

## Start from these truths

- the guardian defines the boundary;
- the young person acts freely inside it;
- out-of-bounds actions refuse or create a request;
- only a guardian can widen standing authority;
- Pyth can restrict/stop, never expand authority;
- learning/XP/P&L never expand authority.

## Backend is now connected

Production API:

`https://keys-api-stocklana.faadil-casecraft.workers.dev`

Cresco production fallback already points to it.

Use `apps/web/src/services/keys-backend.ts`; do not create parallel fetch logic.

The Family demo now supports backend sessions, shared state, current Mandate, evaluate, Devnet execute/proof, requests/guardian decisions, test funding, learning sync, Money portfolio and market quotes.

See:
- `docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md`
- `docs/BACKEND-API.md`
- `docs/LIVE-DEMO-INTEGRATION.md`
- `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

## Experience target

1. My Key
2. Contextual Learn / Practice
3. In-bounds action
4. Boundary refusal
5. Market evidence/change
6. Ask for more room
7. Guardian allow once / widen / refuse
8. Same action after widen
9. Stale authorization refusal
10. Proof/receipt

Do not expose protocol jargon as the main UX.

## Current test-money truth

Money Mode’s proven AAPL lane uses:
- Solana Devnet;
- a demo SPL token;
- live Pyth market truth;
- a server-held Devnet demo signer.

It does not buy real AAPL/AAPLx shares and is not brokerage/custody.

## Market

The Explore universe may mix Pyth-backed and sample values. Only `FRESH` Pyth is “Live · Pyth”. Historical charts remain sample until a history provider is connected.

## Sponsor extension

Pyth is load-bearing proof.

PreStocks is a secondary Learn/Practice representation surface:
- eligibility unknown by default;
- execution ineligible by default;
- Practice available;
- authority effect NONE.

Do not make a sponsor dashboard the product.

## Do not block on production-only scope

The current hackathon demo does not require us to fake:
production KYC/auth, embedded wallets, bank/card rails, custody/brokerage, mainnet, all-symbol market entitlements/history, or jurisdiction-specific minor-account rollout.
