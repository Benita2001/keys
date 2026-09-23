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

## v0.2 target — active build

The new Technical Reality Gate passed with an architecture delta.

Target:

`program-controlled vault + permission-matrix Mandate + AssetRule + signed Pyth Pro verification`

The v0.2 proof must show:

1. an in-bounds action can execute without guardian approval;
2. an out-of-bounds action fails in the Solana execution path;
3. Pyth market evidence can be load-bearing and fail closed;
4. an explicit human widen changes the Mandate version/nonce;
5. the same action can then succeed;
6. old authorization material cannot replay.

See:

- [Technical Reality Gate](docs/TECHNICAL-REALITY-GATE-BOUNDED-AUTONOMY.md)
- [Architecture Delta](docs/ARCHITECTURE-DELTA-BOUNDED-AUTONOMY.md)
- [Concept Lock](docs/CONCEPT-LOCK.md)
- [Truth Boundary](docs/TRUTH-BOUNDARY.md)

## Truth boundary

Real minor securities execution is **not** currently claimed.

KEYS is not claiming to be a broker or custodian.

The current live Pyth proof is off-chain/server-side; signed on-chain Pyth verification is a v0.2 target and must not be presented as completed before runtime proof exists.

## Collaboration

- Frontend / product experience: Benita
- Backend / Solana / Pyth / proof: Faadil

The old v0.1 frontend contract remains historical proof. A new v0.2 semantic contract will be frozen after the bounded-autonomy backend build.

See [docs/BENITA-FRONTEND-HANDOFF.md](docs/BENITA-FRONTEND-HANDOFF.md).
