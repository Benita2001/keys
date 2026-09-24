# Technical Reality Check v0.2

Date: 2026-09-24  
Status: **PASS — CANONICAL DEVNET RUNTIME PROVEN**

The v0.2 Family bounded-autonomy architecture is no longer only a target. Its core capital and market-evidence paths now pass on local Solana and the canonical devnet program.

Canonical devnet run:

https://github.com/Faadil1/keys/actions/runs/35959137364

Canonical program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

## What is now proven

1. A Mandate is executable policy, not merely a displayed stage.
2. A program-controlled demo-token vault holds the capital used in the proof.
3. An in-bounds action executes without guardian approval.
4. An out-of-bounds action refuses inside the Solana program.
5. An explicit authorized human widen advances Mandate version/nonce.
6. Stale authorization/execution material refuses after the change.
7. The same previously refused larger action succeeds after the human widen.
8. Pause/downward authority blocks execution.
9. Live authenticated Pyth Pro/Lazer TSLA evidence is verified inside the Solana capital path.
10. Pyth-derived USD notional is load-bearing.
11. A notional breach refuses with `PythNotionalExceeded`.
12. A precommitted max-price condition refuses with `MarketConditionInvalidated`.
13. Market evidence has no authority-widening effect.
14. LEARN/PRACTICE remain contextual Family UX and do not auto-promote authority.

## Canonical architecture

**KEYS program-controlled vault + Mandate permission matrix + AssetRule + signed Pyth Pro/Lazer verification.**

Squads remains a possible future smart-account substrate.

Raw SPL delegation remains a narrow proof primitive, not the canonical KEYS policy model.

Token transfer hooks are not required by the current product architecture.

## Pyth implementation reality

The proven path is:

1. backend fetches an authenticated Pyth Pro Solana-format signed message;
2. the transaction carries the exact signed message;
3. an Ed25519 verification instruction precedes the KEYS instruction;
4. KEYS CPI-invokes the canonical Pyth Lazer Solana verifier;
5. KEYS parses only the signed properties it needs;
6. freshness/confidence/feed/price rules are applied before capital moves;
7. price is converted into deterministic integer micro-USD for notional checks.

Canonical live feed in the proof:

`Equity.US.TSLA/USD` — feed id `1435`.

The current trial does not prove live AAPL entitlement.

## Learning reality

Learning remains a first-class Family layer:

- contextual;
- short;
- action-linked;
- available in Practice;
- reflective after meaningful outcomes.

It is not an authority oracle.

`LEARNING COMPLETION != AUTHORITY`

`PROFIT != DECISION QUALITY`

## Frozen integration target

Frontend/backend contract v0.2 is now frozen:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

Benita can integrate against that contract.

## Truth boundary

Still not claimed:

- real tokenized-stock/minor execution;
- brokerage/custody;
- conventional legal share ownership from token balance;
- Solana mainnet deployment;
- universal issuer/venue/jurisdiction eligibility.

The proof asset remains an explicitly labeled demo/mock SPL token.

## Next milestone

**BENITA_V0_2_FRONTEND_INTEGRATION**

Backend role is now proof maintenance and integration support.
