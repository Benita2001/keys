# KEYS — Devnet Bounded-Autonomy Runtime Proof

Date: 2026-09-23  
Network: Solana devnet  
Workflow: `solana-devnet-authority-proof`  
Run: https://github.com/Faadil1/keys/actions/runs/35931280449  
Result: **PASS — 11 passing**

## Canonical program

Program ID:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Explorer:

https://explorer.solana.com/address/ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk?cluster=devnet

Upgrade authority before and after deployment:

`FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`

Deployment / upgrade signature:

`4DsLWRCmDAAMMkWysv6iuruKxeEuVNUojyihRnZnWAfQ9JHuKP4zo5vGyDeHBYALsiJSWoC3r4R9k4FXM5tBnP2h`

## What this proof establishes

On the canonical devnet program, KEYS v0.2 now proves:

1. a program-controlled demo-token vault exists;
2. an explicit AssetRule is attached to the Mandate;
3. an in-bounds beneficiary action executes with no guardian approval transaction;
4. an out-of-bounds action is refused by the KEYS program and capital does not move;
5. guardian widening changes Mandate version/nonce;
6. stale execution material is refused after the version/nonce change;
7. the same larger action that previously failed succeeds after the explicit human widen;
8. guardian pause is a real downward authority transition and blocks subsequent execution;
9. prior v0.1 authority-transition and replay-protection proofs continue to pass.

## Runtime objects

Mock stock mint:

`HDoTLMVoMFDAHQKno6AQnCSG7y2TNuQ9a3nr2dEhqCZ8`

AssetRule PDA:

`5Q1jep4jVB83Ajgen5YKacPWxS2vkeBuNrFV6wreyCZw`

Program-controlled vault token account:

`4ETw5mVvVuJUYDcAfnUZE7Ak21Fp6vxtrdzZxU8adiBc`

Mandate:

`Dua5aDGdWzF9g3Rp7DYLz36BfoXDpzBfyQH5oLgmRPkT`

## Key proof markers

```
PROOF devnet_build=PASS
PROOF source_program_id_match=PASS
PROOF devnet_upgrade_authority_match=PASS
PROOF devnet_upgrade_authority_postdeploy_match=PASS
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
DEVNET_PROOF=PASS
```

## Example transaction signatures

Initialize AssetRule:

`31dQRn6zeNivedf3bnJbZhQCah7mbj1E9YXBFuABgSaeKGYu8hsBjWMKioDLig1cy1ry8y8xU6ySt6xETpBbe4ji`

In-bounds execution:

`3NtroeZQb2MYNbZKKUR1McxTX3ChmpidRjV8PhUTRn3fHdhkUN19BSEcabqAJtvfERc7TsSZfJWRDkwDWsGTK9PW`

Guardian widen:

`3igdk5TXDnF1gDj1PEZNDR87DHBVZ2CZzah1Pnre9txXmAFazW1bKFN5hjE9EUurTpRVTkfMNDtTSx6MPgAqSXCH`

Same larger action after widen:

`42eVvVv3Whv7d85U6mAzVEjnjn7YHduUHKLH1WKEaz15bVoBZmYLtSaBJ9ucJfv2dWxikLxc8bPZzfcbcstZS2Ep`

Pause:

`4NzCZNMbydhcJmNdgrGvnaFqf66Hv571Fbj8BX3R5VFiyuVZtmjFVAJuJEHH6q4qy3uvtaqATSCrm2iC79GcuQPV`

## Truth boundary

The devnet asset is an explicitly labeled demo/mock SPL token. This is not real tokenized-stock execution and not evidence of a brokerage or custodial service.

The current on-chain boundary is expressed in token units. Pyth-signed Solana payload availability has separately passed, but the payload is not yet verified inside `execute_within_mandate`.

Therefore the correct current claim is:

> **KEYS now has real devnet program-controlled capital enforcement for bounded autonomy. Pyth is live and signed-payload-capable, but on-chain Pyth verification remains the next backend proof.**
