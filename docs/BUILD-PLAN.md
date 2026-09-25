# Build Plan

Date: 2026-09-24

## Gate 1 — local deterministic core — PASS

Reference state machine, refusals, evidence summary, explicit transition requirement, tests and static demo.

## Gate 2 — Solana authority proof — PASS

Proved:

- Charter;
- Mandate stage/caps;
- Proposal commitment;
- unauthorized transition refusal;
- authorized transition;
- version/nonce advance;
- stale replay refusal.

This is now classified as the **v0.1 authority-transition proof**.

## Gate 3 — Pyth evidence proof — PASS

Authenticated Pyth Pro equity evidence with freshness/confidence normalization reaches the KEYS evaluator.

Current proof is off-chain/server-side and uses an entitled live feed.

## Gate 4 — product-model revision — PASS

Result:

- keep Family as the Stocklana wedge;
- reject proposal-per-action UX;
- adopt bounded autonomy;
- stages become Family policy/UX rather than universal protocol architecture;
- learning/practice stays, but never auto-promotes authority;
- Solana must enforce capital/action boundaries;
- Pyth must become load-bearing condition/notional evidence.

## Gate 5 — technical reality gate v0.2 — PASS WITH ARCHITECTURE DELTA

Canonical target:

`program-controlled vault + permission-matrix Mandate + AssetRule + signed Pyth verification`

See:
- `docs/TECHNICAL-REALITY-GATE-BOUNDED-AUTONOMY.md`
- `docs/ARCHITECTURE-DELTA-BOUNDED-AUTONOMY.md`

## Gate 6 — backend v0.2 bounded-autonomy capital path — PASS / FAADIL

Proven on local Solana and canonical devnet:

1. Mandate permission envelope + AssetRule.
2. Program-controlled vault.
3. `execute_within_mandate` success/refusal proof.
4. Explicit human widen + stale execution refusal.
5. Same larger action succeeds after human widen.
6. Pause/downward authority.
7. Initial v0.2 semantic API/contract (subsequently frozen after Gate 6.5).

Canonical devnet run:

https://github.com/Faadil1/keys/actions/runs/35931280449

## Gate 6.5 — signed Pyth on-chain enforcement — PASS

Local Solana runtime now proves:

- live authenticated TSLA Pyth message;
- Ed25519 + canonical Pyth Lazer verification in the KEYS transaction path;
- Pyth-derived USD/notional enforcement;
- notional refusal;
- precommitted max-price refusal;
- no authority widening from market evidence.

Local canonical evidence:

https://github.com/Faadil1/keys/actions/runs/35956618933

Canonical devnet proof:

https://github.com/Faadil1/keys/actions/runs/35959137364

Result:

- signed Pyth verification in the capital path: PASS;
- Pyth-derived USD/notional enforcement: PASS;
- Pyth max-price invalidation: PASS;
- market evidence authority effect: NONE;
- 12 runtime tests: PASS.

Frontend/backend contract v0.2 is now frozen and handed to Benita.

## Gate 7 — Family experience integration — PASS / BENITA + FAADIL

Product experience:

- current-key / bounds view;
- contextual learning + Practice;
- instant in-bounds action;
- clear boundary refusal;
- boundary request;
- guardian allow-once / widen / refuse;
- market-condition explanation;
- stale-authorization proof.

Benita retains frontend ownership.

## Gate 8 — judge-facing proof — READY / RECORDING

Canonical demo spine:

`ALLOW → REFUSE → guardian ALLOW_ONCE → exact ALLOW → replay REFUSE / AllowanceAlreadyUsed`

Pyth/receipt evidence is the proof layer after the human interaction. Standing widening remains supported, but is not the canonical hero path.

Close:

**Financial independence shouldn't happen all at once.**

