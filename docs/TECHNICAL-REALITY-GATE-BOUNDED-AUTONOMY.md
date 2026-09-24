# KEYS — Technical Reality Gate: Bounded Autonomy

Date: 2026-09-24  
Status: **PASS — IMPLEMENTED CORE PROVEN ON CANONICAL DEVNET**

## Decision

The improved Family wedge is technically credible and its core mechanism is now demonstrated:

> A guardian defines an explicit Mandate. The young person acts freely inside it. Actions outside it are refused or escalated. Market evidence may restrict or invalidate an action, but only an authorized human can widen human authority.

## Required truths and current verdict

1. **In-bounds action is immediate — PASS.** No guardian approval is required for ordinary actions already covered by the Mandate.
2. **Capital boundary is machine-enforced — PASS.** An out-of-bounds action fails in the Solana execution path.
3. **Mandate is technical truth — PASS at runtime core.** Asset/action, amount, period, status, version/nonce and market constraints participate in execution.
4. **Pyth is load-bearing — PASS.** Live signed market evidence is verified in the capital path and used for USD/notional and market-condition checks.
5. **Pyth never grants authority — PASS.** Market evidence can refuse an action; widening remains human-signed.
6. **Learning remains without becoming authority — LOCKED product rule.**
7. **Minor private reasoning stays off public chain — LOCKED truth boundary.**
8. **Real execution truth remains separate from legal eligibility — LOCKED truth boundary.**

## Architecture decision

### A. UI/backend-only rules — REJECTED

Insufficient for the native Solana proof because the capital boundary would live only in application policy.

### B. Raw SPL delegate allowance — PROOF PRIMITIVE ONLY

Useful for narrow allowances, but insufficient for the full KEYS Mandate: USD notional, period limits, market conditions, explicit transitions, one-time exceptions and richer policy semantics.

### C. Squads smart account — POSSIBLE FUTURE SUBSTRATE

Credible as a future account substrate, but not a replacement for KEYS policy semantics.

### D. KEYS program-controlled vault — ADOPTED AND PROVEN

The current runtime uses a KEYS-controlled token account and checks the active Mandate before capital movement.

The proven execution path includes:

- delegate/signer relationship;
- version/nonce;
- Mandate active status;
- asset rule;
- action permission;
- per-action amount;
- per-period amount;
- Pyth feed match;
- Pyth freshness;
- Pyth confidence;
- Pyth-derived USD notional;
- per-action/per-period notional;
- optional precommitted max-price condition.

**D remains the canonical architecture.**

## Pyth reality — proven

The earlier REST-only Pyth proof has been superseded by a stronger runtime proof.

The current canonical path:

1. server/backend obtains authenticated signed Pyth Pro Solana-format evidence;
2. transaction includes the exact signed market message;
3. Ed25519 verification is included;
4. KEYS invokes the canonical Pyth Lazer verifier;
5. KEYS parses the verified payload;
6. policy checks occur before capital can move.

Canonical devnet proof:

https://github.com/Faadil1/keys/actions/runs/35959137364

Evidence:

`evidence/pyth/DEVNET-ONCHAIN-PYTH-BOUNDARY-PROOF-2026-09-24.md`

## Learning / Practice reality

Learning stays as a Family experience layer.

Recommended moments:

- first exposure to an unfamiliar asset/action;
- Practice before unfamiliar risk;
- explanation after a boundary refusal;
- explanation when a Pyth condition invalidates an old idea;
- post-action reflection comparing T0 belief with later evidence.

Rules:

- learning may support a request for review;
- learning never auto-widens authority;
- P&L never becomes a maturity score;
- guardian/principal explicitly controls standing authority changes.

## Historical v0.1 versus current v0.2

v0.1 remains valid historical evidence for authority-transition semantics.

v0.2 now additionally proves:

- permission-matrix core / AssetRule;
- program-controlled capital;
- in-bounds autonomy;
- out-of-bounds refusal;
- explicit human widen;
- stale execution refusal;
- downward pause;
- signed live Pyth verification;
- Pyth-derived USD notional;
- Pyth market-condition refusal.

## Gate verdict

**PASS.**

Next gate:

**BENITA_V0_2_FRONTEND_INTEGRATION**

Frozen integration contract:

`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`

Truth boundary remains strict: demo/mock SPL token, no real minor securities execution, no brokerage/custody claim, no mainnet claim.
