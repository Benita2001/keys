# KEYS — Stocklana Bounty Integration Gate

Date: 2026-09-24  
Status: **PYTH + PRESTOCKS + TESSERA ACTIVE; CLAWPUMP / METEORA HELD OUTSIDE CORE**

## Governing rule

Sponsor tracks may extend KEYS only when they strengthen the locked Family bounded-autonomy product. They must not turn KEYS into an agent-first product, add launch infrastructure only to chase a bounty, weaken eligibility/truth boundaries, or let an external protocol widen human authority.

## Track decisions

| Track | KEYS state | Decision |
| --- | --- | --- |
| Pyth | Signed live market evidence is already load-bearing in the canonical Solana capital path | **ACTIVE / ENTER** |
| PreStocks | Official public token API is now integrated with fail-closed eligibility | **ACTIVE / ENTER** |
| Tessera | Official public keyless token-details API integrated; live T-OpenAI / T-Kalshi / T-SpaceX representations are normalized fail-closed | **ACTIVE / ENTER** |
| Clawpump | Requires a real Stocknized Agent deployment and RWA/Meteora pairing | **HOLD OUTSIDE CORE** |
| Meteora | Requires a genuine DBC/stock-launch use case | **HOLD OUTSIDE CORE** |

## Pyth — proven

Canonical devnet proof:

https://github.com/Faadil1/keys/actions/runs/35959137364

KEYS already proves live signed Pyth Pro/Lazer evidence, on-chain verification, USD-notional enforcement, notional refusal, precommitted max-price refusal, and authority effect NONE.

Submission framing:

> Pyth can stop an action. Pyth cannot give Maya more authority.

## PreStocks — live integration

Current sponsor messaging asks Stocklana projects to integrate PreStocks and has increased the bounty to $10,000 across three awards ($5K / $3K / $2K).

Reference: https://t.me/s/PreStocksFi

Official public token API:

https://prestocks.com/api/prestocks

The API currently exposes real product symbols, Solana contract addresses, mark prices/valuations, token prices/implied valuations, supply and product URLs.

### Implemented in KEYS

- `src/prestocks-adapter.mjs`
- `scripts/prestocks-live-proof.mjs`
- `.github/workflows/prestocks-live-proof.yml`
- canonical live proof: https://github.com/Faadil1/keys/actions/runs/35969672666
- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

The adapter exposes the exact representation, live market context and representation semantics without creating KEYS authority.

Default state:

- `eligibility.status = UNKNOWN`
- `executionEligible = false`
- `practiceAvailable = true`
- `authorityEffect = NONE`

An explicit trusted eligibility resolver is required before any representation can be marked execution-eligible. External eligibility still does not widen the Mandate.

### Product value

PreStocks makes the representation problem concrete:

Company ≠ representation ≠ direct equity ownership ≠ holder eligibility ≠ KEYS authority.

That gives KEYS a sponsor-native use case that fits the Family wedge: contextual learning can explain the actual on-chain representation rather than teaching generic finance theory.

### Truth boundary

PreStocks' own materials state that its tokens provide economic exposure rather than direct ownership/voting/dividend/information rights and are unavailable to U.S. persons and other ineligible persons.

KEYS therefore never infers eligibility from wallet possession and does not claim live minor PreStocks execution.

## Tessera — live integration

The earlier HOLD condition is now cleared. Tessera exposes an official public keyless token-details API:

`https://rest-api.tessera.pe/v1/public/token-details`

KEYS integrates and normalizes the live Tessera representation layer without creating Money eligibility or KEYS authority.

### Implemented in KEYS

- `src/tessera-adapter.mjs`
- `scripts/tessera-live-proof.mjs`
- `.github/workflows/tessera-live-proof.yml`
- `GET /api/v0.2/integrations/tessera`
- `GET /api/v0.2/integrations/tessera/:asset`
- live proof: https://github.com/Faadil1/keys/actions/runs/36112072978
- hosted Cloudflare proof: https://github.com/Faadil1/keys/actions/runs/36112229684
- Cresco Explore Learn/Practice surface: web run `36112502712`, WebKit/iPhone run `36112502709`

The live proof verifies the official Tessera mints for T-OpenAI, T-Kalshi and T-SpaceX and preserves the representation truth boundary.

Default KEYS state:

- `eligibility.status = UNKNOWN`
- `executionEligible = false`
- `practiceAvailable = true`
- `representationLearningAvailable = true`
- `authorityEffect = NONE`

Tessera T-Tokens are modeled as **loan participation rights**, not direct equity ownership. KEYS does not infer user/jurisdiction eligibility from wallet possession, does not expose them as current Money assets, and does not claim real minor securities execution.

### Product value

Tessera makes another important representation distinction concrete:

Company ≠ T-Token ≠ direct equity ownership ≠ holder eligibility ≠ KEYS authority.

That fits KEYS Family directly: a young person can learn what a private-market representation actually is before confusing a token ticker with owning company shares.

## Clawpump — hold outside core

Current Stocklana messaging describes Stocknized Agents as agents deployed through Clawpump and paired with RWA infrastructure on Meteora. That requires a real agent deployment. It is a possible future delegated-capital sidecar, not the Family hero.

## Meteora — hold outside core

The Meteora bounty is explicitly about real DBC use: curves, fee models, quote assets, graduation mechanics, price discovery or launch/issuer tooling. KEYS Family has no native need for a bonding curve.

Activate only if a later Clawpump sidecar genuinely needs a stock-paired DBC launch.

## Current submission target

1. Stocklana main track.
2. Pyth sponsor track.
3. PreStocks sponsor track.
4. Tessera sponsor track.

Clawpump and Meteora remain outside the core unless a later product-native activation case independently justifies them.

## Benita integration rule

Pyth stays in the core proof. PreStocks and Tessera are secondary representation / Learn / Practice surfaces using their live integration routes. Both remain fail-closed for execution eligibility unless explicitly verified, and neither creates KEYS authority.

Do not turn the homepage into a sponsor dashboard.
