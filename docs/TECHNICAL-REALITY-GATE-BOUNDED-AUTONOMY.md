# KEYS — Technical Reality Gate: Bounded Autonomy

Date: 2026-09-24  
Status: **PASS WITH ARCHITECTURE DELTA**

## Decision

The improved Family wedge is technically credible without turning KEYS into a parental-control dashboard.

The canonical product direction is now:

> A guardian defines an explicit mandate once. The young person acts freely inside it. Actions outside it are refused or escalated. Market evidence may restrict or expire an action, but it may never grant more human authority. Wider authority requires an explicit signed transition, and old authorization material becomes stale.

The previous v0.1 proof remains valid evidence for authority-transition semantics, but it is no longer the complete target architecture.

## What must be true

1. **In-bounds action is immediate.** No proposal or guardian approval is required for ordinary actions already covered by the current Mandate.
2. **The capital boundary is machine-enforced.** An out-of-bounds action must fail in the Solana execution path, not only in UI/backend policy.
3. **The Mandate is the technical truth.** Family stages may remain as a UX/policy pack, but authority is represented by explicit scopes and bounds.
4. **Pyth is load-bearing.** Fresh signed market evidence can be used to compute notional, expire a precommitted condition, or fail closed on stale/unknown evidence.
5. **Pyth never grants authority.** External evidence may restrict, expire, or escalate; only an authorized human transition may widen a human delegate's authority.
6. **Learning remains in the product.** Learning is contextual and practice is available, but lesson completion, quiz performance, P&L, or model scores do not auto-promote authority.
7. **Minor private reasoning stays off public chain.** Only commitments/hashes, bounds, receipts and transition proofs belong on-chain.
8. **Real execution truth remains separate from legal eligibility.** Mainnet tokenized-stock use still requires issuer/venue/jurisdiction eligibility.

## Architecture options considered

### A. UI/backend-only rules — REJECTED

A centralized service can enforce limits inside its own product, but this does not prove the Stocklana-native mechanism. It also leaves KEYS as a policy dashboard rather than an execution layer.

### B. Raw SPL Token delegate allowance — VALID PROOF TOOL, NOT CANONICAL ARCHITECTURE

SPL Token delegation can authorize a delegate to transfer or burn a limited token amount from a token account. This is useful for a narrow proof of an on-chain ceiling.

It is not sufficient as the long-term KEYS Mandate because it does not natively express:

- USD/notional limits across changing prices;
- per-period aggregate limits;
- multi-asset policy;
- Pyth conditions;
- expiry semantics across a policy matrix;
- one-time exceptions versus standing authority;
- boundary-request semantics;
- cross-action rules.

Use it only where it is the simplest truthful proof adapter.

### C. Squads smart account / spending limits — STRONG SUBSTRATE, NOT THE POLICY MODEL

Squads v4 provides smart-account infrastructure, spending limits, time locks and programmable asset management. It is a credible production substrate.

However, KEYS still needs its own policy layer for market conditions, proposal commitments, evidence semantics, learning separation, explicit mandate versioning and human-only widening.

Squads may later hold capital while KEYS compiles Mandates into compatible spending-limit/account instructions.

### D. KEYS program-controlled vault — CANONICAL ARCHITECTURE

A KEYS-controlled vault/PDA holds demo assets or controls the token accounts from which authorized actions execute.

The execution instruction checks the current Mandate before moving capital:

- delegate signer;
- mandate version / nonce;
- allowed asset;
- allowed action;
- per-action notional;
- per-period notional;
- expiry;
- Pyth freshness / confidence / committed market condition;
- current status (active / paused / revoked).

Only after those checks pass does the program CPI into the token program or an approved execution adapter.

This architecture directly expresses the product and keeps the authority policy independent of any single frontend.

**Decision: adopt D as the canonical target.**

Squads remains a possible production smart-account substrate. Raw SPL delegation remains a possible proof adapter.

## Pyth reality

Current KEYS live proof uses authenticated Pyth Pro REST data off-chain. That proof is real, but it is not yet an on-chain Pyth enforcement proof.

Pyth Pro supports Solana verification of signed price updates. The target integration is:

1. server/backend subscribes to or fetches Pyth Pro using the secret API key;
2. request a signed Solana-format payload, not the current unsigned-only demo format;
3. include the signed payload in the Solana transaction;
4. the KEYS program verifies/parses the update using the Pyth Pro/Lazer Solana SDK and Solana ed25519 verification;
5. enforce freshness/confidence and the committed condition before execution.

Official references:
- https://docs.pyth.network/price-feeds/pro/integrate-as-consumer/svm
- https://docs.pyth.network/price-feeds/pro/subscribe-to-prices
- https://docs.pyth.network/price-feeds/pro/api/rest

## Learning / Practice reality

Learning is retained as a **Family experience layer**, not an automatic authority engine.

Recommended learning moments:

- first exposure to a new asset or action;
- before a new risk class;
- after a boundary refusal;
- when Pyth invalidates a user's own precommitted condition;
- after execution/review, comparing T0 belief with what happened.

Practice mode uses the same market evidence and Mandate vocabulary but does not move real capital.

Rules:

- learning completion may suggest **requesting** a review;
- learning completion may never auto-widen authority;
- P&L may never be the promotion mechanism;
- the guardian may explicitly widen, narrow, pause or revoke a Mandate.

## Current v0.1 gaps

The deployed program currently proves authority transitions, but not bounded capital execution. Specific gaps:

- Mandate stores a single stage rather than a permission matrix;
- no program-controlled vault / execution instruction;
- no asset-rule PDA or explicit mint allowlist;
- no per-period spend accounting;
- no mandate expiry/pause/revoke state;
- no on-chain Pyth verification;
- Proposal is still required by the old happy path;
- review eligibility is threshold-driven and separate from the new boundary-request model;
- transition logic allows any forward jump rather than compiling an explicit new permission envelope;
- proposal `created_at` is caller-supplied;
- downward transitions are not first-class.

These are architecture deltas, not failures of the v0.1 proof.

## Gate verdict

**PASS.**

The new concept is technically realizable on Solana with a clean separation between:

- **Mandate / capital enforcement** — on-chain;
- **Pyth market truth** — signed external evidence verified at execution;
- **learning** — contextual product layer;
- **human authority changes** — explicit authorized signatures;
- **legal eligibility / custody / brokerage claims** — separate and not implied.

Next gate: **BACKEND_V0_2_BOUNDED_AUTONOMY_BUILD**.
