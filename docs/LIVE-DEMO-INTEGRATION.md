# KEYS — Live Demo Integration Contract v0.2

Date: 2026-09-24  
Status: **FROZEN V0.2 PRODUCT SURFACE / FRONTEND OWNED BY BENITA**

This is the handoff between the verified KEYS backend/runtime proof and Benita's frontend.

It does **not** prescribe visual design.

## Current frontend target

Use the frozen v0.2 contract:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

Primary product routes:

- `GET /api/v0.2/demo/maya`
- `POST /api/v0.2/actions/evaluate`
- `POST /api/v0.2/boundary-requests`

The old `/api/v0.1/*` routes remain historical/compatibility surfaces.  
The `/api/v0.2/draft/*` aliases remain compatibility aliases only.

Do not use either as the product integration target.

## Route 1 — Maya demo contract

### GET /api/v0.2/demo/maya

Returns the canonical Maya bounded-autonomy fixture.

The fixture communicates:

- contract version `0.2`;
- active Mandate version/nonce;
- current key/bounds;
- contextual learning/Practice;
- in-bounds ALLOW;
- boundary REFUSE;
- Pyth market-condition refusal;
- guardian widen as the only authority-expanding source;
- same action ALLOW after widen;
- stale authorization REFUSE;
- `onchainPythVerification: true`;
- `realMinorSecuritiesExecution: false`.

This is the preferred bootstrap surface for Benita.

## Route 2 — Action evaluation

### POST /api/v0.2/actions/evaluate

Body shape:

```json
{
  "mandate": {},
  "assetRule": {},
  "action": {},
  "now": "ISO-8601 timestamp"
}
```

If `assetRule.requiresMarketEvidence === true`, market evidence is resolved server-side.

The browser must never supply or receive `PYTH_PRO_API_KEY`.

The response includes the bounded-autonomy evaluation and:

```json
{
  "type": "V0_2_ACTION_EVALUATION",
  "runtimeProofStatus": "CANONICAL_DEVNET_RUNTIME_PROVEN"
}
```

Primary UX mapping:

- inside bounds → `ALLOW`;
- outside bounds → `REFUSE` / boundary request available;
- stale/invalid market evidence → fail closed;
- invalid precommitted market condition → `REFUSE`;
- Pyth authority effect → `NONE`.

## Route 3 — Boundary request

### POST /api/v0.2/boundary-requests

Body shape:

```json
{
  "mandate": {},
  "assetRule": {},
  "action": {},
  "reasoningCommitmentHash": "...",
  "condition": null,
  "now": "ISO-8601 timestamp"
}
```

The response remains a pending human-decision object.

A boundary request is **not authority**.

## Guardian decision / widen truth

The current frozen v0.2 HTTP product surface covers the Maya fixture, bounded-action evaluation and boundary-request creation.

The authorized guardian widen, version/nonce advance, same-action-after-widen success and stale-authorization refusal are proven by the canonical Solana runtime and represented in the frozen fixture/demo spine.

Frontend rule:

- do not display a simulated UI transition as a new on-chain transaction unless an actual runtime proof/signature is attached;
- do not invent a new guardian mutation endpoint;
- keep the UI semantics aligned with the proven human-authority transition.

## Judge-facing demo spine

Build the product experience in this order:

1. **My Key** — Maya understands her current freedom.
2. **Learn / Practice** — short contextual learning.
3. **In-bounds action** → ALLOW with no guardian approval.
4. **Boundary action** → REFUSE.
5. **Market changed** → explain the Pyth-backed condition/refusal.
6. **Ask for more room** → boundary request.
7. **Guardian decision** → allow once / widen / refuse.
8. **Widen** → version/nonce advance.
9. **Same action** → ALLOW.
10. **Old authorization** → STALE / REFUSE.

## Cresco execution bridge — implemented / smoke proof pending

The backend now includes:

- `GET /api/v0.2/demo/runtime`
- `POST /api/v0.2/actions/execute`

The target is a judge-visible real Solana devnet signature produced from Cresco while preserving the current truth boundary.

Runtime mode:

`SERVER_HELD_DEVNET_DEMO`

Capital asset:

`DEMO_TOKEN`

Market truth:

live signed Pyth AAPL evidence (`Equity.US.AAPL/USD`, feed `922`), verified through the KEYS/Pyth Lazer on-chain path.

This is **not** embedded-wallet production architecture, real securities execution, brokerage or custody.

The stable AAPL runtime bootstrap and HTTP execution smoke are **PASS / PROVEN** in `devnet-execution-bridge` run `36034651466`.

See:

`docs/CRESCO-BACKEND-DELTA-2026-09-24.md`

## Optional sponsor surface — PreStocks

PreStocks is a secondary representation / Practice surface and must not replace the core Maya demo spine.

Available routes:

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

Use it to show that:

`underlying company != token representation != direct equity ownership != holder eligibility != KEYS authority`

Default frontend behavior must remain fail-closed:

- eligibility unknown;
- execution not eligible;
- Practice available;
- authority effect none.

Canonical live PreStocks proof:

https://github.com/Faadil1/keys/actions/runs/35969672666

The judge-facing sequence should remain **My Key first**. PreStocks may appear inside Learn / Practice or a representation detail surface, not as a sponsor dashboard.

## Canonical runtime proof

Program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Network:

`Solana devnet`

Canonical Solana + live Pyth run:

https://github.com/Faadil1/keys/actions/runs/35959137364

Runtime result:

`12 passing`

## Truth boundary

The demo/runtime may truthfully claim:

> KEYS enforces bounded capital actions on Solana using live Pyth market truth.

It must not claim:

- real minor securities execution;
- conventional legal share ownership;
- brokerage or custody;
- mainnet execution;
- universal issuer/venue/jurisdiction eligibility;
- that Pyth grants Maya authority;
- that learning completion grants Maya authority.

The execution asset in the current proof is a demo/mock SPL token.

## Hosting / secret boundary

A public hosted HTTP base URL is not currently claimed by this document.

Benita owns final frontend/runtime deployment.

If the backend is hosted:

- keep `PYTH_PRO_API_KEY` server-side only;
- keep signer/keypair material server-side only;
- expose only frontend-safe proof metadata;
- preserve the frozen v0.2 semantic contract.
