# Cresco — Backend Integration Handoff

Audience: backend owner (KEYS v0.2 runtime, Solana, Pyth).
Frontend: `apps/web` (Next.js 16, TypeScript). Contract status: the backend v0.2 contract is **DRAFT** (`docs/FRONTEND-BACKEND-CONTRACT-V0.2-DRAFT.md`). This document lists exactly what the Cresco frontend consumes, what already exists, and what's missing.

**Read first:** nothing in the frontend executes capital. Money Mode is demo state with honest labels. The only backend calls the frontend makes today are listed in §1.

---

## 0. Where the seams are

| Layer | File | Role |
|---|---|---|
| Domain types | `apps/web/src/domain/types.ts` | `CurrentMandate`, `AssetRule`, `ActionEvaluation`, `LearningContext`, `BoundaryRequest`, `ExecutionProof` (backend vocabulary kept) |
| Policy preview | `apps/web/src/domain/policy.ts` | TS mirror of `src/bounded-autonomy.mjs#evaluateBoundedAction` for instant UI explanations. **Never authority.** A parity test runs the same cases through the backend module. |
| Service interfaces | `apps/web/src/services/types.ts` | `MarketDataService`, `MoneyExecutionService`, `PracticeExecutionService`, `BoundaryRequestService`, `MandateService`, `FundingService`, `AuthService` |
| Service registry | `apps/web/src/services/index.ts` | Current implementations (demo + KEYS draft routes) |
| KEYS HTTP adapter | `apps/web/src/services/keys-backend.ts` | Only file that talks HTTP |
| Demo session state | `apps/web/src/state/store.tsx` | localStorage-backed family state until profile/portfolio APIs exist |
| Mock data | `apps/web/src/mocks/{market,family,learning}.ts` | Only place sample prices and demo family values live |

Enable the backend with:

```bash
# repo root
npm run api                      # KEYS dev API on 127.0.0.1:8787

# apps/web/.env.local
NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8787
```

Unset → the frontend runs fully on local demo state and the local policy preview.

---

## 1. What is wired today

| Frontend call | Backend route (exists) | Used for | Verified |
|---|---|---|---|
| `evaluateActionDraft()` | `POST /api/v0.2/draft/actions/evaluate` | Money Mode decision (ALLOW / REFUSE + `boundaryRequestAvailable`) | Yes: local API, browser CORS, $5 → ALLOW, $20 → REFUSE `MANDATE_LIMIT_EXCEEDED` |
| `fetchLiveEquityPrice()` | `GET /api/v0.1/demo/live-proof` | Overlay a live Pyth price for the configured demo equity (TSLA) when `evaluation.marketEvidence.status === "FRESH"` | Route reachable. Without `PYTH_PRO_API_KEY` it returns no fresh evidence, so TSLA stays labeled **Sample prices** (correct fail-closed behavior). Live path not observed locally. |
| `fetchCapabilities()` | `GET /api/v0.1/capabilities` | Available for routing decisions; not yet consumed by UI | Route exists |

Fail-closed rule in the adapter: if the evaluate call errors or times out (8s), the frontend returns `REFUSE / DECISION_UNAVAILABLE` ("We couldn't check your limits. Nothing happened."). An unreachable backend never becomes an ALLOW.

---

## 2. Object mapping

| Contract object | Frontend type | Consumed by | Notes / gaps |
|---|---|---|---|
| `currentMandate` | `CurrentMandate` | Home Money hero, `MandateSummaryCard`, My limits, parent dashboard/limits | Frontend needs **multi-asset scope** (`allowedAssets[]`), `periodLabel`, `spentThisPeriod`, `updatedAt`. Draft fixture is single-asset. `familyStage` is display-only. |
| `assetRule` | `AssetRule` (projected by `assetRuleFor(mandate, ticker)`) | Evaluate request body | Frontend sends `requiresMarketEvidence:false` because USD/notional Pyth enforcement isn't built on-chain yet (TRUTH-BOUNDARY). Flip when it is. Period spend is **mandate-wide** in the UI; the backend currently tracks it per rule. |
| `actionEvaluation` | `ActionEvaluation` | Invest flow, Company Detail CTA, `BoundaryMessage` | Uses `decision`, `reasonCode`, `requestedNotional`, `standingLimit`, `remainingPeriodNotional`, `boundaryRequestAvailable`, `guardianApprovalRequired`, `mandateVersion/Nonce`. Frontend adds `source` (`keys-backend-draft` \| `local-preview`). Frontend-only codes: `INSUFFICIENT_BALANCE`, `ASSET_UNAVAILABLE`, `DECISION_UNAVAILABLE`. |
| `learningContext` | `LearningContext` | `BoundaryMessage` "Why limits exist", company first-use sheet | Mirrors `learningCueForAction`. No score field exists or is rendered. |
| `boundaryRequest` | `BoundaryRequest` | `BoundaryRequestSheet`, `RequestStatusCard`, parent request page | Draft route builds the envelope but **nothing persists it and no decision route exists** (see §3.5). Frontend keeps `reason` text client-side; backend draft expects `reasoningCommitmentHash`. |
| `executionProof` | `ExecutionProof` | Invest success, *View transaction details* | Today always `DEMO_NOT_EXECUTED` (Money) or `PRACTICE_LOCAL`. UI already renders `RUNTIME_CONFIRMED` with `network`, `signature`, `programId`, `mandateVersion/Nonce`. |

