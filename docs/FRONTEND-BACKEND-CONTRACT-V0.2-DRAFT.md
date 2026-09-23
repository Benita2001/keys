# Frontend / Backend Contract v0.2 — DRAFT

Date: 2026-09-24  
Status: **DRAFT — DO NOT TREAT AS FROZEN UNTIL SOLANA V0.2 RUNTIME PROOF PASSES**

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
