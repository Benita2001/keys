/**
 * Network-leakage tests: Practice = Solana Devnet (no real value),
 * Money = Solana Mainnet (real value). Nothing may cross between them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assetRuleFor } from "@/domain/policy";
import { DEMO_MANDATE } from "@/mocks/family";
import { MOCK_ASSETS } from "@/mocks/market";
import { executionAdapterFor, moneyMainnetExecution, practiceDevnetExecution } from "@/services";
import { clearBackendSessionToken, configureKeysBackend } from "@/services/keys-backend";
import { initialState, reducer } from "@/state/store";
import {
  DEVNET_KEYS_PROGRAM_ID,
  MAINNET_ASSETS,
  NetworkLeakError,
  PRACTICE_DEVNET,
  assertNetwork,
  belongsTo,
  environmentFor,
  explorerTxUrl,
  moneyMainnetEnvironment,
  moneyMainnetLive,
} from "./network";

const apple = MOCK_ASSETS.find((a) => a.ticker === "AAPL")!;

describe("execution environments", () => {
  it("maps practice → solana-devnet (no real value) and money → solana-mainnet (real value)", () => {
    expect(environmentFor("practice")).toMatchObject({ network: "solana-devnet", realValue: false, programId: DEVNET_KEYS_PROGRAM_ID });
    expect(environmentFor("money")).toMatchObject({ network: "solana-mainnet", realValue: true, rpcEnvironment: "mainnet-beta" });
  });

  it("Money is setup-required today and never reuses the Devnet program", () => {
    const money = moneyMainnetEnvironment();
    expect(money.status).toBe("setup-required");
    expect(money.programId).not.toBe(DEVNET_KEYS_PROGRAM_ID);
    expect(moneyMainnetLive()).toBe(false);
  });

  it("Money only goes live when every real-world requirement is proven", () => {
    const all = { mainnetProgramDeployed: true, executionProviderConfigured: true, guardianVerified: true, assetVerified: true, realFunding: true };
    expect(moneyMainnetLive(all)).toBe(true);
    for (const key of Object.keys(all) as (keyof typeof all)[]) {
      expect(moneyMainnetLive({ ...all, [key]: false })).toBe(false);
    }
  });
});

describe("leak guards", () => {
  it("a Devnet signature is never accepted under Money, nor a Mainnet one under Practice", () => {
    expect(belongsTo("practice", "solana-devnet")).toBe(true);
    expect(belongsTo("money", "solana-devnet")).toBe(false);
    expect(belongsTo("practice", "solana-mainnet")).toBe(false);
    expect(() => assertNetwork("money", "solana-devnet")).toThrow(NetworkLeakError);
    expect(() => assertNetwork("practice", "solana-mainnet")).toThrow(NetworkLeakError);
    expect(() => assertNetwork("money", undefined)).toThrow(NetworkLeakError);
  });

  it("explorer links carry the proof's own cluster", () => {
    expect(explorerTxUrl("SIG", "solana-devnet")).toContain("cluster=devnet");
    expect(explorerTxUrl("SIG", "solana-mainnet")).not.toContain("cluster=");
  });

  it("adapters are bound to their networks; Money never resolves to the Devnet adapter", () => {
    expect(executionAdapterFor("practice")).toBe(practiceDevnetExecution);
    expect(executionAdapterFor("practice").network).toBe(PRACTICE_DEVNET.network);
    expect(executionAdapterFor("money")).toBe(moneyMainnetExecution);
    expect(executionAdapterFor("money").network).toBe("solana-mainnet");
    expect(executionAdapterFor("money").realValue).toBe(true);
    expect(executionAdapterFor("practice").realValue).toBe(false);
  });

  it("the Practice (Devnet) mint representation is never the real Mainnet token", () => {
    const aapl = MAINNET_ASSETS.AAPL;
    expect(aapl.practice.representation).toBe("DEMO_TOKEN");
    expect(aapl.practice.realValue).toBe(false);
    expect(aapl.money.realValue).toBe(true);
    expect(aapl.money.eligibility).toBe("verification-required");
  });

  it("Practice state never becomes Money authority or balance", () => {
    let s = reducer(initialState, {
      type: "practiceBuy",
      ticker: "AAPL",
      amount: 50,
      shares: 0.15,
      proof: { status: "PRACTICE_LOCAL", executedAt: "2026-09-25T00:00:00Z" },
    });
    s = reducer(s, {
      type: "syncBackend",
      remote: {
        profile: { childName: "Alex", parentName: "Sam", parentLinked: true },
        mandate: initialState.mandate,
        balances: { money: 35, practice: 1000 },
        moneyHoldings: [{ ticker: "AAPL", shares: 0.05, costBasis: 15 }],
        requests: [],
        learning: { completedLessons: [], xp: 0, weeklyMinutes: [] },
        activity: [],
      },
    });
    expect(s.money).toEqual(initialState.money);
    expect(s.money.holdings).toEqual([]);
    expect(s.money.balance).toBeNull();
  });
});

describe("Practice adapter rejects a non-Devnet result", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
    clearBackendSessionToken();
    configureKeysBackend({ url: "http://keys.test", execution: "runtime", timeoutMs: 2000, chainTimeoutMs: 2000 });
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      const path = new URL(input).pathname;
      if (path === "/api/v0.2/auth/demo-session") return json({ token: "t", role: "child", displayName: "Alex" });
      if (path === "/api/v0.2/actions/evaluate") return json({ decision: "ALLOW", reasonCode: "WITHIN_MANDATE" });
      if (path === "/api/v0.2/actions/execute" && init?.method === "POST") {
        return json({
          evaluation: { decision: "ALLOW", reasonCode: "WITHIN_MANDATE" },
          executionProof: {
            status: "CONFIRMED",
            network: "solana-mainnet",
            signature: "M".repeat(88),
            programId: "SomeMainnetProgram1111111111111111111111111",
            idempotencyKey: "k-leak",
            simulated: false,
            executedAt: "2026-09-25T00:00:00Z",
          },
        });
      }
      return json({ error: "NOT_FOUND" }, 404);
    });
  });

  afterEach(() => {
    configureKeysBackend(null);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("a Mainnet proof reaching Practice is refused as NETWORK_MISMATCH, never shown as success", async () => {
    const res = await practiceDevnetExecution.execute({
      mandate: DEMO_MANDATE,
      assetRule: assetRuleFor(DEMO_MANDATE, "AAPL"),
      asset: apple,
      type: "BUY",
      amount: 5,
      balance: 50,
      idempotencyKey: "k-leak",
    });
    expect(res.ok).toBe(false);
    expect(res.evaluation.reasonCode).toBe("NETWORK_MISMATCH");
    expect(res.proof).toBeUndefined();
  });
});
