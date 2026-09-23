# Benita — Frontend Start Here

You own the KEYS frontend and product experience.

The backend semantics are frozen enough for you to move without waiting for the remaining Solana/Pyth runtime proof.

## Read first

1. [../README.md](../README.md)
2. [../product/PRD-0.1.md](../product/PRD-0.1.md)
3. [CONCEPT-LOCK.md](CONCEPT-LOCK.md)
4. [FRONTEND-BACKEND-CONTRACT.md](FRONTEND-BACKEND-CONTRACT.md)
5. [../fixtures/frontend-maya-contract.json](../fixtures/frontend-maya-contract.json)

## What is fixed

Do not redesign the meaning of:
- mandate stages,
- ALLOW / ESCALATE / REFUSE,
- reason codes,
- explicit guardian transition,
- review eligibility wording,
- UNKNOWN failing closed,
- stale authorization/review refusal,
- truth boundaries around custody, brokerage and minor execution.

## What you own

You have freedom over:
- information architecture,
- navigation,
- screen composition,
- component system,
- typography,
- motion,
- visual identity,
- how Maya and the guardian understand the relationship,
- how the longitudinal evidence/history becomes legible,
- how the transition moment feels,
- responsive behavior.

The current static demo is a placeholder, not a design constraint.

## Canonical demo story

Maya is 16 and currently has a **PROPOSE** mandate.

She proposes a $25 AAPL position and commits her reasoning before the outcome is known:
- rationale,
- counterargument,
- horizon,
- reconsideration condition.

The backend returns:

```
ESCALATE
GUARDIAN_REVIEW_REQUIRED
```

The product should make the distinction memorable:

**Proposal is not authority.**

Later, longitudinal evidence makes the mandate **Eligible for Mandate Review**.

An authority increase without an authorized guardian is refused.

The guardian explicitly authorizes:

```
PROPOSE → BOUNDED
```

The mandate version/nonce advances.

Old review/authorization material is then stale and cannot be reused.

A final real-execution attempt with eligibility `UNKNOWN` is refused.

End promise:

**Financial independence shouldn't happen all at once.**

## Experience target

KEYS should feel like something a teenager and parent could sit down and use together without either person feeling patronized.

Aim for:
- calm,
- trustworthy,
- serious,
- age-respectful,
- family-native,
- autonomous without being reckless.

Avoid:
- generic fintech dashboard,
- kids banking clone,
- crypto wallet / DeFi aesthetic,
- LMS/course UI,
- cartoon treatment,
- AI-dashboard visual language,
- dark-blue SaaS default,
- gratuitous glassmorphism/gradients,
- P&L leaderboard framing.

## Development assumption

You can use `fixtures/frontend-maya-contract.json` as the local frontend data source first.

That fixture is covered by backend CI so the core Maya semantics cannot silently drift.

When the frontend is ready for live integration, the backend can expose the same contract through an API/client adapter without changing the product meaning.
