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

type KeysConfig = {
  url: string;
  execution: "demo" | "runtime";
  /** Reads. */
  timeoutMs: number;
  /**
   * Calls that submit a Solana Devnet transaction (execute, Mandate transition,
   * guardian decisions). Aborting these early can interrupt the backend between
   * the on-chain commit and its bookkeeping, so they get a long timeout.
   */
  chainTimeoutMs: number;
};

const PUBLIC_HOSTED_KEYS_API =
  "https://keys-api-stocklana.faadil-casecraft.workers.dev";

let override: Partial<KeysConfig> | null = null;

type BackendRole = "child" | "guardian";

const BACKEND_SESSION_KEYS: Record<BackendRole, string> = {
  child: "cresco-keys-session-child-v1",
  guardian: "cresco-keys-session-guardian-v1",
};
const BACKEND_ACTIVE_ROLE_KEY = "cresco-keys-session-active-role-v1";
const BACKEND_NAME_KEYS: Record<BackendRole, string> = {
  child: "cresco-keys-session-child-name-v1",
  guardian: "cresco-keys-session-guardian-name-v1",
};
const DEFAULT_NAMES: Record<BackendRole, string> = { child: "Alex", guardian: "Sam" };

/** Error with the HTTP status so the UI can tell auth, offline and server faults apart. */
export class KeysApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "KeysApiError";
  }
}

export function isAuthError(e: unknown) {
  return e instanceof KeysApiError && (e.status === 401 || e.status === 403);
}

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

function saveBackendSessionToken(token: string, role: BackendRole, displayName?: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKEND_SESSION_KEYS[role], token);
    window.localStorage.setItem(BACKEND_ACTIVE_ROLE_KEY, role);
    if (displayName) window.localStorage.setItem(BACKEND_NAME_KEYS[role], displayName);
  } catch {
    // Storage may be unavailable; the current call still completed safely.
  }
}

function dropBackendSessionToken(role: BackendRole) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BACKEND_SESSION_KEYS[role]);
  } catch {
    /* best effort */
  }
}

function storedName(role: BackendRole) {
  if (typeof window === "undefined") return DEFAULT_NAMES[role];
  try {
    return window.localStorage.getItem(BACKEND_NAME_KEYS[role]) || DEFAULT_NAMES[role];
  } catch {
    return DEFAULT_NAMES[role];
  }
}

/** Which demo session GET requests should use (the view the user is in). */
export function setActiveBackendRole(role: BackendRole) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKEND_ACTIVE_ROLE_KEY, role);
  } catch {
    /* best effort */
  }
}

export function activeBackendRole(): BackendRole | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(BACKEND_ACTIVE_ROLE_KEY) as BackendRole | null;
  } catch {
    return null;
  }
}

