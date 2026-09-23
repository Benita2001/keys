# KEYS — Documentation Status

Date: 2026-09-23  
Status: **CANONICAL DOCS SYNCHRONIZED**

This index exists to prevent old blocker language from becoming the apparent current state.

## Current canonical truth

- backend demo-first proof: **PASS**
- local Solana authority runtime: **PASS**
- Solana devnet authority runtime: **PASS**
- stable devnet program identity: **PASS**
- authenticated live Pyth US-equity proof: **PASS**
- live demo backend contract: **PASS**
- Vercel/serverless adapter: **PASS in CI**
- public hosted backend URL: **not currently claimed**
- real minor securities execution: **OUT OF SCOPE**
- frontend/integration/deployment owner: **Benita**
- backend/proof owner: **Faadil**

Canonical devnet program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

Canonical live Pyth proof feed:

`Equity.US.TSLA/USD`

The current Pyth trial does not entitle AAPL. The product is asset-independent.

## Canonical documents

| Document | Role | Current status |
| --- | --- | --- |
| `README.md` | Repository overview / public truth | CURRENT |
| `product/PRD-0.1.md` | Product requirements | CURRENT |
| `product/REALITY-GATE.md` | Reality-gate assumptions / unresolved validation | CURRENT |
| `docs/CONCEPT-LOCK.md` | Locked product thesis | CURRENT |
| `docs/BUILD-PLAN.md` | Gate progression | CURRENT |
| `docs/DEMO-FIRST-ARCHITECTURE.md` | Judge/demo narrative architecture | CURRENT |
| `docs/TECHNICAL-REALITY-CHECK.md` | Technical reality boundary | CURRENT |
| `docs/TRUTH-BOUNDARY.md` | Claim/no-claim boundary | CURRENT |
| `docs/SOLANA-AUTHORITY-PROOF.md` | Solana local/devnet proof | CURRENT |
| `docs/PYTH-EVIDENCE-PROOF.md` | Authenticated Pyth proof | CURRENT |
| `docs/EXTERNAL-PROOF-CREDENTIALS.md` | Reproducible secret/funding paths | CURRENT |
| `docs/BACKEND-EXTERNAL-BLOCKERS.md` | Historical blockers + resolved state | CURRENT |
| `docs/BACKEND-API.md` | Frontend-facing backend API | CURRENT |
| `docs/FRONTEND-BACKEND-CONTRACT.md` | Frozen semantic contract | CURRENT |
| `docs/FRONTEND-START-HERE.md` | Benita starting guide | CURRENT |
| `docs/LIVE-DEMO-INTEGRATION.md` | Live integration contract | CURRENT |
| `docs/BENITA-FRONTEND-HANDOFF.md` | Ownership/deployment handoff | CURRENT |
| `state/CURRENT.yaml` | Short canonical machine-readable truth | CURRENT |
| `state/HANDOVER.yaml` | Cross-conversation/project handoff | CURRENT |

## Evidence

Solana:

- `evidence/solana/LOCAL-AUTHORITY-RUNTIME-PROOF-2026-09-23.md`
- `evidence/solana/DEVNET-AUTHORITY-RUNTIME-PROOF-2026-09-23.md`

Pyth:

- `evidence/pyth/LIVE-EQUITY-EVIDENCE-PROOF-2026-09-23.md`

Evidence files intentionally preserve exact observed run values and historical progression. They should not be rewritten merely because later proofs supersede earlier blockers.

## Historical language rule

Historical blocker terms such as:

- `BLOCKED_FUNDING`
- `BLOCKED_API_KEY`
- `PYTH_NOT_ENTITLED`

may appear inside explicitly historical evidence or diagnostic sections.

They must not appear as the current project status.

## Ownership rule

Frontend / product experience / integration / deployment:

**Benita**

Backend semantics / Solana / Pyth / proof maintenance / backend support:

**Faadil**

COVENANT remains separate until the final Candidate A vs Candidate B collision.
