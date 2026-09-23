# KEYS — Local Solana Authority Runtime Proof

Date: 2026-09-23  
Status: **PASS — LOCAL VALIDATOR**

Canonical workflow run:

https://github.com/Faadil1/keys/actions/runs/35890368959

Workflow:

`solana-authority-proof #16`

## What was actually executed

The Anchor program was built with the Solana SBF toolchain, an ephemeral local program id was synchronized, the program was rebuilt, a local validator test environment was started, and the authority proof scenario completed with **4 passing runtime tests**.

Local runtime program id:

`DbvkVxnYro1S4tVFD9SbGUYSVPvspt2S7yiAfx2wfokH`

This program id belongs to the ephemeral local proof environment. It is **not** a devnet deployment address.

## Runtime proof sequence

### 1. Beneficiary funding

Transaction:

`5gFA1vwCsYhAtXQ8FEp1uDeXrDzNzP5zRwvoZeufpcxjii3NGvfmMxC7M8ALYRJcRQzQ7nRmtrZ2v6QKq1MKEAEc`

### 2. Charter initialized

Transaction:

`54vAXDPbsUnDvvghDFKXJweT25Joht3pMRtc7EREuMw7yKuqxsKQUwkFbdHekgsPBpcDkwNJuhui92BKdtnhnC5h`

Charter PDA:

`AbcHBUbSGbWcEkG9JdC8AMZgg4m7K1hEJkwuuaQvTYkR`

### 3. Mandate initialized

Transaction:

`2QQ8vnoVXcn3XqBureWRs9x1xUTQy3YXeTurXEvRpcqCfPjPxh2ATrPqkiqdxoUyah4aJDGY4p2L1phnSxxHsSh2`

Mandate PDA:

`DYDFQqnAJrhNsTtLLU6H82bNese7eaBbhJvJheQ2X1os`

Verified state before transition:

- stage: `PROPOSE`
- version: `1`
- nonce: `0`

### 4. Proposal committed

Transaction:

`2AEfTWuwL7QZ5WKZxqEgwwe9rTWKm2HA32kQ21vgCwer6W8StpPx5tzfoZ8k1N4uZfU9utkzK6einmBnbXXMzdW4`

Proposal account:

`BF1arDV8FuCS8Fc1QHCeaNHuYL1JYqa5xa1aHc87Xq1W`

Committed amount:

`2500`

### 5. Eligible ReviewReceipt recorded

Transaction:

`3YCoWGtucn8rvFmHqjXnuPUxw7HDndSt2dV9dSkZLAMy1Ji3QYZw2BaaMLWoL4q1fNnCr9MRoyv7WF2Dge86nYvt`

ReviewReceipt PDA:

`Fdfmru2KGA679Edk6ERnWP4cU5FqQaMMHhfE3wv413Su`

Verified state:

- eligible_for_review: `true`
- mandate_nonce: `0`

### 6. Unauthorized widening refused

Observed runtime result:

`PROOF unauthorized_transition=REFUSE code=ConstraintHasOne`

The mandate remained:

- stage: `PROPOSE`
- nonce: `0`

This proves that possession of review material alone does not create authority.

### 7. Guardian transition accepted

Transaction:

`3NrNhz5eJDjazzr2id2Q7bWZo7QT9om4WB9vvXLaKmVC1hSLV2rxtHaYpfM4e2qbTLjbdMyPqG8ftAcK4xmWAtqC`

Observed runtime result:

`PROOF authorized_transition=ALLOW PROPOSE->BOUNDED version=2 nonce=1`

Verified resulting mandate:

- stage: `BOUNDED`
- version: `2`
- nonce: `1`

### 8. Old review material replay refused

Observed runtime result:

`PROOF stale_review_replay=REFUSE code=ConstraintSeeds`

The mandate remained at:

- stage: `BOUNDED`
- version: `2`
- nonce: `1`

The nonce-bound review material from nonce 0 cannot be reused after the authority state advances.

## Runtime verdict

```
Charter
→ Mandate
→ ProposalCommitment
→ eligible ReviewReceipt
→ unauthorized transition REFUSE
→ guardian PROPOSE → BOUNDED ALLOW
→ version/nonce advance
→ stale replay REFUSE
```

Result:

`4 passing`

## What this proves

This is executable evidence for the KEYS authority primitive:

**Evidence can make a mandate eligible for review, but evidence does not itself grant authority. An authorized signer is required for the transition, and previous review material becomes stale after state advancement.**

## What this does not prove

This local proof does not establish:

- Solana devnet deployment;
- mainnet deployment;
- brokerage or custody integration;
- legal securities authority;
- real minor securities execution;
- live Pyth consumption inside the Solana program.

Those remain separate gates.
