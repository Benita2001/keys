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
  "now": "ISO-8601 timestamp"
}
```

The normal route does **not** trust market evidence or execution eligibility supplied by the frontend.

- market evidence is resolved server-side through the Pyth boundary;
- eligibility defaults fail-closed to `UNKNOWN` until a verified eligibility provider exists.

If `PYTH_PRO_API_KEY` is unavailable, the response includes a safe evidence summary showing the blocker and the policy decision fails closed.

Canonical Maya outcome at `PROPOSE` with acceptable market evidence:

```json
{
  "contractVersion": "0.1",
  "type": "PROPOSAL_EVALUATION",
  "decision": "ESCALATE",
  "reasonCode": "GUARDIAN_REVIEW_REQUIRED"
}
```

### POST /api/v0.1/simulations/proposals/evaluate

This route is explicitly for deterministic demo/simulation work.

It may accept simulated `market` and `eligibility` inputs and always labels the response:

```json
{
  "type": "SIMULATION_PROPOSAL_EVALUATION",
  "simulation": true
}
```

Do not use this route as evidence of live Pyth data or real execution eligibility.

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

Uses backend-owned market evidence and backend-owned eligibility state for an execution-facing decision.

Until a verified eligibility provider exists, the backend resolves eligibility to `UNKNOWN`.

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

## Evidence metadata returned to the frontend

Proposal/execution responses include a safe `marketEvidence` object containing only display-safe proof metadata such as:

- source;
- symbol/feed id;
- status;
- blocker reason code;
- price/confidence when actually available;
- publish/receive timestamps;
- evidence age;
- market session/publisher count when supplied by Pyth.

No API key or secret is included.

Responses also expose the resolved eligibility status, with `UNKNOWN` as the default fail-closed state.
