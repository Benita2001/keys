# KEYS Backend External Proof Gates

Date: 2026-09-23  
Status: **DEVNET + LIVE PYTH PROOF COMPLETE**

This file preserves the external-proof gate history and current remaining constraints.

## 1. Solana devnet — RESOLVED

Previous blocker:

`BLOCKED_FUNDING`

Resolution:

- canonical devnet-only wallet funded with test SOL;
- keypair stored only in GitHub Actions secret `DEVNET_KEYPAIR_JSON`;
- program deployed to devnet;
- authority runtime executed successfully;
- same program id subsequently upgraded and revalidated.

Canonical program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Stable-program proof:

https://github.com/Faadil1/keys/actions/runs/35905841296

Terminal state:

`DEVNET_PROOF=PASS`

## 2. Live Pyth evidence — RESOLVED

Previous blockers:

- missing API key;
- initial secret-injection mismatch;
- AAPL not included in the current demo-trial entitlement.

Resolution:

- `PYTH_PRO_API_KEY` stored only in GitHub Actions;
- secret injection verified;
- token validity verified with a BTC control feed;
- live proof made asset-configurable;
- trial-entitled `Equity.US.TSLA/USD` used for the canonical authenticated proof.

Canonical live proof:

https://github.com/Faadil1/keys/actions/runs/35910460176

Verified:

- live US-equity status: `FRESH`;
- price/confidence/publish time obtained;
- market session and publisher count obtained;
- KEYS decision: `ESCALATE / GUARDIAN_REVIEW_REQUIRED`.

Terminal state:

`PYTH_LIVE_PROOF=PASS fresh_market_evidence_reached_guardian_review`

AAPL is still **not entitled on the current trial token**. That is not a product blocker because KEYS is asset-independent.

## 3. Remaining real-execution constraint

There is still no verified brokerage/custody/venue eligibility integration.

Canonical state:

`UNKNOWN`

Therefore any route implying real securities execution must fail closed.

This remains intentional and is not part of the hackathon proof.

## 4. Frontend/runtime handoff

The backend contract and proof surfaces are complete enough for frontend integration.

Benita owns:

- frontend architecture and UX/UI;
- live-proof integration;
- frontend/runtime hosting and deployment.

Faadil owns:

- backend semantics;
- policy engine;
- Solana/Pyth proof maintenance;
- backend support if integration uncovers an actual contract/runtime issue.

The backend repo is Vercel-ready, but no hosted public HTTP runtime is currently claimed in canonical state.
