# KEYS

**Financial independence shouldn't happen all at once.**

KEYS Family is a bounded-autonomy experience for young people learning to use tokenized stocks.

A guardian defines an explicit **Mandate**. Inside it, the young person can act freely without asking for permission on every action. Outside it, the action is refused or becomes a boundary request. Wider authority requires an explicit authorized human transition.

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

KEYS is not removing financial learning.

Learning becomes contextual:

- first use of a new asset/action;
- Practice mode;
- boundary explanations;
- Pyth-driven market-condition changes;
- post-action review.

Learning completion, quizzes, P&L or AI scoring never auto-grant authority.

See [docs/FAMILY-LEARNING-LAYER.md](docs/FAMILY-LEARNING-LAYER.md).

## v0.1 proof — complete

This repository already proves:

- Charter / Mandate / Proposal / Review state;
- explicit guardian-signed authority transition;
- version/nonce advance;
- stale replay refusal;
- local and devnet Solana runtime;
- authenticated live Pyth Pro US-equity evidence through a server-side boundary.

Canonical devnet program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Current verified live Pyth trial feed:

`Equity.US.TSLA/USD`

## v0.2 bounded autonomy — capital path proven

The new Technical Reality Gate passed and the first runtime delta is now real.

On local Solana and on the canonical devnet program, KEYS now proves:

1. a program-controlled demo-token vault;
2. explicit per-asset/per-action and per-period boundaries;
3. an in-bounds action executes without guardian approval;
4. an out-of-bounds action fails inside the Solana program;
5. an explicit guardian widen advances version/nonce;
6. stale execution material refuses;
7. the same larger action succeeds after the widen;
8. pause/downward authority blocks execution.

Canonical v0.2 devnet proof:

https://github.com/Faadil1/keys/actions/runs/35931280449

Pyth also now returns a signed Solana-format payload in the authenticated proof path:

https://github.com/Faadil1/keys/actions/runs/35930425544

**Remaining backend proof:** verify that signed Pyth payload inside the Anchor execution path and use verified prices for USD/notional and user-precommitted market conditions.

See:

- [Technical Reality Gate](docs/TECHNICAL-REALITY-GATE-BOUNDED-AUTONOMY.md)
- [Architecture Delta](docs/ARCHITECTURE-DELTA-BOUNDED-AUTONOMY.md)
- [Concept Lock](docs/CONCEPT-LOCK.md)
- [Truth Boundary](docs/TRUTH-BOUNDARY.md)

## Truth boundary

Real minor securities execution is **not** currently claimed.

KEYS is not claiming to be a broker or custodian.

The current live Pyth path proves authenticated equity evidence and signed Solana-payload availability. The signed payload is **not yet verified inside the KEYS Anchor execution instruction**, so on-chain Pyth enforcement must not be presented as completed yet.

## Consumer frontend — Cresco

The family-facing app is **Cresco**, built in [`apps/web`](apps/web) (Next.js, isolated from the backend package). Practice and Money modes, bounded-autonomy boundary requests and guardian decisions are implemented against the KEYS v0.2 draft semantics. Money Mode is demo-only in the frontend.

See [Cresco implementation summary](docs/CRESCO-FRONTEND-IMPLEMENTATION-SUMMARY.md) and [backend integration handoff](docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md).

## Collaboration

- Frontend / product experience: Benita
- Backend / Solana / Pyth / proof: Faadil

The old v0.1 frontend contract remains historical proof. A v0.2 draft contract now exists and will be frozen after the Pyth-integrated runtime proof.

See [docs/BENITA-FRONTEND-HANDOFF.md](docs/BENITA-FRONTEND-HANDOFF.md).
