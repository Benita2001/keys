# Stocklana — KEYS Submission Packaging

Date: 2026-09-24  
Status: **READY AFTER FINAL LIVE DEPLOY SMOKE**

## Submission target

Main submission: **KEYS Family**

Sponsor tracks:
- **Pyth**
- **PreStocks**

Do not add Clawpump, Meteora or Tessera unless their activation gates change before submission.

Official platform submission surfaces support:
- GitHub repository;
- live demo deployed to devnet or mainnet;
- pitch video up to 3 minutes;
- technical video up to 5 minutes;
- sponsor-track selection.

Our submission should use all four supporting surfaces even where optional.

## One-line product

**KEYS lets a young person act independently with capital inside family-set limits, while Solana enforces the boundary and Pyth supplies market truth.**

Alternative consumer line:

**Financial independence shouldn’t happen all at once. KEYS gives young people a key: freedom inside clear limits, a request only when they reach the boundary.**

## Problem

Youth finance products commonly turn the parent-child relationship into either:
- continuous per-action permission; or
- a jump from supervised learning to broad account access.

That leaves little room for **bounded independence**: real decision-making without either constant approval or unrestricted authority.

## Solution

A guardian creates a versioned **Mandate**:
- allowed action;
- asset scope;
- per-action limit;
- period limit;
- market conditions;
- status / revocation;
- version + nonce.

Inside the Mandate, the child acts without requesting permission.

Outside it, KEYS refuses and may offer a short boundary request.

Only an authorized guardian can:
- allow once;
- widen standing authority;
- refuse.

Learning and market evidence can inform or restrict. Neither can grant authority.

## Why Solana is necessary

The core promise is stronger than a parental-control UI.

The capital boundary is enforced by the KEYS Solana program:
- in-bounds execution;
- out-of-bounds refusal;
- versioned authority;
- stale-nonce refusal;
- pause/downward authority;
- guardian-authored policy changes.

This makes the receipt independently inspectable rather than asking judges to trust browser state.

Canonical program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Network:

**Solana Devnet**

## Why Pyth is necessary

Pyth provides external market truth used in the capital path.

For the current AAPL lane, KEYS verifies live signed Pyth evidence through the on-chain Pyth Lazer path and uses it for:
- price/notional computation;
- freshness/confidence checks;
- notional boundaries;
- precommitted market conditions.

Rule:

> **Pyth can stop an action. Pyth cannot give the child more authority.**

Current proof feed:

`Equity.US.AAPL/USD` — feed id `922`.

## PreStocks sponsor integration

PreStocks extends the learning/representation layer, not the hero flow.

KEYS consumes the official public PreStocks catalog and exposes:
- exact Solana representation;
- representation semantics;
- live public market/mark context when available;
- eligibility state.

Default:
- eligibility = UNKNOWN;
- execution eligible = false;
- Practice = available;
- authority effect = NONE.

Do not imply direct private-company equity ownership or live minor execution.

## 3-minute pitch video

### 0:00–0:15 — product immediately

Show **My Key** on screen.

Voice:

> “Financial independence shouldn’t happen all at once. KEYS gives a young person freedom to make capital decisions inside limits their family understands — without asking permission every time.”

### 0:15–0:40 — in-bounds autonomy

Show a small AAPL Money action within the current limit.

Expected:
- ALLOW;
- no guardian approval screen;
- confirmed Devnet receipt.

Voice:

> “Inside the Key, Alex acts independently. This is not a frontend permission check: the bounded action goes through our KEYS program on Solana Devnet.”

Briefly expose receipt:
- Devnet;
- program id;
- transaction signature;
- current Mandate nonce/version;
- Pyth verification.

### 0:40–1:05 — boundary

Attempt the larger action.

Expected:
- refuse;
- plain-language boundary;
- Ask for more room.

Voice:

> “Outside the standing boundary, the action does not execute. Alex can change the amount, practice, or ask for more room.”

### 1:05–1:30 — human authority

Send the request. Switch to guardian.

Show:
- exact request;
- current vs requested limit;
- Allow once / Widen / Refuse.

Choose **Widen**.

Voice:

> “Only the guardian can expand standing authority. The transition changes the on-chain Mandate and advances its version and nonce.”

