/**
 * Service registry. Today every service is a demo implementation over local
 * state, with the KEYS backend used for Money-mode decisions and live TSLA
 * evidence when NEXT_PUBLIC_KEYS_API_URL is configured.
 */
import { assetRuleFor, evaluateBoundedAction } from "@/domain/policy";
import type {
  ActionEvaluation,
  BoundaryRequest,
  CurrentMandate,
  ExecutionResult,
  MarketAsset,
  Period,
} from "@/domain/types";
import { EXPLORE_ORDER, MOCK_ASSETS, sampleSeries } from "@/mocks/market";
import {
  evaluateAction,
  fetchLiveEquityPrice,
  keysBackendConfigured,
  keysRuntimeExecutionEnabled,
} from "./keys-backend";
import type {
  AuthService,
  BoundaryRequestService,
  Capabilities,
  FundingService,
  MandateService,
  MarketDataService,
  MoneyActionInput,
  MoneyExecutionService,
  PracticeExecutionService,
} from "./types";

/* ------------------------------------------------------------------ */
/* Demo controls (used by Profile → About → Demo controls)             */
/* ------------------------------------------------------------------ */

export type DemoFlags = {
  marketFailure: boolean;
  slowNetwork: boolean;
};

const flags: DemoFlags = { marketFailure: false, slowNetwork: false };

export function setDemoFlags(next: Partial<DemoFlags>) {
  Object.assign(flags, next);
}

function latency(base = 280) {
  const ms = flags.slowNetwork ? base * 8 : base;
  return new Promise((r) => setTimeout(r, ms));
}

export function getCapabilities(): Capabilities {
  const backend = keysBackendConfigured();
  const runtime = keysRuntimeExecutionEnabled();
  return {
    backend: backend ? "keys-v0.2-frozen" : "none",
    marketData: backend ? "mock-with-live-tsla" : "mock",
    // The Family product lane remains demo/policy-only. A configured runtime
    // enables only the isolated TSLA technical proof lane.
    moneyMode: "demo",
    funding: "demo",
    auth: "demo",
    execution: runtime ? "keys-runtime" : "demo-not-executed",
  };
}

/* ------------------------------------------------------------------ */
/* Market data                                                         */
/* ------------------------------------------------------------------ */

let liveOverlay: Promise<Awaited<ReturnType<typeof fetchLiveEquityPrice>>> | null = null;

async function withLiveOverlay(assets: MarketAsset[]): Promise<MarketAsset[]> {
  if (!keysBackendConfigured()) return assets;
  liveOverlay ??= fetchLiveEquityPrice().catch(() => null);
  const live = await liveOverlay;
  if (!live) return assets;
  return assets.map((a) =>
    a.ticker === live.ticker
      ? { ...a, price: live.price, priceSource: "pyth", dataStatus: "live", asOf: live.asOf }
      : a,
  );
}

export const marketData: MarketDataService = {
  async listAssets() {
    await latency();
    if (flags.marketFailure) throw new Error("Market data unavailable");
    const ordered = EXPLORE_ORDER.map((t) => MOCK_ASSETS.find((a) => a.ticker === t)!);
    return withLiveOverlay(ordered);
  },
  async getAsset(ticker) {
    const all = await this.listAssets();
    return all.find((a) => a.ticker === ticker.toUpperCase()) ?? null;
  },
  async getSeries(ticker, period) {
    await latency(160);
    if (flags.marketFailure) throw new Error("Market data unavailable");
    const asset = MOCK_ASSETS.find((a) => a.ticker === ticker);
    if (!asset) return [];
    return sampleSeries(ticker, asset.price, asset.dayChangePercent, period);
  },
};

/** 1D sample series for list sparklines (sample data, derived from the asset's price). */
export function sparklineFor(asset: MarketAsset) {
  return sampleSeries(asset.ticker, asset.price, asset.dayChangePercent, "1D");
}

/** Synchronous sample series for derived views (e.g. portfolio period change). */
export function seriesFor(asset: MarketAsset, period: Period) {
  return sampleSeries(asset.ticker, asset.price, asset.dayChangePercent, period);
}

/** Synchronous lookup for already-loaded contexts (e.g. portfolio math). */
export function assetSnapshot(ticker: string): MarketAsset | undefined {
  return MOCK_ASSETS.find((a) => a.ticker === ticker);
}

export function allAssetSnapshots(): MarketAsset[] {
  return MOCK_ASSETS;
}

/* ------------------------------------------------------------------ */
/* Practice execution — local only, virtual capital                    */
/* ------------------------------------------------------------------ */

