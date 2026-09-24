# KEYS Backend API — Frontend Integration v0.2

Date: 2026-09-24  
Status: **FROZEN V0.2 PRODUCT CONTRACT / RUNTIME PROVEN**

This adapter lets the KEYS frontend integrate against the bounded-autonomy domain contract without importing Anchor or duplicating policy logic.

It is not a production brokerage/custody API and does not claim real minor securities execution.

## Current product contract

Contract version:

`0.2`

Frozen semantic contract:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

Primary product routes:

- `GET /api/v0.2/demo/maya`
- `POST /api/v0.2/actions/evaluate`
- `POST /api/v0.2/boundary-requests`

The `/api/v0.1/*` routes remain historical/compatibility surfaces.  
The `/api/v0.2/draft/*` aliases remain compatibility aliases only.

Benita should integrate against the non-draft v0.2 routes above.

## Start locally

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

## GET /health

Returns service health for the current product integration target.

Current response includes:

```json
{
  "ok": true,
  "service": "keys-backend",
  "contractVersion": "0.2",
  "legacyContractVersion": "0.1"
}
```

The legacy version field exists only because the repository intentionally preserves the v0.1 proof surfaces.

## GET /api/v0.2/demo/maya

Returns:

`fixtures/frontend-maya-v0.2-contract.json`

Key truth fields include:

- `contractVersion: "0.2"`;
- `truthBoundary.onchainPythVerification: true`;
- `truthBoundary.realMinorSecuritiesExecution: false`;
- current Mandate version/nonce;
- bounded-autonomy demo beats.

This is the fastest frontend bootstrap route.

## POST /api/v0.2/actions/evaluate

Body:

```json
{
  "mandate": {},
  "assetRule": {},
  "action": {},
  "now": "ISO-8601 timestamp"
}
```

When `assetRule.requiresMarketEvidence === true`, the backend resolves market evidence server-side.

The route never trusts a browser-supplied Pyth API key.

Response metadata includes:

```json
{
  "type": "V0_2_ACTION_EVALUATION",
  "runtimeProofStatus": "CANONICAL_DEVNET_RUNTIME_PROVEN"
}
```

Relevant decisions/reason codes include:

- `ALLOW / WITHIN_MANDATE`;
- `REFUSE / MANDATE_LIMIT_EXCEEDED`;
- `REFUSE / PYTH_NOTIONAL_EXCEEDED`;
- `REFUSE / MARKET_CONDITION_INVALIDATED`;
- stale/invalid Pyth evidence fail-closed reason codes.

The UI should translate protocol reason codes into plain language.

## POST /api/v0.2/boundary-requests

Body:

```json
{
  "mandate": {},
  "assetRule": {},
  "action": {},
  "reasoningCommitmentHash": "...",
  "condition": null,
  "now": "ISO-8601 timestamp"
}
```

The result is a boundary-request object awaiting a human decision.

A boundary request never widens authority by itself.

## Guardian decisions and authority transitions

The v0.2 product semantics require:

`ALLOW_ONCE | WIDEN_MANDATE | REFUSE`

Standing widen authority comes only from an authorized human transition and advances Mandate version/nonce.

The current frozen v0.2 HTTP surface does not invent a new guardian mutation endpoint. The on-chain human-widen and stale-replay behavior is already proven by the canonical Solana runtime and represented in the frontend fixture/demo spine.

Do not label a frontend-only state transition as a committed on-chain transition unless an actual proof/signature is attached.

## Canonical Solana / Pyth proof

Program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Network:

`devnet`

Canonical run:

https://github.com/Faadil1/keys/actions/runs/35959137364

Proven:

- in-bounds execution without guardian approval;
- out-of-bounds program refusal;
- explicit authorized human widen;
- version/nonce advance;
- stale authorization refusal;
- live signed Pyth verification in the capital path;
- Pyth-derived USD/notional enforcement;
- precommitted max-price refusal;
- Pyth authority effect = NONE.

## Secret boundary

Never expose to the frontend:

- `PYTH_PRO_API_KEY`;
- `DEVNET_KEYPAIR_JSON`;
- signer material.

The browser receives only frontend-safe proof/evidence metadata.

## Hosting status

The repository includes a tested Vercel adapter:

- `src/vercel-adapter.mjs`
- `api/[...path].mjs`
- `api/health.mjs`
- `vercel.json`

A public hosted HTTP base URL is not currently claimed.

Benita owns final frontend/runtime deployment.

## Legacy compatibility

The following remain available because successful v0.1 proof/evidence is intentionally preserved:

- `/api/v0.1/capabilities`
- `/api/v0.1/demo/maya`
- `/api/v0.1/demo/live-proof`
- v0.1 proposal/review/transition/execution routes

They are **not** the current product target.

Likewise, `/api/v0.2/draft/*` aliases are compatibility aliases and should not be used in new frontend code.
