# Truth Boundary

Date: 2026-09-24

## Real in v0.1

- deterministic mandate semantics;
- proposal/refusal logic;
- market freshness/confidence normalization;
- evidence summaries;
- explicit mandate review eligibility;
- explicit authorized transition semantics;
- local HTTP backend facade;
- Vercel-ready serverless API adapter;
- executable local Solana authority runtime;
- verified Solana devnet deployment/runtime;
- stable canonical devnet program and upgrade authority;
- authenticated live Pyth Pro US-equity evidence;
- tests proving fail-closed authority paths.

Canonical devnet program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Canonical live Pyth proof feed:

`Equity.US.TSLA/USD`

## Real in v0.2

KEYS Family v0.2 now has a proven **bounded-autonomy capital path** on local Solana and the canonical devnet program.

Runtime proof now covers:

- permission-matrix core / AssetRule;
- program-controlled demo-token vault;
- in-bounds capital execution without guardian approval;
- out-of-bounds capital refusal inside the KEYS program;
- explicit human widening with version/nonce advance;
- stale execution refusal;
- the same larger action succeeding after the widen;
- pause/downward authority blocking execution;
- signed Pyth Pro Solana-payload availability at the backend evidence boundary.

Still **specified / not yet proven on-chain**:

- Pyth signature/payload verification inside `execute_within_mandate`;
- Pyth-derived USD/notional enforcement;
- Pyth-enforced precommitted price conditions;
- frozen frontend/backend contract v0.2.

## Not claimed

- Solana mainnet deployment;
- live AAPL entitlement on the current Pyth trial token;
- brokerage or custodian integration;
- real minor securities execution;
- real family identity verification;
- automatic legal handoff at age of majority;
- venue acceptance of a KEYS record;
- continuous Pyth monitoring without an external service;
- any claim that KEYS measures financial maturity or investment competence.

## Required semantic rules

Use:

- **Mandate**
- **Practice**
- **Boundary Request / Proposal**
- **Market Evidence**
- **Review**
- **ALLOW / ESCALATE / REFUSE**
- **Eligible / Ineligible / Unknown** where eligibility is actually relevant.

Avoid:

- certified investor;
- competence score;
- safe investment;
- approved security;
- custody/broker claims not actually integrated;
- claims that a token balance proves conventional legal share ownership.

## Canonical invariants

`MARKET EVIDENCE != AUTHORITY`

`LEARNING COMPLETION != AUTHORITY`

`PROFIT != DECISION QUALITY`

`INSIDE MANDATE -> MAY EXECUTE IF ALL REQUIRED EVIDENCE/ELIGIBILITY PASSES`

`OUTSIDE MANDATE -> REFUSE OR HUMAN ESCALATION`

`OLD AUTHORIZATION != CURRENT AUTHORITY AFTER VERSION/NONCE CHANGE`
