# Benita gap closure — Stocklana / Cresco

Date: 2026-09-24
Status: **HACKATHON IMPLEMENTATION CLOSED — ONE EXTERNAL DEVNET DEPLOYMENT GATE REMAINS**

This file maps Benita’s observations to the current KEYS/Cresco implementation.

## Closed submission-risk items

- Demo/mock ambiguity: closed by explicit Practice/sample labels and Devnet/demo-SPL truth labels.
- Money Mode not connected to Solana: closed for the current AAPL lane; hosted KEYS API returns Devnet receipts.
- PR #1 / CI: merged and covered by current web CI.
- Safari/iPhone: WebKit mobile CI is active and passing.

## Closed backend items

- Pyth on-chain verification: proven on the AAPL Devnet capital path.
- v0.2 contract: frozen.
- Mandate read/update API: implemented; limits/status changes commit to Solana Devnet.
- Browser-supplied authority: removed; evaluate/execute load current server/on-chain state.
- Family-wide period/balance serialization: Durable Object reservations protect one shared budget across tabs/devices; hosted proof now exercises concurrent AAPL/TSLA-labeled reservations without claiming TSLA execution.
- Execute endpoint: implemented with Devnet proof.
- Boundary requests: persisted, listed and decided server-side.
- Allow once: exact request id + asset + ceiling + nonce + single successful use is implemented and locally proven. The final deployed-binary proof is blocked only by Devnet upgrade funding: run 36070676319 calculated 2,371,812,520 lamports required versus 1,948,895,627 available, leaving a 422,916,893-lamport shortfall. Automated RPC/provider funding was unavailable and the current PoW faucet was empty.
- Double-spend protection: durable idempotency/reservations, with hosted concurrency smoke PASS.
- Market quotes: fail-closed API for the UI universe; only entitled Pyth evidence is labeled live.
- History: AAPL now uses authenticated Pyth Pro History through Cloudflare for supported periods; missing/unentitled history still fails closed with no fabricated points.
- Signing model: explicit SERVER_HELD_DEVNET_DEMO signer for the hackathon.
- Child/guardian accounts: role-scoped demo sessions + shared Family state; not KYC.
- Funding: guardian-only test credit; no real payment.
- CORS and hosting: Cloudflare Worker is the production demo backend for cresco-lac.vercel.app.

## Closed frontend items

- Hosted backend adapter is wired.
- Mandate, requests, Money balance/holdings and learning re-sync from Cloudflare; localStorage is a UI cache, not authority.
- Confirmed non-simulated Devnet signatures can link to Solana Explorer.
- Parent/child no longer depend on one browser-only state.
- Parent period selector is functional (7/30 days).
- Learning bars use synchronized lesson minutes.
- Practice/Money supports arrow-key navigation and WebKit QA.
- Companies allowed is now truth-safe: AAPL is the current proven Money asset; other visible companies are Practice-only until their own runtime representation/evidence is connected.
- AAPL enable/disable maps to the on-chain AssetRule rather than a decorative toggle.

## Visual polish

The custom illustrations and company tiles remain valid hackathon assets. Replacing every illustration with generated 3D art or every tile with trademark artwork is optional polish, not a product-completeness blocker, and should not introduce external-image fragility before judging.

## Production-only — do not fake before submission

- production identity/KYC and jurisdictional minor-account compliance;
- user-bound embedded wallets / production key management;
- bank/card rails;
- regulated brokerage/custody and real securities settlement;
- mainnet capital;
- live entitlements + real history for every visible symbol.

## Canonical demo truth

> KEYS enforces bounded demo-token capital actions on Solana Devnet using live Pyth market truth. The young person acts freely inside a standing family Mandate; only an authorized guardian can expand authority.

Core flow: MY KEY → LEARN/PRACTICE → ALLOW → REFUSE → ASK FOR MORE ROOM → GUARDIAN DECISION → ALLOW → STALE REFUSE
