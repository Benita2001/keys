# KEYS — AAPL Pyth + Cresco HTTP-to-Solana Devnet Proof

Date: 2026-09-24  
Status: **PASS — AAPL CURRENT PROOF LANE**

## Headline

KEYS now proves the current Cresco technical proof lane with:

`Cresco / KEYS API → live signed Pyth AAPL → KEYS Solana devnet program → CONFIRMED demo-token execution`

This replaces TSLA as the **current** judge-facing proof asset.

The earlier TSLA proofs remain historically valid evidence of the same mechanism and are not deleted or rewritten.

## Current Pyth market truth

Symbol:

`Equity.US.AAPL/USD`

Pyth Pro feed id:

`922`

### Authenticated live AAPL entitlement proof

Workflow:

`pyth-live-proof`

Run:

https://github.com/Faadil1/keys/actions/runs/36035283447

Observed:

- secret injection: PASS;
- symbol: `Equity.US.AAPL/USD`;
- feed id: `922`;
- channel: `fixed_rate@1000ms`;
- status: `FRESH`;
- market session: `regular`;
- publisher count: `19`;
- signed Solana payload: `AVAILABLE`;
- payload encoding: `base64`;
- `PYTH_SIGNED_SOLANA_PAYLOAD=PASS`;
- load-bearing decision reached `ESCALATE / GUARDIAN_REVIEW_REQUIRED`;
- `PYTH_LIVE_PROOF=PASS`.

Observed live snapshot during this proof:

- price: approximately `337.34502 USD`;
- confidence: approximately `0.04003 USD`;
- confidence bps: approximately `1.1866`;
- publish time: `2026-09-24T17:34:56.000Z`.

The price is evidence from that proof instant, not a durable quoted price.

## AAPL HTTP-to-Solana execution proof

Workflow:

`devnet-execution-bridge`

Run:

https://github.com/Faadil1/keys/actions/runs/36034651466

Result:

**SUCCESS**

Terminal marker:

`DEVNET_HTTP_EXECUTION_BRIDGE=PASS`

### Stable runtime

Program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Network:

`solana-devnet`

Runtime mode:

`SERVER_HELD_DEVNET_DEMO`

Signer:

`FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`

Charter:

`GUwYmmzW3woSC8mdu3auXCr9PP9QMKfHnZh2HzNbGYay`

Mandate:

`AnBnNwACbwQ7KMN46jBoDS5pxsek2AdHV6X1B1uA7hXp`

Mandate version / nonce at proof:

`v5 / nonce 4`

Max action notional:

`10,000,000 micro-USD = $10`

Max period notional:

`50,000,000 micro-USD = $50`

### AAPL demo rule

Market asset:

`AAPL`

Pyth feed id:

`922`

Demo mint:

`5x2X4jeHeLfM1WYiPa87QNwJMzvdqjx1QpM58LM6C3i4`

AssetRule:

`625zxvb7sTyaY3oKMcVs2tvQCCPvPgXVEZEHaJiCKsC`

Vault:

`3DEqwJK5zrCYmURAxwa1vvZMcS9NVyhU3nvrrz6VKA5n`

Delegate token account:

`7YJZbzGR4bwFEbwNBnr1QcUQvi6Jjuqp48vAX3kTYun7`

The capital asset remains a demo/mock SPL token.

## Confirmed transaction

Decision:

`ALLOW / WITHIN_MANDATE`

Signature:

`3pFf5gFTQANbeJkxdLLdZho2iwgtsmXS36WdQroGPoUwuF7txaxRzQrJf2mcMajBj7BsnvrAEj5a148erm6TboP1`

Explorer:

`https://explorer.solana.com/tx/3pFf5gFTQANbeJkxdLLdZho2iwgtsmXS36WdQroGPoUwuF7txaxRzQrJf2mcMajBj7BsnvrAEj5a148erm6TboP1?cluster=devnet`

Execution proof:

- network: `solana-devnet`;
- simulated: `false`;
- execution asset: `DEMO_TOKEN`;
- Pyth source: `PYTH_PRO`;
- Pyth feed id: `922`;
- Pyth verification: `ONCHAIN_PYTH_LAZER`;
- Pyth status: `FRESH`;
- Pyth authority effect: `NONE`.

## Product alignment

The current technical proof now uses the same underlying company as the primary Cresco Family journey:

```
Apple UX
  ↓
Pyth Equity.US.AAPL/USD
  ↓
KEYS Mandate
  ↓
Solana devnet
  ↓
confirmed demo-token execution
```

This removes the previous Apple-UX / TSLA-proof mismatch.

It does **not** mean:

`AAPL equity == AAPLx == AAPLon`

Those remain distinct representations/feeds/products until their exact mappings are separately verified.

## Truth boundary

This proof establishes:

- authenticated AAPL market evidence;
- signed Solana-format Pyth payload;
- AAPL feed id `922`;
- Pyth Lazer verification in the KEYS capital path;
- real Solana devnet transaction confirmation;
- bounded demo-token execution.

This proof does **not** establish:

- purchase of real AAPL shares;
- purchase of AAPLx or AAPLon;
- brokerage;
- custody;
- legal securities ownership;
- production minor investing;
- mainnet execution.

Canonical sentence:

> KEYS enforces bounded demo-token capital actions on Solana devnet using live signed Pyth AAPL market truth.

Authority invariant:

> Pyth can stop an action. Pyth cannot give Maya more authority.
