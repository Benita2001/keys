# Solana Authority Proof — Gate 2

The KEYS repository now contains an executable Anchor implementation target rather than a design-only stub.

## Authority semantics implemented

- A Charter is anchored to a guardian and beneficiary.
- A Mandate has a stage, version, nonce and latest evidence commitment.
- A beneficiary can commit a bounded ProposalCommitment.
- A guardian can create a ReviewReceipt for the current mandate nonce.
- The receipt records whether the current evidence is eligible for mandate review.
- transition_mandate requires the guardian signer, an eligible review receipt, the current nonce and a forward-only stage transition.
- A successful transition increments both mandate version and nonce.
- The old review receipt is therefore not reusable after state advances.

## What this is intended to prove

Evidence may support eligibility for a mandate review without itself creating authority. A real-authority transition still requires an explicit authorized signer.

The nonce-bound review receipt also makes old transition material stale after state advances.

## Truth boundary

This repository does not yet claim:
- a devnet deployment;
- live Pyth consumption inside the Solana program;
- token or securities execution;
- legal custody or brokerage authority.

GitHub CI compiles and unit-tests the Anchor crate independently from the Node reference engine.
