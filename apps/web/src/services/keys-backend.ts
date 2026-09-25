/**
 * KEYS backend adapter (repository root: src/http-api.mjs).
 *
 * Configuration (build-time public env; no secrets ever live here):
 *   NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8787   optional KEYS API override
 *   NEXT_PUBLIC_KEYS_EXECUTION=runtime                 optional execution override
 *
 * Production fallback:
 *   https://keys-api-stocklana.faadil-casecraft.workers.dev
 *
 * In production, the hosted runtime backs the bounded AAPL Money demo lane.
 * It uses Solana Devnet test capital / demo-token execution, not real securities.
 *
 * Routes used:
 *   GET  /api/v0.1/capabilities                 (exists)
 *   GET  /api/v0.1/demo/live-proof              (exists) live Pyth AAPL evidence if configured
 *   POST /api/v0.2/actions/evaluate             (frozen) ALLOW / REFUSE
 *   GET  /api/v0.2/demo/runtime                 (implemented) stable devnet demo runtime metadata
 *   POST /api/v0.2/actions/execute              (implemented) real devnet demo-token execution bridge
 *
 * The real execution bridge is intentionally scoped to the server-held AAPL
 * devnet proof lane. Other Cresco assets remain on the product/demo path until
 * their own runtime representation is proven.
 */
import type {
  ActionEvaluation,
  AssetRule,
  BoundaryRequest,
  CurrentMandate,
  Decision,
  ExecutionOutcome,
  ExecutionProof,
  GuardianDecision,
  ReasonCode,
  Session,
} from "@/domain/types";

type KeysConfig = { url: string; execution: "demo" | "runtime"; timeoutMs: number };

const PUBLIC_HOSTED_KEYS_API =
  "https://keys-api-stocklana.faadil-casecraft.workers.dev";

let override: Partial<KeysConfig> | null = null;

type BackendRole = "child" | "guardian";

const BACKEND_SESSION_KEYS: Record<BackendRole, string> = {
  child: "cresco-keys-session-child-v1",
  guardian: "cresco-keys-session-guardian-v1",
};
const BACKEND_ACTIVE_ROLE_KEY = "cresco-keys-session-active-role-v1";

function backendSessionToken(role?: BackendRole | null) {
  if (typeof window === "undefined") return null;
  try {
    const resolved =
      role ??
      (window.localStorage.getItem(BACKEND_ACTIVE_ROLE_KEY) as BackendRole | null);
    if (resolved && BACKEND_SESSION_KEYS[resolved]) {
      return window.localStorage.getItem(BACKEND_SESSION_KEYS[resolved]);
    }
    return (
      window.localStorage.getItem(BACKEND_SESSION_KEYS.child) ??
      window.localStorage.getItem(BACKEND_SESSION_KEYS.guardian)
    );
  } catch {
    return null;
  }
}

function saveBackendSessionToken(token: string, role: BackendRole) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKEND_SESSION_KEYS[role], token);
    window.localStorage.setItem(BACKEND_ACTIVE_ROLE_KEY, role);
  } catch {
    // Storage may be unavailable; the current call still completed safely.
  }
}

function requiredRoleForRequest(path: string, method = "GET"): BackendRole | null {
  const upper = method.toUpperCase();
  if (path === "/api/v0.2/mandates/transition") return "guardian";
  if (/\/api\/v0\.2\/boundary-requests\/[^/]+\/decision$/.test(path)) return "guardian";
  if (path === "/api/v0.2/funding/deposits") return "guardian";

  if (path === "/api/v0.2/family/link") return "child";
  if (path === "/api/v0.2/actions/evaluate") return "child";
  if (path === "/api/v0.2/actions/execute") return "child";
  if (path === "/api/v0.2/learning/progress") return "child";
  if (path === "/api/v0.2/boundary-requests" && upper === "POST") return "child";

  return null;
}

export function clearBackendSessionToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BACKEND_SESSION_KEYS.child);
    window.localStorage.removeItem(BACKEND_SESSION_KEYS.guardian);
    window.localStorage.removeItem(BACKEND_ACTIVE_ROLE_KEY);
    // Clean up the pre-role-split key if it exists from an older deployment.
    window.localStorage.removeItem("cresco-keys-session-v1");
  } catch {
    // Demo session cleanup is best-effort.
  }
}

