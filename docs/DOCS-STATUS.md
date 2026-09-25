# KEYS — Documentation Status

Date: 2026-09-24  
Status: **CANONICAL DOCS SYNCHRONIZED — ALL CURRENT HACKATHON TECHNICAL GATES PASS**

## Current canonical truth

- Stocklana wedge: **KEYS Family**
- product model: **bounded autonomy**
- contextual learning / Practice: **retained**
- stages: **Family UX/policy pack**
- Mandate: **technical authority truth**
- v0.1 Solana authority-transition proof: **PASS**
- v0.1 authenticated Pyth Pro live-equity proof: **PASS**
- v0.2 program-controlled capital execution: **PASS — local + canonical devnet, demo SPL token**
- v0.2 permission-matrix core / AssetRule: **PASS**
- v0.2 explicit human widen + stale execution refusal: **PASS**
- v0.2 pause/downward authority: **PASS**
- Pyth signed Solana payload availability: **PASS**
- v0.2 signed on-chain Pyth verification: **PASS — AAPL current devnet lane; TSLA historical local/devnet evidence retained**
- Pyth-derived USD/notional enforcement: **PASS — devnet**
- precommitted max-price refusal: **PASS — devnet**
- frontend/backend contract v0.2: **FROZEN**
- Cloudflare stateful Family API: **LIVE / STATEFUL BUILD DEPLOYED**
- Durable Object Family state + cross-device sync: **IMPLEMENTED**
- server-owned Mandate evaluation: **IMPLEMENTED**
- role-scoped child/guardian demo sessions: **IMPLEMENTED**
- guardian Mandate transitions: **IMPLEMENTED ON SOLANA DEVNET**
- persistent boundary requests / decisions: **IMPLEMENTED**
- exact single-use ALLOW_ONCE: **PASS — DEPLOYED + PROVEN ON DEVNET; reuse REFUSE / AllowanceAlreadyUsed**
- durable idempotency / anti-double-spend reservations: **IMPLEMENTED**
- test funding: **IMPLEMENTED — NO REAL PAYMENT**
- learning + Money portfolio sync: **IMPLEMENTED**
- market quote API: **IMPLEMENTED / FAIL-CLOSED**
- market history provider: **PASS — AUTHENTICATED PYTH PRO AAPL HISTORY HOSTED; fail-closed otherwise**
- iPhone WebKit QA: **PASS — run 36057960806**
- current Node/API CI: **PASS — run 36112502744**
- Cloudflare Worker dry-run: **PASS — run 36112073075**
- hosted state/history/concurrency/Tessera smoke: **PASS — run 36112229684**
- final ALLOW_ONCE Devnet proof: **PASS — upgrade run 36079506597; bridge run 36082140600**
- Tessera public T-Token integration: **PASS — live run 36112072978; hosted run 36112229684**
- Cresco Tessera Learn/Practice surface: **PASS — web 36112502712; WebKit 36112502709**
- real minor securities execution: **OUT OF SCOPE**
- frontend owner: **Benita**
- backend v0.2 owner: **Faadil**

Canonical devnet program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Canonical live Pyth proof feed:

`Equity.US.AAPL/USD`

## Current canonical documents

