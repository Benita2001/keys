# Cresco — Backend Integration Handoff

Audience: backend owner (KEYS v0.2 runtime, Solana, Pyth).
Frontend: `apps/web` (Next.js 16, TypeScript). Contract status: the backend v0.2 contract is **FROZEN** (`docs/FRONTEND-BACKEND-CONTRACT-V0.2.md`). This document reflects the merged Cresco frontend and current backend integration truth.

**Read first:** the normal Family Money lane remains demo/policy-only with honest labels. The separate Technical details proof lane can execute the bounded demo/mock SPL-token path on Solana devnet and surface a real confirmed signature. The backend calls used by Cresco are listed in §1.

> **Current delta:** see `docs/CRESCO-BACKEND-DELTA-2026-09-24.md`. The stable devnet execution bridge is intentionally AAPL market truth + demo/mock SPL token + server-held devnet demo signer. It does not replace the broader production architecture sections below.

---

## 0. Where the seams are

| Layer | File | Role |
|---|---|---|
| Domain types | `apps/web/src/domain/types.ts` | `CurrentMandate`, `AssetRule`, `ActionEvaluation`, `LearningContext`, `BoundaryRequest`, `ExecutionProof` (backend vocabulary kept) |
| Policy preview | `apps/web/src/domain/policy.ts` | TS mirror of `src/bounded-autonomy.mjs#evaluateBoundedAction` for instant UI explanations. **Never authority.** A parity test runs the same cases through the backend module. |
| Service interfaces | `apps/web/src/services/types.ts` | `MarketDataService`, `MoneyExecutionService`, `PracticeExecutionService`, `BoundaryRequestService`, `MandateService`, `FundingService`, `AuthService` |
| Service registry | `apps/web/src/services/index.ts` | Current implementations (demo + frozen KEYS v0.2 routes) |
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
| `evaluateAction()` | `POST /api/v0.2/actions/evaluate` | Money Mode decision (ALLOW / REFUSE + `boundaryRequestAvailable`) | Yes: frozen v0.2 route |
| `fetchLiveEquityPrice()` | `GET /api/v0.1/demo/live-proof` | Overlay a live Pyth price for the configured demo equity (AAPL) when `evaluation.marketEvidence.status === "FRESH"` | Route reachable. Without `PYTH_PRO_API_KEY` it returns no fresh evidence, so AAPL stays labeled **Sample prices** (correct fail-closed behavior). Live AAPL path is proven in GitHub Actions run `36035283447`. |
| `fetchCapabilities()` | `GET /api/v0.1/capabilities` | Available for routing decisions; not yet consumed by UI | Route exists |
| `executeAction()` | `POST /api/v0.2/actions/execute` (**implemented; AAPL devnet smoke PASS**) | Real demo-token devnet execution + proof when `NEXT_PUBLIC_KEYS_EXECUTION=runtime` | PASS / PROVEN in run `36034651466`; confirmed non-simulated devnet signature returned |

Fail-closed rule in the adapter: if the evaluate call errors or times out (8s), the frontend returns `REFUSE / DECISION_UNAVAILABLE` ("We couldn't check your limits. Nothing happened."). An unreachable backend never becomes an ALLOW.

---

## 2. Object mapping

| Contract object | Frontend type | Consumed by | Notes / gaps |
|---|---|---|---|
| `currentMandate` | `CurrentMandate` | Home Money hero, `MandateSummaryCard`, My limits, parent dashboard/limits | Frontend needs **multi-asset scope** (`allowedAssets[]`), `periodLabel`, `spentThisPeriod`, `updatedAt`. Draft fixture is single-asset. `familyStage` is display-only. |
| `assetRule` | `AssetRule` (projected by `assetRuleFor(mandate, ticker)`) | Evaluate request body | Frontend sends `requiresMarketEvidence:false` for instant local preview only. The current AAPL technical proof lane enforces signed Pyth evidence on-chain; the preview never acts as authority. Period spend is **mandate-wide** in the UI; the backend currently tracks it per rule. |
| `actionEvaluation` | `ActionEvaluation` | Invest flow, Company Detail CTA, `BoundaryMessage` | Uses `decision`, `reasonCode`, `requestedNotional`, `standingLimit`, `remainingPeriodNotional`, `boundaryRequestAvailable`, `guardianApprovalRequired`, `mandateVersion/Nonce`. Frontend adds `source` (`keys-backend` | `keys-runtime` | `local-preview`). Frontend-only codes: `INSUFFICIENT_BALANCE`, `ASSET_UNAVAILABLE`, `DECISION_UNAVAILABLE`. |
| `learningContext` | `LearningContext` | `BoundaryMessage` "Why limits exist", company first-use sheet | Mirrors `learningCueForAction`. No score field exists or is rendered. |
| `boundaryRequest` | `BoundaryRequest` | `BoundaryRequestSheet`, `RequestStatusCard`, parent request page | Draft route builds the envelope but **nothing persists it and no decision route exists** (see §3.5). Frontend keeps `reason` text client-side; backend draft expects `reasoningCommitmentHash`. |
| `executionProof` | `ExecutionProof` | Invest success, *View transaction details* | Today always `DEMO_NOT_EXECUTED` (Money) or `PRACTICE_LOCAL`. UI already renders `RUNTIME_CONFIRMED` with `network`, `signature`, `programId`, `mandateVersion/Nonce`. |

