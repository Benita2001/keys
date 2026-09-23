# Build Plan

## Gate 1 — local deterministic core — PASS

Reference state machine, refusals, evidence summary, explicit transition requirement, tests and static demo.

## Gate 2 — Solana authority proof

Build the smallest inspectable program that proves:

- Charter account exists;
- Mandate account has a current stage and caps;
- Proposal commitment is bound to an asset/amount/hash;
- unsigned mandate transition is refused;
- authorized transition advances version/nonce;
- replay of old transition material is refused.

No swap is required for this gate.

## Gate 3 — Pyth evidence proof

Consume a verified Pyth snapshot with freshness/confidence checks. If entitlement blocks the desired feed, record the blocker and use an entitled equity feed without pretending it is Apple.

## Gate 4 — consumer vertical slice

Teen view → proposal → refusal/escalation → evidence history → mandate review → explicit transition → eligibility refusal.

## Gate 5 — winner-to-winner collision

Compare the functioning KEYS demo against the functioning COVENANT demo on Stocklana fit, user clarity, technical proof, Pyth usefulness, native Solana value, regulatory truthfulness and post-hackathon durability.
