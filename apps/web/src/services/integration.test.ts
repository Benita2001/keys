import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { learningStreak } from "@/hooks/data";
import { PRACTICE_SEED } from "@/mocks/family";
import { initialState, reducer } from "@/state/store";
import { clearMarketCaches, marketData, MONEY_PROOF_TICKER } from ".";
import {
  clearBackendSessionToken,
  configureKeysBackend,
  executeAction,
  normalizeEvaluation,
  toExecutionProof,
  type ExecuteRequest,
} from "./keys-backend";

/* A tiny fake KEYS API: route → handler. Every call is recorded. */
type Handler = (init: RequestInit | undefined, url: URL) => Response | Promise<Response>;
let routes: Record<string, Handler> = {};
let calls: { path: string; auth?: string; idem?: string }[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function installFetch() {
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ path: url.pathname, auth: headers.authorization, idem: headers["idempotency-key"] });
    const handler = routes[`${init?.method ?? "GET"} ${url.pathname}`];
    if (!handler) return json({ error: "NOT_FOUND" }, 404);
    return handler(init, url);
  });
}

let sessions = 0;
const demoSession: Handler = () => json({ token: `tok-${++sessions}`, role: "child", displayName: "Alex" });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
  routes = { "POST /api/v0.2/auth/demo-session": demoSession };
  calls = [];
  sessions = 0;
  clearBackendSessionToken();
  clearMarketCaches();
  configureKeysBackend({ url: "http://keys.test", execution: "runtime", timeoutMs: 2000, chainTimeoutMs: 2000 });
  installFetch();
});

