# KEYS — Live Demo Integration v0.2

Date: 2026-09-24  
Status: **FAMILY DEVNET DEMO CONNECTED**

The frozen semantic contract remains `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`. The implementation around it is now stateful and connected.

## Live endpoints

Backend:
`https://keys-api-stocklana.faadil-casecraft.workers.dev`

Frontend:
`https://cresco-lac.vercel.app`

## Demo spine

1. My Key / current limits.
2. Source-backed Learn / Practice.
3. AAPL in-bounds Money action → **ALLOW**, no guardian approval.
4. Larger action → **REFUSE**.
5. Ask for more room → persisted exact request.
6. Guardian demo sign-in → choose **ALLOW_ONCE**.
7. Exact retry → **ALLOW** with one-time authorization; allowance is consumed.
8. Reuse the same one-time authorization → **REFUSE / AllowanceAlreadyUsed**.
9. Receipt → Devnet signature + program + version/nonce + Pyth proof.

Widen remains implemented for a real standing-authority change, but it is secondary to the canonical ALLOW_ONCE demo.

## Runtime

- Solana Devnet
- program `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- server-held Devnet demo signer
- demo SPL token
- AAPL Pyth feed 922
- on-chain Pyth Lazer verification
- Durable Object family state / reservations

This is real Devnet execution over test/demo capital, not real securities.

## State and roles

Cresco receives a temporary backend child or guardian demo session.

Child role:
- family link;
- evaluate/execute;
- create boundary request;
- learning progress.

Guardian role:
- decide requests;
- widen/pause/resume;
- test funding.

Family reads use either role. This closes the previous “same browser means same authority” gap at the backend mutation boundary without pretending to be production identity/KYC.

## Market truth

Quotes endpoint supports the UI universe, but only fresh entitled Pyth evidence is labeled live. Missing feeds stay sample/unavailable.

AAPL historical series are now fetched server-side from authenticated Pyth Pro History for supported periods. Unentitled or unconfigured history still fails closed with no fabricated points.

## PreStocks

PreStocks remains an optional Learn/Practice representation surface and is not part of the hero journey. It never creates KEYS authority and is execution-ineligible by default until a trusted eligibility resolver says otherwise.

## Truth sentence

> **KEYS enforces bounded capital actions on Solana using live Pyth market truth.**

Do not claim:
- real minor securities execution;
- brokerage/custody;
- legal share ownership from the demo token;
- mainnet;
- production auth/KYC;
- real bank/card funding;
- universal live market coverage.

## QA

The web workflow includes unit/integration checks plus iPhone WebKit coverage for core routes, horizontal overflow and Practice/Money keyboard navigation.