### 1:30–1:50 — same action succeeds

Switch back into the child session and retry the same action.

Expected:
- confirmed execution after the widen.

Voice:

> “The exact action that was outside the Key is now inside it, so it can execute without another approval.”

### 1:50–2:05 — stale proof

Show stale nonce/refusal evidence from the proof drawer or prepared deterministic beat.

Voice:

> “Old authorization cannot be replayed after the boundary changes.”

### 2:05–2:25 — Pyth

Show market evidence.

Voice:

> “Pyth is load-bearing market truth: it prices the action and can invalidate a market condition. It can restrict authority, never create it.”

### 2:25–2:40 — learning

Show a contextual Learn/Practice beat.

Voice:

> “Because the user is young, learning is part of the product — but it never becomes a competence score that silently unlocks money.”

### 2:40–2:52 — PreStocks

Brief representation detail / Practice surface.

Voice:

> “PreStocks lets us teach the difference between a company, its token representation, eligibility and authority without pretending those are the same thing.”

### 2:52–3:00 — close

Return to My Key.

Voice:

> “KEYS turns family supervision into bounded autonomy: learn in context, act freely inside bounds, ask for more freedom only at the boundary.”

## 5-minute technical walkthrough

### 0:00–0:45 — architecture

Show:

```text
Cresco
  → Cloudflare Worker
  → Durable Family State
  → KEYS policy/runtime
  → Pyth
  → Solana Devnet program
```

Explain browser state is a cache, not authority.

### 0:45–1:35 — Solana program

Show:
- Mandate;
- AssetRule;
- program-controlled vault;
- version/nonce;
- `execute_within_mandate_with_pyth`.

Explain:
- guardian-only transition;
- child execution inside bounds;
- stale nonce.

### 1:35–2:20 — Pyth path

Show:
- server fetches signed Pyth Pro payload;
- Ed25519 verification instruction;
- Pyth Lazer verification;
- USD/notional enforcement;
- market condition.

Explicitly say Pyth authority effect is NONE.

### 2:20–3:05 — state / concurrency

Show Durable Object:
- Family state;
- reservation;
- idempotency;
- balance/period serialization;
- finalize confirmed execution.

Explain why two browser tabs cannot independently overspend the same family period boundary.

### 3:05–3:45 — requests / roles

Show:
- child demo session;
- guardian demo session;
- request persistence;
- exact ALLOW_ONCE request id;
- nonce binding;
- consumed state.

Clarify this is role-scoped demo auth, not KYC.

### 3:45–4:20 — market and sponsor surfaces

Show:
- market quotes route;
- FRESH/STALE/UNAVAILABLE;
- no fabricated history;
- PreStocks fail-closed eligibility.

### 4:20–5:00 — evidence / truth boundary

Show CI/proof:
- canonical Solana run;
- AAPL entitlement/on-chain bridge run;
- web/iPhone WebKit run;
- Node/API tests;
- Cloudflare dry-run.

End with:
- Devnet;
- demo SPL token;
- no brokerage/custody;
- no real minor securities execution;
- no mainnet claim.

## Submission description

### Short

**KEYS is bounded autonomy for family investing. A guardian defines a versioned capital Mandate; a young person can act independently inside it, while Solana refuses actions outside the boundary. Pyth provides load-bearing market truth, and only an authorized guardian can widen standing authority. The Stocklana demo runs on Solana Devnet with a demo SPL token and exposes verifiable transaction receipts without claiming brokerage or real minor securities execution.**

### Longer

**KEYS asks a different question from traditional youth investing apps: what if the parent did not have to approve every decision, but the child still could not exceed an understandable standing boundary?**

A guardian authors a versioned Mandate describing what actions are allowed, the asset scope, per-action and period limits, market conditions and status. Inside that Mandate, the child acts independently. Outside it, the Solana program refuses and the product can offer a family-private request for more room.

Pyth supplies live market evidence to the execution path. It can make an action invalid or too large, but it can never expand human authority. Guardian widening is explicit, versioned and nonce-protected; old authorization becomes stale.

