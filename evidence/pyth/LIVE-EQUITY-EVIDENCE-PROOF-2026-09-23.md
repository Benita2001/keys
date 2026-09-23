# KEYS — Live Pyth Equity Evidence Proof

Date: 2026-09-23  
Status: **PASS — AUTHENTICATED LIVE EQUITY**

Canonical workflow run:

https://github.com/Faadil1/keys/actions/runs/35910460176

Workflow:

`pyth-live-proof #9`

## Credential boundary

The workflow received the Pyth API key only through the GitHub Actions secret:

`PYTH_PRO_API_KEY`

Observed:

`PYTH_SECRET_INJECTION=PASS`

The key value was never printed, committed or exposed to frontend code.

## Trial entitlement discovery

The current Pyth demo trial does not entitle `Equity.US.AAPL/USD`.

The user-visible Pyth Terminal trial surface showed trial-entitled equities including:

- `Equity.US.VOO/USD`
- `Equity.US.TSLA/USD`
- `Equity.US.QQQ/USD`

A prior control proof established that the API token itself was valid: BTC/USD returned `FRESH` while AAPL returned `PYTH_NOT_ENTITLED`.

KEYS therefore made the live proof asset-configurable rather than purchasing AAPL access or pretending AAPL was available.

## Authenticated live equity snapshot

Selected entitled equity:

`Equity.US.TSLA/USD`

Observed normalized snapshot:

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

This is real authenticated market evidence returned by Pyth Pro during the workflow run.

## Load-bearing KEYS decision

The fresh acceptable Pyth snapshot was passed into the KEYS proposal evaluator.

Observed:

- market status: `FRESH`
- decision: `ESCALATE`
- reason: `GUARDIAN_REVIEW_REQUIRED`

Terminal marker:

`PYTH_LIVE_PROOF=PASS fresh_market_evidence_reached_guardian_review`

This proves the intended separation:

`MARKET EVIDENCE != AUTHORITY`

Fresh market evidence allows the proposal to reach the appropriate mandate decision, but it does not widen authority by itself.

## Asset independence

The proof intentionally does not make KEYS dependent on TSLA.

The Pyth proof script now selects its equity feed through configuration. The product mechanism remains about evidence-backed progressive authority, not a specific ticker.

AAPL may remain in deterministic UI fixtures if useful for frontend continuity, but any judge-facing claim of **live** Pyth data must name the actual verified live feed (`TSLA`) unless AAPL entitlement is later obtained and separately proven.

## Truth boundary

This proof establishes:

- authenticated live Pyth Pro access;
- a live entitled US-equity feed;
- price/confidence/freshness normalization;
- load-bearing integration with the KEYS decision engine.

It does not establish:

- continuous monitoring without an external scheduler/transaction;
- AAPL live entitlement;
- financial competence;
- automatic authority transition;
- brokerage, custody or securities execution.
