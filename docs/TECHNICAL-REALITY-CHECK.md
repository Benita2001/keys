# Technical Reality Check v0.2

Date: 2026-09-24  
Status: **PASS WITH ARCHITECTURE DELTA**

The v0.1 authority proof succeeded. The product strategy has now been relocked around **Family bounded autonomy**.

Full gate decision:

`docs/TECHNICAL-REALITY-GATE-BOUNDED-AUTONOMY.md`

Implementation delta:

`docs/ARCHITECTURE-DELTA-BOUNDED-AUTONOMY.md`

## What must be true for v0.2

1. A Mandate is a machine-readable permission envelope, not merely a stage.
2. An in-bounds action can execute without guardian approval.
3. An out-of-bounds action deterministically refuses in the Solana execution path.
4. A boundary request cannot itself create authority.
5. Wider standing authority requires an authorized signer.
6. Version/nonce invalidates stale authorization material.
7. Market evidence fails closed when missing, stale, unverifiable or outside committed conditions.
8. Market evidence may restrict/expire/escalate; it may never grant/widen human authority.
9. LEARN/PRACTICE remain available, but learning completion/P&L never auto-promotes authority.
10. Minor PII and free-form decision narratives remain off public chain.
11. Real execution claims remain gated by age, jurisdiction, venue and issuer eligibility.

## Canonical architecture target

**KEYS program-controlled vault + Mandate permission matrix + AssetRule + signed Pyth Pro verification.**

Squads v4 is a credible future smart-account substrate.

Raw SPL Token delegation is a valid narrow proof primitive, but it is not the complete KEYS policy model.

Token transfer hooks are not a product requirement.

## Pyth delta

Current live proof:

- authenticated Pyth Pro REST;
- server-side API key;
- off-chain normalized evidence;
- current adapter requests unsigned `leUnsigned` data.

Target:

- server-side subscription/fetch of signed Solana-format Pyth Pro update;
- payload included in the transaction;
- Pyth Pro/Lazer SVM verification in the Solana execution path;
- freshness/confidence/condition checks before capital movement.

## Learning delta

Learning remains a first-class Family product layer.

It becomes:

- contextual;
- short;
- action-linked;
- available in Practice;
- reflective after outcomes.

It does not become an authority oracle.

See `docs/FAMILY-LEARNING-LAYER.md`.

## Current truth

PASS:
- deterministic v0.1 policy engine;
- local Solana authority runtime;
- devnet authority runtime;
- stable devnet program identity;
- guardian-signed transition;
- version/nonce stale-replay refusal;
- authenticated live Pyth Pro equity evidence.

NOT YET BUILT:
- permission-matrix Mandate;
- program-controlled capital execution;
- signed on-chain Pyth verification;
- boundary-only proposal flow;
- pause/revoke/downward authority;
- frontend contract v0.2.

## Next milestone

**BACKEND_V0_2_BOUNDED_AUTONOMY_BUILD**

Do not claim real minor securities execution.
