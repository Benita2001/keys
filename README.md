# KEYS

**Financial independence shouldn't happen all at once.**

KEYS Family is a bounded-autonomy experience for young people learning to use tokenized stocks.

A guardian defines an explicit **Mandate**. Inside it, the young person can act freely without asking permission on every action. Outside it, the action is refused or becomes a boundary request. Wider standing authority requires an explicit authorized human transition.

> **Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.**

## Product primitive

The long-term primitive is a versioned, revocable permission envelope over capital:

- principal / guardian;
- delegate / beneficiary;
- asset scope;
- allowed actions;
- per-action and per-period limits;
- expiry;
- market conditions;
- escalation / revocation;
- version / nonce.

**Stages are Family UX. Mandates are technical truth.**

The familiar `LEARN → PRACTICE → PROPOSE → BOUNDED → INDEPENDENT` progression remains useful as a Family policy pack, but it is not the universal protocol architecture.

## Learning stays

Learning is contextual rather than bureaucratic:

- first use of a new asset/action;
- Practice mode;
- boundary explanations;
- Pyth-driven market-condition changes;
- post-action review.

Learning completion, quizzes, P&L or AI scoring never auto-grant authority.

See [docs/FAMILY-LEARNING-LAYER.md](docs/FAMILY-LEARNING-LAYER.md).

## v0.2 bounded autonomy — canonical devnet proof PASS

KEYS now proves the core product mechanism on local Solana and the canonical devnet program.

Canonical program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Canonical devnet run:

https://github.com/Faadil1/keys/actions/runs/35959137364

Result:

**12 passing**

The runtime proves:

1. program-controlled demo-token vault;
2. explicit AssetRule / permission boundary;
3. in-bounds action executes without guardian approval;
4. out-of-bounds action refuses inside the Solana program;
5. explicit guardian widening advances version/nonce;
6. stale execution material refuses;
7. the same larger action succeeds after widening;
8. pause/downward authority blocks execution;
9. live signed Pyth Pro/Lazer TSLA evidence is verified inside the Solana capital path;
10. Pyth-derived USD/notional limits are load-bearing;
11. a notional breach refuses;
12. a precommitted max-price condition refuses;
13. Pyth has **no authority-widening effect**.

Canonical Pyth proof feed:

`Equity.US.TSLA/USD` — feed id `1435`.

Evidence:

- [Devnet Pyth bounded-autonomy proof](evidence/pyth/DEVNET-ONCHAIN-PYTH-BOUNDARY-PROOF-2026-09-24.md)
- [Local Pyth bounded-autonomy proof](evidence/pyth/LOCAL-ONCHAIN-PYTH-BOUNDARY-PROOF-2026-09-24.md)
- [Earlier bounded-capital devnet proof](evidence/solana/DEVNET-BOUNDED-AUTONOMY-RUNTIME-PROOF-2026-09-23.md)

## Frozen v0.2 integration contract

The current frontend/backend semantic contract is:

[docs/FRONTEND-BACKEND-CONTRACT-V0.2.md](docs/FRONTEND-BACKEND-CONTRACT-V0.2.md)

Current v0.2 API semantics:

- `GET /api/v0.2/demo/maya`
- `POST /api/v0.2/actions/evaluate`
- `POST /api/v0.2/boundary-requests`

The old v0.1 contract remains historical proof only.

## Sponsor integrations

KEYS currently targets the Stocklana main track plus two sponsor tracks that strengthen the locked product.

### Pyth — proven

Pyth is load-bearing market truth in the canonical Solana capital path: signed live Pyth Pro/Lazer evidence, on-chain verification, USD/notional enforcement, market-condition refusal, and authority effect `NONE`.

### PreStocks — live API integration

KEYS consumes the official PreStocks public token catalog:

`https://prestocks.com/api/prestocks`

Current routes:

- `GET /api/v0.2/integrations/prestocks`
- `GET /api/v0.2/integrations/prestocks/:symbol`

The adapter exposes the exact Solana representation plus live mark/token pricing for contextual Practice and representation understanding.

It defaults fail-closed:

- `eligibility.status = UNKNOWN`
- `executionEligible = false`
- `practiceAvailable = true`
- `authorityEffect = NONE`

Live proof command:

`npm run proof:prestocks`

See [docs/BOUNTY-INTEGRATION-GATE-2026-09-24.md](docs/BOUNTY-INTEGRATION-GATE-2026-09-24.md).


## Truth boundary

The current capital proof uses an explicitly labeled **demo/mock SPL token** with real live Pyth market evidence.

KEYS does **not** currently claim:

- real minor securities execution;
- brokerage or custodial service;
- legal conventional-share ownership from a token balance;
- Solana mainnet deployment;
- universal issuer/venue/jurisdiction eligibility.

The current Pyth trial proves TSLA live evidence; it does not establish live AAPL entitlement.

## Collaboration

- Frontend / product experience: **Benita**
- Backend / Solana / Pyth / proof: **Faadil**

Backend v0.2 is now in proof-maintenance/integration-support mode. Benita can integrate against the frozen v0.2 contract.

See [docs/BENITA-FRONTEND-HANDOFF.md](docs/BENITA-FRONTEND-HANDOFF.md).
