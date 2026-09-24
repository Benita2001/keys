/**
 * KEYS backend adapter (repository root: src/http-api.mjs).
 *
 * Configuration (build-time public env; no secrets ever live here):
 *   NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8787   KEYS API base URL
 *   NEXT_PUBLIC_KEYS_EXECUTION=runtime                 use the execute route
 *
 * Routes used:
 *   GET  /api/v0.1/capabilities                 (exists)
 *   GET  /api/v0.1/demo/live-proof              (exists) live Pyth AAPL evidence if configured
 *   POST /api/v0.2/actions/evaluate             (frozen) ALLOW / REFUSE
 *   GET  /api/v0.2/demo/runtime                 (implemented) stable devnet demo runtime metadata
 *   POST /api/v0.2/actions/execute              (implemented) real devnet demo-token execution bridge
 *
 * The real execution bridge is intentionally scoped to the server-held TSLA
 * devnet proof lane. Other Cresco assets remain on the product/demo path until
 * their own runtime representation is proven.
 */
import type {
  ActionEvaluation,
  AssetRule,
  CurrentMandate,
  Decision,
  ExecutionOutcome,
  ExecutionProof,
  ReasonCode,
} from "@/domain/types";

type KeysConfig = { url: string; execution: "demo" | "runtime"; timeoutMs: number };

let override: Partial<KeysConfig> | null = null;

/** Test hook: override env-derived config. Pass null to reset. */
export function configureKeysBackend(next: Partial<KeysConfig> | null) {
  override = next;
}

export function keysConfig(): KeysConfig {
  const url = (override?.url ?? process.env.NEXT_PUBLIC_KEYS_API_URL ?? "").replace(/\/$/, "");
  const execution = override?.execution ?? (process.env.NEXT_PUBLIC_KEYS_EXECUTION === "runtime" ? "runtime" : "demo");
  return { url, execution: url ? execution : "demo", timeoutMs: override?.timeoutMs ?? 8000 };
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
  const res = await fetch(`${keysConfig().url}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
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

function draftMandate(m: CurrentMandate) {
  return { status: m.status, version: m.version, nonce: m.nonce, expiresAt: m.expiresAt };
}

export async function evaluateAction(input: {
  mandate: CurrentMandate;
  assetRule: AssetRule | null;
  asset: string;
  type: string;
  notional: number;
}): Promise<ActionEvaluation> {
  const body = {
    mandate: draftMandate(input.mandate),
    assetRule: input.assetRule,
    action: { asset: input.asset, type: input.type, amount: input.notional, notional: input.notional },
  };
  const result = await request<BackendEvaluation>("/api/v0.2/actions/evaluate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { ...result, source: "keys-backend" };
}

/* ------------------------------------------------------------------ */
/* Execute (proposed v0.2 route)                                       */
/* ------------------------------------------------------------------ */

/** Request body for POST /api/v0.2/actions/execute. */
export type ExecuteRequest = {
  asset: string;
  type: string;
  notional: number;
  expectedNonce: number;
  idempotencyKey: string;
  /** Present when a guardian ALLOW_ONCE covers this action. Server must verify it. */
  allowOnceRequestId?: string;
  /**
   * DRAFT ONLY. Until the server owns the delegate's Mandate (handoff §3.4),
   * the client sends it so the runtime can evaluate. The final route must
   * ignore this and load the Mandate from the session.
   */
  draft?: { mandate: ReturnType<typeof draftMandate>; assetRule: AssetRule | null };
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
      headers: { "content-type": "application/json", "idempotency-key": body.idempotencyKey },
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
    draft: { mandate: draftMandate(input.mandate), assetRule: input.assetRule },
  };
}

export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
