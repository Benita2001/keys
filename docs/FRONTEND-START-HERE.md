# Benita — Frontend Start Here (v0.2 transition)

Date: 2026-09-24  
Status: **V0.2 CONTRACT FROZEN; INTEGRATION READY**

You still own the KEYS frontend and product experience.

However, the product strategy has changed after hostile review + Stocklana re-scoring. Do **not** lock the new experience to the old v0.1 proposal-per-action contract.

## New product direction

KEYS Family is now **bounded autonomy**:

> Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.

The guardian sets the boundary.

Maya acts freely inside it.

## What remains fixed

- ALLOW / ESCALATE / REFUSE semantics;
- explicit human authority changes;
- version/nonce stale-authorization refusal;
- UNKNOWN fails closed;
- market evidence does not create authority;
- no competence score;
- no brokerage/custody claim;
- no real minor securities execution claim;
- private minor reasoning stays off public chain.

## What changed

Old v0.1 happy path:

`Proposal → Guardian Review → Transition`

New v0.2 happy path:

`In-bounds Action → ALLOW immediately`

Boundary path:

`Out-of-bounds Action → REFUSE or Boundary Request → Guardian decision → optional explicit Mandate transition`

The five-stage Family progression may remain visible as a narrative, but the Mandate permission envelope is the technical truth.

## Learning / Practice

Do not remove learning.

Learning should be:

- short and contextual;
- tied to first-use, unfamiliar asset/action, boundary refusal, market change or review;
- available in Practice;
- age-respectful;
- never a score that automatically widens authority.

See `FAMILY-LEARNING-LAYER.md`.

## Experience target

Primary surfaces should now communicate:

1. **My Key / Current Mandate** — what Maya can do right now.
2. **Practice / Learn** — contextual market understanding without making every action homework.
3. **Action** — instant if inside bounds.
4. **Boundary** — why an action cannot execute.
5. **Ask for more room** — short boundary request.
6. **Guardian decision** — allow once / widen / refuse.
7. **Market evidence** — what changed, in human language.
8. **History / receipts** — transitions and meaningful reviews, not a surveillance feed.

## Backend coordination

The old v0.1 fixture/API remains historical proof only.

The current frozen integration contract is:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

The canonical Solana devnet + live Pyth proof is:

https://github.com/Faadil1/keys/actions/runs/35959137364

Faadil now maintains the backend/proof and supports integration issues. Benita can integrate against the frozen v0.2 semantics.

Do not redesign around TSLA or AAPL availability. The mechanism remains asset-independent and actual live assets must always be labeled truthfully.
