# KEYS — Stocklana Bounty Integration Gate

Date: 2026-09-24  
Status: **PASS WITH SELECTIVE INTEGRATION**

## Purpose

Evaluate Stocklana sponsor bounties against the locked KEYS product without changing the core wedge, weakening the truth boundary, or adding sponsor technology only for cosmetic eligibility.

Canonical rule:

> Sponsor integrations may extend KEYS. They must not redefine KEYS.

The Family bounded-autonomy experience remains the product spine:

`MY KEY → LEARN/PRACTICE → ALLOW → REFUSE → MARKET CHANGE → ASK FOR MORE ROOM → HUMAN WIDEN → ALLOW → STALE REFUSE`

## Current Stocklana sponsor tracks

Publicly announced tracks:

- **Pyth Network** — best use of Pyth market data.
- **PreStocks** — Best Integration.
- **Tessera** — Pre-IPO Stocks.
- **Clawpump** — Stocknized Agent.
- **Meteora** — Best Use of DBC.

A single Stocklana submission may target the main competition plus one or more sponsor bounties.

Reference:
- https://solanacompass.com/news/stocklana-hackathon-expands-to-121000-with-five-ecosystem-partner-tracks
- https://www.binance.com/en/square/post/368030416345179
- https://launch.meteora.ag/

Deadline currently published for Stocklana:

**2026-09-25 16:00 ET**

## Decision framework

A bounty integration is accepted only if all are true:

1. **Product-native** — it makes the bounded-autonomy product meaningfully better.
2. **Sponsor-native** — a judge can identify actual use of the sponsor technology/product, not a logo or metadata reference.
3. **Load-bearing or independently useful** — removing it changes a real capability or proof.
4. **Truthful** — it does not imply securities ownership, eligibility, brokerage, custody, or execution that KEYS does not prove.
5. **Demo-legible** — the sponsor contribution can be understood quickly.
6. **Non-destructive** — it does not force the Maya/Family journey to become an agent, launchpad, DEX, or issuer product.
7. **Bounded scope** — it can live behind an adapter/sidecar rather than contaminating the core Mandate model.

## Gate result

| Track | Verdict | KEYS fit | Required proof |
| --- | --- | --- | --- |
| Pyth | **GO — ALREADY EARNED** | Native / load-bearing | Existing signed live Pyth verification in Solana capital path |
| PreStocks | **CONDITIONAL GO** | Strong representation + private-market boundary fit | Verified PreStocks representation consumed by a KEYS adapter; issuer/representation truth visible |
| Tessera | **CONDITIONAL GO** | Strong representation-structure / pre-IPO education fit | Verified Tessera T-Token representation consumed by the same adapter; legal/economic representation distinguished |
| Clawpump | **SIDE-CAR ONLY / NOT CORE** | Strong long-term delegated-agent fit, weak Family-core fit | Actual Stocknized agent deployed through Clawpump and bounded by a KEYS Mandate |
| Meteora | **ONLY WITH REAL DBC USE** | Weak alone; potentially natural with Clawpump | Actual DBC launch/pool/configuration tied to stock/RWA quote asset and visible in demo |

## 1. Pyth — GO / COMPLETE ENOUGH TO ENTER

### Why it clears the gate

Pyth is already a load-bearing part of the proven KEYS capital path.

Canonical proof:

- live Pyth Pro equity market evidence;
- signed Solana-format payload;
- Ed25519 verification;
- Pyth Lazer verification inside the KEYS transaction path;
- deterministic micro-USD price/notional derivation;
- notional-limit refusal;
- precommitted max-price refusal;
- market evidence authority effect = NONE.

Canonical devnet run:

https://github.com/Faadil1/keys/actions/runs/35959137364

Program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

### Sponsor story

> Pyth is not a price badge in KEYS. It is market truth used inside the capital boundary.

Canonical product rule:

> Pyth can stop an action. Pyth cannot give Maya more authority.

### Action

**No new architecture required.**

Submission packaging should make the Pyth path explicit and easy for the sponsor judge to verify.

## 2. PreStocks — CONDITIONAL GO

### Why it fits

PreStocks exposes pre-IPO economic exposure through Solana tokens. Its own public disclosures state that PreStocks provide economic exposure and do not confer direct ownership/voting/dividend/information rights; availability is also restricted for ineligible users/jurisdictions.

