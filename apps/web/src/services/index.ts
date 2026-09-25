/**
 * Service registry. Today every service is a demo implementation over local
 * state, with the KEYS backend used for Money-mode decisions and fresh Pyth
 * quotes when NEXT_PUBLIC_KEYS_API_URL is configured.
 */
import { assetRuleFor } from "@/domain/policy";
import type {
  ActionEvaluation,
  CurrentMandate,
  ExecutionResult,
  MarketAsset,
  Period,
  PricePoint,
  SeriesResult,
} from "@/domain/types";
import { EXPLORE_ORDER, MOCK_ASSETS, sampleSeries } from "@/mocks/market";
import {
  addDevnetTestFunds,
  buildExecuteRequest,
  createBackendDemoSession,
  createPersistentBoundaryRequest,
  decidePersistentBoundaryRequest,
  evaluateAction,
  executeAction,
  fetchMarketQuotes,
  fetchMarketSeries,
  fetchPreStocks,
  fetchPythMarketDiscovery,
  fetchTesseraRepresentations,
  type PreStocksRepresentation,
  type TesseraRepresentation,
  keysBackendConfigured,
  keysRuntimeExecutionEnabled,
  newIdempotencyKey,
  transitionCurrentMandate,
} from "./keys-backend";
import type {
  AuthService,
  BoundaryRequestService,
  Capabilities,
  FundingService,
  MandateService,
  MarketDataService,
  CrescoExecutionAdapter,
  KeyedActionInput,
  PracticeSandboxService,
} from "./types";
import { MAINNET_ASSETS, PRACTICE_DEVNET, belongsTo, moneyMainnetLive } from "@/domain/network";

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
    marketData: backend ? "mock-with-live-aapl" : "mock",
    practice: backend && runtime ? "devnet-runtime" : "sandbox-only",
    practiceFunding: backend ? "devnet-test" : "none",
    money: moneyMainnetLive() ? "mainnet-live" : "mainnet-setup-required",
    auth: backend ? "backend-demo" : "demo",
  };
}

/* ------------------------------------------------------------------ */
/* Market data                                                         */
/* ------------------------------------------------------------------ */

/** Small TTL cache so every screen doesn't refetch, but prices never freeze. */
function cached<T>(ttlMs: number, load: () => Promise<T>) {
  let value: { at: number; data: Promise<T> } | null = null;
  return {
    get(): Promise<T> {
      if (!value || Date.now() - value.at > ttlMs) {
        const data = load();
        value = { at: Date.now(), data };
        // A failed load must not be cached.
        data.catch(() => {
          if (value?.data === data) value = null;
        });
      }
      return value.data;
    },
    clear() {
      value = null;
    },
  };
}

const COMPANY_TICKERS = EXPLORE_ORDER;
/** The asset with a proven KEYS Devnet practice lane (and a verified Mainnet product). */
export const MONEY_PROOF_TICKER = "AAPL";

/** Money status from Mainnet truth only; a Devnet lane or a Pyth price never grants it. */
function mainnetMoneyStatus(ticker: string): MarketAsset["moneyModeStatus"] {
  if (!(ticker in MAINNET_ASSETS)) return "unavailable";
  return moneyMainnetLive() ? "eligible" : "verification-required";
}

function practiceLaneFor(ticker: string): MarketAsset["practiceLane"] {
  return devnetLaneAvailable() && PRACTICE_DEVNET_TICKERS.has(ticker) ? "devnet" : "sandbox";
}

const quotesCache = cached(20_000, () => fetchMarketQuotes(COMPANY_TICKERS));
const discoveryCache = cached(60_000, () => fetchPythMarketDiscovery());
const intradayCache = new Map<string, ReturnType<typeof cached<PricePoint[] | null>>>();
const preStocksCache = cached(60_000, () => fetchPreStocks());
const tesseraCache = cached(60_000, () => fetchTesseraRepresentations());

/** Real Pyth 1D history points, or null when history is unavailable. */
function pythIntraday(ticker: string) {
  let entry = intradayCache.get(ticker);
  if (!entry) {
    entry = cached(60_000, async () => {
      const series = await fetchMarketSeries(ticker, "1D");
      const pts = series.points ?? [];
      return series.status === "UNAVAILABLE" || pts.length < 2 ? null : pts;
    });
    intradayCache.set(ticker, entry);
  }
  return entry.get().catch(() => null);
}

/** Real day change from Pyth 1D history (first vs last point), or null. */
async function pythDayChange(ticker: string) {
  const pts = await pythIntraday(ticker);
  if (!pts || !pts[0].v) return null;
  return ((pts[pts.length - 1].v - pts[0].v) / pts[0].v) * 100;
}

