# Demo-First Architecture v0.2

Date: 2026-09-24  
Title: **The account that can say no**

## 2–3 minute transformation

### 0:00–0:25 — Freedom first

Maya sees her current key:

- allowed assets/actions;
- current per-action bound;
- expiry / relevant market rule;
- a small contextual learning cue.

She performs a small **in-bounds** action.

**ALLOW / SUCCESS.**

No guardian approval. No essay.

Message:

> Inside her Mandate, Maya is free.

### 0:25–0:55 — The boundary

Maya attempts the same kind of action above her standing bound.

The Solana execution path refuses.

**REFUSE / MANDATE_LIMIT_EXCEEDED.**

Message:

> The app did not say no. The account could not do it.

### 0:55–1:20 — Market truth

A boundary request or precommitted action is attached to a market condition.

Pyth evidence shows the condition is stale/invalid.

**REFUSE / MARKET_CONDITION_INVALIDATED** or **MARKET_EVIDENCE_STALE**.

Message:

> Pyth does not decide whether Maya deserves more authority. It only proves whether the world still matches the condition she committed to.

### 1:20–1:55 — Human decision

Maya asks for more room.

Guardian chooses:

- **Allow once**
- **Widen Mandate**
- **Refuse**

A standing widen is explicitly signed.

Mandate version/nonce advances.

### 1:55–2:20 — Same action, new authority

Maya retries the same action that previously failed.

**ALLOW / SUCCESS.**

### 2:20–2:35 — Replay proof

Old authorization material is reused.

**REFUSE / STALE_NONCE.**

Message:

> Machines guard. Humans grant.

### Close

**Financial independence shouldn't happen all at once.**

## Learning in the demo

Learning is visible but not the bottleneck.

Possible short beat:

- first unfamiliar asset → 10–20 second explanation;
- boundary refusal → explain the risk/bound;
- Pyth invalidation → show T0 vs now;
- review → compare thesis/condition with outcome, P&L separate.

Do not turn the demo into an LMS.

## Technical truth

The existing v0.1 backend proves:

- guardian-signed authority transition;
- version/nonce advance;
- stale replay refusal;
- authenticated Pyth Pro equity evidence.

The v0.2 build must still prove:

- program-controlled bounded capital action;
- signed on-chain Pyth verification;
- permission-matrix Mandate;
- boundary-only proposal flow.

No real minor securities execution is currently claimed.
