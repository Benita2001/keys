# Technical Reality Check v0.1

## What must be true for KEYS to be more than a dashboard

1. A mandate must be machine-readable and enforceable.
2. An out-of-scope action must deterministically refuse.
3. Evidence history must be append-only or tamper-evident.
4. Market evidence must fail closed when stale, unavailable, or too uncertain.
5. Evidence may create **eligibility for mandate review**, not automatic real authority.
6. A real-authority transition must require an authorized signer or regulated authority.
7. Real execution must additionally pass age, jurisdiction, venue and eligibility checks.
8. Minor PII and free-form decision narratives must remain off public chain.

## v0.1 proof target

The first technical proof is intentionally smaller than the full company vision:

- create Charter;
- create Mandate;
- create Proposal;
- normalize an external market snapshot;
- refuse stale evidence;
- refuse actions outside scope;
- summarize longitudinal evidence;
- mark the mandate eligible/ineligible for review;
- refuse an unsigned mandate transition;
- accept an explicit authorized transition;
- refuse real execution when eligibility is UNKNOWN.

The Node reference engine in `src/` implements this deterministic slice and is covered by tests.

## Solana boundary

The minimal Solana authority program is implemented and verified on both local validator and devnet.

Canonical devnet program:

`ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`

The account model is:

- `CharterPda`
- `MandatePda`
- `ProposalCommitmentPda`
- `ReviewReceiptPda`

Only hashes / bounded parameters / timestamps / signer identities belong on-chain. Family identity and sensitive narratives stay off-chain.

## Pyth boundary

Authenticated live Pyth US-equity evidence is also verified.

The canonical live proof uses `Equity.US.TSLA/USD` because it is included in the current trial entitlement. Fresh evidence reaches the mandate evaluator but still resolves `PROPOSE` to `ESCALATE / GUARDIAN_REVIEW_REQUIRED`.

This verifies that market evidence is load-bearing without becoming an authority oracle.

## Why Solana matters

A centralized database can implement the v0.1 UX. Solana becomes structural only when the authority state is portable, independently inspectable, and enforceable across programmable assets or multiple applications rather than existing only inside one vendor's database.
