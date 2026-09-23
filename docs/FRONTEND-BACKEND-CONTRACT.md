# Frontend ↔ Backend Contract — KEYS v0.1

Status: **FROZEN FOR THE MAYA DEMO**

Owner split:
- **Frontend / product experience:** Benita
- **Backend / policy engine / Solana / Pyth / proof:** Faadil

This contract lets the frontend move independently from backend implementation details. The demo-first Solana/Pyth runtime proof is complete; this document remains the stable UI-safe semantic boundary and does not create custody or brokerage promises.

## 1. Stable stages

The frontend may rely on these exact mandate-stage strings:

```
LEARN
PRACTICE
PROPOSE
BOUNDED
INDEPENDENT
```

Meaning:
- `LEARN`: education/observation only.
- `PRACTICE`: simulated proposal/review activity only.
- `PROPOSE`: beneficiary can commit a proposal, but execution authority is not created.
- `BOUNDED`: signed authority exists inside explicit limits, still subject to current eligibility.
- `INDEPENDENT`: independent authority state, still subject to current eligibility where execution is involved.

The UI must never infer maturity from the stage.

## 2. Stable decision states

Every proposal evaluation resolves to one of:

```
ALLOW
ESCALATE
REFUSE
```

These are backend policy outcomes, not emotional labels and not scores.

## 3. Stable reason codes for v0.1

The frontend may render human copy around these codes, but should not change their meaning:

- `CHARTER_EXPIRED`
- `ASSET_OUTSIDE_MANDATE`
- `MARKET_EVIDENCE_UNAVAILABLE`
- `MARKET_CONFIDENCE_TOO_WIDE`
- `DECISION_CONTEXT_INCOMPLETE`
- `PRACTICE_ONLY`
- `PROPOSAL_CAP_EXCEEDED`
- `GUARDIAN_REVIEW_REQUIRED`
- `BOUNDED_CAP_EXCEEDED`
- `INELIGIBLE`
- `ELIGIBILITY_UNKNOWN`
- `WITHIN_BOUNDED_MANDATE`
- `INDEPENDENT_ELIGIBLE`
- `UNKNOWN_STAGE`

Mandate-transition policy-preview outcomes additionally use:

- `REVIEW_THRESHOLD_NOT_MET`
- `AUTHORIZED_TRANSITION_REQUIRED`

Committed authority runtime outcomes may additionally use:

- `AUTHORITY_RUNTIME_UNAVAILABLE`
- `AUTHORITY_RUNTIME_ERROR`
- provider/Anchor refusal codes such as stale nonce or account-constraint failures.

Solana/runtime proof also enforces stale/replayed authority refusal through mandate nonce/version binding.

## 4. Maya demo identity

Canonical demo beneficiary:

```json
{
  "beneficiary": {
    "displayName": "Maya",
    "age": 16,
    "jurisdiction": "CA-QC"
  },
  "stake": {
    "purpose": "Learn long-term ownership through companies I can explain",
    "fundingProvenance": [
      {
        "source": "birthday gift",
        "amount": 50,
        "currency": "CAD"
      }
    ],
    "legalControl": "guardian-controlled practice mode"
  },
  "mandate": {
    "stage": "PROPOSE"
  }
}
```

Minor PII beyond bounded demo data is not part of the public/on-chain contract.

## 5. Proposal payload

For the Maya vertical slice, frontend → backend proposal data is:

```json
{
  "id": "maya-aapl-001",
  "asset": "AAPL",
  "amount": 25,
  "rationale": "string",
  "counterargument": "string",
  "horizonDays": 365,
  "invalidation": "string",
  "createdAt": "ISO-8601 timestamp",
  "mode": "PRACTICE"
}
```

Required before substantive review:
- rationale,
- counterargument,
- invalidation/reconsideration condition.

The frontend must present these as reasoning committed **before** the outcome is known.

## 6. Proposal evaluation response

Backend → frontend:

```json
{
  "decision": "ESCALATE",
  "reasonCode": "GUARDIAN_REVIEW_REQUIRED",
  "reasons": [
    "The proposal is inside the mandate but requires explicit guardian review."
  ]
}
```

For the canonical Maya / $25 AAPL / PROPOSE scenario, fresh acceptable market evidence should resolve to:

```
ESCALATE
GUARDIAN_REVIEW_REQUIRED
```

Preferred UI meaning:

> Proposal is not authority. Guardian review is required.

Do not render this as an error state.

## 7. Market evidence surface

The backend owns evidence validity. Normal API routes do not accept frontend-supplied market evidence as authoritative. Deterministic simulated evidence is confined to explicitly labeled simulation routes.

Frontend may display:
- asset/symbol,
- reference price,
- evidence timestamp,
- freshness state,
- confidence/uncertainty state,
- relevant market-session/event context when provided.

Frontend must not claim:
- continuous monitoring,
- guaranteed real-time pricing,
- investment suitability,
- financial competence.