export const practiceExecution: PracticeExecutionService = {
  async buy({ asset, amount, cash }) {
    await latency(420);
    const ok = amount > 0 && amount <= cash;
    const evaluation: ActionEvaluation = {
      decision: ok ? "ALLOW" : "REFUSE",
      reasonCode: ok ? "WITHIN_MANDATE" : amount > cash ? "INSUFFICIENT_BALANCE" : "INVALID_AMOUNT",
      requestedNotional: amount,
      source: "local-preview",
    };
    return {
      ok,
      outcome: ok ? "EXECUTED" : "REFUSED",
      evaluation,
      ticker: asset.ticker,
      amount,
      shares: ok ? amount / asset.price : undefined,
      proof: ok ? { status: "PRACTICE_LOCAL", executedAt: new Date().toISOString() } : undefined,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Money execution — decision from KEYS backend when configured        */
/* ------------------------------------------------------------------ */

function preflight(input: MoneyActionInput): ActionEvaluation | null {
  if (input.asset.moneyModeStatus === "unavailable") {
    return { decision: "REFUSE", reasonCode: "ASSET_UNAVAILABLE", source: "local-preview" };
  }
  return null;
}

function allowOnceCovers(input: MoneyActionInput): boolean {
  const r = input.allowOnce;
  return (
    !!r &&
    r.status === "ALLOWED_ONCE" &&
    r.asset === input.asset.ticker &&
    r.mandateNonce === input.mandate.nonce &&
    input.amount <= r.requestedNotional
  );
}

async function decide(input: MoneyActionInput): Promise<ActionEvaluation> {
  const pre = preflight(input);
  if (pre) return pre;

  let evaluation: ActionEvaluation;
  if (keysBackendConfigured()) {
    try {
      evaluation = await evaluateAction({
        mandate: input.mandate,
        assetRule: input.assetRule,
        asset: input.asset.ticker,
        type: input.type,
        notional: input.amount,
      });
    } catch {
      // Fail closed: an unreachable backend never becomes an ALLOW.
      return { decision: "REFUSE", reasonCode: "DECISION_UNAVAILABLE", source: "keys-backend" };
    }
  } else {
    evaluation = evaluateBoundedAction({
      mandate: input.mandate,
      assetRule: input.assetRule,
      action: { asset: input.asset.ticker, type: input.type, notional: input.amount },
    });
  }

  // A human ALLOW_ONCE covers exactly one limit refusal for the same asset,
  // amount and Mandate nonce. It never changes standing authority.
  if (
    evaluation.decision === "REFUSE" &&
    (evaluation.reasonCode === "MANDATE_LIMIT_EXCEEDED" || evaluation.reasonCode === "PERIOD_LIMIT_EXCEEDED") &&
    allowOnceCovers(input)
  ) {
    evaluation = { ...evaluation, decision: "ALLOW", reasonCode: "WITHIN_MANDATE", guardianApprovalRequired: false };
  }

  if (evaluation.decision === "ALLOW" && input.amount > input.balance) {
    return {
      decision: "REFUSE",
      reasonCode: "INSUFFICIENT_BALANCE",
      requestedNotional: input.amount,
      source: evaluation.source,
    };
  }
  return evaluation;
}

function sharesFor(input: MoneyActionInput) {
  return input.amount / input.asset.price;
}

export const moneyExecution: MoneyExecutionService = {
  async evaluate(input) {
    await latency(200);
    return decide(input);
  },
  async execute(input) {
    await latency(520);
    const evaluation = await decide(input);
    const ok = evaluation.decision === "ALLOW";
    const result: ExecutionResult = {
      ok,
      outcome: ok ? "EXECUTED" : "REFUSED",
      evaluation,
      ticker: input.asset.ticker,
      amount: input.amount,
      shares: ok ? sharesFor(input) : undefined,
      idempotencyKey: input.idempotencyKey,
      // No Money execution runtime is configured. Be explicit.
      proof: ok
        ? {
            status: "DEMO_NOT_EXECUTED",
            mandateVersion: input.mandate.version,
            mandateNonce: input.mandate.nonce,
            executedAt: new Date().toISOString(),
            idempotencyKey: input.idempotencyKey,
          }
        : undefined,
    };
    return result;
  },
};

/* ------------------------------------------------------------------ */
/* Boundary requests + guardian decisions                              */
/* ------------------------------------------------------------------ */

function bumpMandate(mandate: CurrentMandate, changes: Partial<CurrentMandate>): CurrentMandate {
  return {
    ...mandate,
    ...changes,
    version: mandate.version + 1,
    nonce: mandate.nonce + 1,
    updatedAt: new Date().toISOString(),
  };
}

export const boundaryRequests: BoundaryRequestService = {
  async create({ mandate, evaluation, asset, type, amount, reason }) {
    await latency(360);
    const request: BoundaryRequest = {
      id: `br_${Date.now().toString(36)}`,
      status: "PENDING_HUMAN_DECISION",
      mandateVersion: mandate.version,
      mandateNonce: mandate.nonce,
      asset,
      actionType: type,
      requestedNotional: amount,
      standingLimit:
        evaluation.reasonCode === "PERIOD_LIMIT_EXCEEDED" ? mandate.maxPeriodNotional : mandate.maxActionNotional,
      reasonCode: evaluation.reasonCode,
      reason: reason.trim().slice(0, 140),
      createdAt: new Date().toISOString(),
    };
    return request;
  },
  async decide({ request, decision, mandate, newLimits, note }) {
    await latency(360);
    const decidedAt = new Date().toISOString();
    if (decision === "WIDEN_MANDATE") {
      if (!newLimits) throw new Error("newLimits required to widen");
      const next = bumpMandate(mandate, newLimits);
      return { request: { ...request, status: "WIDENED", decidedAt, guardianNote: note }, mandate: next };
    }
    if (decision === "ALLOW_ONCE") {
      return { request: { ...request, status: "ALLOWED_ONCE", decidedAt, guardianNote: note }, mandate };
    }
    return { request: { ...request, status: "REFUSED", decidedAt, guardianNote: note }, mandate };
  },
};

export const mandates: MandateService = {
  async update({ mandate, changes }) {
    await latency(300);
    return bumpMandate(mandate, changes);
  },
};

/* ------------------------------------------------------------------ */
/* Funding + auth — demo only                                          */
/* ------------------------------------------------------------------ */

export const funding: FundingService = {
  async addMoney({ amount }) {
    await latency(500);
    return { status: "DEMO_CREDITED", amount };
  },
};

export const auth: AuthService = {
  async signInDemo(role, displayName) {
    await latency(250);
    return { role, displayName, kind: "demo" };
  },
};

export { assetRuleFor };
