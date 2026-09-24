import { beforeEach, describe, expect, it, vi } from "vitest";
import { assetRuleFor } from "@/domain/policy";
import type { BoundaryRequest } from "@/domain/types";
import { DEMO_MANDATE } from "@/mocks/family";
import { MOCK_ASSETS } from "@/mocks/market";
import { boundaryRequests, getCapabilities, moneyExecution, practiceExecution } from ".";

const asset = (t: string) => MOCK_ASSETS.find((a) => a.ticker === t)!;
const input = (ticker: string, amount: number, extra: Partial<Parameters<typeof moneyExecution.execute>[0]> = {}) => ({
  mandate: DEMO_MANDATE,
  assetRule: assetRuleFor(DEMO_MANDATE, ticker),
  asset: asset(ticker),
  type: "BUY" as const,
  amount,
  balance: 50,
  ...extra,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
});

describe("capabilities", () => {
  it("reports demo-only money, funding and execution", () => {
    const caps = getCapabilities();
    expect(caps.moneyMode).toBe("demo");
    expect(caps.funding).toBe("demo");
    expect(caps.execution).toBe("demo-not-executed");
  });
});

describe("money execution", () => {
  it("executes in-bounds actions immediately and labels the proof as not executed", async () => {
    const res = await moneyExecution.execute(input("AAPL", 5));
    expect(res.ok).toBe(true);
    expect(res.evaluation.guardianApprovalRequired).toBe(false);
    expect(res.proof?.status).toBe("DEMO_NOT_EXECUTED");
    expect(res.proof?.signature).toBeUndefined();
  });

  it("refuses over-limit actions with a boundary request", async () => {
    const res = await moneyExecution.execute(input("AAPL", 20));
    expect(res.ok).toBe(false);
    expect(res.evaluation.reasonCode).toBe("MANDATE_LIMIT_EXCEEDED");
    expect(res.evaluation.boundaryRequestAvailable).toBe(true);
  });

  it("refuses assets that are unavailable in Money Mode", async () => {
    const res = await moneyExecution.execute(input("META", 5, { assetRule: null }));
    expect(res.evaluation.reasonCode).toBe("ASSET_UNAVAILABLE");
  });

  it("refuses when the balance is too low even inside the Mandate", async () => {
    const res = await moneyExecution.execute(input("AAPL", 8, { balance: 5 }));
    expect(res.evaluation.reasonCode).toBe("INSUFFICIENT_BALANCE");
  });

  it("refuses when Money Mode is paused", async () => {
    const paused = { ...DEMO_MANDATE, status: "PAUSED" as const };
    const res = await moneyExecution.execute(input("AAPL", 5, { mandate: paused, assetRule: assetRuleFor(paused, "AAPL") }));
    expect(res.evaluation.reasonCode).toBe("MANDATE_NOT_ACTIVE");
  });

  it("an ALLOW_ONCE decision covers exactly the requested action and nothing larger", async () => {
    const allowOnce: BoundaryRequest = {
      id: "br_1",
      status: "ALLOWED_ONCE",
      mandateVersion: DEMO_MANDATE.version,
      mandateNonce: DEMO_MANDATE.nonce,
      asset: "AAPL",
      actionType: "BUY",
      requestedNotional: 20,
      standingLimit: 10,
      reasonCode: "MANDATE_LIMIT_EXCEEDED",
      reason: "test",
      createdAt: new Date().toISOString(),
    };
    expect((await moneyExecution.execute(input("AAPL", 20, { allowOnce }))).ok).toBe(true);
    expect((await moneyExecution.execute(input("AAPL", 25, { allowOnce }))).ok).toBe(false);
    expect((await moneyExecution.execute(input("NVDA", 20, { allowOnce }))).ok).toBe(false);
    const stale = { ...allowOnce, mandateNonce: DEMO_MANDATE.nonce - 1 };
    expect((await moneyExecution.execute(input("AAPL", 20, { allowOnce: stale }))).ok).toBe(false);
  });
});

describe("guardian decisions", () => {
  const base = async () => {
    const evaluation = (await moneyExecution.evaluate(input("AAPL", 20)));
    return boundaryRequests.create({ mandate: DEMO_MANDATE, evaluation, asset: "AAPL", type: "BUY", amount: 20, reason: "x".repeat(300) });
  };

  it("keeps the child's reason short", async () => {
    const req = await base();
    expect(req.reason.length).toBe(140);
    expect(req.status).toBe("PENDING_HUMAN_DECISION");
  });

  it("widening advances version and nonce", async () => {
    const req = await base();
    const res = await boundaryRequests.decide({
      request: req,
      decision: "WIDEN_MANDATE",
      mandate: DEMO_MANDATE,
      newLimits: { maxActionNotional: 20, maxPeriodNotional: 50 },
    });
    expect(res.mandate.version).toBe(DEMO_MANDATE.version + 1);
    expect(res.mandate.nonce).toBe(DEMO_MANDATE.nonce + 1);
    expect(res.mandate.maxActionNotional).toBe(20);
    expect(res.request.status).toBe("WIDENED");
  });

  it("allow once and refuse leave standing authority unchanged", async () => {
    for (const decision of ["ALLOW_ONCE", "REFUSE"] as const) {
      const res = await boundaryRequests.decide({ request: await base(), decision, mandate: DEMO_MANDATE });
      expect(res.mandate).toEqual(DEMO_MANDATE);
    }
  });
});

describe("practice execution", () => {
  it("uses virtual cash and never touches Money state", async () => {
    const res = await practiceExecution.buy({ asset: asset("TSLA"), amount: 50, cash: 100 });
    expect(res.ok).toBe(true);
    expect(res.proof?.status).toBe("PRACTICE_LOCAL");
  });
});