/**
 * List sparkline: real Pyth 1D history when this asset's change comes from it,
 * otherwise an illustrative sample shape (the row is labeled Sample).
 */
export async function sparklineSeries(asset: MarketAsset): Promise<PricePoint[]> {
  if (asset.changeSource === "pyth-history") {
    const pts = await pythIntraday(asset.ticker);
    if (pts) return pts;
  }
  return sparklineFor(asset);
}

/** Test/demo hook: drop cached market data. */
export function clearMarketCaches() {
  quotesCache.clear();
  discoveryCache.clear();
  preStocksCache.clear();
  tesseraCache.clear();
  intradayCache.clear();
}

/**
 * Overlay backend truth onto the company universe:
 * 1. /market/quotes FRESH/STALE → live/delayed price (AAPL, TSLA today)
 * 2. /market/discovery FRESH equity feeds → live price (e.g. NVDA, MSFT)
 * 3. otherwise the clearly labeled sample value stays (never $0)
 * Money eligibility follows the proven runtime lane, not price availability.
 */
async function withBackendTruth(assets: MarketAsset[]): Promise<MarketAsset[]> {
  if (!keysBackendConfigured()) {
    return assets.map((a) => ({ ...a, moneyModeStatus: mainnetMoneyStatus(a.ticker), practiceLane: "sandbox" as const }));
  }

  const [quotes, discovery] = await Promise.all([
    quotesCache.get().catch(() => null),
    discoveryCache.get().catch(() => null),
  ]);
  const bySymbol = new Map((quotes?.quotes ?? []).map((q) => [q.symbol, q]));
  const discoveryEquities = new Map(
    (discovery?.classes ?? [])
      .filter((c) => c.id === "equity")
      .flatMap((c) => c.feeds)
      .filter((f) => f.priceStatus === "FRESH" && typeof f.price === "number" && f.price > 0)
      .map((f) => [f.displaySymbol, f]),
  );

  const overlaid = await Promise.all(
    assets.map(async (asset): Promise<MarketAsset> => {
      const moneyModeStatus = mainnetMoneyStatus(asset.ticker);
      const practiceLane = practiceLaneFor(asset.ticker);
      const quote = bySymbol.get(asset.ticker);
      if (quote && (quote.status === "FRESH" || quote.status === "STALE") && typeof quote.price === "number" && quote.price > 0) {
        const change = await pythDayChange(asset.ticker);
        return {
          ...asset,
          moneyModeStatus,
          practiceLane,
          price: quote.price,
          priceSource: "pyth",
          dataStatus: quote.status === "FRESH" ? "live" : "stale",
          asOf: quote.publishTime ?? undefined,
          dayChangePercent: change ?? 0,
          changeSource: change == null ? "unknown" : "pyth-history",
        };
      }
      const feed = discoveryEquities.get(asset.ticker);
      if (feed && typeof feed.price === "number") {
        return {
          ...asset,
          moneyModeStatus,
          practiceLane,
          price: feed.price,
          priceSource: "pyth",
          dataStatus: "live",
          asOf: feed.publishTime ?? undefined,
          dayChangePercent: 0,
          changeSource: "unknown",
        };
      }
      return { ...asset, moneyModeStatus, practiceLane, changeSource: "sample" };
    }),
  );
  return overlaid;
}

function preStockToAsset(p: PreStocksRepresentation): MarketAsset | null {
  const price = p.market.tokenPrice ?? p.market.markPrice;
  if (p.market.status !== "AVAILABLE" || typeof price !== "number" || price <= 0) return null;
  const company = p.name.replace(/\s*PreStocks$/i, "");
  return {
    id: `prestocks-${p.symbol.toLowerCase()}`,
    companyName: company,
    ticker: p.symbol,
    tokenizedTicker: `${company} PreStock`,
    category: "Private",
    shortDescription: "Pre-IPO exposure · not shares",
    about: `${company} is a private company, so its shares aren't traded on a public stock market. A ${company} PreStock is a token on Solana that tracks an estimate of the company's value. Owning one does not make you a shareholder: no voting, no dividends and no information rights.`,
    thingsToKnow: [
      { icon: "bolt", text: "Private companies aren't on a public stock exchange", tone: "orange" },
      { icon: "heart", text: "The token tracks an estimated value, not a share", tone: "pink" },
      { icon: "globe", text: "Valuations of private companies can change suddenly", tone: "blue" },
      { icon: "swords", text: "Practice only in Cresco: eligibility isn't verified", tone: "aqua" },
    ],
    price,
    dayChangePercent: 0,
    changeSource: "unknown",
    brand: { background: "#102b63", foreground: "#ffbc32", mark: company.slice(0, 1).toUpperCase() },
    network: "solana",
    provider: "prestocks",
    priceSource: "prestocks",
    dataStatus: "live",
    practiceEnabled: p.keysPolicy.practiceAvailable,
    moneyModeStatus: "unavailable",
    practiceLane: "sandbox",
    asOf: p.market.receivedAt,
    representation: {
      source: "PRESTOCKS",
      label: "Pre-IPO economic exposure · not shares",
      kind: "PRE_IPO_ECONOMIC_EXPOSURE",
      underlyingCompany: company,
      contractAddress: p.contractAddress,
      network: "solana-mainnet",
      productUrl: p.productUrl,
      markPrice: p.market.markPrice,
      tokenPrice: p.market.tokenPrice,
      valuation: p.market.markValuation,
      premiumDiscountPct: p.market.premiumDiscountPct,
      receivedAt: p.market.receivedAt,
      eligibility: p.eligibility.status,
    },
  };
}

