import { beforeEach, describe, expect, it, vi } from "vitest";
import { assetRuleFor } from "@/domain/policy";
import type { ActionEvaluation } from "@/domain/types";
import { DEMO_MANDATE } from "@/mocks/family";
import { MOCK_ASSETS } from "@/mocks/market";
import { boundaryRequests, funding, getCapabilities, marketData, moneyMainnetExecution, practiceDevnetExecution, practiceSandboxExecution } from ".";

const asset = (t: string) => MOCK_ASSETS.find((a) => a.ticker === t)!;
const input = (ticker: string, amount: number) => ({
  mandate: DEMO_MANDATE,
  assetRule: assetRuleFor(DEMO_MANDATE, ticker),
  asset: asset(ticker),
  type: "BUY" as const,
  amount,
  balance: 50,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
});

describe("capabilities (no backend configured)", () => {
  it("practice is sandbox-only and Money is Mainnet setup-required", () => {
    const caps = getCapabilities();
    expect(caps.practice).toBe("sandbox-only");
    expect(caps.practiceFunding).toBe("none");
    expect(caps.money).toBe("mainnet-setup-required");
  });
});

describe("Practice on Devnet without a backend", () => {
  it("has no Devnet lane: nothing executes and no proof is invented", async () => {
    expect(practiceDevnetExecution.supports(asset("AAPL"))).toBe(false);
    const res = await practiceDevnetExecution.execute(input("AAPL", 5));
    expect(res.ok).toBe(false);
    expect(res.proof).toBeUndefined();
  });
});

describe("Money on Mainnet", () => {
  it("is hard-gated: SETUP_REQUIRED without contacting any network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      expect(moneyMainnetExecution.supports(asset("AAPL"))).toBe(false);
      const evaluation = await moneyMainnetExecution.evaluate(input("AAPL", 5));
      expect(evaluation.reasonCode).toBe("MAINNET_SETUP_REQUIRED");
      const res = await moneyMainnetExecution.execute(input("AAPL", 5));
      expect(res.outcome).toBe("SETUP_REQUIRED");
      expect(res.ok).toBe(false);
      expect(res.proof).toBeUndefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("never fakes real funding", async () => {
    await expect(funding.depositUsdc({ amount: 10 })).rejects.toThrow(/Mainnet account/);
  });

  it("no asset is Money-eligible today; AAPL is verification-required, others unavailable", async () => {
    const assets = await marketData.listAssets();
    expect(assets.some((a) => a.moneyModeStatus === "eligible")).toBe(false);
    expect(assets.find((a) => a.ticker === "AAPL")?.moneyModeStatus).toBe("verification-required");
    expect(assets.filter((a) => a.ticker !== "AAPL").every((a) => a.moneyModeStatus === "unavailable")).toBe(true);
  });
});

describe("guardian decisions (offline Key preview)", () => {
  const refusal: ActionEvaluation = {
    decision: "REFUSE",
    reasonCode: "MANDATE_LIMIT_EXCEEDED",
    requestedNotional: 20,
    standingLimit: 10,
    boundaryRequestAvailable: true,
    source: "local-preview",
  };
  const base = () =>
    boundaryRequests.create({ mandate: DEMO_MANDATE, evaluation: refusal, asset: "AAPL", type: "BUY", amount: 20, reason: "x".repeat(300) });

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

describe("Practice sandbox", () => {
  it("uses sandbox cash and is labeled local, never on-chain", async () => {
    const res = await practiceSandboxExecution.buy({ asset: asset("TSLA"), amount: 50, cash: 100 });
    expect(res.ok).toBe(true);
    expect(res.proof?.status).toBe("PRACTICE_LOCAL");
    expect(res.proof?.network).toBeUndefined();
    expect(res.proof?.signature).toBeUndefined();
  });
});
