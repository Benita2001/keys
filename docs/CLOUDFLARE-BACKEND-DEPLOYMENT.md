# KEYS Backend — Cloudflare Workers Deployment

Date: 2026-09-24  
Status: **DEPLOYMENT-READY**

## Architecture

This remains one KEYS/Cresco product.

```
Cresco frontend
https://cresco-lac.vercel.app
        ↓
KEYS API — Cloudflare Worker
        ↓
Pyth AAPL / feed 922
        ↓
KEYS Mandate
        ↓
Solana devnet
```

Cloudflare is only the backend hosting layer.

## Worker

Config:

`wrangler.jsonc`

Entry point:

`src/cloudflare-worker.mjs`

Worker name:

`keys-api-stocklana`

Compatibility date:

`2026-09-24`

The current compatibility date gives Workers the Node.js compatibility required by the existing KEYS runtime.

## Required secrets

Add as Cloudflare Worker **Secrets**, never plaintext vars:

- `DEVNET_KEYPAIR_JSON`
- `PYTH_PRO_API_KEY`
- `SOLANA_DEVNET_RPC_URL`

Required for hosted Cloudflare execution:

- `SOLANA_DEVNET_RPC_URL` — authenticated Solana Devnet HTTPS RPC endpoint.

Use a managed/authenticated RPC URL rather than a shared public endpoint. The official Solana public RPC was blocked from Cloudflare with HTTP 403, and the OnFinality public endpoint hit HTTP 429 shared-rate limits.

For OnFinality, create a free authenticated Solana Devnet endpoint and store the full HTTPS endpoint as a Cloudflare **Secret**.

Do not place these secrets in Cresco.

## Non-secret vars

Already defined in `wrangler.jsonc`:

- `KEYS_CORS_ORIGIN=https://cresco-lac.vercel.app`
- `KEYS_DEMO_LIVE_EQUITY=AAPL`

## Deploy through Cloudflare Git integration

In Cloudflare:

1. Go to **Workers & Pages**.
2. Create a Worker / import an existing Git repository.
3. Select `Faadil1/keys`.
4. Use the repository root.
5. Worker configuration is read from `wrangler.jsonc`.
6. Add the two required secrets.
7. Deploy.

If Cloudflare asks for a deploy command, use:

`npx --yes wrangler@4 deploy`

For local validation:

`npx --yes wrangler@4 deploy --dry-run --outdir dist/cloudflare`

## Deploy through Wrangler CLI instead

After authenticating Wrangler:

```bash
npx --yes wrangler@4 secret put DEVNET_KEYPAIR_JSON
npx --yes wrangler@4 secret put PYTH_PRO_API_KEY
npx --yes wrangler@4 deploy
```

Do not paste secret values into Git or shell history when avoidable.

## Validation after deployment

Assume Cloudflare gives:

`https://keys-api-stocklana.<account-subdomain>.workers.dev`

### 1. Health

`GET /`

Expected:

```json
{
  "ok": true,
  "service": "keys-backend",
  "contractVersion": "0.2"
}
```

### 2. Runtime

`GET /api/v0.2/demo/runtime`

Expected:

- `mode = SERVER_HELD_DEVNET_DEMO`
- `network = solana-devnet`
- `asset = AAPL`
- program id = `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- `executionAsset = DEMO_TOKEN`
- `realMinorSecuritiesExecution = false`

### 3. Live AAPL execution

Read the current nonce from the runtime route and call:

`POST /api/v0.2/actions/execute`

with:

```json
{
  "asset": "AAPL",
  "type": "BUY",
  "notional": 5,
  "expectedNonce": <CURRENT_NONCE>,
  "idempotencyKey": "<NEW_UUID>"
}
```

Expected:

- `ALLOW / WITHIN_MANDATE`
- `executionProof.status = CONFIRMED`
- `executionProof.simulated = false`
- real Solana devnet signature
- Pyth feed id `922`
- `verification = ONCHAIN_PYTH_LAZER`
- `authorityEffect = NONE`

## Connect Cresco

Once the Worker URL is known, Cresco needs only two **public frontend values**:

```
NEXT_PUBLIC_KEYS_API_URL=https://keys-api-stocklana.<account-subdomain>.workers.dev
NEXT_PUBLIC_KEYS_EXECUTION=runtime
```

The preferred path if Faadil cannot edit Benita's Vercel project:

1. commit the public Worker base URL as the safe default backend URL in the Cresco adapter;
2. keep `NEXT_PUBLIC_KEYS_API_URL` as an override;
3. Benita's Git-connected Vercel deployment only needs to rebuild from `main`.

No Pyth or Solana private key ever enters Cresco.

## Current proof before hosted Cloudflare deployment

AAPL entitlement / signed payload:

https://github.com/Faadil1/keys/actions/runs/36035283447

AAPL HTTP→Solana devnet execution:

https://github.com/Faadil1/keys/actions/runs/36034651466

AAPL bridge revalidation:

https://github.com/Faadil1/keys/actions/runs/36035543689
