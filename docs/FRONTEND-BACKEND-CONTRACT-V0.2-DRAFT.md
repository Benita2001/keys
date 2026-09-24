# Frontend / Backend Contract v0.2 — HISTORICAL DRAFT

Date: 2026-09-24  
Status: **HISTORICAL / SUPERSEDED — DO NOT INTEGRATE AGAINST THIS FILE**

> Current frozen contract: `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`
>
> Canonical devnet Solana + live Pyth proof: https://github.com/Faadil1/keys/actions/runs/35959137364
>
> Any statements below describing devnet confirmation as pending are preserved only as historical context and are not current project truth.

This draft lets Benita design against the new product semantics without pretending that the new runtime proof is complete.

## Product semantics

Happy path:

`inside current Mandate → ALLOW immediately`

Boundary path:

`outside current Mandate → REFUSE + boundary request available`

Authority path:

`boundary request → human decision → optional signed standing widen → new version/nonce`

Evidence path:

`market evidence may restrict/expire/escalate; it never widens human authority`

Learning path:

`contextual learning / Practice → understanding; never automatic authority`

## Minimum frontend objects

### currentMandate

- status;
- version;
- nonce;
- Family stage (display only);
- human-readable summary.

### assetRule

- asset;
- enabled;
- allowed actions;
- per-action notional;
- per-period notional;
- market-evidence requirement;
- freshness/confidence constraints.

### actionEvaluation

- decision: ALLOW / ESCALATE / REFUSE;
- reasonCode;
- requestedNotional;
- standingLimit / remaining period limit when relevant;
- boundaryRequestAvailable;
- guardianApprovalRequired.

### learningContext

- kind;
- title;
- short body;
- Practice availability.

It must never contain a maturity/competence score.

### boundaryRequest

- current mandate version/nonce;
- requested action;
- reasoning commitment;
- optional precommitted market condition;
- human decisions: ALLOW_ONCE / WIDEN_MANDATE / REFUSE.

### executionProof

When runtime-backed:

- network;
- transaction signature;
- program id;
- mandate;
- version / nonce;
- result;
- reason code for refusal when available.

Until the v0.2 Solana proof passes, frontend demo fixtures must label execution proof as deterministic/demo only.

## Draft fixture

`fixtures/frontend-maya-v0.2-contract.json`

## Draft JS policy facade

`src/bounded-autonomy.mjs`

These do not replace the historical v0.1 proof contract yet.


## Proven runtime semantics

Local Solana now proves the full bounded-autonomy + Pyth path with live TSLA market evidence:

- in-bounds execution without guardian approval;
- out-of-bounds refusal in the KEYS program;
- explicit guardian widening with version/nonce advance;
- stale authorization refusal;
- signed Pyth Lazer verification inside the capital path;
- Pyth-derived USD notional enforcement;
- market-condition invalidation without authority widening.

Evidence:

https://github.com/Faadil1/keys/actions/runs/35956618933

Canonical devnet confirmation is still pending before this contract is frozen.

## Unit conventions

For v0.2, machine fields must be explicit about units:

- `amount`: mint base units unless a route explicitly says otherwise;
- `unitPriceMicroUsd`: integer micro-USD per whole token;
- `requestedNotionalMicroUsd`: integer micro-USD;
- `maxActionNotionalMicroUsd`: integer micro-USD;
- `maxPeriodNotionalMicroUsd`: integer micro-USD;
- `maxUnitPriceMicroUsd`: optional precommitted ceiling, integer micro-USD;
- `publishTimeUs`: Pyth feed update time in Unix microseconds.

The UI may display dollars, shares and friendly labels, but the backend/chain contract should not rely on ambiguous decimal units.

## Pyth proof envelope

A runtime-backed action evaluation/execution should expose a normalized proof envelope when Pyth is load-bearing:

```json
{
  "marketEvidence": {
    "source": "PYTH_PRO",
    "symbol": "Equity.US.TSLA/USD",
    "feedId": 1435,
    "verification": "ONCHAIN_PYTH_LAZER",
    "status": "FRESH",
    "unitPriceMicroUsd": 378230000,
    "publishTimeUs": 0,
    "confidenceBps": 1
  },
  "authorityEffect": "NONE"
}
```

`authorityEffect` must remain `NONE` for market evidence. Market data may allow an already-authorized action to remain executable, or cause refusal/expiry; it does not widen the Mandate.