---

## 3. Integrations needed, by feature

Each entry: screen → purpose → existing support → missing → proposed endpoint → request/response → permissions → states/errors → caching → security → truth boundary.

### 3.1 Market data (prices, series)

- **Screens:** Explore, Company Detail, Portfolio, Home hero, Parent performance.
- **Purpose:** price, day change, sparkline, 1D/1W/1M/1Y history for the 10-asset universe (AAPL, NVDA, TSLA, NFLX, AMZN, MSFT, META, MCD, SPY, QQQ ↔ `…x` xStocks).
- **Existing:** Pyth Pro server-side adapter (`src/pyth-adapter.mjs`) with AAPL + TSLA feed ids; AAPL is now entitled and is the current proof asset; TSLA remains historical proof.
- **Missing:** a quotes endpoint for the full universe, history/series, feed ids for the other 8 symbols, entitlement.
- **Proposed:** `GET /api/v0.2/market/quotes?symbols=AAPL,NVDA,…` and `GET /api/v0.2/market/series?symbol=AAPL&period=1M`.
- **Response (quote):** `{ symbol, tokenizedSymbol, price, dayChangePercent, source: "PYTH_PRO", status: "FRESH"|"STALE"|"UNAVAILABLE", publishTime, confidenceBps }`.
- **Permissions:** public read. **Secrets:** Pyth key server-only (already the pattern).
- **States:** loading (skeletons exist), stale (`DataStatusTag` "Delayed"), unavailable ("Price data is taking a little longer to load."). Never return `0` for unknown.
- **Caching:** quotes 5–15s; series 1–15 min by period.
- **Truth boundary:** a quote is `live` only if `status === "FRESH"` from Pyth. Everything else renders as sample/delayed. Frontend maps `status` → `dataStatus`.

### 3.2 Money Mode action evaluation — **wired (frozen v0.2)**

