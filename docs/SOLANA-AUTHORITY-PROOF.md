# Solana Authority Proof — Gate 2

Status: **LOCAL RUNTIME PASS / DEVNET RUNTIME PASS**

## Verified local runtime proof

Latest canonical revalidation:

https://github.com/Faadil1/keys/actions/runs/35895608533

`solana-authority-proof #18` completed successfully with the current Anchor authority-provider integration.

Previous passing revalidation:

https://github.com/Faadil1/keys/actions/runs/35894538107

`solana-authority-proof #17` completed successfully.

Initial passing runtime proof:

https://github.com/Faadil1/keys/actions/runs/35890368959

`solana-authority-proof #16`

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

Latest ephemeral local runtime program id:

`XBjsh428EBwTdjZ4h4PFCm3kBzYrJ98Ro6hV6HbvpYC`

Latest #18 observed runtime transactions:

- beneficiary funding: `2it4kg8Vn4GC99Wd4Rxv5F1MvuWZASuBDXBEnNp9nWP4QrKvUoozMJTDHhuMbCzXHCrTXuiShWS25ixBtKBMStLY`
- initialize Charter: `2VB6fhkP3VzvpNYNX2aWhfirn156PxZwrwVGp7R337eP2Zrz5M1gLTh81TRFVPta56PRak5mwteuajh2gTPPJYqB`
- initialize Mandate: `Q79oLBnkppKF4RzfFhs6VqZ2vwLkrWo5kQY5fgQZ6jDGARfrnQvhjqc5nxYaBni9F1WwS6kzEwnnjWzqGx94K2u`
- commit Proposal: `4v2qCEbEUHMGiXWxJzu4VegBP5qzBD3hfHmhTjUuHw4aXeU4zVRuGFn4Ch7j9bQv2rsnEJKRpewkzjaAkCEkXiRF`
- record ReviewReceipt: `5j6Mj9VPt2tPFSGztErjmYdvUqxpBYkXUPHu4dj59611sDvDbR8knGenFBV64LVEuguWrXyuB9oeY2HHLXUtfBWJ`
- guardian authority transition: `4bXUdv2dN19WmLKnUQDduJGdoihkn5d16wDD5wskduzKgnVMVjzcxyR7Et9qRUh1yEUF8MnmnduwS8tCCfL2tt9V`

Latest #18 authority assertions:

- unauthorized transition → `REFUSE / ConstraintHasOne`
- guardian `PROPOSE -> BOUNDED` → `ALLOW / version=2 / nonce=1`
- stale review replay → `REFUSE / ConstraintSeeds`
- Anchor authority provider → `READY`
- runtime tests → `4 passing`

Initial #16 ephemeral program id:

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

Canonical devnet run:

https://github.com/Faadil1/keys/actions/runs/35904484604

`solana-devnet-authority-proof #17` completed successfully.

Verified deployment:

- funded wallet source: GitHub Actions repository secret
- payer public address: `FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`
- balance before deployment: `5,000,000,000 lamports` (5 devnet SOL)
- SBF/Anchor build: **PASS**
- deployed program id: `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- deployment signature: `fEZYkktLV38swATo1pgacZroWqHqw7WTs365MZX4H1QEdUZmuoYUDNaHGS441HWmgm3D1WzM2eZZPgoSwzf5Eey`
- Explorer: https://explorer.solana.com/address/ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk?cluster=devnet
- authority runtime tests: `4 passing`
- terminal marker: `DEVNET_PROOF=PASS`

Observed authority assertions on devnet:

- unauthorized transition → `REFUSE / ConstraintHasOne`
- guardian `PROPOSE -> BOUNDED` → `ALLOW / version=2 / nonce=1`
- stale review replay → `REFUSE / ConstraintSeeds`

Full evidence:

[evidence/solana/DEVNET-AUTHORITY-RUNTIME-PROOF-2026-09-23.md](../evidence/solana/DEVNET-AUTHORITY-RUNTIME-PROOF-2026-09-23.md)

The previous build-only run `#16` remains historical evidence of the earlier funding blocker; it is superseded by the successful devnet runtime proof above.

## What this proves

Evidence may support eligibility for a mandate review without itself creating authority. A real-authority transition still requires an explicit authorized signer.

The nonce-bound review receipt makes old transition material stale after state advances.

The local runtime proof now demonstrates these semantics through executed Anchor transactions rather than unit-test-only evidence.

## Truth boundary

This repository can now claim the verified devnet deployment and runtime proof documented above.

It still does not claim:

- mainnet deployment;
- live Pyth consumption inside the Solana program;
- token or securities execution;
- legal custody or brokerage authority;
- real minor securities execution.


## Stable devnet program identity

The first successful devnet deployment was subsequently stabilized and revalidated.

Canonical stabilization run:

https://github.com/Faadil1/keys/actions/runs/35905841296

`solana-devnet-authority-proof #18`

Canonical devnet program id:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

The program source now declares this id and `Anchor.toml` registers it for devnet.

The workflow verified the existing on-chain program before upgrade:

- source program id match: **PASS**
- upgrade authority: `FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`
- expected payer/authority match: **PASS**

It then upgraded the same address rather than deploying a new one.

Upgrade signature:

`67hsECJonPA9N9eBP9jjPkzLNBzHPoXm8NGqLoKzrmZQfYFpUM4PDFLLFg7ZmPwsaogh95gg7LdLLHGW8FYvpQtu`

After the upgrade:

- program id remained unchanged;
- upgrade authority remained the canonical devnet wallet;
- authority-provider runtime tests returned `4 passing`;
- `DEVNET_PROOF=PASS`.

A concurrent local Solana runtime proof also remained green, so pinning the devnet identity did not regress local authority semantics.
