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

## Canonical live proof

Workflow:

`pyth-live-proof #9`

Run:

https://github.com/Faadil1/keys/actions/runs/35910460176

Observed:

- `PYTH_SECRET_INJECTION=PASS`
- symbol: `Equity.US.TSLA/USD`
- feed id: `1435`
- channel: `fixed_rate@1000ms`
- status: `FRESH`
- price: `379.696`
- confidence: `0.019`
- confidence bps: `0.500400320256205`
- publish time: `2026-09-23T19:36:42.000Z`
- evidence age: `0 seconds`
- market session: `regular`
- publisher count: `19`

The KEYS engine then produced:

`ESCALATE / GUARDIAN_REVIEW_REQUIRED`

Terminal marker:

`PYTH_LIVE_PROOF=PASS fresh_market_evidence_reached_guardian_review`

Full evidence:

[evidence/pyth/LIVE-EQUITY-EVIDENCE-PROOF-2026-09-23.md](../evidence/pyth/LIVE-EQUITY-EVIDENCE-PROOF-2026-09-23.md)

## Why the canonical live feed is TSLA rather than AAPL

Earlier authenticated attempts established that the current Pyth demo-trial token does not entitle `Equity.US.AAPL/USD`.

Control proof:

https://github.com/Faadil1/keys/actions/runs/35909454962

Observed on the same token:

- `Equity.US.AAPL/USD` → `PYTH_NOT_ENTITLED`
- `Crypto.BTC/USD` → `FRESH`

The user's Pyth Terminal trial surface showed entitled equities including:

- `Equity.US.VOO/USD`
- `Equity.US.TSLA/USD`
- `Equity.US.QQQ/USD`

Rather than paying only to preserve an arbitrary ticker, KEYS made the live proof asset-configurable and used an entitled US-equity feed.

This strengthens the product truth: KEYS is not an AAPL product.

## Credential boundary

The Pyth key is stored only as the GitHub Actions repository secret:

`PYTH_PRO_API_KEY`

It is not committed to the repository and must not be exposed in browser/frontend code.

## Truth boundary

KEYS can now truthfully claim:

- authenticated Pyth Pro access;
- a verified live US-equity snapshot;
- price/confidence/freshness normalization;
- load-bearing use of that evidence in the policy engine.

KEYS must not claim:

- live AAPL access on the current trial token;
- continuous monitoring without an external scheduler/service;
- that Pyth assesses maturity or competence;
- that market data creates authority;
- brokerage, custody or securities execution.
