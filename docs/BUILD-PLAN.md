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

## Gate 4 — strategy re-open + hostile review — PASS

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
7. Draft v0.2 semantic API/contract.

Canonical devnet run:

https://github.com/Faadil1/keys/actions/runs/35931280449

## Gate 6.5 — signed Pyth on-chain enforcement — ACTIVE / FAADIL

Already proven:

- authenticated live Pyth equity evidence;
- signed Solana-format Pyth payload availability.

Next runtime proof:

1. verify the signed Pyth payload in the KEYS Anchor path;
2. enforce freshness/confidence from verified evidence;
3. derive USD/notional from verified price;
4. fail closed when a user-precommitted market condition is invalid/stale;
5. re-run local + canonical devnet proof;
6. freeze frontend/backend semantic contract v0.2.

## Gate 7 — Family experience integration — BENITA AFTER FROZEN V0.2 CONTRACT

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

## Gate 8 — judge-facing proof

Target demo spine:

`in-bounds SUCCESS → out-of-bounds REFUSE → market condition invalid/stale → human widen → same action SUCCESS → stale replay REFUSE`

Close:

**Financial independence shouldn't happen all at once.**

## Gate 9 — winner-to-winner collision

Compare functioning KEYS Family v0.2 against COVENANT on Stocklana fit, user clarity, technical proof, Pyth usefulness, native Solana value, regulatory truthfulness and post-hackathon durability.
