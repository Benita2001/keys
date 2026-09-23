# KEYS — Benita Frontend Handoff

Status: **READY FOR FRONTEND INTEGRATION**

## Ownership

Benita owns:

- frontend architecture;
- interaction design;
- visual system;
- responsive behavior;
- judge-facing product experience;
- frontend hosting/deployment;
- deciding how/when to surface live backend proof inside the UI.

Faadil owns:

- policy/domain engine;
- backend API contract;
- Solana authority runtime;
- Pyth market-evidence boundary;
- backend proof maintenance;
- backend integration support if a frontend blocker appears.

## What is already complete

Backend proof is complete for the demo-first slice:

- local Solana authority runtime: PASS;
- Solana devnet deployment/runtime: PASS;
- stable devnet program id: `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`;
- authenticated live Pyth US-equity evidence: PASS;
- live market evidence still resolves Maya-style `PROPOSE` to `ESCALATE / GUARDIAN_REVIEW_REQUIRED`;
- frontend/backend contract tests: PASS.

## Frontend starting points

Deterministic UI fixture:

`fixtures/frontend-maya-contract.json`

Stable semantic contract:

`docs/FRONTEND-BACKEND-CONTRACT.md`

Live integration contract:

`docs/LIVE-DEMO-INTEGRATION.md`

Backend API documentation:

`docs/BACKEND-API.md`

## Important product rule

The frontend does not need to be redesigned around TSLA.

The existing Maya/AAPL deterministic fixture may remain the canonical storytelling scenario.

The current authenticated live Pyth proof uses `TSLA` only because that equity is included in the current trial entitlement.

KEYS is asset-independent.

If the UI shows live market evidence, it must identify the actual live asset and must not claim AAPL is live unless AAPL entitlement is separately proven.

## Truth boundaries to preserve

- Market evidence does not create authority.
- Evidence does not equal maturity.
- Review eligibility is not a competence score.
- No real minor securities execution claim.
- No brokerage/custody claim.
- No API keys or private keys in frontend code.

## Integration freedom

Benita may choose:

- deterministic-only demo;
- live-proof mode;
- a toggle between deterministic and live-backed proof;
- any frontend hosting/deployment approach that fits the product experience.

The backend contract should be treated as stable unless an actual integration blocker is found.
