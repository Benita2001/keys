import { describe, expect, it } from "vitest";
import type { FamilyState } from "@/services/keys-backend";
import { initialState, reducer, restoreState } from "./store";

const remote = (overrides: Partial<FamilyState> = {}): FamilyState =>
  ({
    profile: { childName: "Alex", parentName: "Sam", parentLinked: true },
    mandate: { ...initialState.mandate, version: 6, nonce: 5, maxPeriodNotional: 100, spentThisPeriod: 15 },
    balances: { money: 35, practice: 1000 },
    moneyHoldings: [{ ticker: "AAPL", shares: 0.045, costBasis: 15 }],
    requests: [],
    learning: { completedLessons: [], xp: 0, weeklyMinutes: [] },
    activity: [],
    reservations: {},
    ...overrides,
  }) as FamilyState;

describe("state reducer", () => {
  it("LEARNING COMPLETION != AUTHORITY: finishing lessons never changes the Key", () => {
    let s = initialState;
    for (const lessonId of ["what-is-a-stock", "why-companies-sell-shares", "why-prices-move", "risk-and-reward"]) {
      s = reducer(s, { type: "completeLesson", lessonId, xp: 500 });
    }
    expect(s.xp).toBe(initialState.xp + 2000);
    expect(s.mandate).toEqual(initialState.mandate);
  });

  it("sandbox practice never touches Devnet practice capital, Money or the Key", () => {
    const s = reducer(initialState, {
      type: "practiceBuy",
      ticker: "TSLA",
      amount: 100,
      shares: 0.26,
      proof: { status: "PRACTICE_LOCAL", executedAt: "2026-09-24T00:00:00Z" },
    });
    expect(s.money).toEqual(initialState.money);
    expect(s.practiceChain).toEqual(initialState.practiceChain);
    expect(s.mandate).toEqual(initialState.mandate);
    expect(s.sandbox.cash).toBe(initialState.sandbox.cash - 100);
  });
});

describe("backend sync (Practice on Devnet)", () => {
  it("fills Practice from the backend and never derives Mainnet Money from it", () => {
    const s = reducer(initialState, { type: "syncBackend", remote: remote() });
    expect(s.practiceChain).toEqual({ holdings: [{ ticker: "AAPL", shares: 0.045, costBasis: 15 }], balance: 35, synced: true });
    expect(s.money).toEqual(initialState.money);
    expect(s.money.network).toBe("solana-mainnet");
    expect(s.money.balance).toBeNull();
    expect(s.money.holdings).toEqual([]);
  });

  it("subtracts held reservations and uses the stricter of chain and ledger spend", () => {
    const s = reducer(initialState, {
      type: "syncBackend",
      remote: remote({ reservations: { k: { notional: 5, asset: "AAPL", createdAt: "2026-09-25T00:00:00Z" } } }),
      chainSpent: 52.997,
    });
    expect(s.practiceChain.balance).toBe(30);
    expect(s.mandate.spentThisPeriod).toBeCloseTo(52.997);
  });

  it("prefers the backend's chain-authoritative practice period when present", () => {
    const s = reducer(initialState, {
      type: "syncBackend",
      remote: remote({
        practice: {
          mode: "practice",
          network: "solana-devnet",
          realValue: false,
          programId: "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
          capital: "DEMO_TOKEN",
          balance: 35,
          availableBalance: 30,
          holdings: [],
          period: { source: "SOLANA_DEVNET_ASSET_RULE", startedAt: null, seconds: null, onChainSpent: 53, ledgerSpent: 15, held: 5, maxPeriod: 100, remaining: 42 },
        },
      }),
    });
    expect(s.mandate.spentThisPeriod).toBe(58);
    expect(s.practiceChain.balance).toBe(30);
  });

  it("accepts only Devnet executions as Practice receipts and clears settled pending intents", () => {
    let s = reducer(initialState, {
      type: "trackPending",
      pending: { idempotencyKey: "k-devnet", ticker: "AAPL", amount: 5, createdAt: "2026-09-25T00:00:00Z" },
    });
    s = reducer(s, {
      type: "syncBackend",
      remote: remote({
        activity: [
          { id: "a1", kind: "MONEY_EXECUTION", network: "solana-devnet", ticker: "AAPL", amount: 5, shares: 0.01, createdAt: "t", proof: { status: "CONFIRMED", network: "solana-devnet", signature: "S1", idempotencyKey: "k-devnet" } },
          { id: "a2", kind: "MONEY_EXECUTION", ticker: "AAPL", amount: 5, shares: 0.01, createdAt: "t", proof: { status: "CONFIRMED", network: "solana-mainnet", signature: "S2" } },
        ] as FamilyState["activity"],
      }),
    });
    expect(s.practiceReceipts.map((r) => r.id)).toEqual(["a1"]);
    expect(s.practiceReceipts[0].network).toBe("solana-devnet");
    expect(s.practiceReceipts[0].realValue).toBe(false);
    expect(s.pendingExecutions).toHaveLength(0);
  });
});

describe("restoreState", () => {
  it("discards corrupt, outdated or reversed-meaning (v1) persisted state", () => {
    expect(restoreState("{not json")).toBeNull();
    expect(restoreState(JSON.stringify({ version: 1, mandate: null, profile: null }))).toBeNull();
    expect(restoreState(JSON.stringify({ ...initialState, version: 1 }))).toBeNull();
    const ok = restoreState(JSON.stringify({ ...initialState, xp: 1500 }));
    expect(ok?.xp).toBe(1500);
    expect(ok?.mandate).toEqual(initialState.mandate);
  });

  it("never restores Mainnet Money or a synced Devnet flag from a browser cache", () => {
    const tampered = {
      ...initialState,
      money: { network: "solana-mainnet", realValue: true, status: "live", balance: 9999, holdings: [{ ticker: "AAPL", shares: 5, costBasis: 1 }] },
      practiceChain: { holdings: [], balance: 40, synced: true },
    };
    const ok = restoreState(JSON.stringify(tampered));
    expect(ok?.money.status).toBe("setup-required");
    expect(ok?.money.balance).toBeNull();
    expect(ok?.practiceChain.synced).toBe(false);
  });

  it("tracks unconfirmed intents once", () => {
    const pending = { idempotencyKey: "k2", ticker: "AAPL", amount: 5, createdAt: "2026-09-24T00:00:00Z" };
    let s = reducer(initialState, { type: "trackPending", pending });
    s = reducer(s, { type: "trackPending", pending });
    expect(s.pendingExecutions).toHaveLength(1);
    s = reducer(s, { type: "clearPending", idempotencyKey: "k2" });
    expect(s.pendingExecutions).toHaveLength(0);
  });
});
