# KEYS — Canonical Devnet On-Chain Pyth Bounded-Autonomy Proof

Date: 2026-09-24  
Network: Solana devnet  
Workflow: `solana-devnet-authority-proof`  
Run: https://github.com/Faadil1/keys/actions/runs/35959137364  
Result: **PASS — 12 passing**

## Canonical program

Program ID:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Explorer:

https://explorer.solana.com/address/ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk?cluster=devnet

Upgrade authority before and after:

`FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`

Upgrade signature:

`2C2J2G6UzBKhyALk9XfDYMnThyB77cedbhjxtrLXKvE6deJYZAroLKMXF5L9QaZ3fATuZAbJfbfetNkPa2eUH1ge`

## What is proven

The canonical devnet KEYS program now proves the full v0.2 bounded-autonomy path with **live authenticated Pyth Pro/Lazer TSLA market evidence verified inside the Solana capital path**.

The runtime proves:

1. Charter / Mandate creation.
2. Unauthorized authority transition refusal.
3. Explicit guardian-signed transition.
4. Stale review replay refusal.
5. Program-controlled demo-token vault.
6. AssetRule / permission boundary.
7. In-bounds action succeeds without guardian approval.
8. Out-of-bounds action is refused by the KEYS program.
9. Explicit human widening advances version/nonce.
10. Stale execution material refuses.
11. The same larger action succeeds after widening.
12. A Pyth-signed Solana-format message is verified through the canonical Pyth Lazer verifier inside the KEYS execution path.
13. A Pyth-derived USD-notional boundary allows one unit and refuses two units with `PythNotionalExceeded`.
14. A precommitted max-price condition refuses with `MarketConditionInvalidated`.
15. Market evidence has no authority-widening effect.
16. Guardian pause/downward authority blocks subsequent execution.

## Live Pyth evidence

Symbol:

`Equity.US.TSLA/USD`

Feed id:

`1435`

Observed live price during canonical devnet proof:

approximately `378.5675 USD`.

The exact signed Pyth message was included in the Solana transaction and verified by CPI into the canonical Pyth Lazer verifier before KEYS parsed the signed payload and enforced the Mandate.

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

PROOF pyth_onchain_execution=ALLOW feed=1435 price=378.56749999999994 action_limit_micro_usd=567851250 nonce=4
PROOF pyth_notional_boundary=REFUSE code=PythNotionalExceeded
PROOF pyth_notional_boundary=ENFORCED price=378.56749999999994 amount=2 action_limit_micro_usd=567851250
PROOF pyth_market_condition=REFUSE code=MarketConditionInvalidated
PROOF pyth_market_condition=REFUSE verified_price=378.56749999999994 max_price_micro_usd=189283750 authority_effect=NONE

PROOF paused_mandate_execution=REFUSE code=MandateNotActive
PROOF downward_authority=PAUSED version=7 nonce=6

12 passing
DEVNET_PROOF=PASS
```

## Example devnet transactions

In-bounds demo-token execution:

`pdgXWLU8zHXBCFZw4d7wVqM5uy5uTtVqYcutdUUGZWg8L2z2LNsnVJSUNvvr7TNkyDVXTTH2gVc69Dc1THttppd`

Guardian widen:

`5hCZmYL8FXj5C2CXQ1UuiUd6VwhK6bYf2phxmSFy3jzqz3KKsKSu3ojo6KaMiHtHkPLhvqnffJymTFbZjT5gyhUY`

Same larger action after widen:

`ELapfY9CDyRwAkDH2wT73xvMmgv3CJ5Whk2ad1UjP2B5pKFdpqgS569stckVzExDUiwr78MpbWv8jrjmGB5Qv8j`

Pyth policy configuration:

`4ykGs1iNjYiQ76JwRcAG4qMw99aL3DzKozxBA3jPTuHwjr4s5ahvwwDCDjV4WsGuGnc9ePspRANCkM8qtNweVPy9`

Pyth-verified execution:

`56CHzu3ym2iqcsDFbnx4KWtVizXe8oeFasMckJGjg855PmsjWzERrVCjpfpoQVbu8jXks14YPvYaDvo6uTKDyFkE`

Market-condition policy transition:

`qpdvUyJjKWdhzqFKpxAjfA1VEn3ETvd4HrZpCniMdzJNY9EJx4n9xYGzz2DjVx7L9cPeJU8Ba2EioBcjt6ThMC1`

Pause:

`5jpG7L6WSZLukXVQ9eLhV9wuF4rdYftLJ39c9HPENFY7TV5pPFHMzSZ2E97FRWUBWubr22qcCL2kX5Pj82pXzPgx`

## Architecture truth

KEYS does not trust a browser-supplied price.

The capital path verifies a Pyth-signed Solana message through the canonical Pyth Lazer verifier, parses only the required signed properties, then applies:

- feed id match;
- fixed-rate channel acceptance;
- freshness;
- confidence;
- deterministic micro-USD conversion;
- per-action notional;
- per-period notional;
- optional precommitted max-price condition.

Pyth can cause an action to fail. It cannot widen the Mandate.

## Truth boundary

The asset moved by KEYS is still an explicitly labeled **demo/mock SPL token**.

This proof does **not** claim:

- real xStock/tokenized-stock execution;
- brokerage;
- custodial service;
- legal minor securities ownership;
- mainnet deployment;
- issuer/venue/jurisdiction eligibility.

The correct claim is:

> **On the canonical Solana devnet program, KEYS now cryptographically enforces bounded capital actions using live Pyth market truth while preserving human-only authority widening.**