afterEach(() => {
  configureKeysBackend(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const req = (key: string): ExecuteRequest => ({
  asset: "AAPL",
  type: "BUY",
  notional: 5,
  expectedNonce: 5,
  idempotencyKey: key,
});

describe("KEYS adapter", () => {
  it("converts frozen-contract micro-USD fields to dollars (never $0)", () => {
    const e = normalizeEvaluation(
      {
        decision: "REFUSE",
        reasonCode: "PYTH_PERIOD_NOTIONAL_EXCEEDED" as never,
        requestedNotionalMicroUsd: 5_000_000,
        standingLimitMicroUsd: 10_000_000,
        remainingPeriodNotionalMicroUsd: 0,
      },
      "keys-runtime",
    );
    expect(e.requestedNotional).toBe(5);
    expect(e.standingLimit).toBe(10);
    expect(e.remainingPeriodNotional).toBe(0);
  });

  it("maps the runtime proof including Pyth evidence", () => {
    const p = toExecutionProof({
      status: "RUNTIME_CONFIRMED",
      network: "solana-devnet",
      signature: "5sig",
      programId: "ABjE",
      mandateAddress: "AnBn",
      executionAsset: "DEMO_TOKEN",
      idempotencyKey: "k1",
      executedAt: "2026-09-25T00:00:00Z",
      pyth: { status: "FRESH", feedId: 922, unitPriceMicroUsd: 336_160_000, publishTime: "2026-09-25T00:00:00Z" },
    } as never);
    expect(p.signature).toBe("5sig");
    expect(p.simulated).toBeFalsy();
    expect(p.pyth?.unitPrice).toBeCloseTo(336.16);
    expect(p.executionAsset).toBe("DEMO_TOKEN");
  });

  it("an upstream Solana RPC 429 reported as 400 is UNKNOWN, never a refusal", async () => {
    routes["POST /api/v0.2/actions/execute"] = () =>
      json({ error: "BAD_REQUEST", message: "429 Too Many Requests: {\"jsonrpc\":\"2.0\"}" }, 400);
    const res = await executeAction(req("intent-429"));
    expect(res.outcome).toBe("UNKNOWN");
    expect(res.proof?.signature).toBeUndefined();
  });

  it("a real policy 400 is a refusal and a 409 is a stale nonce", async () => {
    routes["POST /api/v0.2/actions/execute"] = () => json({ error: "BAD_REQUEST", message: "invalid asset" }, 400);
    expect((await executeAction(req("intent-bad"))).outcome).toBe("REFUSED");
    routes["POST /api/v0.2/actions/execute"] = () => json({ error: "STALE_NONCE" }, 409);
    const stale = await executeAction(req("intent-stale"));
    expect(stale.outcome).toBe("REFUSED");
    expect(stale.evaluation.reasonCode).toBe("STALE_NONCE");
  });

  it("renews an expired demo session once and retries with the same idempotency key", async () => {
    let n = 0;
    routes["POST /api/v0.2/actions/execute"] = () => (++n === 1 ? json({ error: "UNAUTHORIZED" }, 401) : json({ error: "BAD_REQUEST", message: "timeout" }, 400));
    await executeAction(req("intent-renew"));
    const exec = calls.filter((c) => c.path === "/api/v0.2/actions/execute");
    expect(exec).toHaveLength(2);
    expect(exec.every((c) => c.idem === "intent-renew")).toBe(true);
    expect(calls.some((c) => c.path === "/api/v0.2/auth/demo-session")).toBe(true);
  });
});

describe("market truth", () => {
  const quote = (symbol: string, status: string, price: number | null) => ({ symbol, status, price, publishTime: "2026-09-25T00:00:00Z" });

  beforeEach(() => {
    routes["GET /api/v0.2/market/quotes"] = () =>
      json({
        quotes: [
          quote("AAPL", "FRESH", 336.16),
          quote("TSLA", "STALE", 382.1),
          quote("NVDA", "UNAVAILABLE", null),
          quote("GOOGL", "UNAVAILABLE", 0),
        ],
      });
    routes["GET /api/v0.2/market/discovery"] = () =>
      json({ classes: [{ id: "equity", feeds: [{ displaySymbol: "MSFT", priceStatus: "FRESH", price: 498.2, publishTime: "2026-09-25T00:00:00Z" }] }] });
    routes["GET /api/v0.2/market/series"] = () => json({ status: "UNAVAILABLE", points: [] });
    routes["GET /api/v0.2/integrations/prestocks"] = () => json({ assets: [] });
    routes["GET /api/v0.2/integrations/tessera"] = () => json({ assets: [] });
  });

  it("labels FRESH live, STALE delayed, UNAVAILABLE sample, and never shows $0", async () => {
    const assets = await marketData.listAssets();
    const by = (t: string) => assets.find((a) => a.ticker === t)!;
    expect(by("AAPL")).toMatchObject({ dataStatus: "live", priceSource: "pyth", price: 336.16 });
    expect(by("TSLA")).toMatchObject({ dataStatus: "stale", price: 382.1 });
    expect(by("MSFT")).toMatchObject({ dataStatus: "live", changeSource: "unknown", price: 498.2 });
    expect(by("NVDA").dataStatus).toBe("mock");
    expect(by("NVDA").changeSource).toBe("sample");
    expect(assets.every((a) => a.price > 0)).toBe(true);
  });

  it("keeps all 10 companies; only the proven asset has a Devnet practice lane and none is Money-eligible", async () => {
    const assets = await marketData.listAssets();
    const companies = assets.filter((a) => a.category !== "Private");
    expect(companies).toHaveLength(10);
    expect(companies.filter((a) => a.practiceLane === "devnet").map((a) => a.ticker)).toEqual([MONEY_PROOF_TICKER]);
    expect(companies.some((a) => a.moneyModeStatus === "eligible")).toBe(false);
    // A live Pyth price never grants Money: AAPL/TSLA/MSFT are live here.
    expect(companies.find((a) => a.ticker === "TSLA")?.moneyModeStatus).toBe("unavailable");
  });

  it("maps PreStocks and Tessera to Practice-only representations, never Money", async () => {
    routes["GET /api/v0.2/integrations/prestocks"] = () =>
      json({
        assets: [
          {
            source: "PRESTOCKS",
            symbol: "SPACEX",
            name: "SpaceX PreStocks",
            contractAddress: "Sp1",
            productUrl: "https://prestocks.com",
            market: { status: "AVAILABLE", tokenPrice: 117.47, markPrice: 117, receivedAt: "2026-09-25T00:00:00Z" },
            eligibility: { status: "UNKNOWN", executionEligible: false },
            keysPolicy: { practiceAvailable: true, executionEligible: false, authorityEffect: "NONE" },
          },
          {
            source: "PRESTOCKS",
            symbol: "EMPTY",
            name: "Empty PreStocks",
            contractAddress: "E",
            productUrl: "",
            market: { status: "UNAVAILABLE", receivedAt: "2026-09-25T00:00:00Z" },
            eligibility: { status: "UNKNOWN", executionEligible: false },
            keysPolicy: { practiceAvailable: true, executionEligible: false, authorityEffect: "NONE" },
          },
        ],
      });
    routes["GET /api/v0.2/integrations/tessera"] = () =>
      json({
        assets: [
          {
            source: "TESSERA",
            symbol: "T-OpenAI",
            underlyingCompany: "OpenAI",
            contractAddress: "T1",
            market: { status: "AVAILABLE", markPrice: 42, receivedAt: "2026-09-25T00:00:00Z" },
            eligibility: { status: "UNKNOWN", executionEligible: false },
            keysPolicy: { practiceAvailable: true, executionEligible: false, authorityEffect: "NONE" },
          },
        ],
      });
    const privates = (await marketData.listAssets()).filter((a) => a.category === "Private");
    expect(privates.map((a) => a.ticker)).toEqual(["SPACEX", "T-OPENAI"]);
    expect(privates.every((a) => a.moneyModeStatus === "unavailable")).toBe(true);
    expect(privates[0].representation?.label).toMatch(/not shares/);
    expect(privates[1].representation?.label).toBe("Loan participation right · not direct equity");
  });
});

describe("practice seed + learning stats", () => {
  it("sizes untouched seed lots at loaded prices and upgrades sample → live once", () => {
    const at = (price: number, live: boolean) => Object.fromEntries(PRACTICE_SEED.map((p) => [p.ticker, { price, live }]));
    const sampled = reducer(initialState, { type: "pricePracticeSeed", prices: at(50, false) });
    const live = reducer(sampled, { type: "pricePracticeSeed", prices: at(100, true) });
    for (const seed of PRACTICE_SEED) {
      const h = live.sandbox.holdings.find((x) => x.ticker === seed.ticker)!;
      expect(h.shares * 100).toBeCloseTo(seed.value);
    }
    // Live sizing is final.
    expect(reducer(live, { type: "pricePracticeSeed", prices: at(1, true) })).toBe(live);
  });

  it("never re-sizes a lot the user has bought into", () => {
    const bought = reducer(initialState, { type: "practiceBuy", ticker: "AAPL", amount: 50, shares: 0.15, proof: { status: "PRACTICE_LOCAL", executedAt: "2026-09-25T00:00:00Z" } });
    const before = bought.sandbox.holdings.find((h) => h.ticker === "AAPL")!;
    const after = reducer(bought, { type: "pricePracticeSeed", prices: { AAPL: { price: 336, live: true } } });
    expect(after.sandbox.holdings.find((h) => h.ticker === "AAPL")).toEqual(before);
  });

  it("counts consecutive learning days ending today or yesterday", () => {
    const now = new Date("2026-09-25T12:00:00Z");
    const m = (d: string) => ({ at: `${d}T10:00:00Z`, minutes: 5 });
    expect(learningStreak([m("2026-09-25"), m("2026-09-24"), m("2026-09-23")], now)).toBe(3);
    expect(learningStreak([m("2026-09-24"), m("2026-09-23")], now)).toBe(2);
    expect(learningStreak([m("2026-09-22")], now)).toBe(0);
    expect(learningStreak([], now)).toBe(0);
  });
});
