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
npm test
npm run demo
```

## Truth boundary

Real today: deterministic policy engine, fail-closed market evidence interface, evidence summaries, explicit transition requirement, static user demo, automated tests.

Not claimed yet: Solana devnet deployment, live Pyth retrieval, brokerage/custody integration, real minor securities execution, venue-recognized credentials, or a financial-competence score.

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

The frontend owns interaction and visual language; backend reason codes, authority semantics, truth boundaries, and transition invariants remain canonical.
