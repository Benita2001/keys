# KEYS — Pyth Evidence Proof

Date: 2026-09-23  
Status: **ADAPTER PASS / LIVE RETRIEVAL BLOCKED BY API KEY**

## What is implemented

KEYS now has a Pyth Pro market-evidence boundary in `src/pyth-adapter.mjs`.

The adapter:

- identifies the AAPL Pyth Pro feed as `Equity.US.AAPL/USD`, numeric feed id `922`;
- requests price, confidence, exponent, `feedUpdateTimestamp`, publisher count and market session;
- normalizes Pyth fixed-point price/confidence values;
- calculates evidence age from `feedUpdateTimestamp`;
- classifies stale evidence;
- preserves confidence width for the KEYS decision engine;
- fails closed for missing credentials, 401, 403, upstream failure, missing feed data or unavailable price.

Pyth is used only as external market reality. It does not determine financial competence or automatically widen authority.

## Load-bearing behavior

The normalized snapshot is passed into the KEYS proposal evaluator.

- fresh evidence with acceptable confidence can continue to the mandate decision;
- stale or unavailable evidence causes `REFUSE / MARKET_EVIDENCE_UNAVAILABLE`;
- an over-wide confidence band causes `REFUSE / MARKET_CONFIDENCE_TOO_WIDE`.

For Maya at the `PROPOSE` stage, acceptable market evidence still results in:

`ESCALATE / GUARDIAN_REVIEW_REQUIRED`

This preserves the invariant:

`MARKET EVIDENCE != AUTHORITY`

## Verified CI evidence

Workflow:

`pyth-live-proof #3`

Run:

https://github.com/Faadil1/keys/actions/runs/35883434458

The deterministic adapter tests passed.

The live step completed with the explicit result:

`PYTH_LIVE_PROOF=BLOCKED reason=PYTH_API_KEY_REQUIRED`

The observed normalized live-attempt state was:

- symbol: `Equity.US.AAPL/USD`
- feed id: `922`
- status: `UNAVAILABLE`
- reason: `PYTH_API_KEY_REQUIRED`
- price: not obtained
- confidence: not obtained
- publish time: not obtained

Therefore this run is **not** evidence of a live Pyth price retrieval.

The workflow is green because the missing credential is an expected, explicit, fail-closed blocker rather than an unhandled integration failure.

## Current blocker

Pyth Pro REST latest-price access requires an API key.

Pyth's current developer documentation also states that, after the Pyth Core upgrade on 2026-08-26, Hermes API access requires an API key. Therefore KEYS does not treat unauthenticated Hermes access as a valid bypass for the missing Pyth Pro credential.

Official references:
- https://docs.pyth.network/price-feeds/pro/api/rest
- https://docs.pyth.network/price-feeds/core/getting-started
- https://docs.pyth.network/price-feeds/pro/acquire-api-key

KEYS does not store or expose a raw Pyth Pro API key in browser code. The key belongs server-side / in the CI secret boundary.

Until a valid `PYTH_PRO_API_KEY` is available and the workflow is rerun successfully, the canonical status remains:

`live_pyth: BLOCKED_API_KEY`

## Truth boundary

Do not claim:

- that KEYS currently has a live AAPL price in the repository proof;
- that a public Pyth Terminal page is the same thing as product-integrated evidence;
- that Pyth continuously monitors a mandate by itself;
- that market data implies maturity or authorization.

The next proof is complete only when a real authenticated response provides the feed value, confidence and `feedUpdateTimestamp`, and that snapshot changes a KEYS proposal decision according to the fail-closed rules.
