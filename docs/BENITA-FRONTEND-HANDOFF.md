# KEYS — Benita Frontend Handoff v0.2 Transition

Date: 2026-09-24  
Status: **FROZEN V0.2 CONTRACT READY FOR INTEGRATION**

## Ownership

Benita still owns:

- frontend architecture;
- interaction design;
- visual system;
- responsive behavior;
- judge-facing product experience;
- final hosting/deployment.

Faadil owns:

- v0.2 policy/domain engine;
- Solana bounded-capital runtime;
- Pyth signed evidence boundary;
- frontend/backend contract v0.2;
- backend proof maintenance.

## Product relock

KEYS Family remains the Stocklana wedge, but the interaction model is now:

**bounded autonomy, not continuous supervision.**

Inside the current Mandate:

- Maya acts freely.

Outside the current Mandate:

- the action refuses or becomes a boundary request.

Standing authority widens only through an explicit authorized human transition.

## Learning stays

LEARN/PRACTICE are not removed.

They become contextual Family product layers:

- first-use explanations;
- Practice for unfamiliar risk;
- boundary explanations;
- market-condition learning;
- post-action reflection.

Learning/P&L never auto-promotes authority.

See `docs/FAMILY-LEARNING-LAYER.md`.

## Contract status

The old v0.1 frontend/backend contract remains historical evidence only.

**v0.2 contract status: FROZEN.**

Use:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

Primary product routes:

- `GET /api/v0.2/demo/maya`
- `POST /api/v0.2/actions/evaluate`
- `POST /api/v0.2/boundary-requests`

New Cresco devnet bridge (implemented; canonical smoke proof pending):

- `GET /api/v0.2/demo/runtime`
- `POST /api/v0.2/actions/execute`

The execution bridge is deliberately a **server-held devnet demo signer** over a demo/mock SPL token. It is not a production wallet/custody model. See `docs/CRESCO-BACKEND-DELTA-2026-09-24.md`.

**Important frontend routing rule:** do not replace the normal Family Money Mode path with the TSLA runtime. The Family journey remains demo/policy-only for its broader asset set. The real TSLA runtime is an isolated judge-facing proof lane under **How Cresco works → Technical details → Run live devnet proof** until a user-bound multi-asset runtime exists.

The `/api/v0.1/*` routes and `/api/v0.2/draft/*` aliases are compatibility/history surfaces, not the frontend product target.

The canonical devnet runtime now proves:

- permission-matrix / AssetRule core;
- program-controlled capital boundary;
- in-bounds execution without guardian approval;
- out-of-bounds refusal;
- signed live Pyth verification inside the capital path;
- Pyth-derived USD/notional enforcement;
- Pyth precommitted max-price refusal;
- explicit human widen;
- stale authorization refusal;
- pause/downward authority.

Canonical run:

https://github.com/Faadil1/keys/actions/runs/35959137364

## UX target

The most important product feeling:

> Maya has real freedom inside a key whose limits she can understand.

Avoid:

- permission request before every action;
- LMS/course-first flow;
- parent surveillance dashboard;
- maturity score;
- P&L progression;
- protocol jargon in primary screens.

Likely core surfaces:

- Maya's current key;
- contextual learn/practice;
- instant action;
- boundary refusal;
- ask for more room;
- guardian allow once / widen / refuse;
- market evidence explanation;
- concise transition/review history.

## Sponsor extension — do not block the core flow

Pyth remains part of the core proof.

PreStocks is now available as an optional representation / Practice surface:

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

Use it to explain the exact on-chain representation and live private-market context. The default PreStocks state is deliberately Practice available, eligibility unknown, execution not eligible, authority effect none.

Do not make PreStocks the homepage hero. Do not represent this integration as live minor securities execution.


## Truth boundaries

- market evidence does not create authority;
- learning completion does not create authority;
- evidence does not equal maturity;
- no real minor securities execution claim;
- no brokerage/custody claim;
- no API/private keys in frontend;
- do not claim AAPL is live under the current Pyth trial unless separately proven.


## Integration priority

Build the judge-facing experience in this order:

1. **My Key** — current bounds in plain language.
2. **Contextual Learn / Practice** — short, age-respectful, never a score.
3. **In-bounds action** — immediate success, no guardian approval.
4. **Boundary refusal** — show that the capital path refused.
5. **Pyth market condition** — explain why a stale/invalid condition blocks an action.
6. **Ask for more room** — short boundary request.
7. **Guardian decision** — allow once / widen / refuse.
8. **Same action after widen** — success.
9. **Stale authorization** — old nonce refuses.

Do not expose backend/protocol vocabulary as the primary UX.
