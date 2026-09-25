# KEYS Backend API — Cresco / v0.2

Date: 2026-09-24  
Status: **FROZEN SEMANTICS / STATEFUL DEVNET DEMO IMPLEMENTED**

Base URL:

`https://keys-api-stocklana.faadil-casecraft.workers.dev`

CORS production origin:

`https://cresco-lac.vercel.app`

This API is a hackathon-grade Devnet implementation of KEYS bounded autonomy. It is not a brokerage/custody API and does not claim real minor securities execution.

## Session model

### POST /api/v0.2/auth/demo-session

Body:

```json
{ "role": "child", "displayName": "Alex" }
```

or `role: "guardian"`.

Returns a temporary role-scoped demo token. Protected routes use:

`Authorization: Bearer <token>`

This is **not** production identity verification/KYC.

## Shared Family state

### GET /api/v0.2/family/state
Family session required.

Returns shared profile, Mandate projection, test balances, Money holdings, requests and learning summary from the Cloudflare Durable Object.

### POST /api/v0.2/family/link
Child session required. Uses the demo family-link code.

## Mandate

### GET /api/v0.2/mandates/current
Family session required.

Returns the current server/on-chain Mandate plus current AAPL AssetRule projection.

### POST /api/v0.2/mandates/transition
Guardian session required.

Body:

```json
{
  "expectedNonce": 4,
  "changes": {
    "maxActionNotional": 20,
    "maxPeriodNotional": 50,
    "status": "ACTIVE"
  }
}
```

Supported current Devnet demo changes are policy notional limits and status. They call the KEYS Solana program and return Devnet proof signatures. Browser data is not the authority source.

## Evaluate

### POST /api/v0.2/actions/evaluate
Child session required.

Body:

```json
{
  "action": {
    "asset": "AAPL",
    "type": "BUY",
    "notional": 5,
    "expectedNonce": 4
  }
}
```

The server loads current authority. The browser no longer submits a trusted Mandate/AssetRule.

## Execute

### POST /api/v0.2/actions/execute
Child session required. Header/body idempotency key must identify one user intent.

```json
{
  "asset": "AAPL",
  "type": "BUY",
  "notional": 5,
  "expectedNonce": 4,
  "idempotencyKey": "uuid",
  "allowOnceRequestId": null
}
```

Execution sequence:

1. load current runtime + Family state;
2. create/check a Durable Object reservation;
3. serialize balance and period-boundary checks;
4. verify optional exact ALLOW_ONCE request;
5. fetch live signed Pyth AAPL evidence;
6. submit KEYS Devnet transaction;
7. wait for confirmation;
8. finalize durable balance/portfolio/request state;
9. return proof.

Confirmed proof includes the Devnet signature, program id, Mandate version/nonce, idempotency key and Pyth proof metadata.

Durable idempotency scope:

`DURABLE_OBJECT_FAMILY`

### ALLOW_ONCE

A one-time allowance is valid only when all are true:

- exact `allowOnceRequestId`;
- request status is `ALLOWED_ONCE`;
- same asset;
- amount ≤ approved request;
- same current Mandate nonce;
- not previously consumed.

Successful use marks it `ALLOWED_ONCE_USED`.

## Boundary requests

### POST /api/v0.2/boundary-requests
Child session required.

Persists a family-private request. Free-form minor reasoning is not placed on-chain.

### GET /api/v0.2/boundary-requests
Family session required.

### POST /api/v0.2/boundary-requests/:id/decision
Guardian session required.

Decisions:

`ALLOW_ONCE | WIDEN_MANDATE | REFUSE`

WIDEN goes through the same on-chain Mandate transition path.

## Test funding

### POST /api/v0.2/funding/deposits
Guardian session required.

Adds backend **test credit only**.

Response includes:

`realPaymentTaken: false`

### GET /api/v0.2/balances
Family session required.

No bank/card provider is connected.

## Learning / portfolio

### POST /api/v0.2/learning/progress
Child session required. Persists lesson/minute progress. Authority effect is always `NONE`.