If evidence is missing, stale or outside confidence bounds, the backend fails closed and the UI should show a blocked/refused state using the returned reason code.

Frontend-facing proposal/execution envelopes include a safe `marketEvidence` summary and the resolved eligibility status. Secrets/credentials never cross this boundary.

## 8. Mandate-review surface

Evidence summary fields currently available:

```json
{
  "proposalCount": 0,
  "reviewCount": 0,
  "scopeViolationCount": 0,
  "thesisRevisionCount": 0,
  "marketEventReviewCount": 0,
  "refusedCount": 0
}
```

Review eligibility:

```json
{
  "eligibleForReview": true,
  "currentStage": "PROPOSE",
  "unmet": []
}
```

Critical wording:

Use **Eligible for Mandate Review**.

Never use:
- “Maya is mature”
- “Maya is a competent investor”
- “Maya earned independence”
- a financial maturity score
- profit/P&L as the promotion rule.

## 9. Authority transition

A mandate change is a distinct explicit action.

There are two separate backend surfaces:

- **preview** — deterministic policy preview only; never means authority changed;
- **commit** — requires a server-side authority runtime/provider and may return a signed runtime proof.

Frontend intent:

```json
{
  "fromStage": "PROPOSE",
  "toStage": "BOUNDED",
  "authorizedBy": "guardian-id",
  "at": "ISO-8601 timestamp"
}
```

Without an authorized signer in preview:

```json
{
  "ok": false,
  "reasonCode": "AUTHORIZED_TRANSITION_REQUIRED",
  "authorityCommitted": false
}
```

If the committed authority runtime is unavailable:

```json
{
  "ok": false,
  "reasonCode": "AUTHORITY_RUNTIME_UNAVAILABLE",
  "authorityCommitted": false
}
```

The frontend must only present an authority transition as committed when the commit response explicitly returns `authorityCommitted: true`.

After a valid Solana transition, the backend proof advances mandate version/nonce. Older review authorization becomes stale and must not be presented as reusable authority.

## 10. Eligibility states

For any path that implies real execution, eligibility is one of:

```
ELIGIBLE
INELIGIBLE
UNKNOWN
PRACTICE_ONLY
```

`UNKNOWN` is never treated as eligible.

For the current Canada/Quebec Maya demo, do not imply a real minor xStocks or brokerage execution path. The product may demonstrate the authority/eligibility gate and simulated economic action.

## 11. Canonical 3-minute frontend journey

1. Show Maya, 16, current mandate = `PROPOSE`.
2. Show what the capital is for, who legally controls it, and what Maya may do.
3. Maya creates a $25 AAPL proposal.
4. Capture rationale, counterargument, horizon, reconsideration condition.
5. Check mandate + cap + asset + market evidence.
6. Render `ESCALATE / GUARDIAN_REVIEW_REQUIRED`.
7. Show longitudinal proposals/reviews/refusals/event reviews.
8. Render **Eligible for Mandate Review** when thresholds are met.
9. Attempt wider authority without authorization → `REFUSE / AUTHORIZED_TRANSITION_REQUIRED`.
10. Guardian explicitly authorizes `PROPOSE → BOUNDED`.
11. Show mandate version/nonce advancing as proof of changed authority.
12. Replay old review/authorization → refused as stale.
13. Attempt real execution with eligibility `UNKNOWN` → `REFUSE / ELIGIBILITY_UNKNOWN`.
14. End on: **Financial independence shouldn't happen all at once.**

## 12. Frontend freedom

Benita owns the interaction model, information architecture, component system, motion, typography and visual language as long as the semantic invariants above remain intact.

The frontend does **not** need to mirror the current static demo.

Avoid treating implementation placeholders as design requirements.

## 13. Product invariants the UI must preserve

1. Proposal ≠ authority.
2. Evidence ≠ maturity.
3. Profit ≠ decision quality.
4. Silence ≠ consent.
5. UNKNOWN ≠ eligible.
6. Practice ≠ custody.
7. Token balance ≠ conventional shareholder title.
8. Minor private PII/narratives are not public-chain content.
9. No financial competence score.
10. No automatic real-authority promotion.
11. No real minor securities execution claim.
12. No brokerage/custody claim without verified integration.
13. No lesson/course/quiz as product core.
14. No leaderboard/P&L-driven progression.

## 14. Integration boundary

The frontend-facing domain facade is now:

- `src/frontend-api.mjs`

It exposes stable v0.1 response envelopes for:
- proposal evaluation;
- mandate-review status;
- mandate transition;
- execution eligibility.

The underlying reference backend remains:

- `src/model.mjs`
- `src/engine.mjs`
- `src/pyth-adapter.mjs`

Solana is the authority-transition proof layer:

- `programs/keys/src/lib.rs`

The frontend should bind to `src/frontend-api.mjs` or an HTTP adapter above it, not directly to the current demo HTML or to Anchor internals.
