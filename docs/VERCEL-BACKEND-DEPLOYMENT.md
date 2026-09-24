# KEYS Backend — Vercel Deployment

Date: 2026-09-24  
Status: **DEPLOYMENT-READY / MANUAL VERCEL PROJECT CREATION REQUIRED**

## Purpose

Deploy the KEYS API as the backend runtime for the existing Cresco frontend.

This is **not a second product**.

```
Cresco frontend
    ↓
KEYS API
    ↓
Pyth AAPL / feed 922
    ↓
KEYS Mandate
    ↓
Solana devnet
```

The current Cresco frontend remains:

`https://cresco-lac.vercel.app`

The backend is deployed separately only as infrastructure.

## Vercel project settings

Create a new Vercel project from:

`Faadil1/keys`

Recommended project name:

`keys-api-stocklana`

Use:

- Root Directory: repository root (`./`)
- Framework Preset: Other
- Install Command: `npm install`
- Build Command: leave default / none
- Output Directory: leave blank
- Node runtime: current Vercel Node default

The repository already contains:

- `vercel.json`
- `api/health.mjs`
- `api/[...path].mjs`
- `src/vercel-adapter.mjs`

The backend root rewrites to the health endpoint.

## Required production environment variables

Add these as **server-side encrypted Vercel environment variables**:

### DEVNET_KEYPAIR_JSON

The dedicated KEYS devnet demo signer keypair.

Never expose this to the frontend.

### PYTH_PRO_API_KEY

The Pyth Pro API key with current AAPL entitlement.

Never expose this to the frontend.

## CORS

Production CORS defaults to:

`https://cresco-lac.vercel.app`

Optional override:

`KEYS_CORS_ORIGIN`

Do not use `*` for the production deployment unless intentionally troubleshooting.

## After deployment

Assume the Vercel production URL is:

`https://<keys-api-project>.vercel.app`

### 1. Health

Open:

`GET /`

Expected:

```json
{
  "ok": true,
  "service": "keys-backend",
  "contractVersion": "0.2"
}
```

### 2. Runtime metadata

Open:

`GET /api/v0.2/demo/runtime`

Expected truth:

- `mode = SERVER_HELD_DEVNET_DEMO`
- `network = solana-devnet`
- `asset = AAPL`
- program id = `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- `truthBoundary.executionAsset = DEMO_TOKEN`
- `truthBoundary.realMinorSecuritiesExecution = false`

If this route returns `DEVNET_EXECUTION_RUNTIME_UNAVAILABLE`, one or both required secrets are missing.

### 3. Live execution proof

Read the current runtime nonce from step 2, then call:

`POST /api/v0.2/actions/execute`

Example body:

```json
{
  "asset": "AAPL",
  "type": "BUY",
  "notional": 5,
  "expectedNonce": <CURRENT_NONCE>,
  "idempotencyKey": "<NEW_UUID>"
}
```

Expected successful truth:

- `evaluation.decision = ALLOW`
- `executionProof.status = CONFIRMED`
- `executionProof.simulated = false`
- real Solana devnet signature
- Pyth feed id `922`
- `verification = ONCHAIN_PYTH_LAZER`
- `authorityEffect = NONE`

## Connect Cresco

Once the backend URL is known, Cresco needs:

```
NEXT_PUBLIC_KEYS_API_URL=https://<keys-api-project>.vercel.app
NEXT_PUBLIC_KEYS_EXECUTION=runtime
```

If Benita's Vercel project cannot be edited by Faadil, either:

1. Benita adds those two public frontend variables and redeploys; or
2. KEYS commits the public backend base URL as a safe fallback in the Cresco adapter and Benita's Git-connected deployment rebuilds from `main`.

The backend secrets must never be copied into the Cresco project.

## Current canonical proof before hosted deployment

AAPL entitlement / signed payload:

https://github.com/Faadil1/keys/actions/runs/36035283447

AAPL HTTP→Solana devnet execution:

https://github.com/Faadil1/keys/actions/runs/36034651466

Revalidation:

https://github.com/Faadil1/keys/actions/runs/36035543689

The hosted deployment must preserve the same truth boundary.