### GET /api/v0.2/learning/summary
Family session required.

### GET /api/v0.2/portfolio?mode=money
Family session required. Returns holdings/activity finalized from confirmed Money executions.

## Market

### GET /api/v0.2/market/discovery

Public KEYS market-discovery surface backed by the current Pyth Pro catalog plus **server-side entitlement probes**.

It currently proves live accessible discovery across:
- US equities / ETFs;
- crypto;
- FX;
- metals;
- commodities / energy futures.

The response distinguishes:
- `PRIMARY_MONEY_PROOF` — currently AAPL only;
- `LEARN_PRACTICE_ONLY` — every other discovered market feed.

Important invariants:
- public Pyth catalog presence does not equal KEYS entitlement;
- entitlement does not equal Money execution eligibility;
- market evidence has `authorityEffect=NONE`;
- unavailable feeds never become fabricated prices.

Canonical proof: `36115570744`  
Hosted non-mutating proof: `36115973480`.

### GET /api/v0.2/market/quotes?symbols=AAPL,NVDA,...

Public market-evidence surface.

Only a Pyth result with status `FRESH` may be rendered as live. Missing/unentitled feeds return `UNAVAILABLE`; unknown prices are never converted to zero.

Current UI universe:
AAPL, NVDA, TSLA, NFLX, AMZN, MSFT, META, MCD, SPY, QQQ.

Current configured Pyth adapter feeds include AAPL and TSLA; AAPL is the current proven Money lane.

### GET /api/v0.2/market/series?symbol=AAPL&period=1M

Uses the authenticated **Pyth Pro History API** server-side for configured feeds.

Supported UI periods map to bounded history windows/resolutions: `1D`, `1W`/`7D`, `1M`/`30D`, `1Y`, and `All`.

When entitled, the route returns `status: AVAILABLE`, `source: PYTH_PRO_HISTORY`, the feed id/resolution, and real close-price points as `{ t, v }`.

Authentication, entitlement, upstream, malformed-response, or no-data failures return `UNAVAILABLE` with an explicit reason code and zero fabricated points. The Pyth Pro key remains server-side.

### POST /api/v0.2/proofs/concurrency

Guardian demo session required.

Runs a no-trade proof against the real Family Durable Object. It submits concurrent AAPL/TSLA-labeled reservations against one shared period/balance budget, verifies serialization/refusal, then releases all proof reservations without changing the Family balance or period spend.

This proves the family-wide reservation boundary is multi-asset-ready. It does **not** claim TSLA is currently executable in Money Mode; AAPL remains the proven Money execution lane.

## Stable proof/runtime

### GET /api/v0.2/demo/runtime

Returns public metadata for the server-held AAPL Devnet demo runtime.

### GET /api/v0.2/demo/maya

Returns the frozen bounded-autonomy fixture.

## PreStocks

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

Live public API integration, fail-closed for execution eligibility:
`eligibility=UNKNOWN`, `executionEligible=false`, `practiceAvailable=true`, `authorityEffect=NONE`.

## Tessera

- `GET /api/v0.2/integrations/tessera`
- `GET /api/v0.2/integrations/tessera/:asset`

Live public API integration using Tessera's public token-details surface.

The normalized response explicitly models T-Tokens as **loan participation rights**, not direct equity. Default KEYS policy is fail-closed:

`eligibility=UNKNOWN`, `executionEligible=false`, `practiceAvailable=true`, `authorityEffect=NONE`.

Live proof: `36112072978`  
Hosted proof: `36112229684`

No Tessera route grants Money execution or changes the Mandate.

## Canonical proof

Solana program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Network: **Devnet**

Current Pyth proof asset:

`Equity.US.AAPL/USD` / feed `922`

Current capital asset: **DEMO_TOKEN**

## Secret boundary

Never expose:

- `PYTH_PRO_API_KEY`
- `DEVNET_KEYPAIR_JSON`
- server signer material

Production auth/KYC, embedded wallets, fiat rails, brokerage/custody, mainnet and all-symbol live/history data are intentionally outside the hackathon demo.
