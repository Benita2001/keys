# KEYS — Concept Lock v0.2

Date: 2026-09-24  
Status: **LOCKED — BOUNDED-AUTONOMY FAMILY MODEL CURRENT**

## Product thesis

**Financial independence shouldn't happen all at once.**

KEYS Family gives a young person **bounded autonomy** over tokenized-stock actions.

A guardian defines an explicit Mandate once. Inside that Mandate, the young person acts freely without asking for permission on every action. Outside it, the action is refused or becomes a boundary request. Wider authority requires an explicit authorized human transition.

## Product principle

> **Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.**

The product is not continuous supervision.

The guardian authors the boundary; the young person owns the experience inside it.

## Stocklana wedge

**Family / teen + guardian** remains the primary wedge because it makes the principal/delegate problem legible immediately and turns Solana enforcement into a visible human moment.

Family is the face.

The Mandate engine is the bones.

## Core primitive

**Mandate-enforced bounded autonomy.**

A Mandate is an explicit, versioned, revocable permission envelope over capital.

Canonical dimensions:

- principal / guardian;
- delegate / beneficiary;
- asset scope;
- allowed actions;
- per-action limit;
- per-period limit;
- expiry;
- market conditions;
- escalation rules;
- revocation authority;
- version;
- nonce.

A delegate can never widen their own Mandate.

External evidence can restrict, expire or escalate an action. It can never silently widen human authority.

## Family policy pack

The familiar narrative remains useful:

`LEARN → PRACTICE → PROPOSE → BOUNDED → INDEPENDENT`

but it is **Family UX / policy**, not the universal protocol architecture.

A young person may be:

- real BOUNDED for diversified allowed assets;
- PRACTICE-only for an unfamiliar risk class;
- PROPOSE-only above a notional threshold;

at the same time.

**Stages are UX. Mandates are truth.**

## Learning

Learning stays in KEYS Family because markets are complex and young users need context.

Learning is:

- short;
- contextual;
- tied to a real action, boundary, market change or review;
- available in Practice with no real capital;
- private by default.

Learning is not:

- a competence score;
- a quiz-to-authority gate;
- a P&L leaderboard;
- an automatic promotion mechanism.

Learning completion may lead to **asking for a review**. It may never auto-widen the Mandate.

See `docs/FAMILY-LEARNING-LAYER.md`.

## Durable objects

- **Charter** — durable relationship/root authority and high-level family rules.
- **Mandate** — current executable permission envelope.
- **AssetRule** — asset/action-specific rule bound to a Mandate.
- **Boundary Request / ProposalCommitment** — a pre-outcome commitment used when requesting an exception or wider authority.
- **Market Evidence** — external factual evidence used to validate notional, freshness, confidence or a precommitted condition.
- **ReviewReceipt** — post-outcome/human-review evidence; never authority by itself.
- **Transition** — explicit authorized change to the Mandate; increments version/nonce and invalidates prior authorization material.

The old user-facing `Stake` noun is no longer required in the primary experience.

## Decision semantics

`ALLOW` — the action is inside the active Mandate and all required evidence is valid.

`ESCALATE` — the action is outside standing authority but can become a boundary request / human decision.

`REFUSE` — the action cannot execute under current authority/evidence.

## Pyth invariant

**MARKET EVIDENCE != AUTHORITY**

Pyth may:

- price an action for notional enforcement;
- make stale/unknown market evidence fail closed;
- expire a precommitted market condition;
- provide T0 vs review evidence.

Pyth may never grant or widen a human Mandate.

## Long-term company

Family is the first policy pack and reference client.

The longer-term company may generalize the same Mandate engine to:

- adult-child capital transfers;
- heirs / trustees;
- reversible elder autonomy;
- employees / treasury delegates;
- AI agents.

The Stocklana submission should not abstract away the Family user to tell that future-platform story.

## Non-goals

KEYS is not:

- a youth brokerage;
- a custodian claim;
- a financial-competence score;
- an automatic maturity classifier;
- a generic RWA compliance protocol;
- an AI-agent-first product;
- a trading game;
- a lesson/course product with authority rewards.
