# Cresco / Benita — Backend Delta after v0.2 Freeze

Date: 2026-09-24  
Status: **CURRENT BACKEND TRUTH — OVERRIDES STALE ASSUMPTIONS IN PR #1 HANDOFF**

This document exists because the Cresco frontend branch was created against an older KEYS backend snapshot.

It does not replace the frozen semantic contract:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

It tells Benita which statements in `docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md` are now stale and what to integrate next.

## Already resolved since the Cresco branch was cut

### v0.2 contract

**Resolved.**

The v0.2 contract is no longer DRAFT.

Current contract:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

Status:

**FROZEN FOR FAMILY EXPERIENCE INTEGRATION**

Do not integrate new frontend work against:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2-DRAFT.md`

That file is historical only.

### Final evaluation route

**Resolved.**

Use:

`POST /api/v0.2/actions/evaluate`

Do not use the draft alias in new Cresco code:

`POST /api/v0.2/draft/actions/evaluate`

The draft alias exists only for compatibility.

### Pyth on-chain verification

**Resolved / PROVEN.**

The canonical Solana devnet runtime already proves:

- signed live Pyth Pro/Lazer TSLA payload;
- Ed25519 verification;
- CPI through the canonical Pyth Lazer verifier;
- feed-id matching;
- freshness/confidence enforcement;
- micro-USD conversion;
- per-action USD notional refusal;
- per-period USD notional refusal;
- precommitted max-price refusal;
- authority effect = NONE.

Canonical proof:

https://github.com/Faadil1/keys/actions/runs/35959137364

Therefore the old Cresco note:

> "USD/notional Pyth enforcement isn't built on-chain yet"

is stale.

### PreStocks

**New since the Cresco branch was cut.**

Current routes:

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

Canonical live proof:

https://github.com/Faadil1/keys/actions/runs/35969672666

Use as an optional Learn / Practice / representation-understanding surface.

Default execution eligibility remains false.

## Newly implemented backend bridge

### GET /api/v0.2/demo/runtime

Purpose:

Expose the stable server-held **devnet demo runtime** that Cresco can use for judge-facing proof.

Expected truth:

- network = Solana devnet;
- program = canonical KEYS program;
- asset = TSLA market truth;
- capital asset = demo/mock SPL token;
- signer mode = server-held devnet demo signer;
- real minor securities execution = false.

### POST /api/v0.2/actions/execute

Purpose:

Relay a bounded demo-token action into the real KEYS Solana devnet program and return the transaction proof.

Request:

```json
{
  "asset": "TSLA",
  "type": "BUY",
  "notional": 5,
  "expectedNonce": 3,
  "idempotencyKey": "uuid"
}
```

Successful response shape:

```json
{
  "contractVersion": "0.2",
  "type": "V0_2_ACTION_EXECUTION",
  "runtimeMode": "SERVER_HELD_DEVNET_DEMO",
  "evaluation": {
    "decision": "ALLOW",
    "reasonCode": "WITHIN_MANDATE"
  },
  "executionProof": {
    "status": "CONFIRMED",
    "network": "solana-devnet",
    "signature": "<base58>",
    "programId": "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
    "simulated": false,
    "executionAsset": "DEMO_TOKEN",
    "pyth": {
      "source": "PYTH_PRO",
      "feedId": 1435,
      "verification": "ONCHAIN_PYTH_LAZER",
      "authorityEffect": "NONE"
    }
  }
}
```

The route is now implemented in backend code.

Current proof state at the time of this document:

**CI devnet stable-runtime bootstrap + HTTP execution smoke is running.**

Do not label the bridge canonically proven until that workflow returns PASS.

## Demo signer model

For the hackathon demo, the runtime deliberately uses a:

**SERVER_HELD_DEVNET_DEMO signer**

This is acceptable only with honest labeling.

It is not:

- child self-custody;
- embedded-wallet production architecture;
- brokerage custody;
- mainnet capital;
- xStocks settlement.

The purpose is to let a judge press Buy in Cresco and see a real devnet KEYS transaction with real on-chain Pyth enforcement.

## Idempotency boundary

The current backend deduplicates identical `idempotencyKey` values in the active server process.

Current scope:

`PROCESS_LOCAL_DEMO`

This is sufficient for the controlled hackathon runtime path but is **not** a production-grade durable idempotency store across cold starts/regions.

Cresco may continue sending an idempotency key.

Do not claim exactly-once execution across arbitrary serverless restarts yet.

## Still real gaps

These remain genuine and should not be confused with the resolved items above:

1. **Hosted backend connection** — Cresco is not yet pointed at a deployed KEYS API.
2. **Server-owned identity/session** — current evaluation semantics may still receive Mandate context from the client.
3. **Mandate read/update HTTP API** — no complete v0.2 guardian CRUD/transition surface yet.
4. **Boundary-request persistence/decision API** — envelope creation exists; persistence/list/decision remains.
5. **Allow-once durable consumption** — not yet implemented as a persistent server/on-chain receipt.
6. **Mandate-wide multi-asset period aggregate** — the on-chain `spent_this_period_notional` currently lives on each AssetRule. Do not describe this as one cryptographically enforced total across all companies.
7. **Production wallet/auth/family linking** — still future hardening.
8. **Real funding/KYC/custody** — out of current hackathon truth.
9. **Full live market universe/history** — current proven Pyth entitlement is TSLA.

## Cresco integration changes now

Benita should update the frontend adapter in this order:

1. replace `/api/v0.2/draft/actions/evaluate` with `/api/v0.2/actions/evaluate`;
2. use `GET /api/v0.2/demo/runtime` to resolve the current demo Mandate nonce/state;
3. keep `NEXT_PUBLIC_KEYS_EXECUTION=runtime`;
4. call `POST /api/v0.2/actions/execute`;
5. on `CONFIRMED + simulated:false`, show the transaction signature and **View on Solana**;
6. on REFUSE, show the returned boundary reason and never fabricate proof;
7. keep the copy explicit that the capital asset is a demo/mock SPL token;
8. optionally add PreStocks under Learn / Practice, never as the homepage hero.

## Frontend routing invariant

The normal Cresco Family flow and the live Solana proof lane are intentionally separate.

**Family product lane**
- keeps the current broad demo asset set and bounded-autonomy UX;
- uses the frozen evaluation semantics;
- does not pretend every visible asset has a proven live Solana execution representation.

**Technical proof lane**
- lives under `How Cresco works → Technical details`;
- resolves the stable TSLA demo runtime from `GET /api/v0.2/demo/runtime`;
- calls `POST /api/v0.2/actions/execute`;
- shows success only for `CONFIRMED + simulated:false + real signature`;
- links directly to the devnet transaction.

Do not globally route Apple/NVDA/etc. Money Mode into the TSLA proof runtime.

## Judge-facing target

The strongest demonstration is:

```
Maya sees My Key
    ↓
$5 action
    ↓
Cresco → KEYS API
    ↓
live signed Pyth TSLA evidence
    ↓
KEYS Solana devnet program
    ↓
ALLOW
    ↓
real transaction signature
    ↓
View on Solana
```

Then:

```
larger action
    ↓
KEYS program / Mandate boundary
    ↓
REFUSE
    ↓
Ask for more room
```

Human widening remains the only path that expands standing authority.

## Canonical truth sentence

> KEYS enforces bounded demo-token capital actions on Solana devnet using live Pyth market truth; the current Cresco integration is a hackathon demo runtime, not real minor securities execution.