The demo uses Solana Devnet, a demo SPL token, a server-held Devnet demo signer and the current AAPL Pyth proof lane. Cloudflare Durable Objects hold synchronized Family demo state and serialize reservations/idempotency across devices. Contextual learning remains first-class, but learning/XP/P&L never automatically changes limits.

PreStocks is integrated as a secondary representation/Practice layer with eligibility fail-closed by default.

## Judge Q&A

### “Is this real money?”

No. The hackathon capital lane uses a **demo SPL token on Solana Devnet**. The transaction and KEYS/Pyth enforcement are real Devnet execution; the asset is explicitly test/demo capital. We do not claim brokerage, custody or real minor securities execution.

### “Then what exactly is real?”

The Solana program, Mandate/AssetRule enforcement, on-chain refusal, version/nonce behavior, Devnet transactions, signed Pyth verification, server-side state/idempotency, request/guardian flow and receipts are real components of the demo.

### “Why not just use a database?”

A database can store the family preference, but the product promise is that the capital action is constrained by a versioned authority object whose enforcement and receipt are independently inspectable. Solana is the execution/authority boundary, not an analytics datastore.

### “Why does this need Pyth?”

Because a USD limit or a precommitted price condition cannot be enforced correctly from a frontend display price. Pyth provides signed external market truth to the capital path.

### “Can Pyth increase the child’s limit?”

No. Pyth can cause a refusal. Only a guardian-authorized transition can widen standing authority.

### “Does finishing lessons unlock more money?”

No. Learning has `authorityEffect: NONE`. It builds understanding and Practice; authority is a separate human decision.

### “Could the child just edit the limit in the browser?”

No. The current route no longer treats the browser’s Mandate as authority. Evaluation loads current server/on-chain state, and authority-changing routes are guardian-role gated.

### “What prevents double spending from two tabs?”

A Cloudflare Durable Object serializes the family reservation, period spend and balance check around execution. User intents also carry idempotency keys.

### “How does Allow once work?”

It is not a generic bypass. The execution must cite the exact approved request id, match its asset and current nonce, stay at or below the approved amount, and the permission is consumed after successful use.

### “Why AAPL?”

AAPL is the current entitled/proven Pyth execution lane, not a product dependency. The Mandate mechanism is asset-agnostic. Other UI assets are labeled honestly according to available market evidence.

### “Are all prices live?”

No. Only fresh entitled Pyth quotes are labeled live. Unavailable symbols stay clearly sample; the backend never converts an unknown price to zero. Historical charts are also labeled sample because a real history provider is not yet connected.

### “What is PreStocks doing here?”

It demonstrates the representation problem that KEYS has to reason about: underlying company, token representation, holder eligibility and KEYS authority are separate concepts. PreStocks does not automatically make an asset executable.

### “How would this become a real company?”

The Family product is the first policy pack for a broader Mandate engine: versioned bounded authority for delegated capital. Production rollout would add regulated custody/brokerage partners, identity/KYC, jurisdiction policy, user-bound wallets and broader asset adapters without changing the core authority primitive.

## Recording checklist

Before recording:
- use a fresh browser/profile or reset demo Family state;
- confirm Cloudflare latest build is deployed;
- confirm child session;
- confirm guardian session switch;
- confirm AAPL Pyth evidence is fresh;
- confirm current Mandate is ACTIVE;
- confirm balance/test funding is sufficient;
- confirm in-bounds amount;
- confirm boundary amount;
- rehearse exact widen value;
- verify Explorer link;
- keep a backup recording of the canonical proof receipt;
- do not expose secrets/dashboard environment values.

## Submission links

Populate before final submit:
- Live demo: `https://cresco-lac.vercel.app`
- Backend health/runtime: `https://keys-api-stocklana.faadil-casecraft.workers.dev`
- GitHub: `https://github.com/Faadil1/keys`
- Pitch video: **TBD**
- Technical video: **TBD**

## Final claim gate

Allowed:
> **KEYS enforces bounded capital actions on Solana using live Pyth market truth.**

Not allowed:
- “KEYS buys real AAPL for minors.”
- “KEYS is a broker/custodian.”
- “All Explore prices are live.”
- “Learning automatically earns more authority.”
- “PreStocks eligibility is inferred from the wallet.”
- “This is mainnet.”
