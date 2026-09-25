# KEYS — Pyth Multi-Market Discovery Proof

Date: 2026-09-25  
Status: **PASS — LIVE PYTH PRO ENTITLEMENT VERIFIED ACROSS FIVE MARKET CLASSES**

## Purpose

Prove that KEYS can broaden the **Learn / Practice market universe** without changing the primary Money proof lane.

Canonical rule:

> **AAPL is the primary execution proof, not the entire market universe.**

A feed being present in the public Pyth catalog does not imply that the KEYS Pyth key is entitled to it. An entitled/live feed also does not imply KEYS Money execution eligibility.

## Canonical runs

- Pyth authenticated discovery proof: https://github.com/Faadil1/keys/actions/runs/36115570744
- hosted Cloudflare market-discovery proof: https://github.com/Faadil1/keys/actions/runs/36115973480
- Cresco web validation: https://github.com/Faadil1/keys/actions/runs/36115749327
- WebKit/iPhone validation: https://github.com/Faadil1/keys/actions/runs/36115749387

## Live verified classes

### Stocks & ETFs

- `Equity.US.AAPL/USD` — feed `922` — **PRIMARY_MONEY_PROOF**
- `Equity.US.NVDA/USD` — feed `1314` — Learn / Practice
- `Equity.US.MSFT/USD` — feed `1292` — Learn / Practice

### Crypto

- `Crypto.BTC/USD` — feed `1`
- `Crypto.ETH/USD` — feed `2`
- `Crypto.SOL/USD` — feed `6`

All are **Learn / Practice only** in current KEYS.

### FX

- `FX.EUR/USD` — feed `327`
- `FX.USD/JPY` — feed `340`
- `FX.GBP/USD` — feed `333`

All are **Learn / Practice only**.

### Metals

- `Metal.XAU/USD` — feed `346` — Gold
- `Metal.XAG/USD` — feed `345` — Silver
- `Metal.AL3M/USD` — feed `3450` — Aluminium 3-month

All are **Learn / Practice only**.

### Commodities / Energy

The live proof found at least one currently accessible Brent futures feed in the selected discovery sample:

- `Commodities.BRENTF7/USD` — feed `3682`

This remains **Learn / Practice only**. Futures availability changes over time, so KEYS discovers the current catalog instead of hard-coding this contract as a permanent product dependency.

### Rates

No currently selectable live Rates feed was proven in this run.

KEYS therefore does **not** label Rates as live.

## Runtime design

Public Pyth catalog:
`GET https://pyth.dourolabs.app/v1/symbols?asset_type=...`

Authenticated entitlement check:
Pyth Pro `/v1/latest_price`, server-side only.

KEYS route:
`GET /api/v0.2/market/discovery`

The route:
1. fetches current Pyth catalog metadata;
2. excludes non-active / coming-soon feeds from selected candidates;
3. probes the KEYS Pyth entitlement server-side;
4. returns only truthful entitlement states;
5. marks AAPL as `PRIMARY_MONEY_PROOF`;
6. marks every other currently accessible feed `LEARN_PRACTICE_ONLY`;
7. preserves `authorityEffect: NONE`.

## Truth boundary

- catalog presence ≠ entitlement;
- entitlement ≠ Money eligibility;
- market evidence ≠ authority;
- AAPL remains the only current proven Money execution asset;
- NVDA/MSFT/BTC/ETH/SOL/FX/metals/commodity discovery does not claim brokerage, custody, settlement or real minor securities execution;
- no price is fabricated when Pyth is unavailable.
