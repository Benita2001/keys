import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store";

describe("demo state reducer", () => {
  it("LEARNING COMPLETION != AUTHORITY: finishing lessons never changes the Mandate", () => {
    let s = initialState;
    for (const lessonId of ["what-is-a-stock", "why-companies-sell-shares", "why-prices-move", "risk-and-reward"]) {
      s = reducer(s, { type: "completeLesson", lessonId, xp: 500 });
    }
    expect(s.xp).toBe(initialState.xp + 2000);
    expect(s.mandate).toEqual(initialState.mandate);
  });

  it("money buys spend from the balance and the period allowance", () => {
    const s = reducer(initialState, {
      type: "moneyBuy",
      ticker: "AAPL",
      amount: 10,
      shares: 0.05,
      proof: { status: "DEMO_NOT_EXECUTED", executedAt: "2026-09-24T00:00:00Z" },
    });
    expect(s.money.balance).toBe(initialState.money.balance - 10);
    expect(s.mandate.spentThisPeriod).toBe(initialState.mandate.spentThisPeriod + 10);
    expect(s.practice).toEqual(initialState.practice);
  });

  it("practice buys never touch Money state", () => {
    const s = reducer(initialState, {
      type: "practiceBuy",
      ticker: "TSLA",
      amount: 100,
      shares: 0.26,
      proof: { status: "PRACTICE_LOCAL", executedAt: "2026-09-24T00:00:00Z" },
    });
    expect(s.money).toEqual(initialState.money);
    expect(s.mandate).toEqual(initialState.mandate);
    expect(s.practice.cash).toBe(initialState.practice.cash - 100);
  });
});

describe("restoreState (Q008)", () => {
  it("discards corrupt or outdated persisted state instead of crashing", async () => {
    const { restoreState } = await import("./store");
    expect(restoreState("{not json")).toBeNull();
    expect(restoreState(JSON.stringify({ version: 1, mandate: null, profile: null }))).toBeNull();
    expect(restoreState(JSON.stringify({ ...initialState, version: 2 }))).toBeNull();
    const ok = restoreState(JSON.stringify({ ...initialState, xp: 1500 }));
    expect(ok?.xp).toBe(1500);
    expect(ok?.mandate).toEqual(initialState.mandate);
  });
});

describe("execution idempotency in state", () => {
  const proof = { status: "RUNTIME_CONFIRMED" as const, executedAt: "2026-09-24T00:00:00Z", simulated: true };
  it("applies one confirmed intent once, even if confirmed again", () => {
    const buy = { type: "moneyBuy" as const, ticker: "AAPL", amount: 5, shares: 0.02, proof, idempotencyKey: "k1" };
    const s1 = reducer(initialState, buy);
    const s2 = reducer(s1, buy);
    expect(s2.money.balance).toBe(initialState.money.balance - 5);
    expect(s2.activity).toHaveLength(1);
  });

  it("tracks unconfirmed intents and clears them on confirmation", () => {
    const pending = { idempotencyKey: "k2", ticker: "AAPL", amount: 5, createdAt: "2026-09-24T00:00:00Z" };
    let s = reducer(initialState, { type: "trackPending", pending });
    s = reducer(s, { type: "trackPending", pending });
    expect(s.pendingExecutions).toHaveLength(1);
    s = reducer(s, { type: "moneyBuy", ticker: "AAPL", amount: 5, shares: 0.02, proof, idempotencyKey: "k2" });
    expect(s.pendingExecutions).toHaveLength(0);
  });
});
