# Cresco — Frontend Implementation Summary

Updated: 2026-09-24  
Workspace: `apps/web`  
Backend: KEYS v0.2 + Cloudflare Worker + Solana Devnet

## Status

Cresco is no longer a browser-only prototype. The hackathon Family experience is wired to the KEYS backend while keeping an explicit test-mode truth boundary.

### Connected now

- **Money Mode AAPL** → KEYS backend → Solana Devnet → demo SPL token.
- **Pyth** → fresh market truth in the execution path; only fresh entitled quotes are labeled live.
- **Multi-market discovery** → live entitlement-checked Pyth exploration across equities, crypto, FX, metals and commodities; AAPL remains the only primary Money proof and all other discovered feeds remain Learn/Practice.
- **Mandate** → server/on-chain source of authority; client Mandate is no longer trusted as authority input.
- **Boundary requests** → persisted/shared; guardian decisions persist.
- **ALLOW_ONCE** → exact request id + asset + amount ceiling + nonce + one successful use; deployed Devnet proof PASS, then reuse REFUSE with `AllowanceAlreadyUsed`.
- **Guardian changes** → role-gated demo session + on-chain transition for limits/status.
- **Family state** → Cloudflare Durable Object/SQLite; shared across tabs/devices.
- **Concurrency** → durable reservation + idempotency before Devnet execution.
- **Test funding** → guardian-only backend test credits; no payment is taken.
- **Learning** → persisted/synced, with `authorityEffect: NONE`.
- **Money portfolio** → persisted from confirmed executions.
- **Parent dashboard** → functional 7/30-day selector + synced learning-minute bars.
- **Accessibility** → Practice/Money arrows + focus behavior.
- **Mobile QA** → iPhone/WebKit automated route/overflow coverage.
- **Proof UI** → confirmed non-simulated Devnet signatures can link to Solana Explorer.
- **Tessera** → live T-OpenAI / T-Kalshi / T-SpaceX representation feed surfaced in Explore as Learn/Practice only; loan participation rights, not direct equity; `authorityEffect: NONE`.

Final Devnet proof references:
- program upgrade: run `36079506597`, slot `503748084`;
- current bridge: run `36082140600`;
- ALLOW_ONCE grant: `574BuAQxEtMCgZ6PWhv9F681qqZBfioopNPqUzHKFSYjetR8gtTpTgEFBXwC8YxgMDYrr8WYznGSqVUr2CZFTEm5`;
- ALLOW_ONCE execution: `5463is82CjnnTxAA6ZLFzyoAhQ9v1yLQvfYGqWfNoFKX6KodrnZLoREHaV6oA3Px7H3BX5Ms4uBKWcFEu5RukA8t`.

## User journey implemented

1. Child sees **My Key** / current limits.
2. Contextual learning and Practice remain available.
3. In-bounds AAPL Money action can execute without guardian approval.
4. Out-of-bounds action refuses.
5. Child asks for more room.
6. Guardian signs in to the demo guardian session.
7. Guardian chooses allow once / widen / refuse.
8. Widen updates the on-chain Mandate/version/nonce.
9. Same action can succeed after the widen.
10. Old nonce is stale/fails closed.

Learning, XP, badges and P&L never change authority.

## Market experience

UI universe:
AAPL, NVDA, TSLA, NFLX, AMZN, MSFT, META, MCD, SPY, QQQ.

The frontend requests quotes from the KEYS market route. A quote is overlaid only when Pyth returns `FRESH` or `STALE`; otherwise the existing value remains visibly **Sample prices**.

Configured entitled history now comes from Pyth Pro History through the backend. Unavailable or unconfigured history remains an explicitly labeled sample fallback rather than fabricated live data.

### Multi-market Explore

The Explore page now exposes live Pyth market-class cards when the backend has verified entitlement.

Current proven examples:
- AAPL / NVDA / MSFT;
- BTC / ETH / SOL;
- EUR/USD / USD/JPY / GBP/USD;
- Gold / Silver / Aluminium 3M;
- a currently entitled Brent futures feed.

Rates are not currently proven live.

This broadens the learning universe without broadening Money authority. AAPL remains the reference Money execution lane.

## Security/truth boundary

Real/proven in this demo:
- KEYS Solana Devnet program;
- bounded demo-token capital execution;
- current AAPL Pyth evidence / on-chain verification;
- server-held Devnet demo signer;
- Cloudflare-hosted API;
- persistent Family demo state;
- role-scoped demo sessions.

Not claimed:
- production login/KYC;
- embedded wallet;
- bank/card funding;
- brokerage/custody;
- real AAPL/AAPLx ownership or settlement;
- mainnet;
- real minor securities execution;
- live feeds/history for every symbol.
- Tessera Money execution or inferred user/jurisdiction eligibility.

## Key implementation files

| Area | File |
|---|---|
| HTTP client | `apps/web/src/services/keys-backend.ts` |
| Service routing | `apps/web/src/services/index.ts` |
| Shared UI cache | `apps/web/src/state/store.tsx` |
| Money flow | `apps/web/src/app/invest/[ticker]/flow.tsx` |
| Parent request decision | `apps/web/src/app/parent/(dash)/requests/[id]/page.tsx` |
| Parent limits | `apps/web/src/app/parent/(dash)/limits/page.tsx` |
| Family API | `src/cloudflare-family-api.mjs` |
| Durable state | `src/cloudflare-family-state.mjs` |
| Devnet provider | `src/devnet-execution-provider.mjs` |
| Solana program | `programs/keys/src/lib.rs` |
| WebKit QA | `apps/web/e2e/mobile.spec.mjs` |

## What remains intentionally production-only

Production auth/KYC, embedded wallets, fiat rails, custody/broker integration, mainnet, all-symbol market entitlements/history, and jurisdiction-specific minor-account compliance.

For the Stocklana demo, these must remain honestly labeled rather than simulated as production capabilities.

## Full backend integration pass (2026-09-25)

- **Backend truth first:** demo-session bootstrap, 401 auto-renew, Family sync (poll + focus + after every mutation), Money gated until first sync and fail-closed. `useMoneyTruth()` is the single read path; `localStorage` is a cache only.
- **Money:** evaluate → execute (AAPL only) with one idempotency key per intent; UNKNOWN/PENDING never shown as success; "Action confirmed on Solana Devnet" receipt with a consumer summary + Technical details (signature, program, mandate account, version/nonce, Pyth feed/price/publish time). Held reservations and on-chain period spend are respected.
- **Boundary + guardian:** limit refusals offer Ask; guardian ALLOW_ONCE / WIDEN (period presets) / REFUSE with `*_PENDING_CHAIN` states; limits and pause changes refresh from chain.
- **Explore:** 10 companies with per-row provenance (Live · Pyth / Delayed / Sample), Pyth discovery classes ("Explore how markets move"), Pyth history charts, and a Private companies section (8 PreStocks, 3 Tessera) that is Learn/Practice only.
- **Learning:** new "Private companies" track (what a pre-IPO company is, PreStocks = exposure not shares, Tessera = loan participation right). Stats/streak/badges derived from synced progress; learning never changes authority.
- **Embedded wallet:** env-gated Privy (email/Google/Apple + Solana embedded wallet) on Profile; identity only.
- **Tests:** 67 unit/integration tests (adapter, micro-USD, upstream-429 → UNKNOWN, market truth, PreStocks/Tessera mapping, seed pricing, streak) + 14 WebKit iPhone e2e.
- Integration matrix and backend issues: `docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md`.
