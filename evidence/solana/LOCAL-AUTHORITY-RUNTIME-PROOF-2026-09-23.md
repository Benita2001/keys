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


## Revalidation run #17

A later repository state re-ran the complete local authority proof successfully:

https://github.com/Faadil1/keys/actions/runs/35894538107

`solana-authority-proof #17`

Result:

`4 passing`

Ephemeral local runtime program id:

`D4g7DYwiWVJmGewivabsyhxF2NRtpdR741T3XsQUJkGL`

Observed transactions:

- initialize Charter: `SuCHfSDqMidRVaoYtak1aXM5vPACWfB2jiAteoY3nFDrrmGUfMWyH4UE1kjXhTGcnU19QFvhJqAZNqk4W7KhZaj`
- initialize Mandate: `3znGrRV9LiNv5puXeqNHJFbfwzoYcyBzDJAMW7HgypTQmAzuUbRt1nefkEhhHEE5qkNuY7PATyNQpK56FzZccxQp`
- commit Proposal: `2DQCNQcFtuYZUmebV3ofDT8vTzTUEd8PrYEpSQUjg8BJ3pEipPRYqRcwo7rLSWuiwvDP5vRvdyd2idKn1ow2fWWU`
- record ReviewReceipt: `FLE2DqiMkEeSKkiZfkW5RCfdXt8hKQ5qwBKjxX1Ey3UMXgWHSAHyNERJXRrUoEuSujHKFu8uqDrVCY8uWcgRX3B`
- guardian authority transition: `S8UQyDXwU2AetGQzmP5Gprhu7VzqmkVjPZTRJxFS1F7nquBZ782RQbV8GGte2hCEBUyqZpGfmwiTqZVniWQovvQ`

Observed authority assertions remained unchanged:

- unauthorized transition → `REFUSE / ConstraintHasOne`
- guardian `PROPOSE -> BOUNDED` → `ALLOW / version=2 / nonce=1`
- stale review replay → `REFUSE / ConstraintSeeds`

This confirms the authority primitive remained executable after subsequent backend/repository changes that triggered the proof workflow.

## Canonical revalidation run #18

The latest current-repository authority proof completed successfully:

https://github.com/Faadil1/keys/actions/runs/35895608533

`solana-authority-proof #18`

Result:

`4 passing`

Ephemeral local runtime program id:

`XBjsh428EBwTdjZ4h4PFCm3kBzYrJ98Ro6hV6HbvpYC`

Observed transactions:

- beneficiary funding: `2it4kg8Vn4GC99Wd4Rxv5F1MvuWZASuBDXBEnNp9nWP4QrKvUoozMJTDHhuMbCzXHCrTXuiShWS25ixBtKBMStLY`
- initialize Charter: `2VB6fhkP3VzvpNYNX2aWhfirn156PxZwrwVGp7R337eP2Zrz5M1gLTh81TRFVPta56PRak5mwteuajh2gTPPJYqB`
- initialize Mandate: `Q79oLBnkppKFZfhs6VqZ2vwLkrWo5kQY5fgQZ6jDGARfrnQvhjqc5nxYaBni9F1WwS6kzEwnnjWzqGx94K2u`
- commit Proposal: `4v2qCEbEUHMGiXWxJzu4VegBP5qzBD3hfHmhTjUuHw4aXeU4zVRuGFn4Ch7j9bQv2rsnEJKRpewkzjaAkCEkXiRF`
- record ReviewReceipt: `5j6Mj9VPt2tPFSGztErjmYdvUqxpBYkXUPHu4dj59611sDvDbR8knGenFBV64LVEuguWrXyuB9oeY2HHLXUtfBWJ`
- guardian authority transition: `4bXUdv2dN19WmLKnUQDduJGdoihkn5d16wDD5wskduzKgnVMVjzcxyR7Et9qRUh1yEUF8MnmnduwS8tCCfL2tt9V`

Observed authority-provider proof:

- `PROOF anchor_authority_provider=READY`
- `PROOF unauthorized_transition=REFUSE code=ConstraintHasOne`
- `PROOF authorized_transition=ALLOW PROPOSE->BOUNDED version=2 nonce=1 provider=anchor-authority-provider`
- `PROOF stale_review_replay=REFUSE code=ConstraintSeeds provider=anchor-authority-provider`

This supersedes #17 as the latest canonical local runtime revalidation while preserving the same authority semantics.