- **Screens:** Invest (`/invest/[ticker]?mode=money`), Company Detail Money CTA.
- **Existing:** `POST /api/v0.2/actions/evaluate` (frozen route).
- **Request sent:** `{ mandate:{status,version,nonce,expiresAt}, assetRule, action:{asset,type:"BUY",amount,notional} }`.
- **Missing:** server-owned Mandate (today the client sends it; the backend must load the delegate's current Mandate by session, not trust the client), multi-asset rules, mandate-wide period spend, balance check.
- **Proposed v0.2 final:** `POST /api/v0.2/actions/evaluate` with body `{ asset, type, notional, expectedNonce }`, identity from session.
- **Errors:** 401/403 → sign-in; 409 stale nonce → `STALE_NONCE` UI exists; 5xx/timeout → fail closed (implemented).
- **Truth boundary:** evaluation ≠ execution. UI never shows "bought" from an evaluation.

### 3.3 Money Mode execution + proof — **frontend built against a mock; backend route needed**

- **Screens:** Invest (`/invest/[ticker]?mode=money`) success, pending, "still checking" and *View transaction details*.
- **Existing:** Anchor program `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk` proves bounded **demo-token** execution on devnet (in-bounds executes without guardian, out-of-bounds fails in-program, widen advances version/nonce, stale refuses, pause blocks). The HTTP execution route is now proven end-to-end for the AAPL demo-token proof lane.
- **Frontend status:** implemented in `apps/web/src/services/keys-backend.ts` (`executeAction`) and `services/index.ts` (`executeOnRuntime`). Enabled with `NEXT_PUBLIC_KEYS_API_URL=…` + `NEXT_PUBLIC_KEYS_EXECUTION=runtime`. Verified against the local mock `apps/web/scripts/mock-keys-api.mjs` (`npm run mock:keys`, port 8788), which evaluates with the real `src/bounded-autonomy.mjs` and returns `simulated: true` proofs.

**Route:** `POST /api/v0.2/actions/execute` · implemented and proven for the server-held AAPL devnet proof lane · header `idempotency-key: <same as body>`

Request:

```json
{
  "asset": "AAPL",
  "type": "BUY",
  "notional": 5,
  "expectedNonce": 3,
  "idempotencyKey": "3f1c…uuid",
  "allowOnceRequestId": "br_… (optional)",
  "draft": {
    "mandate": { "status": "ACTIVE", "version": 4, "nonce": 3 },
    "assetRule": { "asset": "AAPL", "enabled": true, "allowedActions": ["BUY"], "maxActionNotional": 10, "maxPeriodNotional": 50, "spentThisPeriod": 0, "requiresMarketEvidence": false }
  }
}
```

`draft` exists only until the server owns the Mandate (§3.4). The final route must load the Mandate from the session and ignore `draft`.

Response: **HTTP 200 for every policy outcome.**

```json
{
  "contractVersion": "0.2",
  "evaluation": { "decision": "ALLOW", "reasonCode": "WITHIN_MANDATE", "guardianApprovalRequired": false, "mandateVersion": 4, "mandateNonce": 3 },
  "executionProof": {
    "status": "CONFIRMED",
    "network": "solana-devnet",
    "signature": "<base58 tx signature>",
    "programId": "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
    "mandateVersion": 4,
    "mandateNonce": 3,
    "executedAt": "2026-09-24T12:00:00Z",
    "idempotencyKey": "3f1c…uuid",
    "simulated": false
  }
}
```

- REFUSE / ESCALATE → `executionProof: null` and the same `evaluation` fields as the draft evaluate route (`boundaryRequestAvailable`, `standingLimit`, …).
- Submitted but not final → `executionProof.status: "PENDING"` (signature optional). The client re-sends the **same** request/key to re-check.

**Server requirements the frontend relies on:**

1. **Idempotency.** The same `idempotencyKey` must return the original result and never execute twice, including after a timeout or 5xx. The frontend persists unconfirmed keys and re-uses them on "Check again", even after navigation.
2. **Atomic evaluate + debit.** Two different keys arriving concurrently must not both pass a period limit.
3. **Stale nonce.** Refuse with `reasonCode: "STALE_NONCE"` (200) or HTTP 409 when `expectedNonce` ≠ current Mandate nonce.
4. **Allow-once.** Verify `allowOnceRequestId` server-side: guardian decided `ALLOW_ONCE`, same asset, amount ≤ requested, same nonce, unused. Mark it used atomically. (The mock trusts it; the real route must not.)
5. **`simulated: false` only for real devnet transactions.** The UI links `signature` to `https://explorer.solana.com/tx/<sig>?cluster=devnet` only when `status: "CONFIRMED"` and `simulated: false`.
6. **`idempotencyKey` echoed in the proof.** The client rejects proofs for a different key.

**How the frontend classifies responses (tested in `apps/web/src/services/execute.test.ts`):**

| Response | Outcome | UI |
|---|---|---|
| 200 + ALLOW + CONFIRMED | EXECUTED | Success + proof note (devnet link, or "Test run (simulated)") |
| 200 + ALLOW + PENDING | PENDING | "Sent. Waiting for confirmation." + Check again; balance unchanged |
| 200 + REFUSE/ESCALATE | REFUSED | Boundary message / ask for more room |
| 400 / 401 / 403 / 422 | REFUSED (`DECISION_UNAVAILABLE`) | "We couldn't check your limits. Nothing happened." |
| 409 | REFUSED (`STALE_NONCE`) | "Your limits just changed." |
| 5xx, timeout (8s), network error, malformed body | UNKNOWN | "We're still checking on this." + Check again; never success or failure |

- **Permissions:** delegate session; server-side signer/relayer or embedded wallet. No keys in the browser.
- **Truth boundary:** devnet demo tokens only. Do not claim share ownership, custody, brokerage or xStocks settlement.

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

Real today: bounded demo-token execution on devnet, frozen v0.2 evaluation route, signed live Pyth AAPL evidence verified on-chain, PreStocks live API integration, and a proven Cresco HTTP execution bridge with confirmed non-simulated devnet signature.
**Not** claimed by the frontend: live prices for assets outside the currently entitled/proven feed set, real securities execution, custody, brokerage, xStocks settlement, share ownership, fiat funding, KYC, embedded wallet, or mainnet.

---

## 6. Suggested integration order

1. Server-owned Mandate read (§3.4 GET) → replace `DEMO_MANDATE`.
2. Final evaluate route with session identity (§3.2).
3. Boundary request persistence + decisions (§3.5).
4. Execute + proof (§3.3) → UI flips to `RUNTIME_CONFIRMED` automatically.
5. Quotes/series for the universe (§3.1).
6. Auth/family link, funding, learning sync.
