# KEYS Backend API — Local Demo v0.1

Status: **LOCAL DEMO / FRONTEND INTEGRATION ONLY**

This adapter exists so the KEYS frontend can integrate against the real domain contract without importing Anchor or duplicating policy logic.

It is not a production API and does not claim authentication, custody, brokerage, or real securities execution.

## Start

```bash
npm run api
```

Default:

```
http://127.0.0.1:8787
```

Optional environment variables:

- `KEYS_API_HOST`
- `KEYS_API_PORT`
- `KEYS_CORS_ORIGIN`

The default host is loopback. CORS defaults to `*` for local demo convenience only.

## Contract version

`0.1`

The HTTP layer delegates to:

`src/frontend-api.mjs`

It does not implement separate business rules.

## Routes

### GET /health

Returns the backend status and contract version.

Example:

```json
{
  "ok": true,
  "service": "keys-backend",
  "contractVersion": "0.1"
}
```

### GET /api/v0.1/demo/maya

Returns the canonical frontend fixture from:

`fixtures/frontend-maya-contract.json`

This is the quickest frontend bootstrap path.

### POST /api/v0.1/proposals/evaluate

Body:

```json
{
  "charter": {},
  "mandate": {},
  "proposal": {},
  "market": {},
  "eligibility": {},
  "now": "ISO-8601 timestamp"
}
```

Canonical Maya outcome at `PROPOSE` with acceptable market evidence:

```json
{
  "contractVersion": "0.1",
  "type": "PROPOSAL_EVALUATION",
  "decision": "ESCALATE",
  "reasonCode": "GUARDIAN_REVIEW_REQUIRED"
}
```

### POST /api/v0.1/mandates/review

Body:

```json
{
  "mandate": {},
  "events": [],
  "thresholds": {
    "minReviews": 3,
    "minProposals": 3,
    "minMarketEventReviews": 1,
    "maxScopeViolations": 0
  }
}
```

The UI-safe review label is:

`Eligible for Mandate Review`

Never translate this into a maturity/competence score.

### POST /api/v0.1/mandates/transition

Body:

```json
{
  "mandate": {},
  "toStage": "BOUNDED",
  "authorizedBy": "guardian-id-or-null",
  "at": "ISO-8601 timestamp",
  "evidenceSummary": {},
  "reviewEligibility": {
    "eligibleForReview": true
  }
}
```

Missing authorization must resolve to:

```
AUTHORIZED_TRANSITION_REQUIRED
```

The local Node facade models product semantics. The stronger nonce/version replay protection is proven in the Anchor authority layer and must remain authoritative for on-chain transitions.

### POST /api/v0.1/execution/evaluate

Uses the same proposal evaluator for an execution-facing decision.

For `BOUNDED` with eligibility `UNKNOWN`:

```
REFUSE / ELIGIBILITY_UNKNOWN
```

`UNKNOWN` never becomes eligible by default.

## Error behavior

Unknown routes return:

```json
{
  "error": "NOT_FOUND"
}
```

Malformed JSON or invalid domain input returns HTTP 400 from the local server.

## Architecture

```
Frontend
   ↓
Local HTTP adapter
   ↓
src/frontend-api.mjs
   ↓
src/engine.mjs
   ↓
Pyth evidence boundary / Solana authority proof
```

The frontend is intentionally insulated from the implementation details below the domain facade.
