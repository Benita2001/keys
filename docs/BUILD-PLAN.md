# Build Plan

## Gate 1 — local deterministic core — PASS

Reference state machine, refusals, evidence summary, explicit transition requirement, tests and static demo.

## Gate 2 — Solana authority proof — PASS

Build the smallest inspectable program that proves:

- Charter account exists;
- Mandate account has a current stage and caps;
- Proposal commitment is bound to an asset/amount/hash;
- unsigned mandate transition is refused;
- authorized transition advances version/nonce;
- replay of old transition material is refused.

No swap is required for this gate.

## Gate 3 — Pyth evidence proof — PASS

Consume a verified Pyth snapshot with freshness/confidence checks. If entitlement blocks the desired feed, record the blocker and use an entitled equity feed without pretending it is Apple.

## Gate 4 — consumer vertical slice — FRONTEND INTEGRATION / BENITA

Teen view → proposal → refusal/escalation → evidence history → mandate review → explicit transition → eligibility refusal.

Backend proof status entering Gate 4:

- local Solana authority runtime: PASS;
- devnet authority runtime: PASS;
- stable devnet program identity: PASS;
- authenticated live Pyth equity: PASS;
- live demo backend contract: PASS.

## Gate 5 — winner-to-winner collision

Compare the functioning KEYS demo against the functioning COVENANT demo on Stocklana fit, user clarity, technical proof, Pyth usefulness, native Solana value, regulatory truthfulness and post-hackathon durability.
