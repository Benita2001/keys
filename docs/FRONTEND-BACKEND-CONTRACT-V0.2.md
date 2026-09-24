# KEYS — Frontend / Backend Contract v0.2

Date: 2026-09-24  
Status: **FROZEN FOR FAMILY EXPERIENCE INTEGRATION**

This contract is frozen against the proven v0.2 semantics:

- local Solana Pyth-integrated runtime: PASS;
- canonical devnet Pyth-integrated runtime: PASS;
- demo/mock SPL token capital path: PASS;
- real minor securities execution: NOT CLAIMED.

Canonical devnet evidence:

https://github.com/Faadil1/keys/actions/runs/35959137364

## Product contract

### Happy path

`inside current Mandate + valid required evidence → ALLOW immediately`

No guardian approval is required for an ordinary action already inside the standing Mandate.

### Boundary path

`outside current Mandate → REFUSE + boundary request available`

A boundary request is not authority.

### Human authority path

`boundary request → ALLOW_ONCE | WIDEN_MANDATE | REFUSE`

A standing widen requires an authorized human signature and advances Mandate version/nonce.

Old authorization material becomes stale.

### Market-evidence path

Pyth may:

- price an action for USD/notional enforcement;
- fail closed on stale/invalid evidence;
- invalidate a user-precommitted market condition;
- provide review evidence.

Pyth may **never** widen a human Mandate.

### Learning path

`contextual learning / Practice → understanding`

Learning completion, quizzes, AI scores and P&L never create authority.

## Canonical frontend objects

### `currentMandate`

Required fields:

- `status`: ACTIVE | PAUSED | REVOKED;
- `version`;
- `nonce`;
- `familyStage` — display/policy-pack field, not technical authority;
- `expiresAt` where present;
- `maxActionNotionalMicroUsd`;
- `maxPeriodNotionalMicroUsd`;
- `humanSummary`.

### `assetRule`

Required fields:

- `asset`;
- `mint` or explicit representation id;
- `enabled`;
- `allowedActions`;
- `maxActionAmountBaseUnits`;
- `maxPeriodAmountBaseUnits`;
- `spentThisPeriodBaseUnits`;
- `spentThisPeriodNotionalMicroUsd`;
- `pythFeedId`;
- `maxUnitPriceMicroUsd` when a precommitted ceiling exists.

### `actionEvaluation`

Required fields:

- `decision`: ALLOW | ESCALATE | REFUSE;
- `reasonCode`;
- `requestedNotionalMicroUsd` when market-priced;
- `standingLimitMicroUsd` when relevant;
- `boundaryRequestAvailable`;
- `guardianApprovalRequired`;
- `mandateVersion`;
- `mandateNonce`.

### `marketEvidence`

When Pyth is load-bearing:

- `source: PYTH_PRO`;
- `symbol`;
- `feedId`;
- `verification: ONCHAIN_PYTH_LAZER`;
- `status`;
- `unitPriceMicroUsd`;
- `publishTimeUs`;
- `confidenceBps`;
- `authorityEffect: NONE`.

The browser must never receive the Pyth Pro API key.

### `learningContext`

May contain:

- `kind`: FIRST_USE | PRACTICE | BOUNDARY | MARKET_CHANGE | REVIEW;
- `title`;
- `body`;
- `practiceAvailable`.

It must not contain a global competence/maturity score used to widen authority.

### `boundaryRequest`

Required fields:

- `status: PENDING_HUMAN_DECISION`;
- current `mandateVersion`;
- current `mandateNonce`;
- requested action;
- amount / requested notional;
- reasoning **commitment/hash**, not public minor free-form text;
- optional precommitted market condition;
- decisions: `ALLOW_ONCE | WIDEN_MANDATE | REFUSE`.

### `transition`

For a standing widen:

- authorized human signer;
- previous version/nonce;
- next version/nonce;
- changed bounds;
- transaction proof when committed.

### `executionProof`

For runtime-backed Solana actions:

- network;
- transaction signature;
- program id;
- mandate address;
- mandate version/nonce;
- result;
- reasonCode;
- Pyth proof envelope when required.

## Canonical reason codes

Core:

- `WITHIN_MANDATE`
- `MANDATE_LIMIT_EXCEEDED`
- `PERIOD_LIMIT_EXCEEDED`
- `ASSET_OUTSIDE_MANDATE`
- `ACTION_OUTSIDE_MANDATE`
- `MANDATE_NOT_ACTIVE`
- `MANDATE_EXPIRED`
- `STALE_NONCE`

Pyth:

- `PYTH_NOTIONAL_EXCEEDED`
- `PYTH_PERIOD_NOTIONAL_EXCEEDED`
- `MARKET_CONDITION_INVALIDATED`
- `PYTH_MARKET_EVIDENCE_STALE`
- `PYTH_CONFIDENCE_TOO_WIDE`
- `PYTH_SIGNATURE_VERIFICATION_FAILED`
- `PYTH_FEED_MISMATCH`

The UI should map these to human language rather than expose protocol jargon as the primary experience.

## Unit conventions

Machine interfaces use explicit integer units:

- token amounts: mint base units;
- market price: micro-USD per whole token;
- notional limits: micro-USD;
- Pyth timestamps: Unix microseconds where supplied by the signed payload.

The UI may render dollars/shares, but no API field should rely on an ambiguous decimal unit.

## Demo / truth boundary

The current runtime proof uses a **demo/mock SPL token** with real live Pyth equity market evidence.

Frontend copy must not imply:

- that Maya legally owns conventional shares;
- that KEYS is a broker or custodian;
- that a minor can execute real tokenized-stock trades in all jurisdictions;
- that AAPL is live under the current Pyth trial entitlement;
- that mainnet execution is already integrated.

## Benita integration target

The primary experience should expose:

1. **My Key** — current freedom in plain language.
2. **Learn / Practice** — contextual, short, age-respectful.
3. **Act** — instant inside bounds.
4. **Boundary** — clear explanation of why the capital path refused.
5. **Ask for more room** — short boundary request.
6. **Guardian decision** — allow once / widen / refuse.
7. **Market changed** — Pyth condition explanation.
8. **History** — meaningful transitions/receipts, not a surveillance feed.

This contract supersedes the v0.1 proposal-per-action contract as the current product integration target.
