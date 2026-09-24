# Cresco — Frontend Implementation Summary

Updated: 2026-09-24  
Workspace: `apps/web`  
Backend: KEYS v0.2 + Cloudflare Worker + Solana Devnet

## Status

Cresco is no longer a browser-only prototype. The hackathon Family experience is wired to the KEYS backend while keeping an explicit test-mode truth boundary.

### Connected now

- **Money Mode AAPL** → KEYS backend → Solana Devnet → demo SPL token.
- **Pyth** → fresh market truth in the execution path; only fresh entitled quotes are labeled live.
- **Mandate** → server/on-chain source of authority; client Mandate is no longer trusted as authority input.
- **Boundary requests** → persisted/shared; guardian decisions persist.
- **ALLOW_ONCE** → exact request id + asset + amount ceiling + nonce + one successful use.
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

Historical charts remain explicitly sample because the backend truthfully returns `HISTORY_PROVIDER_NOT_CONNECTED` rather than inventing history.

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
