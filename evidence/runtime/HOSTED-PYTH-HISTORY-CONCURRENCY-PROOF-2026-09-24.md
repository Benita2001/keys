# Hosted Pyth History + Durable Concurrency Proof — 2026-09-24

Status: **PASS**

Canonical hosted workflow:

https://github.com/Faadil1/keys/actions/runs/36066208304

## What the hosted smoke proved

The public Cloudflare KEYS backend successfully served the current stateful Family implementation and passed the new proof gates:

1. A child demo session was issued by the hosted API.
2. A guardian demo session was issued by the hosted API.
3. Shared Family state loaded from the Durable Object.
4. AAPL market history returned from the authenticated server-side Pyth Pro History path with:
   - `status: AVAILABLE`
   - `source: PYTH_PRO_HISTORY`
   - more than one real history point
   - `fabricatedHistory: false`
5. The guardian-only concurrency proof exercised the real Family Durable Object with concurrent AAPL/TSLA-labeled reservations against one shared period/balance budget.
6. At least one reservation was accepted and at least one was refused once shared capacity was exhausted.
7. All proof reservations were released without changing Family balance or period spend.

## What this does not claim

- TSLA is **not** claimed as a current Money execution asset.
- The AAPL lane remains the currently proven Money/Solana execution lane.
- The AAPL history proof is market-data evidence, not securities ownership or brokerage execution.
- No real payment, KYC, brokerage/custody, mainnet capital, or real minor securities execution is claimed.

## Judge-facing consequence

The previous statements that historical data was always unavailable and that multi-device overspend protection was only an implementation claim are now superseded.

The hosted demo can truthfully state:

> AAPL history is fetched server-side from Pyth Pro when entitled, and the Family Durable Object has a hosted concurrency proof showing one shared reservation boundary across asset-labelled intents.