| Document | Role | Status |
| --- | --- | --- |
| `README.md` | Repository overview / public truth | CURRENT v0.2 |
| `docs/CONCEPT-LOCK.md` | Product concept lock | CURRENT v0.2 |
| `product/PRD-0.1.md` | PRD (path retained, content v0.2) | CURRENT |
| `product/REALITY-GATE.md` | Strategy/reality assumptions | CURRENT |
| `docs/TECHNICAL-REALITY-GATE-BOUNDED-AUTONOMY.md` | v0.2 architecture decision | CURRENT |
| `docs/ARCHITECTURE-DELTA-BOUNDED-AUTONOMY.md` | exact v0.1→v0.2 build delta | CURRENT |
| `docs/FAMILY-LEARNING-LAYER.md` | learning/practice rules | CURRENT |
| `docs/TECHNICAL-REALITY-CHECK.md` | short technical boundary | CURRENT v0.2 |
| `docs/BUILD-PLAN.md` | gate progression | CURRENT |
| `docs/DEMO-FIRST-ARCHITECTURE.md` | judge/demo narrative | CURRENT v0.2 |
| `docs/TRUTH-BOUNDARY.md` | claim/no-claim boundary | CURRENT |
| `docs/SOLANA-AUTHORITY-PROOF.md` | v0.1 Solana evidence | HISTORICAL VALID PROOF |
| `docs/PYTH-EVIDENCE-PROOF.md` | v0.1 Pyth evidence | HISTORICAL VALID PROOF |
| `docs/FRONTEND-BACKEND-CONTRACT.md` | original v0.1 semantic contract | HISTORICAL / NOT NEW TARGET |
| `docs/FRONTEND-BACKEND-CONTRACT-V0.2-DRAFT.md` | bounded-autonomy semantic draft | HISTORICAL DRAFT |
| `docs/FRONTEND-BACKEND-CONTRACT-V0.2.md` | bounded-autonomy integration contract | CURRENT / FROZEN |
| `docs/BACKEND-API.md` | current v0.2 HTTP integration surface | CURRENT / FROZEN TARGET |
| `docs/LIVE-DEMO-INTEGRATION.md` | Benita live/demo integration guide | CURRENT v0.2 |
| `docs/CRESCO-BACKEND-DELTA-2026-09-24.md` | corrections/delta for Benita PR #1 backend assumptions | CURRENT |
| `docs/BOUNTY-INTEGRATION-GATE-2026-09-24.md` | sponsor-track activation / anti-bounty-chasing gate | CURRENT |
| `evidence/solana/CRESCO-AAPL-HTTP-DEVNET-EXECUTION-PROOF-2026-09-24.md` | current AAPL entitlement + HTTP→Solana devnet proof | CURRENT CANONICAL EVIDENCE |
| `evidence/pyth/DEVNET-ONCHAIN-PYTH-BOUNDARY-PROOF-2026-09-24.md` | historical TSLA devnet live Pyth capital proof | HISTORICAL VALID EVIDENCE |
| `evidence/solana/LOCAL-BOUNDED-AUTONOMY-RUNTIME-PROOF-2026-09-23.md` | v0.2 local capital proof | CURRENT EVIDENCE |
| `evidence/solana/DEVNET-BOUNDED-AUTONOMY-RUNTIME-PROOF-2026-09-23.md` | v0.2 canonical devnet capital proof | CURRENT EVIDENCE |
| `docs/FRONTEND-START-HERE.md` | Benita transition guide | CURRENT |
| `docs/BENITA-FRONTEND-HANDOFF.md` | ownership/handoff | CURRENT |
| `state/CURRENT.yaml` | machine-readable current truth | CURRENT |
| `state/HANDOVER.yaml` | cross-conversation handoff | CURRENT v19 |

## v0.1 evidence remains evidence

Do not rewrite successful historical proof merely because the product target evolved.

The v0.1 program still truthfully proves:

- explicit authority transition;
- guardian authorization;
- version/nonce lineage;
- stale replay refusal.

The Pyth proof still truthfully proves authenticated live equity evidence through the server-side boundary.

The current v0.2 proof now additionally proves bounded capital execution and the permission-matrix core with a demo SPL token.

Now additionally proven on canonical devnet:

- signed live Pyth verification inside the Solana capital path;
- Pyth-derived USD/notional enforcement;
- precommitted max-price refusal.
- exact ALLOW_ONCE grant/consume/reuse refusal on canonical devnet;
- authenticated AAPL Pyth Pro History via the hosted Cloudflare API;
- multi-asset Family budget serialization via hosted Durable Object concurrency proof.

Production-only / intentionally not claimed:

- production authentication / identity verification / KYC;
- embedded production wallet or custody model;
- real bank/card funding;
- real tokenized-stock/minor execution;
- brokerage/custody;
- mainnet execution;
- live entitlement/history for every Explore symbol.

## Ownership

Backend v0.2 build / Solana / Pyth / contract:

**Faadil**

Frontend/product experience:

**Benita**, after/alongside the new v0.2 contract rather than being locked to v0.1 proposal-per-action semantics.

COVENANT remains separate until the final Candidate A vs Candidate B collision.