function tesseraToAsset(t: TesseraRepresentation): MarketAsset | null {
  const price = t.market.markPrice;
  if (t.market.status !== "AVAILABLE" || typeof price !== "number" || price <= 0) return null;
  return {
    id: `tessera-${t.symbol.toLowerCase()}`,
    companyName: t.symbol,
    ticker: t.symbol.toUpperCase(),
    tokenizedTicker: t.symbol,
    category: "Private",
    shortDescription: "Loan participation right · not direct equity",
    about: `${t.symbol} is a Tessera T-Token linked to ${t.underlyingCompany}. It is a loan participation right, not direct equity: it gives no shareholder, voting or dividend rights and it isn't on ${t.underlyingCompany}'s cap table.`,
    thingsToKnow: [
      { icon: "heart", text: "A loan participation right, not a share", tone: "pink" },
      { icon: "bolt", text: `Its price follows an estimate of ${t.underlyingCompany}'s value`, tone: "orange" },
      { icon: "globe", text: "Jurisdiction restrictions apply", tone: "blue" },
      { icon: "swords", text: "Practice only in Cresco: eligibility isn't verified", tone: "aqua" },
    ],
    price,
    dayChangePercent: 0,
    changeSource: "unknown",
    brand: { background: "#f0edff", foreground: "#6a4fe0", mark: "T" },
    network: "solana",
    provider: "tessera",
    priceSource: "tessera",
    dataStatus: "live",
    practiceEnabled: t.keysPolicy.practiceAvailable,
    moneyModeStatus: "unavailable",
    practiceLane: "sandbox",
    asOf: t.market.receivedAt,
    representation: {
      source: "TESSERA",
      label: "Loan participation right · not direct equity",
      kind: "LOAN_PARTICIPATION_RIGHT",
      underlyingCompany: t.underlyingCompany,
      contractAddress: t.contractAddress,
      network: "solana",
      markPrice: t.market.markPrice,
      valuation: t.market.markValuation,
      sector: t.sector,
      receivedAt: t.market.receivedAt,
      eligibility: t.eligibility.status,
    },
  };
}

/** Private-market representations (PreStocks + Tessera). Learn / Practice only. */
export async function listPrivateAssets(): Promise<MarketAsset[]> {
  if (!keysBackendConfigured()) return [];
  const [ps, ts] = await Promise.all([preStocksCache.get().catch(() => null), tesseraCache.get().catch(() => null)]);
  return [
    ...(ps?.assets ?? []).map(preStockToAsset),
    ...(ts?.assets ?? []).map(tesseraToAsset),
  ].filter((a): a is MarketAsset => a !== null);
}

export async function listDiscovery() {
  return discoveryCache.get();
}

export const marketData: MarketDataService = {
  async listAssets() {
    await latency();
    if (flags.marketFailure) throw new Error("Market data unavailable");
    const ordered = COMPANY_TICKERS.map((t) => MOCK_ASSETS.find((a) => a.ticker === t)!);
    const [companies, privates] = await Promise.all([withBackendTruth(ordered), listPrivateAssets().catch(() => [])]);
    return [...companies, ...privates];
  },
  async getAsset(ticker) {
    const all = await this.listAssets();
    return all.find((a) => a.ticker === ticker.toUpperCase()) ?? null;
  },
  async getSeries(ticker, period): Promise<SeriesResult> {
    await latency(160);
    if (flags.marketFailure) throw new Error("Market data unavailable");

    if (keysBackendConfigured()) {
      try {
        const live = await fetchMarketSeries(ticker, period);
        if (live.status !== "UNAVAILABLE" && live.points.length > 1) {
          return { points: live.points, source: "pyth-history", resolution: live.resolution };
        }
      } catch {
        // History unavailable → fall through to an explicitly labeled sample.
      }
    }

    const asset = MOCK_ASSETS.find((a) => a.ticker === ticker);
    if (!asset) return { points: [], source: "unavailable" };
    return { points: sampleSeries(ticker, asset.price, asset.dayChangePercent, period), source: "sample" };
  },
};