/** Test hook: override env-derived config. Pass null to reset. */
export function configureKeysBackend(next: Partial<KeysConfig> | null) {
  override = next;
}

export function keysConfig(): KeysConfig {
  const productionFallback =
    process.env.NODE_ENV === "production" ? PUBLIC_HOSTED_KEYS_API : "";

  const url = (
    override?.url ??
    process.env.NEXT_PUBLIC_KEYS_API_URL ??
    productionFallback
  ).replace(/\/$/, "");

  const envExecution = process.env.NEXT_PUBLIC_KEYS_EXECUTION;
  const execution =
    override?.execution ??
    (envExecution
      ? envExecution === "runtime"
        ? "runtime"
        : "demo"
      : productionFallback
        ? "runtime"
        : "demo");

  return {
    url,
    execution: url ? execution : "demo",
    timeoutMs: override?.timeoutMs ?? 8000,
  };
}

export function keysBackendConfigured() {
  return keysConfig().url.length > 0;
}

export function keysRuntimeExecutionEnabled() {
  return keysConfig().execution === "runtime";
}

/** Base URL for display (technical details). */
export function keysApiUrl() {
  return keysConfig().url;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = backendSessionToken(
    requiredRoleForRequest(path, init?.method ?? "GET"),
  );
  const res = await fetch(`${keysConfig().url}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(keysConfig().timeoutMs),
  });
  if (!res.ok) throw new Error(`KEYS backend ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

export type KeysCapabilities = {
  contractVersion: string;
  mode: string;
  marketEvidence: { status: string };
  v2?: { status: string; realMinorSecuritiesExecution: boolean };
};

export function fetchCapabilities() {
  return request<KeysCapabilities>("/api/v0.1/capabilities");
}

export type DevnetDemoRuntime = {
  contractVersion: "0.2";
  type: "V0_2_DEVNET_DEMO_RUNTIME";
  mode: "SERVER_HELD_DEVNET_DEMO";
  network: "solana-devnet";
  asset: "AAPL";
  programId: string;
  mandateAddress: string;
  mandate: {
    status: "ACTIVE" | "NOT_ACTIVE";
    stage: number;
    version: number;
    nonce: number;
    maxActionNotionalMicroUsd: number;
    maxPeriodNotionalMicroUsd: number;
  };
  truthBoundary: {
    executionAsset: "DEMO_TOKEN";
    serverHeldDemoSigner: true;
    realMinorSecuritiesExecution: false;
    brokerageOrCustody: false;
  };
};

/** Current server-held AAPL devnet proof lane. Never authority by itself. */
export function fetchDevnetDemoRuntime() {
  return request<DevnetDemoRuntime>("/api/v0.2/demo/runtime");
}

export type CurrentMandateResponse = {
  contractVersion: "0.2";
  type: "V0_2_CURRENT_MANDATE";
  mandate: CurrentMandate;
  assetRule: AssetRule;
  source: string;
};

export function fetchCurrentMandate() {
  return request<CurrentMandateResponse>("/api/v0.2/mandates/current");
}

export function transitionCurrentMandate(input: {
  expectedNonce: number;
  changes: Partial<
    Pick<
      CurrentMandate,
      "maxActionNotional" | "maxPeriodNotional" | "allowedAssets" | "status"
    >
  >;
}) {
  return request<{
    mandate: CurrentMandate;
    proof: {
      network: "solana-devnet";
      signatures: string[];
      programId: string;
      simulated: false;
    };
  }>("/api/v0.2/mandates/transition", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createPersistentBoundaryRequest(input: {
  mandate: CurrentMandate;
  evaluation: ActionEvaluation;
  asset: string;
  type: string;
  amount: number;
  reason: string;
}) {
  return request<BoundaryRequest>("/api/v0.2/boundary-requests", {
    method: "POST",
    body: JSON.stringify({
      asset: input.asset,
      type: input.type,
      notional: input.amount,
      reason: input.reason,
      evaluation: input.evaluation,
      expectedNonce: input.mandate.nonce,
    }),
  });
}

export function fetchPersistentBoundaryRequests(status?: string) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ requests: BoundaryRequest[] }>(
    `/api/v0.2/boundary-requests${suffix}`,
  );
}

export function decidePersistentBoundaryRequest(input: {
  requestId: string;
  decision: GuardianDecision;
  note?: string;
  newLimits?: { maxActionNotional: number; maxPeriodNotional: number };
}) {
  return request<{ request: BoundaryRequest; mandate: CurrentMandate }>(
    `/api/v0.2/boundary-requests/${input.requestId}/decision`,
    {
      method: "POST",
      body: JSON.stringify({
        decision: input.decision,
        note: input.note,
        newLimits: input.newLimits,
      }),
    },
  );
}

export function addDevnetTestFunds(amount: number) {
  return request<{
    status: "DEVNET_TEST_CREDITED";
    amount: number;
    availableBalance: number;
    realPaymentTaken: false;
  }>("/api/v0.2/funding/deposits", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export async function createBackendDemoSession(
  role: Session["role"],
  displayName: string,
): Promise<Session> {
  const backendRole = role === "parent" ? "guardian" : "child";
  const result = await request<{
    role: "guardian" | "child";
    displayName: string;
    token: string;
  }>("/api/v0.2/auth/demo-session", {
    method: "POST",
    body: JSON.stringify({ role: backendRole, displayName }),
  });
  saveBackendSessionToken(result.token, backendRole);
  return {
    role: result.role === "guardian" ? "parent" : "child",
    displayName: result.displayName,
    kind: "demo",
  };
}

export function linkBackendFamily(code: string) {
  return request<{ linked: boolean; familyId: string | null }>(
    "/api/v0.2/family/link",
    {
      method: "POST",
      body: JSON.stringify({ code }),
    },
  );
}

export function fetchFamilyState() {
  return request<{
    profile: {
      childName: string;
      parentName: string;
      parentLinked: boolean;
    };
    mandate: CurrentMandate;
    balances: { money: number; practice: number };
    moneyHoldings: { ticker: string; shares: number; costBasis: number }[];
    requests: BoundaryRequest[];
    learning: {
      completedLessons: string[];
      xp: number;
      weeklyMinutes: { at: string; minutes: number }[];
    };
  }>("/api/v0.2/family/state");
}

export function persistLearningProgress(input: {
  lessonId: string;
  xp?: number;
  minutes?: number;
  researchedCompany?: string;
}) {
  return request<{
    learning: {
      completedLessons: string[];
      xp: number;
      weeklyMinutes: { at: string; minutes: number }[];
    };
    authorityEffect: "NONE";
  }>("/api/v0.2/learning/progress", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchLearningSummary() {
  return request<{
    completedLessons: string[];
    xp: number;
    weeklyMinutes: { at: string; minutes: number }[];
    authorityEffect: "NONE";
  }>("/api/v0.2/learning/summary");
}

export function fetchMoneyPortfolio() {
  return request<{
    balance: number;
    holdings: { ticker: string; shares: number; costBasis: number }[];
    activity: unknown[];
  }>("/api/v0.2/portfolio?mode=money");
}

export type BackendMarketQuote = {
  symbol: string;
  tokenizedSymbol?: string;
  source: "PYTH_PRO";
  feedId?: number;
  status: "FRESH" | "STALE" | "UNAVAILABLE";
  price?: number | null;
  publishTime?: string | null;
  confidenceBps?: number | null;
  reasonCode?: string | null;
};

export function fetchMarketQuotes(symbols: string[]) {
  const query = encodeURIComponent(symbols.join(","));
  return request<{
    contractVersion: "0.2";
    type: "V0_2_MARKET_QUOTES";
    quotes: BackendMarketQuote[];
  }>(`/api/v0.2/market/quotes?symbols=${query}`);
}

export function fetchMarketSeries(symbol: string, period: string) {
  return request<{
    contractVersion: "0.2";
    type: "V0_2_MARKET_SERIES";
    symbol: string;
    period: string;
    status: "FRESH" | "STALE" | "UNAVAILABLE";
    points: { t: number; v: number }[];
    reasonCode?: string;
  }>(
    `/api/v0.2/market/series?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}`,
  );
}

export type TesseraRepresentation = {
  source: "TESSERA";
  id: string;
  code: string;
  symbol: string;
  name: string;
  sector?: string | null;
  underlyingCompany: string;
  contractAddress: string;
  tokenStandard: "TOKEN_2022";
  representation: {
    kind: "LOAN_PARTICIPATION_RIGHT";
    directEquityOwnership: false;
    votingRights: false;
    dividendRights: false;
    jurisdictionRestrictionsApply: true;
  };
  market: {
    status: "AVAILABLE" | "UNAVAILABLE";
    markPrice?: number | null;
    markValuation?: number | null;
    holders?: number | null;
    receivedAt: string;
  };
  eligibility: {
    status: "UNKNOWN" | "ELIGIBLE" | "INELIGIBLE";
    executionEligible: boolean;
    reasonCode?: string | null;
  };
  keysPolicy: {
    practiceAvailable: boolean;
    representationLearningAvailable: boolean;
    executionEligible: boolean;
    moneyModeDefault: "INELIGIBLE";
    authorityEffect: "NONE";
  };
};

export function fetchTesseraRepresentations() {
  return request<{
    contractVersion: "0.2";
    type: "TESSERA_INTEGRATION_CATALOG";
    integration: {
      sponsor: "TESSERA";
      status: "LIVE_PUBLIC_API_INTEGRATED";
      authorityEffect: "NONE";
    };
    assets: TesseraRepresentation[];
  }>("/api/v0.2/integrations/tessera");
}

type LiveProof = {
  scenario?: { asset?: string };
  evaluation?: {
    marketEvidence?: { status?: string; price?: number; publishTime?: string; source?: string };
  };
};

/** Returns a live Pyth price for the backend's configured demo equity, or null. */
export async function fetchLiveEquityPrice(): Promise<{ ticker: string; price: number; asOf: string } | null> {
  const proof = await request<LiveProof>("/api/v0.1/demo/live-proof");
  const evidence = proof.evaluation?.marketEvidence;
  const ticker = proof.scenario?.asset;
  if (!ticker || evidence?.status !== "FRESH" || typeof evidence.price !== "number") return null;
  return { ticker, price: evidence.price, asOf: evidence.publishTime ?? new Date().toISOString() };
}

type BackendEvaluation = {
  decision: ActionEvaluation["decision"];
  reasonCode: ReasonCode;
  requestedNotional?: number;
  standingLimit?: number;
  remainingPeriodNotional?: number;
  boundaryRequestAvailable?: boolean;
  guardianApprovalRequired?: boolean;
  mandateVersion?: number;
  mandateNonce?: number;
};

export async function evaluateAction(input: {
  mandate: CurrentMandate;
  assetRule: AssetRule | null;
  asset: string;
  type: string;
  notional: number;
}): Promise<ActionEvaluation> {
  const body = {
    action: {
      asset: input.asset,
      type: input.type,
      amount: input.notional,
      notional: input.notional,
      expectedNonce: input.mandate.nonce,
    },
  };
  const result = await request<BackendEvaluation>("/api/v0.2/actions/evaluate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { ...result, source: "keys-backend" };
}

/* ------------------------------------------------------------------ */
/* Execute (frozen v0.2 technical proof route)                         */
/* ------------------------------------------------------------------ */

/** Request body for POST /api/v0.2/actions/execute. */
export type ExecuteRequest = {
  asset: string;
  type: string;
  notional: number;
  expectedNonce: number;
  idempotencyKey: string;
  /** Present when a guardian ALLOW_ONCE covers this action. Server verifies it. */
  allowOnceRequestId?: string;
};

/** Response body for POST /api/v0.2/actions/execute (HTTP 200 for every policy outcome). */
export type ExecuteResponse = {
  contractVersion: string;
  evaluation: BackendEvaluation;
  executionProof: null | {
    status: "CONFIRMED" | "PENDING";
    network: "solana-devnet";
    signature?: string;
    programId: string;
    mandateVersion: number;
    mandateNonce: number;
    executedAt: string;
    idempotencyKey: string;
    simulated: boolean;
  };
};

export type ExecuteResult = {
  outcome: ExecutionOutcome;
  evaluation: ActionEvaluation;
  proof?: ExecutionProof;
  /** Why the outcome is UNKNOWN (for logs / transaction details). */
  detail?: string;
};

const DECISIONS: Decision[] = ["ALLOW", "ESCALATE", "REFUSE"];

function unknown(detail: string): ExecuteResult {
  return {
    outcome: "UNKNOWN",
    evaluation: { decision: "REFUSE", reasonCode: "EXECUTION_UNCONFIRMED", source: "keys-runtime" },
    detail,
  };
}

/** Strict shape check: a malformed success must never be shown as success. */
function parseExecuteResponse(raw: unknown, idempotencyKey: string): ExecuteResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<ExecuteResponse>;
  const e = r.evaluation;
  if (!e || !DECISIONS.includes(e.decision) || typeof e.reasonCode !== "string") return null;
  const evaluation: ActionEvaluation = { ...e, source: "keys-runtime" };

  if (e.decision !== "ALLOW") {
    return { outcome: "REFUSED", evaluation };
  }

  const p = r.executionProof;
  if (!p || (p.status !== "CONFIRMED" && p.status !== "PENDING")) return null;
  if (p.idempotencyKey !== idempotencyKey) return null;
  if (p.status === "CONFIRMED" && (typeof p.signature !== "string" || p.signature.length < 32)) return null;
  if (typeof p.simulated !== "boolean" || typeof p.programId !== "string") return null;

  const proof: ExecutionProof = {
    status: p.status === "CONFIRMED" ? "RUNTIME_CONFIRMED" : "RUNTIME_PENDING",
    network: p.network,
    signature: p.signature,
    programId: p.programId,
    mandateVersion: p.mandateVersion,
    mandateNonce: p.mandateNonce,
    executedAt: p.executedAt,
    simulated: p.simulated,
    idempotencyKey: p.idempotencyKey,
  };
  return { outcome: p.status === "CONFIRMED" ? "EXECUTED" : "PENDING", evaluation, proof };
}

/**
 * Execute (or re-check) one user intent. Safe to call repeatedly with the
 * same idempotency key: the runtime returns the original result.
 *
 * - 200 + REFUSE/ESCALATE → REFUSED (nothing happened)
 * - 200 + ALLOW + CONFIRMED → EXECUTED
 * - 200 + ALLOW + PENDING → PENDING
 * - 400/401/403/409/422 → REFUSED as DECISION_UNAVAILABLE (request rejected before execution)
 * - timeout, network error, 5xx, malformed body → UNKNOWN (may have executed)
 */
export async function executeAction(body: ExecuteRequest): Promise<ExecuteResult> {
  let res: Response;
  try {
    res = await fetch(`${keysConfig().url}/api/v0.2/actions/execute`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": body.idempotencyKey,
        ...(backendSessionToken("child")
          ? { authorization: `Bearer ${backendSessionToken("child")}` }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(keysConfig().timeoutMs),
    });
  } catch {
    return unknown("network-or-timeout");
  }

  if (res.status >= 500) return unknown(`http-${res.status}`);
  if (!res.ok) {
    return {
      outcome: "REFUSED",
      evaluation: { decision: "REFUSE", reasonCode: res.status === 409 ? "STALE_NONCE" : "DECISION_UNAVAILABLE", source: "keys-runtime" },
    };
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return unknown("malformed-json");
  }
  return parseExecuteResponse(raw, body.idempotencyKey) ?? unknown("malformed-shape");
}

export function buildExecuteRequest(input: {
  mandate: CurrentMandate;
  assetRule: AssetRule | null;
  asset: string;
  type: string;
  notional: number;
  idempotencyKey: string;
  allowOnceRequestId?: string;
}): ExecuteRequest {
  return {
    asset: input.asset,
    type: input.type,
    notional: input.notional,
    expectedNonce: input.mandate.nonce,
    idempotencyKey: input.idempotencyKey,
    allowOnceRequestId: input.allowOnceRequestId,
  };
}

export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