That distinction matches a core KEYS requirement:

`underlying company != representation != token != eligibility != human authority`

Official public surfaces:
- https://prestocks.com/
- https://prestocks.com/products
- https://prestocks.com/faq
- https://prestocks.com/ecosystem

### Correct KEYS integration

Create a sponsor-neutral representation layer:

```
RepresentationAdapter
  issuer
  issuerProduct
  underlying
  representationId
  mint
  tokenProgram
  representationType
  rightsSummary
  eligibilityStatus
  eligibilitySource
  marketDataMapping
  verificationStatus
```

Then add:

`PreStocksRepresentationAdapter`

The adapter may inform whether the representation is the one named by an `AssetRule`.

It must **not** grant authority.

### Required bounty proof before claiming integration

At least one real PreStocks product must be resolved from an authoritative/verified source to:

- exact Solana mint/representation;
- product/issuer identity;
- token program / relevant extensions when material;
- underlying company;
- representation semantics;
- eligibility status or UNKNOWN fail-closed state.

The frontend should be able to show:

> “This is the representation your Key permits.”

rather than merely:

> “This is OpenAI.”

### Why CONDITIONAL rather than immediate GO

The public PreStocks site clearly exposes products and Solana ecosystem integration, but the current research pass did **not** locate a first-party developer SDK/API specification that would by itself prove sponsor-native integration.

Therefore:

**do not claim the PreStocks bounty is earned until KEYS consumes a real PreStocks representation and produces an auditable integration receipt.**

## 3. Tessera — CONDITIONAL GO

### Why it fits

Tessera's public product explanation describes T-Tokens as tokenized loan participation rights issued through dedicated structures rather than direct equity ownership.

Reference:
- https://blog.tessera.pe/posts/how-t-tokens-are-actually-structured
- https://blog.tessera.pe/posts/t-openai-goes-live-today

That makes Tessera highly compatible with KEYS' representation-aware architecture.

The educational value is particularly strong:

```
OpenAI
  ↓ underlying
T-OpenAI
  ↓ representation
loan participation right
  ↓ token
Solana asset
  ↓ authority
KEYS AssetRule
```

These layers must not be collapsed into “owning OpenAI stock.”

### Correct integration

Reuse the same generic:

`RepresentationAdapter`

and add:

`TesseraRepresentationAdapter`

No separate Tessera-specific authority model should be created.

### Required bounty proof

Before entering the Tessera track, prove at least one current T-Token representation with:

- canonical mint;
- representation/product identity;
- issuer/structure summary;
- underlying;
- token mechanics needed by KEYS;
- market-data mapping where available;
- explicit rights/truth-boundary copy.

A judge should be able to see why KEYS needs representation-level policy rather than ticker-level policy.

### Gate

**Do not build a second frontend journey for Tessera.**

PreStocks and Tessera must share one representation abstraction and differ only in adapter/evidence.

## 4. Clawpump — SIDE-CAR ONLY

### Current sponsor signal

Public Stocklana messaging describes the track as **Stocknized Agent** and specifically promotes stock/RWA agents deployed through Clawpump, including combinations with Meteora.

References:
- https://clawpump.tech/
- public Stocklana sponsor announcement summarized at https://solanacompass.com/news/stocklana-hackathon-expands-to-121000-with-five-ecosystem-partner-tracks

### Strong KEYS angle

Clawpump becomes interesting only if KEYS acts as an authorization boundary around an autonomous agent:

```
Clawpump stock agent
        ↓ proposes action
KEYS Agent Mandate
   ↙             ↘
within           outside
ALLOW            REFUSE
```

Long-term product connection:

> KEYS is a mandate engine for delegated capital, whether the delegate is a teenager, an adult child, an advisor, or an autonomous agent.

### Why not core

The current Stocklana wedge is Family.

Putting an agent in Maya's primary journey would weaken:
- immediate user legibility;
- Family differentiation;
- the human-development/learning story;
- the locked judge-facing demo.

### Gate

Only proceed if a **separate Agent Key lab/sidecar** can produce a real Clawpump deployment without touching the Family spine.

No fake agent card.  
No generic LLM chat.  
No “AI recommends a stock” feature.

