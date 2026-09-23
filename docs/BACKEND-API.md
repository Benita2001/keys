# KEYS Backend API — Frontend Integration v0.1

Status: **CONTRACT READY / LOCAL + VERCEL-READY / PUBLIC RUNTIME NOT YET CLAIMED**

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

### GET /api/v0.1/capabilities

Returns the backend's current truth state for frontend routing.

Example when the runtime does not have the Pyth secret configured:

```json
{
  "contractVersion": "0.1",
  "mode": "LOCAL_DEMO",
  "marketEvidence": {
    "status": "BLOCKED_API_KEY"
  },
  "authorityCommit": {
    "status": "RUNTIME_UNAVAILABLE"
  },
  "executionEligibility": {
    "status": "UNKNOWN_DEFAULT"
  },
  "simulation": {
    "status": "AVAILABLE"
  },
  "liveDemoProof": {
    "status": "BLOCKED_API_KEY",
    "selectedEquity": "TSLA",
    "route": "/api/v0.1/demo/live-proof",
    "solanaProgramId": "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk"
  }
}
```

The frontend may use this to decide whether to show a live-backed path or an explicitly simulated/demo path without guessing.

### GET /api/v0.1/demo/maya

Returns the canonical frontend fixture from:

`fixtures/frontend-maya-contract.json`

This is the quickest frontend bootstrap path.

### GET /api/v0.1/demo/live-proof

Returns a frontend-safe live demo envelope.

The backend selects a configured live equity (currently `TSLA` by default), retrieves Pyth evidence server-side, evaluates the Maya-style `PROPOSE` scenario through the same KEYS engine, and attaches public Solana devnet proof metadata.

The route never exposes:

- `PYTH_PRO_API_KEY`;
- `DEVNET_KEYPAIR_JSON`;
- signer material.

Current verified semantic outcome with fresh acceptable evidence:

```
ESCALATE / GUARDIAN_REVIEW_REQUIRED
```

Public Solana proof metadata includes the canonical devnet program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Exact market prices must be treated as live data and not hardcoded.

See:

`docs/LIVE-DEMO-INTEGRATION.md`

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

### POST /api/v0.1/mandates/transition/preview

Deterministic policy preview only.

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

A preview response always carries:

```json
{
  "preview": true,
  "authorityCommitted": false
}
```

### POST /api/v0.1/mandates/transition

Committed authority route.

This route does **not** use the Node preview as proof of authority. It requires a server-side `authorityTransitionProvider`.

Without one, it fails closed with HTTP 503:

```json
{
  "type": "MANDATE_TRANSITION_COMMIT",
  "ok": false,
  "authorityCommitted": false,
  "reasonCode": "AUTHORITY_RUNTIME_UNAVAILABLE"
}
```

When backed by the Anchor provider and a real signer/runtime, a successful result may include:

```json
{
  "ok": true,
  "authorityCommitted": true,
  "mandate": {
    "stage": "BOUNDED",
    "version": 2,
    "nonce": 1
  },
  "proof": {
    "signature": "...",
    "programId": "...",
    "mandateAddress": "...",
    "version": 2,
    "nonce": 1
  }
}
```

The proof envelope is deliberately bounded and never includes signer secrets.

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
src/frontend-api.mjs  ── policy preview
   ↓
src/engine.mjs
   ↓
Pyth evidence boundary

Committed mandate transition
   ↓
src/authority-runtime.mjs
   ↓
src/anchor-authority-provider.mjs
   ↓
Anchor / Solana authority runtime
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


## Hosting status

The repository includes a tested Vercel adapter:

- `src/vercel-adapter.mjs`
- `api/[...path].mjs`
- `api/health.mjs`
- `vercel.json`

CI proof:

https://github.com/Faadil1/keys/actions/runs/35912763697

Canonical state does **not** yet claim a public hosted HTTP base URL. Benita owns final frontend/runtime deployment and may choose the hosting path.

A hosted runtime must keep `PYTH_PRO_API_KEY` server-side only.
