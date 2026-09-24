# KEYS — Cresco HTTP → Solana Devnet Execution Bridge Proof

Date: 2026-09-24  
Network: Solana devnet  
Workflow: `devnet-execution-bridge`  
Canonical successful run: https://github.com/Faadil1/keys/actions/runs/36008701813  
Result: **PASS**

## What this proof establishes

The KEYS frontend/backend bridge now proves the following end-to-end demo path:

```
Cresco / HTTP client
    ↓
POST /api/v0.2/actions/execute
    ↓
server-held devnet demo signer
    ↓
live signed Pyth TSLA message
    ↓
KEYS execute_within_mandate_with_pyth
    ↓
canonical KEYS Solana devnet program
    ↓
confirmed transaction signature
```

This is no longer only a frontend simulation or a backend policy preview.

The smoke proof returned:

- decision: `ALLOW`
- reason: `WITHIN_MANDATE`
- execution proof status: confirmed
- `simulated: false`
- Pyth verification: `ONCHAIN_PYTH_LAZER`
- Pyth authority effect: `NONE`

## Canonical program

Program ID:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Explorer:

https://explorer.solana.com/address/ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk?cluster=devnet

## Stable devnet demo runtime

Runtime mode:

`SERVER_HELD_DEVNET_DEMO`

Guardian / beneficiary demo signer public address:

`FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`

Charter:

`GUwYmmzW3woSC8mdu3auXCr9PP9QMKfHnZh2HzNbGYay`

Mandate:

`AnBnNwACbwQ7KMN46jBoDS5pxsek2AdHV6X1B1uA7hXp`

Mandate at proof time:

- version: `4`
- nonce: `3`
- max action notional: `10,000,000` micro-USD = **$10**
- max period notional: `50,000,000` micro-USD = **$50**

Proof asset market reference:

- symbol: `TSLA`
- Pyth feed id: `1435`

Demo/mock SPL mint:

`6SiraBz3rrfsf2j1AWZzVJPG4NWnyu71F2duL9QASNSC`

AssetRule:

`DTL4pE8z2TRrgkdw4KWe4vxsWYFZw3q6Sft64hfBgp8q`

Program-controlled vault token account:

`Du7vhDEEjQm1DpYPt9iJkB13zUXtcvA7ptxXck9Xvs7A`

Delegate token account:

`GedZ81teunTiygCaEuXHxeP28F9bXvRCNgtriwLz4m8A`

Vault balance at bootstrap:

`50,000,000` base units = 50 demo tokens at 6 decimals.

## Confirmed bridge transaction

Transaction signature:

`2GqHrafL46sU3RMDEEb8AChHzwgRqkMT5fjn5GiMyqomqkrEukrnywDCmGZrNtnRLkNGYMVjdPowyh5HrKtGdytn`

Explorer:

https://explorer.solana.com/tx/2GqHrafL46sU3RMDEEb8AChHzwgRqkMT5fjn5GiMyqomqkrEukrnywDCmGZrNtnRLkNGYMVjdPowyh5HrKtGdytn?cluster=devnet

Observed proof envelope:

```json
{
  "status": "PASS",
  "decision": "ALLOW",
  "reasonCode": "WITHIN_MANDATE",
  "signature": "2GqHrafL46sU3RMDEEb8AChHzwgRqkMT5fjn5GiMyqomqkrEukrnywDCmGZrNtnRLkNGYMVjdPowyh5HrKtGdytn",
  "programId": "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
  "mandateAddress": "AnBnNwACbwQ7KMN46jBoDS5pxsek2AdHV6X1B1uA7hXp",
  "mandateVersion": 4,
  "mandateNonce": 3,
  "pyth": {
    "source": "PYTH_PRO",
    "feedId": 1435,
    "verification": "ONCHAIN_PYTH_LAZER",
    "status": "FRESH",
    "authorityEffect": "NONE"
  },
  "truthBoundary": {
    "executionAsset": "DEMO_TOKEN",
    "simulated": false
  }
}
```

Proof marker:

`DEVNET_HTTP_EXECUTION_BRIDGE=PASS`

## Supporting bootstrap transactions

Policy configuration:

`629opFJnR4Mb9yxHdskf23Pu1NEZsEcT42wW7N3DSUGHn3Gn9AbYusg3c4H3tr9sVaTrKsrZhJts3JELByHZv2jW`

Vault top-up:

`3P9iWAhK7BJzTpjxMZwGAndCM8hoaDBbbT1qGX3bAEekhFfkZ6vB7mSMmuhWdLXoUkJTkSrNjqfgY2b1uRofjSbZ`

## Security and truth boundary

The proof deliberately uses a server-held **devnet-only demo signer**.

No private-key material is recorded here.

This proof does **not** establish:

- child self-custody;
- production embedded wallets;
- real securities execution;
- xStocks settlement;
- brokerage;
- custody;
- fiat funding;
- KYC;
- Solana mainnet.

The moved capital asset is an explicitly labeled demo/mock SPL token.

The correct claim is:

> **Cresco can now invoke the KEYS backend and receive a real confirmed Solana devnet transaction in which live signed Pyth market truth is verified inside the KEYS capital path.**

## Product routing

The primary Family journey remains product-first and asset-agnostic.

The TSLA devnet bridge is exposed as an isolated **Live Solana proof lane** in Cresco technical details so judges can inspect the real runtime without forcing the entire Family experience to become a TSLA-specific engineering demo.
