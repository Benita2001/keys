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

Use these product routes:

- `GET /api/v0.2/demo/maya`
- `POST /api/v0.2/actions/evaluate`
- `POST /api/v0.2/boundary-requests`

Cresco devnet bridge now implemented in backend code:

- `GET /api/v0.2/demo/runtime`
- `POST /api/v0.2/actions/execute`

Until the dedicated devnet smoke workflow passes, treat those two routes as **IMPLEMENTED / PROOF PENDING** rather than canonically proven. The runtime uses a server-held devnet demo signer and a demo/mock SPL token.

Current delta for PR #1:

`docs/CRESCO-BACKEND-DELTA-2026-09-24.md`

Do not build the new product around `/api/v0.1/*` or `/api/v0.2/draft/*`; those remain compatibility/history surfaces only.

The canonical Solana devnet + live Pyth proof is:

https://github.com/Faadil1/keys/actions/runs/35959137364

Faadil now maintains the backend/proof and supports integration issues. Benita can integrate against the frozen v0.2 semantics.

## Sponsor extension available now

Pyth remains part of the core proof.

PreStocks is available as an optional secondary Learn / Practice representation surface:

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

Use PreStocks to help Maya understand **what the on-chain representation actually is**, not as a new homepage hero or as proof of live minor securities execution.

Default PreStocks truth:

- `eligibility.status = UNKNOWN`
- `executionEligible = false`
- `practiceAvailable = true`
- `authorityEffect = NONE`

Canonical PreStocks live proof:

https://github.com/Faadil1/keys/actions/runs/35969672666

Sponsor integrations must extend KEYS without redefining the Family journey.

Do not redesign around TSLA, AAPL or any single sponsor asset. The mechanism remains asset-independent and actual live assets must always be labeled truthfully.
