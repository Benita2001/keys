# Solana Authority Proof — Gate 2

Status: **LOCAL RUNTIME PASS / DEVNET BUILD PASS / DEVNET DEPLOYMENT BLOCKED BY FUNDING**

## Verified local runtime proof

Canonical run:

https://github.com/Faadil1/keys/actions/runs/35890368959

`solana-authority-proof #16` completed successfully.

The program was built with the Solana SBF toolchain and executed through Anchor on a local validator.

Observed proof:

- Charter created;
- Mandate created at `PROPOSE / version=1 / nonce=0`;
- ProposalCommitment created;
- eligible ReviewReceipt created and bound to nonce 0;
- unauthorized transition refused with `ConstraintHasOne`;
- guardian `PROPOSE -> BOUNDED` accepted;
- mandate advanced to `version=2 / nonce=1`;
- replay of the old nonce-0 review material refused with `ConstraintSeeds`;
- 4 Anchor runtime tests passed.

Ephemeral local runtime program id:

`DbvkVxnYro1S4tVFD9SbGUYSVPvspt2S7yiAfx2wfokH`

This is a local-validator proof address, not a devnet deployment.

Full evidence:

[evidence/solana/LOCAL-AUTHORITY-RUNTIME-PROOF-2026-09-23.md](../evidence/solana/LOCAL-AUTHORITY-RUNTIME-PROOF-2026-09-23.md)

## Authority semantics implemented

- A Charter is anchored to a guardian and beneficiary.
- A Mandate has a stage, version, nonce and latest evidence commitment.
- A beneficiary can commit a bounded ProposalCommitment.
- A guardian can create a ReviewReceipt for the current mandate nonce.
- The receipt records whether the current evidence is eligible for mandate review.
- `transition_mandate` requires the guardian signer, an eligible review receipt, the current nonce and a forward-only stage transition.
- A successful transition increments both mandate version and nonce.
- The old review receipt is therefore not reusable after state advances.

## Current devnet proof

Latest strengthened devnet run:

https://github.com/Faadil1/keys/actions/runs/35890663439

`solana-devnet-authority-proof #16` verified:

- SBF-compatible dependency resolution: PASS
- Anchor/Solana tooling: PASS
- program build before funding gate: PASS
- generated devnet-target program id: `8XmhNVJqCFRwvpeTF4vNFsGgcoFs64goK2mjSVP9XKUm`
- wallet source: ephemeral
- starting balance: 0 lamports
- 5 SOL faucet attempt: rate-limited
- 2 SOL faucet fallback: rate-limited
- final balance: 0 lamports
- deployment: **not attempted because funding requirement was not met**

Observed terminal state:

`DEVNET_PROOF=BLOCKED_FUNDING`

The generated program id is not claimed as deployed.

The workflow now supports a persistent funded wallet through the repository secret `DEVNET_KEYPAIR_JSON`. The secret is consumed only in CI and is never committed to the repository.

## What this proves

Evidence may support eligibility for a mandate review without itself creating authority. A real-authority transition still requires an explicit authorized signer.

The nonce-bound review receipt makes old transition material stale after state advances.

The local runtime proof now demonstrates these semantics through executed Anchor transactions rather than unit-test-only evidence.

## Truth boundary

This repository still does not claim:

- a devnet deployment;
- live Pyth consumption inside the Solana program;
- token or securities execution;
- legal custody or brokerage authority.

The devnet artifact is buildable; deployment remains blocked by devnet funding.