## 5. Meteora — CONDITIONAL ONLY THROUGH REAL DBC

### Official product requirement signal

Meteora's Stocklana track explicitly promotes creative uses of **Dynamic Bonding Curve (DBC)** in tokenized-stock contexts.

Meteora describes DBC as a permissionless token launch product with a virtual pool and configurable price discovery before migration into liquidity infrastructure.

References:
- https://launch.meteora.ag/
- https://github.com/MeteoraAg/docs/blob/main/core-products/dbc/what-is-dbc.mdx
- https://github.com/MeteoraAg/meteora-invent

### KEYS fit

A bonding curve has no natural role in Maya's bounded-autonomy journey.

Therefore Meteora is **not** eligible merely because KEYS touches Solana assets.

### Acceptable path

The only currently credible path is a sidecar that genuinely requires launch/liquidity infrastructure, most naturally:

`Clawpump Agent Key → stock/RWA-paired agent/token → Meteora DBC`

Then KEYS controls the delegated-capital actions of that agent.

### Gate

Do not implement DBC just to display a Meteora badge.

Proceed only after the Clawpump sidecar has a concrete launch object for which DBC is functionally necessary.

## Architecture rule

Sponsor integrations must sit around the canonical engine:

```
                    KEYS MANDATE ENGINE
                           │
              ┌────────────┼────────────┐
              │            │            │
         Market Truth  Representation  Delegate
             Pyth         Adapters      Adapters
                        /          \        │
                 PreStocks       Tessera  Clawpump
                                             │
                                          Meteora
                                     only if DBC needed
```

### Authority invariant

None of these may widen authority:

- Pyth;
- PreStocks;
- Tessera;
- Clawpump;
- Meteora;
- market performance;
- learning completion;
- agent confidence.

Only the authorized human transition may widen a human-created Mandate.

## Integration sequence

### B0 — Pyth packaging — DO NOW

No architecture work.

Add/ensure:
- sponsor label in submission;
- canonical devnet proof link;
- Pyth role in README/demo;
- judge-visible explanation of Pyth refusal paths.

### B1 — Representation Adapter — NEXT TECHNICAL CANDIDATE

Build one generic representation interface.

Then attempt, in this order:

1. authoritative PreStocks representation;
2. authoritative Tessera representation.

Stop if authoritative product identity/mint evidence cannot be established cleanly.

Success criterion:

**one KEYS AssetRule can distinguish two different representations of the same underlying company.**

That would make the integration product-native rather than sponsor decoration.

### B2 — Agent Key feasibility — AFTER FAMILY FRONTEND IS SAFE

Investigate actual Clawpump deployment mechanics.

Proceed only if:
- real deployment is possible;
- the agent can expose an action request KEYS can bound;
- the sidecar is isolated from Maya's flow.

### B3 — Meteora DBC — ONLY IF B2 CREATES A NATURAL NEED

No independent Meteora build.

## Submission strategy

Current target set:

- **Stocklana main:** YES
- **Pyth:** YES
- **PreStocks:** pending B1 proof
- **Tessera:** pending B1 proof
- **Clawpump:** pending B2 proof
- **Meteora:** pending B2/B3 proof

Do not list a conditional bounty as integrated in the submission until its proof exists.

## Stop conditions

Kill a sponsor integration immediately if it requires any of the following:

- changing KEYS Family into a launchpad;
- adding approval-per-action back into Maya's normal flow;
- implying a minor can legally trade a restricted security;
- hard-coding a sponsor asset as KEYS' product identity;
- duplicating the Mandate engine;
- adding an AI agent to the primary Family journey;
- deploying a token solely to claim sponsor eligibility;
- using a logo/API call with no product effect;
- weakening UNKNOWN → fail-closed behavior;
- exposing private keys/API keys/browser signer material.

## Gate conclusion

**PASS WITH SELECTIVE INTEGRATION.**

Pyth is already a genuine KEYS integration.

PreStocks and Tessera are the best next extension because the existing v0.2 `AssetRule` already has the right conceptual seam: representation identity.

Clawpump is strategically interesting as proof that KEYS can bound non-human delegates, but must remain a sidecar.

Meteora should activate only when a real DBC use exists, most likely through that sidecar.

The locked Family product remains unchanged.
