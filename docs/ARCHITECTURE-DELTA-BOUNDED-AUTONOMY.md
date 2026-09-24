# KEYS — Architecture Delta: v0.1 Authority Proof → v0.2 Bounded Autonomy

Date: 2026-09-24  
Status: **CANONICAL BUILD DELTA**

## Product delta

Old happy path:

`Proposal → Guardian Review → Transition`

New happy path:

`Action inside Mandate → ALLOW immediately`

Boundary path:

`Action outside Mandate → REFUSE or Boundary Request → Human decision → explicit Mandate transition`

Learning remains available before, during and after these actions, but it is not a permission oracle.

## Canonical state model

### Charter

Durable relationship / root authority.

Target fields:

- guardian / principal;
- beneficiary / delegate;
- jurisdiction hash;
- charter version;
- bump.

The Charter should not carry day-to-day trading limits.

### Mandate

The current executable permission envelope.

Target fields:

- charter;
- policy-pack id/version;
- optional family UX stage;
- status: ACTIVE / PAUSED / REVOKED;
- version;
- nonce;
- effective_at;
- expires_at;
- quote unit;
- max_action_notional;
- max_period_notional;
- period_seconds;
- period_start;
- spent_this_period;
- market evidence max age;
- market confidence bound;
- bump.

**Stage is descriptive UX state; the permission envelope is authoritative.**

### AssetRule PDA

One rule per Mandate × mint/asset.

Target fields:

- mandate;
- mint / representation identifier;
- action bitmask (e.g. buy / sell / transfer);
- enabled;
- optional per-asset notional cap;
- Pyth feed id / mapping hash where applicable;
- bump.

This avoids hard-coding a fixed-size asset array into the Mandate.

### BoundaryRequest / ProposalCommitment

Created only when the delegate wants something outside the current Mandate or when the Family policy pack intentionally requires a precommitment.

Target fields:

- mandate;
- delegate;
- current mandate nonce;
- requested change hash or one-time action hash;
- reasoning commitment hash;
- asset/mint;
- amount/notional request;
- condition type / threshold hash;
- created_at from `Clock`;
- valid_until;
- status;
- bump.

Free-form teen reasoning stays off-chain.

### ReviewReceipt

Preserve as a post-outcome / human-review object, but do not use it as an automatic promotion score.

Target semantics:

- references the Mandate nonce/version and request;
- records evidence hash / result;
- may state `ELIGIBLE_FOR_REVIEW`, `NOT_ELIGIBLE`, or `UNKNOWN`;
- cannot itself widen authority.

### LearningProfile — OFF-CHAIN

Learning is not public-chain identity.

Suggested fields in app/backend:

- contextual concepts already introduced;
- practice scenarios completed;
- user-selected confidence/help preferences;
- first-use flags by asset/action;
- reflection prompts and private notes.

No global competence score.

## Canonical instruction set

### Existing instructions to preserve conceptually

- initialize_charter
- initialize_mandate
- commit_proposal / boundary request
- record_review
- transition_mandate

### New / rebuilt instructions

#### `configure_asset_rule`
Guardian configures or updates an allowed asset/action rule under the current Mandate.

#### `execute_within_mandate`
Delegate requests an action from the program-controlled vault.

Checks:

1. signer == delegate;
2. Mandate ACTIVE;
3. version/nonce match;
4. not expired;
5. AssetRule enabled;
6. requested action permitted;
7. signed Pyth evidence verifies when the rule requires market evidence;
8. evidence fresh / within confidence bound;
9. market condition still valid;
10. requested notional <= max_action_notional;
11. period spend + requested notional <= max_period_notional;
12. only then move assets / call approved execution adapter.

Fail closed on missing or unverifiable evidence.

#### `pause_mandate` / `revoke_mandate`
Authorized principal can reduce authority. Reduction is first-class and does not require evidence thresholds.

#### `transition_mandate`
Rebuilt to apply an explicitly signed new permission envelope (or terms hash), increment version/nonce, and invalidate all prior authorization artifacts.

A market oracle must never call this instruction as the authority source.

#### Optional later: `authorize_once`
A principal can approve one specific boundary action without permanently widening the standing Mandate.

This should be nonce-bound and consumed exactly once.

## Pyth integration delta — PROVEN

The target path is now proven on local Solana and the canonical devnet program:

- Pyth Pro API key stays server-side;
- backend requests the signed Solana-format Pyth payload;
- the transaction carries the signed payload;
- Ed25519 verification plus the canonical Pyth Lazer verifier are used in the KEYS capital path;
- KEYS derives deterministic micro-USD notional from the verified market message;
- freshness, confidence, feed identity, notional limits and precommitted price conditions can stop execution;
- market evidence never grants or widens human authority.

Canonical devnet proof:

https://github.com/Faadil1/keys/actions/runs/35959137364

Three product uses remain:

1. **Execution truth:** convert token quantity to mandate quote notional; UNKNOWN/STALE => REFUSE.
2. **Boundary-request validity:** expire/refuse when a committed market condition no longer holds.
3. **Review evidence:** explain market context without using P&L as a competence score.

## Learning delta

Keep:

`LEARN → PRACTICE → PROPOSE → BOUNDED → INDEPENDENT`

as an optional **Family narrative/policy pack**.

Do not use it as the universal protocol schema.

Family UX should instead expose:

- what Maya can do now;
- what is practice-only;
- what requires a boundary request;
- why a market condition blocked an action;
- short contextual learning before unfamiliar actions;
- reflection after meaningful actions.

Learning rules:

`learning → understanding`

not:

`learning → automatic authority`

## Frontend contract delta

The v0.1 frozen frontend contract is now historical for the original authority-proof demo.

The v0.2 frontend contract must expose at least:

- `currentMandate` with explicit bounds;
- `assetRules`;
- `learningContext`;
- `actionEvaluation`: ALLOW / ESCALATE / REFUSE;
- `executionProof` for committed Solana action or refusal;
- `marketEvidence` with verification/freshness status;
- `boundaryRequest`;
- `transition` with version/nonce;
- `staleAuthorization` proof.

Benita remains frontend owner. Backend v0.2 contract is owned by Faadil and is **FROZEN FOR FRONTEND INTEGRATION** at `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`.

## Demo spine

1. Maya sees her current key/bounds and a small contextual learning cue.
2. In-bounds action succeeds with no guardian approval.
3. Larger action fails in Solana execution.
4. If needed, Pyth invalidates a stale precommitted market condition.
5. Maya requests more room.
6. Guardian chooses one-time approval, widen, or refuse.
7. Widen increments mandate version/nonce.
8. Same action now succeeds.
9. Old authorization material fails as stale.
10. Practice/learning remains available without being a gatekeeper.

## Non-goals for v0.2

- legal minor brokerage;
- mainnet tokenized-stock eligibility claim;
- competence scoring;
- auto-promotion based on P&L or learning completion;
- storing private minor narratives on-chain;
- generic RWA compliance platform;
- AI-agent-first product;
- token transfer hooks as a requirement.

## Build sequence

1. Redesign Anchor accounts around permission envelope + asset rule.
2. Add program-controlled vault and deterministic in-bounds/out-of-bounds transfer proof.
3. Add signed on-chain Pyth Pro verification.
4. Add boundary request / explicit widen / stale replay path.
5. Add downward pause/revoke.
6. Produce backend/frontend contract v0.2.
7. Hand v0.2 contract to Benita for product integration.
8. Preserve Practice + contextual learning as Family UX, not authority scoring.
