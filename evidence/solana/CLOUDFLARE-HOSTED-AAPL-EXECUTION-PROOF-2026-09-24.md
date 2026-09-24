# KEYS — Hosted Cloudflare AAPL HTTP-to-Solana Proof

Date: 2026-09-24  
Status: **PASS — PUBLIC HOSTED BACKEND PROVEN**

## Public backend

`https://keys-api-stocklana.faadil-casecraft.workers.dev`

Hosting:

Cloudflare Workers

## Hosted proof run

Workflow:

`cloudflare-hosted-execution-smoke`

Run:

https://github.com/Faadil1/keys/actions/runs/36049479465

Result:

**SUCCESS**

## Hosted health

`GET /`

Observed:

- `ok = true`
- `service = keys-backend`
- `contractVersion = 0.2`

Marker:

`CLOUDFLARE_HOSTED_HEALTH=PASS`

## Hosted runtime

`GET /api/v0.2/demo/runtime`

Observed:

- mode: `SERVER_HELD_DEVNET_DEMO`
- network: `solana-devnet`
- asset: `AAPL`
- program: `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- charter: `GUwYmmzW3woSC8mdu3auXCr9PP9QMKfHnZh2HzNbGYay`
- mandate: `AnBnNwACbwQ7KMN46jBoDS5pxsek2AdHV6X1B1uA7hXp`
- mandate version: `5`
- mandate nonce at proof: `4`
- Pyth feed id: `922`
- execution asset: `DEMO_TOKEN`
- live Pyth: `true`
- real minor securities execution: `false`
- brokerage/custody: `false`

Marker:

`CLOUDFLARE_HOSTED_RUNTIME=PASS`

## Hosted execution

Request:

```json
{
  "asset": "AAPL",
  "type": "BUY",
  "notional": 5,
  "expectedNonce": 4,
  "idempotencyKey": "cloudflare-hosted-36049479465-1"
}
```

Observed decision:

- `ALLOW`
- `WITHIN_MANDATE`
- requested notional: `5,000,000 micro-USD`
- standing action limit: `10,000,000 micro-USD`
- guardian approval required: `false`

Execution proof:

- status: `CONFIRMED`
- network: `solana-devnet`
- simulated: `false`
- asset: `AAPL`
- execution asset: `DEMO_TOKEN`
- Pyth source: `PYTH_PRO`
- Pyth feed id: `922`
- Pyth verification: `ONCHAIN_PYTH_LAZER`
- Pyth status: `FRESH`
- Pyth authority effect: `NONE`

Signature:

`5TDCr87Ayu51m1uUAPWvReRHAcwfJEh54W326dCWo11Mk26Fropodsy9FLhK2V4Qz6wE3y1TaBVNbpn6RuafRKfi`

Explorer:

`https://explorer.solana.com/tx/5TDCr87Ayu51m1uUAPWvReRHAcwfJEh54W326dCWo11Mk26Fropodsy9FLhK2V4Qz6wE3y1TaBVNbpn6RuafRKfi?cluster=devnet`

Terminal marker:

`CLOUDFLARE_HOSTED_HTTP_TO_SOLANA=PASS`

## Hosted infrastructure path

```
Cloudflare Worker
  ↓
authenticated Solana Devnet RPC
  ↓
KEYS stable Mandate
  ↓
live signed Pyth AAPL evidence
  ↓
Pyth Lazer verification
  ↓
KEYS program
  ↓
confirmed Solana devnet transaction
```

## Truth boundary

This is a public hosted proof of the KEYS execution engine.

It is still:

- Solana devnet;
- demo/mock SPL-token capital;
- server-held demo signer;
- not real AAPL shares;
- not brokerage;
- not custody;
- not production minor securities execution.

Canonical sentence:

> The public KEYS Cloudflare backend enforces bounded demo-token capital actions on Solana devnet using live signed Pyth AAPL market truth.

Authority invariant:

> Pyth can stop an action. Pyth cannot give Maya more authority.
