# KEYS — Pyth Evidence Proof

Date: 2026-09-23  
Status: **PASS — AUTHENTICATED LIVE EQUITY**

## What is implemented

KEYS has a server-owned Pyth Pro market-evidence boundary in `src/pyth-adapter.mjs`.

The adapter:

- supports configured US-equity feeds;
- requests price, confidence, exponent, `feedUpdateTimestamp`, publisher count and market session;
- normalizes fixed-point price/confidence values;
- calculates evidence age;
- classifies stale evidence;
- preserves confidence width for the KEYS decision engine;
- fails closed for missing credentials, entitlement failure, upstream failure, missing feed data or unavailable price.

Pyth remains external market reality only. It does not determine financial competence and does not widen authority by itself.

## Load-bearing behavior

Fresh evidence with acceptable confidence can continue to the mandate decision.

Stale or unavailable evidence causes a market-evidence refusal. An over-wide confidence band causes `REFUSE / MARKET_CONFIDENCE_TOO_WIDE`.

For a beneficiary at the `PROPOSE` stage, acceptable fresh evidence still results in:

`ESCALATE / GUARDIAN_REVIEW_REQUIRED`

Invariant:

`MARKET EVIDENCE != AUTHORITY`

## Current canonical live proof — AAPL

Pyth activated temporary Stocklana access to AAPL on 2026-09-24.

Workflow:

`pyth-live-proof`

Run:

https://github.com/Faadil1/keys/actions/runs/36035283447

Observed:

- `PYTH_SECRET_INJECTION=PASS`
- symbol: `Equity.US.AAPL/USD`
- feed id: `922`
- channel: `fixed_rate@1000ms`
- status: `FRESH`
- price at proof instant: `337.34502`
- confidence: approximately `0.04003`
- confidence bps: approximately `1.1866`
- publish time: `2026-09-24T17:34:56.000Z`
- evidence age: `0 seconds`
- market session: `regular`
- publisher count: `19`
- signed Solana payload: `AVAILABLE`
- `PYTH_SIGNED_SOLANA_PAYLOAD=PASS`

The KEYS engine still produced:

`ESCALATE / GUARDIAN_REVIEW_REQUIRED`

Terminal marker:

`PYTH_LIVE_PROOF=PASS fresh_market_evidence_reached_guardian_review`

The full HTTP→Solana AAPL proof is:

https://github.com/Faadil1/keys/actions/runs/36034651466

Evidence:

[evidence/solana/CRESCO-AAPL-HTTP-DEVNET-EXECUTION-PROOF-2026-09-24.md](../evidence/solana/CRESCO-AAPL-HTTP-DEVNET-EXECUTION-PROOF-2026-09-24.md)

## Historical TSLA proof

Before AAPL entitlement was activated, KEYS used the entitled `Equity.US.TSLA/USD` feed (id `1435`) to prove the same market-evidence mechanism.

Historical run:

https://github.com/Faadil1/keys/actions/runs/35910460176

That proof remains valid historical evidence. It is no longer the current Cresco proof lane.

This preserves the product truth: KEYS is asset-independent even though AAPL is now the best judge-facing proof because it matches the primary Apple UX.

## Credential boundary

The Pyth key is stored only as the GitHub Actions repository secret:

`PYTH_PRO_API_KEY`

It is not committed to the repository and must not be exposed in browser/frontend code.

## Truth boundary

KEYS can now truthfully claim:

- authenticated Pyth Pro access;
- verified live AAPL access on the current trial token;
- a signed Solana-format AAPL payload;
- a verified live US-equity snapshot;
- price/confidence/freshness normalization;
- load-bearing use of that evidence in the policy engine.

KEYS must not claim:

- continuous monitoring without an external scheduler/service;
- that Pyth assesses maturity or competence;
- that market data creates authority;
- brokerage, custody or securities execution.