export function hasBackendSession(role: BackendRole) {
  return !!backendSessionToken(role);
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
    timeoutMs: override?.timeoutMs ?? 12_000,
    chainTimeoutMs: override?.chainTimeoutMs ?? 60_000,
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

function isChainWrite(path: string, method = "GET") {
  if (method.toUpperCase() !== "POST") return false;
  return (
    path === "/api/v0.2/actions/execute" ||
    path === "/api/v0.2/mandates/transition" ||
    /\/api\/v0\.2\/boundary-requests\/[^/]+\/decision$/.test(path)
  );
}

async function send(path: string, init: RequestInit | undefined, token: string | null) {
  const cfg = keysConfig();
  return fetch(`${cfg.url}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(isChainWrite(path, init?.method) ? cfg.chainTimeoutMs : cfg.timeoutMs),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const role = requiredRoleForRequest(path, init?.method ?? "GET") ?? activeBackendRole();
  let res = await send(path, init, backendSessionToken(role));

  // Demo sessions are temporary. On an expired/missing session, mint a fresh
  // role-scoped demo session once and retry. Never retried for the session route itself.
  if (res.status === 401 && role && path !== "/api/v0.2/auth/demo-session") {
    dropBackendSessionToken(role);
    await createDemoSessionFor(role, storedName(role));
    res = await send(path, init, backendSessionToken(role));
  }

  if (!res.ok) {
    let code: string | undefined;
    try {
      code = ((await res.json()) as { error?: string })?.error;
    } catch {
      /* no body */
    }
    throw new KeysApiError(`KEYS backend ${path} responded ${res.status}`, res.status, code);
  }
  return (await res.json()) as T;
}

async function createDemoSessionFor(role: BackendRole, displayName: string) {
  const res = await send(
    "/api/v0.2/auth/demo-session",
    { method: "POST", body: JSON.stringify({ role, displayName }) },
    null,
  );
  if (!res.ok) throw new KeysApiError("Could not start a demo session", res.status);
  const result = (await res.json()) as { token: string; displayName: string; role: BackendRole };
  saveBackendSessionToken(result.token, role, result.displayName);
  return result;
}

/**
 * Make sure a role-scoped KEYS demo session exists (hackathon auth, not
 * identity/KYC). Used on bootstrap so a visitor who lands on any page gets
 * backend truth instead of local defaults.
 */
export async function ensureBackendSession(role: BackendRole, displayName?: string) {
  if (!backendSessionToken(role)) await createDemoSessionFor(role, displayName ?? storedName(role));
  setActiveBackendRole(role);
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
  assetRule?: {
    address: string;
    mint: string;
    enabled: boolean;
    pythFeedId: number;
    spentThisPeriodNotionalMicroUsd: number;
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
  const result = await createDemoSessionFor(backendRole, displayName);
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
    activity?: BackendActivity[];
    familyCode?: string;
    /** In-flight executions the family ledger is holding against balance and period. */
    reservations?: Record<string, { notional: number; asset: string; createdAt: string }>;
    /** Newer backends: explicit Practice (Devnet) namespace with chain-authoritative period. */
    practice?: PracticeNamespace;
    /** Newer backends: Money (Mainnet) namespace. SETUP_REQUIRED today. */
    money?: { network: "solana-mainnet"; realValue: true; status: string; balance: number | null; requirements?: string[] };
  }>("/api/v0.2/family/state");
}

export type PracticePeriod = {
  source: "SOLANA_DEVNET_ASSET_RULE" | "FAMILY_LEDGER_ONLY";
  startedAt: string | null;
  seconds: number | null;
  resetsAt?: string | null;
  onChainSpent: number | null;
  ledgerSpent: number;
  held: number;
  maxPeriod: number;
  remaining: number;
};

export type PracticeNamespace = {
  mode: "practice";
  network: "solana-devnet";
  realValue: false;
  programId: string;
  capital: "DEMO_TOKEN";
  balance: number;
  availableBalance: number;
  holdings: { ticker: string; shares: number; costBasis: number }[];
  period: PracticePeriod;
}

/** A confirmed Money execution as recorded by the Family Durable Object. */
export type BackendActivity = {
  id: string;
  kind: string;
  mode?: "practice";
  network?: "solana-devnet";
  realValue?: false;
  ticker: string;
  amount: number;
  shares: number;
  createdAt: string;
  proof?: RawExecutionProof;
};

export type FamilyState = Awaited<ReturnType<typeof fetchFamilyState>>;

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
    /** History is AVAILABLE/UNAVAILABLE; FRESH/STALE kept for older deployments. */
    status: "AVAILABLE" | "FRESH" | "STALE" | "UNAVAILABLE";
    source?: "PYTH_PRO_HISTORY";
    feedId?: number;
    resolution?: string;
    points: { t: number; v: number }[];
    reasonCode?: string | null;
  }>(
    `/api/v0.2/market/series?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}`,
  );
}

export type PythDiscoveryFeed = {
  marketClass: string;
  symbol: string;
  displaySymbol: string;
  description?: string | null;
  feedId: number;
  entitlementStatus: "ACCESSIBLE" | "UNAVAILABLE";
  priceStatus: "FRESH" | "STALE" | "UNAVAILABLE";
  price?: number | null;
  publishTime?: string | null;
  marketSession?: string | null;
  reasonCode?: string | null;
  productMode: "PRIMARY_MONEY_PROOF" | "LEARN_PRACTICE_ONLY";
  moneyExecutionProven: boolean;
  authorityEffect: "NONE";
};

export type PythMarketClass = {
  id: string;
  label: string;
  learningAngle: string;
  catalogStatus: "AVAILABLE" | "UNAVAILABLE";
  catalogFeedCount: number;
  accessibleFeedCount: number;
  feeds: PythDiscoveryFeed[];
};

export function fetchPythMarketDiscovery() {
  return request<{
    contractVersion: "0.2";
    type: "V0_2_MARKET_DISCOVERY";
    source: "PYTH_PRO";
    status: "AVAILABLE";
    primaryMoneyAsset: "AAPL";
    primaryMoneySymbol: "Equity.US.AAPL/USD";
    classes: PythMarketClass[];
    truthBoundary: {
      catalogPresenceDoesNotImplyEntitlement: true;
      entitlementDoesNotImplyMoneyExecution: true;
      onlyAaplMoneyExecutionProven: true;
      marketEvidenceAuthorityEffect: "NONE";
    };
  }>("/api/v0.2/market/discovery");
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

export function fetchTesseraRepresentation(asset: string) {
  return request<{ contractVersion: "0.2"; type: "TESSERA_INTEGRATION_ASSET"; asset: TesseraRepresentation }>(
    `/api/v0.2/integrations/tessera/${encodeURIComponent(asset)}`,
  );
}

export type PreStocksRepresentation = {
  source: "PRESTOCKS";
  sourceUrl: string;
  network: "solana-mainnet";
  symbol: string;
  name: string;
  contractAddress: string;
  productUrl: string;
  representation: {
    kind: "PRE_IPO_ECONOMIC_EXPOSURE";
    directEquityOwnership: false;
    votingRights: false;
    dividendRights: false;
    informationRights: false;
  };
  market: {
    status: "AVAILABLE" | "UNAVAILABLE";
    markPrice?: number | null;
    markValuation?: number | null;
    tokenPrice?: number | null;
    impliedValuation?: number | null;
    premiumDiscountPct?: number | null;
    supply?: number | null;
    receivedAt: string;
  };
  eligibility: { status: "UNKNOWN" | "ELIGIBLE" | "INELIGIBLE"; executionEligible: boolean; reasonCode?: string | null };
  keysPolicy: { practiceAvailable: boolean; executionEligible: boolean; authorityEffect: "NONE"; rule?: string };
};

export function fetchPreStocks() {
  return request<{
    contractVersion: "0.2";
    type: "PRESTOCKS_INTEGRATION_CATALOG";
    integration: { sponsor: "PRESTOCKS"; status: string; authorityEffect: "NONE"; executionDefault: string };
    assets: PreStocksRepresentation[];
  }>("/api/v0.2/integrations/prestocks");
}

export function fetchPreStock(symbol: string) {
  return request<{ contractVersion: "0.2"; type: "PRESTOCKS_INTEGRATION_ASSET"; asset: PreStocksRepresentation }>(
    `/api/v0.2/integrations/prestocks/${encodeURIComponent(symbol)}`,
  );
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
  /** Frozen contract integer units (the on-chain path reports these). */
  requestedNotionalMicroUsd?: number;
  standingLimitMicroUsd?: number;
  remainingPeriodNotionalMicroUsd?: number;
  boundaryRequestAvailable?: boolean;
  guardianApprovalRequired?: boolean;
  mandateVersion?: number;
  mandateNonce?: number;
};

const fromMicro = (v?: number | null) => (typeof v === "number" && Number.isFinite(v) ? v / 1_000_000 : undefined);

/** Accept both dollar and micro-USD fields; the UI always works in dollars. */
export function normalizeEvaluation(e: BackendEvaluation, source: ActionEvaluation["source"]): ActionEvaluation {
  return {
    decision: e.decision,
    reasonCode: e.reasonCode,
    requestedNotional: e.requestedNotional ?? fromMicro(e.requestedNotionalMicroUsd),
    standingLimit: e.standingLimit ?? fromMicro(e.standingLimitMicroUsd),
    remainingPeriodNotional: e.remainingPeriodNotional ?? fromMicro(e.remainingPeriodNotionalMicroUsd),
    boundaryRequestAvailable: e.boundaryRequestAvailable,
    guardianApprovalRequired: e.guardianApprovalRequired,
    mandateVersion: e.mandateVersion,
    mandateNonce: e.mandateNonce,
    source,
  };
}

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
  return normalizeEvaluation(result, "keys-backend");
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
export type RawExecutionProof = {
  status: "CONFIRMED" | "PENDING";
  network: "solana-devnet";
  signature?: string;
  programId: string;
  mandateAddress?: string;
  mandateVersion: number;
  mandateNonce: number;
  executedAt: string;
  idempotencyKey: string;
  simulated: boolean;
  executionAsset?: string;
  pyth?: {
    source?: string;
    feedId?: number;
    verification?: string;
    status?: string;
    unitPriceMicroUsd?: number;
    publishTime?: string;
    authorityEffect?: "NONE";
  } | null;
};

export type ExecuteResponse = {
  contractVersion: string;
  evaluation: BackendEvaluation;
  executionProof: null | RawExecutionProof;
};

/** Normalize a backend proof (execute response or Family activity) for the UI. */
export function toExecutionProof(p: RawExecutionProof): ExecutionProof {
  return {
    status: p.status === "CONFIRMED" ? "RUNTIME_CONFIRMED" : "RUNTIME_PENDING",
    network: p.network,
    signature: p.signature,
    programId: p.programId,
    mandateAddress: p.mandateAddress,
    mandateVersion: p.mandateVersion,
    mandateNonce: p.mandateNonce,
    executedAt: p.executedAt,
    simulated: p.simulated,
    idempotencyKey: p.idempotencyKey,
    executionAsset: p.executionAsset,
    pyth: p.pyth
      ? {
          status: p.pyth.status,
          feedId: p.pyth.feedId,
          verification: p.pyth.verification,
          unitPrice: typeof p.pyth.unitPriceMicroUsd === "number" ? p.pyth.unitPriceMicroUsd / 1_000_000 : undefined,
          publishTime: p.pyth.publishTime,
        }
      : undefined,
  };
}

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
  const evaluation = normalizeEvaluation(e, "keys-runtime");

  if (e.decision !== "ALLOW") {
    return { outcome: "REFUSED", evaluation };
  }

  const p = r.executionProof;
  if (!p || (p.status !== "CONFIRMED" && p.status !== "PENDING")) return null;
  if (p.idempotencyKey !== idempotencyKey) return null;
  if (p.status === "CONFIRMED" && (typeof p.signature !== "string" || p.signature.length < 32)) return null;
  if (typeof p.simulated !== "boolean" || typeof p.programId !== "string") return null;

  const proof = toExecutionProof(p);
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
  const post = () =>
    send(
      "/api/v0.2/actions/execute",
      { method: "POST", headers: { "idempotency-key": body.idempotencyKey }, body: JSON.stringify(body) },
      backendSessionToken("child"),
    );
  let res: Response;
  try {
    res = await post();
    // An expired demo session was rejected before any execution: renew and retry the same key.
    if (res.status === 401) {
      dropBackendSessionToken("child");
      await createDemoSessionFor("child", storedName("child"));
      res = await post();
    }
  } catch {
    return unknown("network-or-timeout");
  }

  if (res.status >= 500 || res.status === 429) return unknown(`http-${res.status}`);
  if (res.status === 400) {
    // The runtime reports upstream faults (e.g. Solana RPC 429) as 400. Those are
    // not policy refusals: keep the intent re-checkable with the same key.
    let body: { error?: string; message?: string } | null = null;
    try {
      body = (await res.clone().json()) as { error?: string; message?: string };
    } catch {
      /* no body */
    }
    if (/429|rate|backend error|timeout|fetch failed|unavailable|blockhash/i.test(`${body?.message ?? ""}`)) {
      return unknown("upstream-busy");
    }
  }
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