---

## 3. Integrations needed, by feature

Each entry: screen → purpose → existing support → missing → proposed endpoint → request/response → permissions → states/errors → caching → security → truth boundary.

### 3.1 Market data (prices, series)

- **Screens:** Explore, Company Detail, Portfolio, Home hero, Parent performance.
- **Purpose:** price, day change, sparkline, 1D/1W/1M/1Y history for the 10-asset universe (AAPL, NVDA, TSLA, NFLX, AMZN, MSFT, META, MCD, SPY, QQQ ↔ `…x` xStocks).
- **Existing:** Pyth Pro server-side adapter (`src/pyth-adapter.mjs`) with AAPL + TSLA feed ids; only TSLA is entitled on the trial.
- **Missing:** a quotes endpoint for the full universe, history/series, feed ids for the other 8 symbols, entitlement.
- **Proposed:** `GET /api/v0.2/market/quotes?symbols=AAPL,NVDA,…` and `GET /api/v0.2/market/series?symbol=AAPL&period=1M`.
- **Response (quote):** `{ symbol, tokenizedSymbol, price, dayChangePercent, source: "PYTH_PRO", status: "FRESH"|"STALE"|"UNAVAILABLE", publishTime, confidenceBps }`.
- **Permissions:** public read. **Secrets:** Pyth key server-only (already the pattern).
- **States:** loading (skeletons exist), stale (`DataStatusTag` "Delayed"), unavailable ("Price data is taking a little longer to load."). Never return `0` for unknown.
- **Caching:** quotes 5–15s; series 1–15 min by period.
- **Truth boundary:** a quote is `live` only if `status === "FRESH"` from Pyth. Everything else renders as sample/delayed. Frontend maps `status` → `dataStatus`.

### 3.2 Money Mode action evaluation — **wired (draft)**

