/**
 * KEYS backend adapter (repository root: src/http-api.mjs).
 *
 * Enabled only when NEXT_PUBLIC_KEYS_API_URL is set, e.g.
 *   NEXT_PUBLIC_KEYS_API_URL=http://127.0.0.1:8787   (npm run api at repo root)
 *
 * Routes used (all exist on the backend today):
 *   GET  /api/v0.1/capabilities
 *   GET  /api/v0.1/demo/live-proof          → live Pyth TSLA evidence if configured
 *   POST /api/v0.2/draft/actions/evaluate   → ALLOW / ESCALATE / REFUSE
 *   POST /api/v0.2/draft/boundary-requests  → boundaryRequest envelope
 *
 * The v0.2 contract is DRAFT on the backend. Nothing here executes capital.
 * No secrets are ever sent from or stored in the browser.
 */
import type { ActionEvaluation, AssetRule, CurrentMandate, ReasonCode } from "@/domain/types";

export const KEYS_API_URL = (process.env.NEXT_PUBLIC_KEYS_API_URL ?? "").replace(/\/$/, "");

export const keysBackendConfigured = KEYS_API_URL.length > 0;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${KEYS_API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`KEYS backend ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

export type KeysCapabilities = {
  contractVersion: string;
  mode: string;
  marketEvidence: { status: string };
  v2Draft?: { status: string; realMinorSecuritiesExecution: boolean };
};

export function fetchCapabilities() {
  return request<KeysCapabilities>("/api/v0.1/capabilities");
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

type DraftEvaluation = {
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

export async function evaluateActionDraft(input: {
  mandate: CurrentMandate;
  assetRule: AssetRule | null;
  asset: string;
  type: string;
  notional: number;
}): Promise<ActionEvaluation> {
  const body = {
    mandate: {
      status: input.mandate.status,
      version: input.mandate.version,
      nonce: input.mandate.nonce,
      expiresAt: input.mandate.expiresAt,
    },
    assetRule: input.assetRule,
    action: { asset: input.asset, type: input.type, amount: input.notional, notional: input.notional },
  };
  const result = await request<DraftEvaluation>("/api/v0.2/draft/actions/evaluate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { ...result, source: "keys-backend-draft" };
}
