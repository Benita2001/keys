# KEYS

**Financial independence shouldn't happen all at once.**

KEYS is a progressive financial stewardship system for young people and families. It preserves the relationship around capital while authority changes over time: learn → practice → propose → act within bounds → independent control.

## The product primitive

KEYS separates three things that youth-finance products often collapse together:

- **what this capital relationship is** (`Stake`),
- **what the young person may do today** (`Mandate`),
- **what they want to do and why** (`Proposal`).

External market evidence can make the current record eligible for a mandate review. It **does not automatically grant real financial authority**. Real authority changes only through an explicit authorized transition.

## v0.1 vertical slice

This repository currently proves the local deterministic core:

`Charter → Mandate → Proposal → Market Evidence → Refusal / Escalation → Evidence Summary → Mandate Review Eligibility → Explicit Transition → Eligibility Gate`

Run:

```bash
npm install
npm test
npm run demo
npm run api
```

`npm run api` starts the local frontend-integration backend on `127.0.0.1:8787` by default.

## Truth boundary

Real today:

- deterministic policy engine and evidence summaries;
- frozen frontend/backend semantic contract;
- local HTTP backend facade with server-owned evidence boundary;
- explicit simulation vs committed-authority separation;
- Anchor authority provider contract;
- executable local Solana authority proof: guardian signer required, mandate version/nonce advance, stale review replay refused;
- devnet-target SBF/Anchor build pass before the funding gate;
- fail-closed Pyth Pro adapter and authenticated server-side integration boundary;
- automated Node/Rust/Anchor tests.

Not claimed yet:

- Solana devnet deployment;
- live authenticated Pyth price retrieval;
- brokerage/custody integration;
- real minor securities execution;
- venue-recognized credentials;
- a financial-competence score.

See `docs/TRUTH-BOUNDARY.md`.

## Candidate B vs COVENANT

KEYS is intentionally independent from COVENANT.

- **COVENANT:** continuity of economic intent while asset representations change.
- **KEYS:** continuity of stewardship while human authority changes.

They should be evaluated as two separate Stocklana product candidates.

## Frontend collaboration

KEYS has a frozen v0.1 semantic contract so frontend work can proceed independently of the deeper Solana/Pyth proof.

- Frontend / product experience: Benita
- Backend / policy engine / Solana / Pyth / proof: Faadil
- Contract: [docs/FRONTEND-BACKEND-CONTRACT.md](docs/FRONTEND-BACKEND-CONTRACT.md)
- Maya integration fixture: [fixtures/frontend-maya-contract.json](fixtures/frontend-maya-contract.json)
- Frontend-facing backend facade: [src/frontend-api.mjs](src/frontend-api.mjs)
- Local backend API: [docs/BACKEND-API.md](docs/BACKEND-API.md)
- Latest Solana authority proof: [docs/SOLANA-AUTHORITY-PROOF.md](docs/SOLANA-AUTHORITY-PROOF.md)

The frontend owns interaction and visual language; backend reason codes, authority semantics, truth boundaries, and transition invariants remain canonical.