/** 1D sample series for list sparklines (sample data, derived from the asset's price). */
export function sparklineFor(asset: MarketAsset) {
  return sampleSeries(asset.ticker, asset.price, asset.changeSource === "unknown" ? 0 : asset.dayChangePercent, "1D");
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

/** Local practice for assets without a Devnet lane. Simulated: never on-chain. */
export const practiceSandboxExecution: PracticeSandboxService = {
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
/* Practice on Solana Devnet — KEYS runtime (decision + execution)      */
/* ------------------------------------------------------------------ */

/** Assets with a proven KEYS Devnet practice lane today. */
export const PRACTICE_DEVNET_TICKERS = new Set(["AAPL"]);

function devnetLaneAvailable() {
  return keysBackendConfigured() && keysRuntimeExecutionEnabled();
}

function allowOnceCovers(input: KeyedActionInput): boolean {
  const r = input.allowOnce;
  return (
    !!r &&
    r.status === "ALLOWED_ONCE" &&
    r.asset === input.asset.ticker &&
    r.mandateNonce === input.mandate.nonce &&
    input.amount <= r.requestedNotional
  );
}

async function decideOnDevnet(input: KeyedActionInput): Promise<ActionEvaluation> {
  if (!practiceDevnetExecution.supports(input.asset)) {
    return { decision: "REFUSE", reasonCode: "ASSET_UNAVAILABLE", source: "local-preview" };
  }
  let evaluation: ActionEvaluation;
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

  // A guardian ALLOW_ONCE covers exactly one limit refusal for the same asset,
  // amount and Key nonce. It never changes standing authority.
  if (
    evaluation.decision === "REFUSE" &&
    (evaluation.reasonCode === "MANDATE_LIMIT_EXCEEDED" || evaluation.reasonCode === "PERIOD_LIMIT_EXCEEDED") &&
    allowOnceCovers(input)
  ) {
    evaluation = { ...evaluation, decision: "ALLOW", reasonCode: "WITHIN_MANDATE", guardianApprovalRequired: false };
  }

  if (evaluation.decision === "ALLOW" && input.amount > input.balance) {
    return { decision: "REFUSE", reasonCode: "INSUFFICIENT_BALANCE", requestedNotional: input.amount, source: evaluation.source };
  }
  return evaluation;
}

export const practiceDevnetExecution: CrescoExecutionAdapter = {
  network: PRACTICE_DEVNET.network,
  realValue: PRACTICE_DEVNET.realValue,
  supports(asset) {
    return devnetLaneAvailable() && PRACTICE_DEVNET_TICKERS.has(asset.ticker) && !asset.representation;
  },
  async evaluate(input) {
    return decideOnDevnet(input);
  },
  async execute(input) {
    const key = input.idempotencyKey ?? newIdempotencyKey();
    const refused = (evaluation: ActionEvaluation): ExecutionResult => ({
      ok: false,
      outcome: "REFUSED",
      evaluation,
      ticker: input.asset.ticker,
      amount: input.amount,
      idempotencyKey: key,
    });
    if (!practiceDevnetExecution.supports(input.asset)) {
      return refused({ decision: "REFUSE", reasonCode: "ASSET_UNAVAILABLE", source: "local-preview" });
    }

    // 1. Evaluate server-side first (no side effects). Skipped on re-checks of an
    //    already-submitted intent and when an exact ALLOW_ONCE covers the action;
    //    execute re-evaluates atomically on the server either way.
    const coveredOnce = allowOnceCovers(input);
    if (!input.recheck && !coveredOnce) {
      const evaluation = await decideOnDevnet(input);
      if (evaluation.decision !== "ALLOW") return refused(evaluation);
    }

    // 2. Execute on Solana Devnet with a stable idempotency key.
    const runtime = await executeAction(
      buildExecuteRequest({
        mandate: input.mandate,
        assetRule: input.assetRule,
        asset: input.asset.ticker,
        type: input.type,
        notional: input.amount,
        idempotencyKey: key,
        allowOnceRequestId: coveredOnce ? input.allowOnce?.id : undefined,
      }),
    );

    // Network separation: a Practice result must be a Devnet result.
    if (runtime.proof?.network && !belongsTo("practice", runtime.proof.network)) {
      return refused({ decision: "REFUSE", reasonCode: "NETWORK_MISMATCH", source: "keys-runtime" });
    }

    const executed = runtime.outcome === "EXECUTED";
    return {
      ok: executed,
      outcome: runtime.outcome,
      evaluation: runtime.evaluation,
      ticker: input.asset.ticker,
      amount: input.amount,
      shares: executed ? input.amount / input.asset.price : undefined,
      idempotencyKey: key,
      proof: runtime.proof,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Money on Solana Mainnet — hard-gated until every requirement exists  */
/* ------------------------------------------------------------------ */

export class MainnetSetupRequiredError extends Error {
  constructor() {
    super("Money Mode requires parent verification and a supported Mainnet account.");
    this.name = "MainnetSetupRequiredError";
  }
}

/**
 * Money never touches the Devnet runtime. Until a Mainnet KEYS program, a
 * verified guardian, a verified asset route and real funding all exist, every
 * call returns SETUP_REQUIRED without contacting any network.
 */
export const moneyMainnetExecution: CrescoExecutionAdapter = {
  network: "solana-mainnet",
  realValue: true,
  supports() {
    return moneyMainnetLive();
  },
  async evaluate() {
    return { decision: "REFUSE", reasonCode: "MAINNET_SETUP_REQUIRED", source: "local-preview" };
  },
  async execute(input) {
    return {
      ok: false,
      outcome: "SETUP_REQUIRED",
      evaluation: { decision: "REFUSE", reasonCode: "MAINNET_SETUP_REQUIRED", source: "local-preview" },
      ticker: input.asset.ticker,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
    };
  },
};

export function executionAdapterFor(mode: "practice" | "money"): CrescoExecutionAdapter {
  return mode === "practice" ? practiceDevnetExecution : moneyMainnetExecution;
}

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
    if (keysBackendConfigured()) {
      return createPersistentBoundaryRequest({
        mandate,
        evaluation,
        asset,
        type,
        amount,
        reason,
      });
    }

    await latency(360);
    return {
      id: `br_${Date.now().toString(36)}`,
      status: "PENDING_HUMAN_DECISION",
      mandateVersion: mandate.version,
      mandateNonce: mandate.nonce,
      asset,
      actionType: type,
      requestedNotional: amount,
      standingLimit:
        evaluation.reasonCode === "PERIOD_LIMIT_EXCEEDED"
          ? mandate.maxPeriodNotional
          : mandate.maxActionNotional,
      reasonCode: evaluation.reasonCode,
      reason: reason.trim().slice(0, 140),
      createdAt: new Date().toISOString(),
    };
  },

  async decide({ request, decision, mandate, newLimits, note }) {
    if (keysBackendConfigured()) {
      return decidePersistentBoundaryRequest({
        requestId: request.id,
        decision,
        newLimits,
        note,
      });
    }

    await latency(360);
    const decidedAt = new Date().toISOString();
    if (decision === "WIDEN_MANDATE") {
      if (!newLimits) throw new Error("newLimits required to widen");
      const next = bumpMandate(mandate, newLimits);
      return {
        request: { ...request, status: "WIDENED", decidedAt, guardianNote: note },
        mandate: next,
      };
    }
    if (decision === "ALLOW_ONCE") {
      return {
        request: {
          ...request,
          status: "ALLOWED_ONCE",
          decidedAt,
          guardianNote: note,
        },
        mandate,
      };
    }
    return {
      request: { ...request, status: "REFUSED", decidedAt, guardianNote: note },
      mandate,
    };
  },
};

export const mandates: MandateService = {
  async update({ mandate, changes }) {
    if (keysBackendConfigured()) {
      const result = await transitionCurrentMandate({
        expectedNonce: mandate.nonce,
        changes,
      });
      return result.mandate;
    }
    await latency(300);
    return bumpMandate(mandate, changes);
  },
};

export const funding: FundingService = {
  async addPracticeCapital({ amount }) {
    if (!keysBackendConfigured()) throw new Error("Practice on Devnet needs the KEYS backend.");
    const out = await addDevnetTestFunds(amount);
    return { ...out, status: "DEVNET_TEST_CREDITED", realPaymentTaken: false };
  },
  async depositUsdc() {
    // Real funding exists only with the Mainnet Money stack. Never faked.
    throw new MainnetSetupRequiredError();
  },
};

export const auth: AuthService = {
  async signInDemo(role, displayName) {
    if (keysBackendConfigured()) {
      return createBackendDemoSession(role, displayName);
    }
    await latency(250);
    return { role, displayName, kind: "demo" };
  },
};

export { assetRuleFor };
