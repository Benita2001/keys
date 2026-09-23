# KEYS — Live Demo Integration Contract

Status: **BACKEND CONTRACT READY / FRONTEND OWNED BY BENITA**

This document is the handoff between Faadil's verified backend proof surfaces and Benita's frontend.

It does **not** prescribe visual design.

## Frontend rule

The existing deterministic Maya fixture remains valid:

`GET /api/v0.1/demo/maya`

Benita may continue building against it without waiting for a live runtime.

The new live-backed surface is:

`GET /api/v0.1/demo/live-proof`

The frontend may progressively switch or offer a judge/demo proof mode using this route.

## What the live route does

The backend:

1. derives the Maya proposal scenario;
2. selects a configured live US-equity feed;
3. fetches Pyth Pro market evidence server-side;
4. evaluates the proposal through the same KEYS policy engine;
5. returns display-safe market evidence;
6. attaches public Solana devnet proof metadata;
7. never exposes the Pyth API key or Solana private key.

Current default live equity:

`TSLA`

The default is configurable with:

`KEYS_DEMO_LIVE_EQUITY`

The product is not semantically tied to TSLA or AAPL.

## Stable response shape

Illustrative envelope:

```json
{
  "contractVersion": "0.1",
  "type": "LIVE_DEMO_PROOF",
  "mode": "LIVE_BACKEND_EVIDENCE",
  "beneficiary": {
    "displayName": "Maya"
  },
  "scenario": {
    "asset": "TSLA",
    "proposal": {},
    "mandate": {
      "stage": "PROPOSE",
      "version": 1,
      "nonce": 0
    }
  },
  "evaluation": {
    "marketEvidence": {
      "source": "PYTH_PRO",
      "status": "FRESH",
      "price": 379.696,
      "confidence": 0.019,
      "confidenceBps": 0.5004,
      "publishTime": "2026-09-23T19:36:42.000Z",
      "marketSession": "regular",
      "publisherCount": 19
    },
    "decision": "ESCALATE",
    "reasonCode": "GUARDIAN_REVIEW_REQUIRED"
  },
  "proofs": {
    "solana": {
      "network": "devnet",
      "status": "VERIFIED",
      "programId": "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
      "explorerUrl": "https://explorer.solana.com/address/ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk?cluster=devnet"
    },
    "pyth": {
      "status": "VERIFIED_LIVE_EQUITY",
      "secretExposedToFrontend": false
    }
  },
  "truthBoundary": {
    "marketEvidenceCreatesAuthority": false,
    "executionEligibility": "UNKNOWN",
    "realSecuritiesExecution": false,
    "liveEvidenceAsset": "TSLA"
  }
}
```

Exact live price values change on every request and must never be hardcoded into the frontend.

## Capabilities discovery

The frontend can first call:

`GET /api/v0.1/capabilities`

The `liveDemoProof` field exposes:

- readiness status;
- selected live equity;
- live route;
- canonical Solana devnet program id.

This lets the UI fail gracefully rather than guessing whether live evidence exists.

## Recommended frontend behavior

If `liveDemoProof.status` is ready:

- show the live proof state;
- label market evidence as live;
- allow the user/judge to inspect freshness/confidence;
- expose the Solana Explorer link as proof;
- keep the decision language as `ESCALATE / GUARDIAN_REVIEW_REQUIRED`.

If live evidence is unavailable:

- do not fake a live price;
- fall back to the deterministic Maya fixture;
- label the fallback as simulation/demo;
- preserve the reason code.

## Product invariants

The UI must preserve:

`MARKET EVIDENCE != AUTHORITY`

and:

`EVIDENCE -> ELIGIBLE FOR REVIEW -> EXPLICIT AUTHORIZED TRANSITION`

Do not translate market quality, returns, or review history into a competence score.

## Current verified backend evidence

Solana devnet:

- program: `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- authority runtime: PASS
- stable upgrade authority: PASS

Pyth:

- authenticated live US-equity: PASS
- canonical proof feed: `Equity.US.TSLA/USD`
- canonical proof run: https://github.com/Faadil1/keys/actions/runs/35910460176

The frontend does not need either secret to render or consume the safe response.


## Ownership and hosting

Benita owns:

- frontend integration;
- product experience;
- hosting/deployment of the judge-facing application;
- deciding whether the experience uses deterministic-only, live-proof, or a deliberate toggle between the two.

Faadil owns backend semantics and proof maintenance only.

The repository includes a CI-tested Vercel adapter, but canonical state does **not** currently claim a public hosted backend URL. Benita may use Vercel or another appropriate hosting path as long as the API contract and secret boundary remain intact.

If a hosted live backend is used, `PYTH_PRO_API_KEY` must stay server-side.
