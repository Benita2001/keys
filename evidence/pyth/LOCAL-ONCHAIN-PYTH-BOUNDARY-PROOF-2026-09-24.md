# KEYS — Local On-Chain Pyth Bounded-Autonomy Proof

Date: 2026-09-24  
Network: local Solana validator with cloned canonical Pyth Lazer verifier/state  
Workflow: `solana-authority-proof`  
Run: https://github.com/Faadil1/keys/actions/runs/35956618933  
Result: **PASS — 12 passing**

## What this proof establishes

KEYS now verifies authenticated Pyth Pro/Lazer market evidence **inside the Solana capital-execution path** on a local validator.

The transaction contains:

1. a Pyth-signed Solana-format TSLA market message;
2. a preceding Ed25519 verification instruction;
3. the KEYS `execute_within_mandate_with_pyth` instruction carrying the exact signed message bytes;
4. a CPI from KEYS into the canonical Pyth Lazer verifier;
5. KEYS parsing the already-verified payload and applying Mandate policy before capital can move.

The proof shows all three required market-evidence roles:

- **Execution truth:** one unit of the demo asset executes under a Pyth-derived USD notional boundary.
- **Notional refusal:** two units are refused with `PythNotionalExceeded`.
- **Precommitted condition refusal:** a price ceiling below the verified live price refuses with `MarketConditionInvalidated`.

Pyth has **no authority effect**. The market condition can restrict/refuse an action; it cannot widen Maya's Mandate.

## Live feed

- Symbol: `Equity.US.TSLA/USD`
- Pyth feed id: `1435`
- Signed Solana payload: fetched through the authenticated Pyth Pro boundary
- Live observed price during proof: approximately `378.23` USD

## Key proof markers

```
PROOF pyth_policy_tx=5dDQuFdmQBUtYqN2fvbbKuAhbjg6jSKYT8ZcRLYyX5CeAMNUxQ4dNLySqu6JjdBtPfNTSyCw1yLRxJ13gK4MLe4C
PROOF pyth_verified_execution_tx=28kw9moMjYAy5x7uB7qFj3SYvKhM7hAedQqhuHj6fxbcouXFohbTwMXZ4BrH1TEdCuYLZTrfchAH8Gfi7NkdmhhK
PROOF pyth_onchain_execution=ALLOW feed=1435 price=378.22999999999996 action_limit_micro_usd=567345000 nonce=4
PROOF pyth_notional_boundary=REFUSE code=PythNotionalExceeded
PROOF pyth_notional_boundary=ENFORCED price=378.22999999999996 amount=2 action_limit_micro_usd=567345000
PROOF pyth_market_condition=REFUSE code=MarketConditionInvalidated
PROOF pyth_market_condition_policy_tx=4aMGRJi4iHNK6KHk1sH18bYaLnJLDNiHGK1HpAehBzH8A7mvHeJqYL1v14XVpBHd4KEzzb15NRtMdAEp5kdx42DA
PROOF pyth_market_condition=REFUSE verified_price=378.21999999999997 max_price_micro_usd=189115000 authority_effect=NONE
12 passing
```

## Architecture detail

The KEYS SBF program intentionally does **not** embed the full Pyth off-chain protocol SDK.

Instead:

- cryptographic signer verification is delegated to the canonical Pyth Lazer Solana program;
- KEYS carries a small parser for only the signed properties it explicitly requests:
  - price;
  - exponent;
  - confidence;
  - publisher count;
  - market session;
  - feed update timestamp;
- freshness and confidence are then checked against the active Mandate;
- price is converted to micro-USD for deterministic integer notional checks.

This keeps the verifier load-bearing without unnecessarily inflating the KEYS program binary.

## Truth boundary

This is a **real local Solana proof** with live authenticated Pyth TSLA evidence and a demo/mock SPL token.

It does not prove:

- real tokenized-stock execution;
- brokerage/custody;
- legal minor securities ownership;
- Solana mainnet deployment.

Canonical devnet confirmation remains a separate gate until its runtime proof passes.
