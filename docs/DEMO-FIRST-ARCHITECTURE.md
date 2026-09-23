# Demo-First Architecture

## 3-minute transformation

**0:00–0:30** — Maya's Stake shows beneficiary, funding provenance, purpose, legal/control truth, and current `PROPOSE` mandate.

**0:30–1:00** — Maya creates a $25 Apple proposal with rationale, counterargument, horizon and invalidation condition.

**1:00–1:30** — KEYS checks the current mandate and returns `ESCALATE / GUARDIAN_REVIEW_REQUIRED`. The system proves that proposal is not execution authority.

**1:30–2:00** — Show evidence history: proposals, completed reviews, market-event reviews, scope violations. KEYS can say whether the current record is eligible for a mandate review.

**2:00–2:25** — Attempt to widen the mandate without an authorized signer. KEYS refuses.

**2:25–2:45** — Guardian explicitly signs a transition from `PROPOSE` to `BOUNDED`.

**2:45–3:00** — Attempt real execution with eligibility `UNKNOWN`. KEYS refuses. Close: **Financial independence shouldn't happen all at once.**

## Next proof milestone

Replace the local transition receipt with a Solana devnet instruction and replace fixture market evidence with a verified live Pyth snapshot. Do not add real minor execution.
