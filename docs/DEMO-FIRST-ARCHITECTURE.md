# Demo-First Architecture v0.2

Date: 2026-09-25  
Title: **The key that works until the boundary — once means once**

## Canonical 55-second judge cut

The product proof should land before the infrastructure proof.

### 0:00–0:05 — freedom first

Show **Key vN** and one small in-bounds AAPL demo-capital action.

**ALLOW.** No guardian screen. No celebration ritual.

> Inside the Key, Alex acts on his own.

### 0:05–0:13 — the edge

Try a larger action.

**REFUSE.**

Show the boundary visually and one plain-language reason. Offer **Ask for more room**.

### 0:13–0:24 — the third model

Guardian sees the exact request and three choices:

**Not this time · Allow once · Widen the Key**

Make the distinction explicit:
- Not this time → Key vN remains.
- Allow once → one request can cross; Key vN remains.
- Widen → create standing Key vN+1.

Choose **Allow once**.

### 0:24–0:36 — consume, do not widen

Retry the approved request.

**ALLOW.**

Show:
- ONE-TIME PERMISSION → USED;
- **Standing Key vN — unchanged**.

The exception moves. The boundary does not.

### 0:36–0:43 — replay

Reuse the same one-time permission.

Main UI:

> This one-time permission has already been used.

Proof lane:

REFUSE / AllowanceAlreadyUsed

No second execution.

### 0:43–0:55 — why Solana / why Pyth

Open the proof drawer only now.

> The UI is not the guard. The KEYS capital path enforces the boundary.

Show Solana Devnet program/signature and the Pyth-derived market evidence used in the capital path.

> Pyth can restrict an action. It can never widen the Key.


## 2–3 minute transformation

### 0:00–0:20 — The product in one sentence

Show **My Key** and one short source-backed learning / Practice cue.

> Alex can act independently inside family-set limits. Sam steps in only at the boundary.

Learning is context, not permission homework.

### 0:20–0:45 — ALLOW

Alex performs a small AAPL Money action inside the standing Key.

**ALLOW / CONFIRMED DEVNET EXECUTION.**

No guardian approval screen.

> Inside the Key, Alex is free to act.

### 0:45–1:10 — REFUSE

Alex attempts the same kind of action above the standing limit.

The KEYS Solana execution path refuses.

**REFUSE / MANDATE_LIMIT_EXCEEDED.**

> The UI did not merely warn him. The capital path could not execute outside the Key.

### 1:10–1:35 — Human boundary decision

Alex sends a short private request.

Sam sees:
- current standing limit;
- requested amount;
- exact asset/action;
- **Allow once / Widen / Not this time**.

For the canonical demo, Sam chooses **Allow once**.

Standing authority does not widen.

### 1:35–1:58 — Exact exception succeeds

Alex retries the exact approved action.

**ALLOW_ONCE → ALLOW / CONFIRMED DEVNET EXECUTION.**

The authorization is bound to the exact request, asset, amount ceiling and current nonce, then consumed after successful use.

> Sam approved this boundary crossing, not a permanently bigger Key.

### 1:58–2:18 — Replay is a real failure

Reuse the same one-time authorization.

**REFUSE / AllowanceAlreadyUsed.**

No second execution.

> One-time means one-time.

This is the canonical negative event in the judge demo.

### 2:18–2:40 — Market truth + receipt

Briefly show:
- live Pyth evidence used by the AAPL proof lane;
- Solana Devnet program;
- transaction receipt / signature;
- Mandate version/nonce.

> Pyth can restrict an action. It can never give Alex more authority.

### Close

**Financial independence shouldn't happen all at once.**

## Why ALLOW_ONCE is the hero

Standing **WIDEN_MANDATE** remains a real supported capability and a useful Q&A/technical path.

It is not the hero because ALLOW_ONCE demonstrates the product primitive more cleanly:
- the standing boundary remains intact;
- a human can authorize one request-scoped exception;
- the permission is consumed;
- replay fails;
- the guardian choice still makes growth visible: Widen is the separate action that creates a new standing Key version.

That is harder to mistake for a parental-control UI.

## Learning in the demo

Keep one short beat:
- source-backed concept;
- visible source + verification date;
- immediate Explore/Practice application.

Do not turn the demo into an LMS. The purpose is to show that the user understands the decision before/around action while authority stays separate.

## Technical truth

Current v0.2 proves on canonical Solana Devnet:
- program-controlled bounded demo-token capital actions;
- in-bounds ALLOW and out-of-bounds REFUSE;
- exact single-use ALLOW_ONCE and replay refusal;
- explicit guardian widening + version/nonce lineage as a separate capability;
- signed on-chain Pyth verification in the capital path;
- Durable Object state/idempotency around the hosted Family flow.

No real minor securities execution, brokerage, custody or mainnet claim is made.
