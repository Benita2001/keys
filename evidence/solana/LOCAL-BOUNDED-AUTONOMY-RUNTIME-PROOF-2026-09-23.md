# KEYS — Local Bounded-Autonomy Runtime Proof

Date: 2026-09-23  
Network: local Solana validator  
Workflow: `solana-authority-proof`  
Run: https://github.com/Faadil1/keys/actions/runs/35930619326  
Result: **PASS — 11 passing**

## What this proof establishes

This run upgrades the prior authority-transition proof with a real program-controlled token path.

It proves, on a local Solana validator:

1. Charter and Mandate initialize.
2. Unauthorized mandate transition refuses.
3. Guardian-authorized `PROPOSE → BOUNDED` transition succeeds.
4. Old nonce-bound review material refuses after transition.
5. A mock-stock SPL mint is created and funded into a KEYS program-controlled vault token account.
6. Guardian creates an AssetRule with:
   - max action amount: 250 token units;
   - max period amount: 1000 token units.
7. Maya/beneficiary executes 100 units **without a guardian approval transaction**.
8. The same delegate attempts 500 units under the 250-unit boundary and the KEYS program refuses with `ActionAmountExceeded`; vault balance does not move.
9. Guardian explicitly widens the AssetRule from 250 → 500, advancing Mandate version/nonce.
10. Execution material using the old nonce refuses with `StaleNonce`.
11. The same 500-unit action that previously failed succeeds under the new Mandate nonce.
12. Guardian pauses the Mandate; subsequent capital execution refuses with `MandateNotActive`.

## Runtime identities

Ephemeral local program id:

`ZnMyaUr6kGm9rGrPXevdJuE9vW3MUoNnFUrSWeiJUZE`

Mock stock mint:

`Z5vWA2WopYitMKHjqa3ZzU7C3KedFj66m2NLuh7qvHi`

AssetRule PDA:

`52QrQ3JQLTuibwQ9kT1A56R72NqyPSwL6TfwCxwyyNAT`

Program-controlled vault token account:

`8CAHrUidib5KfWS5WmLEiztjLjxyx3qrDZQo9RnqgMnh`

Mandate:

`By9NG5Uvtai5MyCuP45rAnxgiunF3BwQV2amUzmesYtn`

## Key proof markers

```
PROOF bounded_vault=READY max_action_amount=250 max_period_amount=1000 nonce=2
PROOF in_bounds_execution=ALLOW amount=100 guardian_approval=false
PROOF out_of_bounds_execution=REFUSE code=ActionAmountExceeded
PROOF capital_boundary=ENFORCED_BY_PROGRAM requested=500 standing_max=250
PROOF human_widen=ALLOW max_action_amount=250->500 version=4 nonce=3
PROOF stale_execution_nonce=REFUSE code=StaleNonce
PROOF same_action_after_human_widen=ALLOW amount=500 nonce=3
PROOF paused_mandate_execution=REFUSE code=MandateNotActive
PROOF downward_authority=PAUSED version=5 nonce=4
11 passing
```

## Truth boundary

This is **real Solana capital-path enforcement using a demo/mock SPL token**, not real tokenized-stock execution.

The current boundary is denominated in token units. It is not yet a cryptographically enforced USD-notional boundary.

Signed Pyth Pro Solana payload availability is proven separately, but Pyth verification is **not yet wired into this Anchor execution instruction**.

Therefore this proof supports:

> **The KEYS program can hold demo assets, allow a beneficiary to act freely inside an explicit standing boundary, refuse a larger action on-chain, accept an explicit human widening, reject stale authorization, and then allow the same larger action.**

It does not support claims of brokerage, custody service, mainnet tokenized-stock execution, legal minor ownership, or on-chain Pyth enforcement.