- **Screens:** Invest (`/invest/[ticker]?mode=money`), Company Detail Money CTA.
- **Existing:** `POST /api/v0.2/draft/actions/evaluate`.
- **Request sent:** `{ mandate:{status,version,nonce,expiresAt}, assetRule, action:{asset,type:"BUY",amount,notional} }`.
- **Missing:** server-owned Mandate (today the client sends it; the backend must load the delegate's current Mandate by session, not trust the client), multi-asset rules, mandate-wide period spend, balance check.
- **Proposed v0.2 final:** `POST /api/v0.2/actions/evaluate` with body `{ asset, type, notional, expectedNonce }`, identity from session.
- **Errors:** 401/403 → sign-in; 409 stale nonce → `STALE_NONCE` UI exists; 5xx/timeout → fail closed (implemented).
- **Truth boundary:** evaluation ≠ execution. UI never shows "bought" from an evaluation.

### 3.3 Money Mode execution + proof

- **Screens:** Invest success, *View transaction details*.
- **Existing:** Anchor program `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk` proves bounded **demo-token** execution on devnet (in-bounds executes without guardian, out-of-bounds fails in-program, widen advances version/nonce, stale refuses, pause blocks). No HTTP route executes it for the frontend.
- **Missing:** an execution endpoint that signs/relays `execute_within_mandate` for the delegate, returns the signature, and updates holdings.
- **Proposed:** `POST /api/v0.2/actions/execute` `{ asset, type, notional, expectedNonce, idempotencyKey }` → `{ evaluation, executionProof:{ status:"RUNTIME_CONFIRMED", network:"solana-devnet", signature, programId, mandateVersion, mandateNonce, executedAt } }`.
- **Permissions:** delegate session; server-side signer or embedded wallet. No keys in the browser.
- **States:** pending (UI shows "Checking your limits…"), confirmed, refused-in-program (map program error → reason code), timeout (show "not confirmed yet", never "done").
- **Truth boundary:** until a mainnet/regulated path exists, label devnet demo-token execution as such. Do not claim share ownership, custody, brokerage or xStocks settlement.

### 3.4 Mandate read/update (guardian)

- **Screens:** parent dashboard limits card, `/parent/limits`, pause/resume, child My limits.
- **Existing:** on-chain widen/pause/downward authority with version/nonce advance; `src/authority-runtime.mjs` for v0.1 transitions.
- **Missing:** HTTP routes for v0.2 Mandate read and guardian-signed update.
- **Proposed:** `GET /api/v0.2/mandates/current?delegate=…` → `CurrentMandate`; `POST /api/v0.2/mandates/transition` `{ changes:{maxActionNotional?,maxPeriodNotional?,allowedAssets?,status?}, expectedNonce, guardianSignature }` → new `CurrentMandate` (+ proof).
- **Permissions:** principal/guardian only. **A delegate can never widen their own Mandate** (UI never exposes it to the child).
- **States:** confirm diff modal exists (before → after, new version). Stale nonce → re-fetch.
- **Truth:** market evidence and learning never appear as inputs.

### 3.5 Boundary requests + guardian decisions

- **Screens:** `BoundaryRequestSheet`, Home/Portfolio `RequestStatusCard`, parent dashboard queue, `/parent/requests/[id]`.
- **Existing:** `POST /api/v0.2/draft/boundary-requests` builds the envelope (`PENDING_HUMAN_DECISION`, `decisions:[ALLOW_ONCE, WIDEN_MANDATE, REFUSE]`). Not persisted; no decision route.
- **Missing:** persistence, list, decide, one-time allowance consumption, notifications.
- **Proposed:**
  - `POST /api/v0.2/boundary-requests` `{ asset, type, notional, reason (≤140), expectedNonce }` → `BoundaryRequest`. Store `reason` privately; derive `reasoningCommitmentHash` server-side if a commitment is needed.
  - `GET /api/v0.2/boundary-requests?status=pending` (guardian), `GET …/mine` (delegate).
  - `POST /api/v0.2/boundary-requests/:id/decision` `{ decision, newLimits?, note? }` → `{ request, mandate }`. `WIDEN_MANDATE` must go through the same signed transition as §3.4.
- **Allow-once semantics the UI implements:** covers exactly one action for the same asset, amount ≤ requested, and the **same Mandate nonce**; consumed on use; never changes standing limits. Backend should enforce the same (e.g. single-use allowance bound to nonce).
- **Privacy:** reasons are family-private. **Never write a minor's reason on a public chain.**

### 3.6 Funding (Add money)

- **Screens:** `/parent/add-money`, allowance setting.
- **Existing:** none.
- **Missing:** funding provider, KYC for the guardian, ledger for family balance.
- **Proposed:** `POST /api/v0.2/funding/deposits` `{ amount, method }` → `{ status:"PENDING"|"SETTLED"|"FAILED", availableBalance }`; `GET /api/v0.2/balances`.
- **Truth:** UI says "Demo mode: no bank or card is connected, and no payment is taken." Keep until a real provider is live.

### 3.7 Auth + family link

- **Screens:** `/start`, `/parent/sign-in`, `/profile/parent`, parent-area gate.
- **Existing:** none. Frontend `AuthService.signInDemo` creates a local demo session.
- **Proposed:** separate child and guardian sessions; family link via one-time code (UI shows `CRES-4821` placeholder); role in session drives authorization for §3.4–3.6.
- **Truth:** no identity verification is claimed.

### 3.8 Learning progress, achievements, activity

- **Screens:** Learn, lessons, Home mission/continue, Wins, parent stats/topics/weekly bars.
- **Existing:** none (content ships in the frontend).
- **Proposed:** `POST /api/v0.2/learning/progress` `{ lessonId }`, `GET /api/v0.2/learning/summary` → `{ completedLessons, streakDays, xp, weeklyMinutes[], researchedCompanies }`.
- **Hard rule:** these endpoints must have **no path** to Mandate changes. `LEARNING COMPLETION != AUTHORITY` is enforced by frontend tests (`store.test.ts`) and should be mirrored server-side.
- **Parent weekly bars** currently show a labeled *sample week*.

### 3.9 Portfolio (practice + money)

- **Screens:** Portfolio, Home heroes, parent performance.
- **Existing:** none. Practice holdings are local demo state; Money holdings are local demo state updated by demo "executions".
- **Proposed:** `GET /api/v0.2/portfolio?mode=practice|money` → `{ holdings:[{symbol, shares, costBasis}], cash }`. Valuation can stay client-side from quotes (§3.1) or be server-computed.

---

## 4. Security checklist for integration

- No Pyth key, devnet keypair or signer material in `NEXT_PUBLIC_*` or client bundles (current adapter sends none).
- Server must derive identity/role from session, not from request bodies (today's draft route trusts the client Mandate; acceptable for demo only).
- CORS: dev API defaults to `*`. Set `KEYS_CORS_ORIGIN` to the deployed web origin.
- Idempotency keys on execute/deposit. The frontend now blocks repeat submits in one tab (`useSingleFlight`), but only the server can stop concurrent requests from two tabs or devices from overspending a period limit. Evaluate-and-debit must be atomic server-side / in-program.
- Minor's private reasoning stays off-chain.

---

## 5. Truth boundary (unchanged by this PR)

Real today: bounded demo-token execution on devnet (backend proof), draft v0.2 evaluation route, authenticated Pyth TSLA evidence server-side.
**Not** claimed by the frontend: live prices for non-TSLA assets, real Money execution, custody, brokerage, xStocks settlement, share ownership, fiat funding, KYC, embedded wallet, mainnet, on-chain Pyth enforcement.

---

## 6. Suggested integration order

1. Server-owned Mandate read (§3.4 GET) → replace `DEMO_MANDATE`.
2. Final evaluate route with session identity (§3.2).
3. Boundary request persistence + decisions (§3.5).
4. Execute + proof (§3.3) → UI flips to `RUNTIME_CONFIRMED` automatically.
5. Quotes/series for the universe (§3.1).
6. Auth/family link, funding, learning sync.
