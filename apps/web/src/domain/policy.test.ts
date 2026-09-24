import { describe, expect, it } from "vitest";
// The repository's canonical backend policy facade (root package, not bundled into the app).
import { evaluateBoundedAction as backendEvaluate } from "../../../../src/bounded-autonomy.mjs";
import { DEMO_MANDATE } from "@/mocks/family";
import { assetRuleFor, evaluateBoundedAction, maxAllowedNow } from "./policy";
import type { CurrentMandate } from "./types";

const mandate: CurrentMandate = { ...DEMO_MANDATE };

function both(m: CurrentMandate, ticker: string, notional: number, expectedNonce?: number) {
  const rule = assetRuleFor(m, ticker);
  const local = evaluateBoundedAction({ mandate: m, assetRule: rule, action: { asset: ticker, type: "BUY", notional, expectedNonce } });
  const backend = backendEvaluate({
    mandate: { status: m.status, version: m.version, nonce: m.nonce, expiresAt: m.expiresAt },
    assetRule: rule,
    action: { asset: ticker, type: "BUY", amount: notional, notional, expectedNonce },
  });
  return { local, backend };
}

describe("local policy preview mirrors the KEYS backend facade", () => {
  const cases: [string, CurrentMandate, string, number, number?][] = [
    ["in-bounds action", mandate, "AAPL", 5],
    ["exactly at the per-action limit", mandate, "AAPL", 10],
    ["over the per-action limit", mandate, "AAPL", 20],
    ["over the period limit", { ...mandate, spentThisPeriod: 45 }, "AAPL", 10],
    ["asset outside the mandate", mandate, "TSLA", 5],
    ["paused mandate", { ...mandate, status: "PAUSED" }, "AAPL", 5],
    ["revoked mandate", { ...mandate, status: "REVOKED" }, "AAPL", 5],
    ["stale nonce", mandate, "AAPL", 5, 2],
    ["invalid amount", mandate, "AAPL", 0],
  ];

  it.each(cases)("%s", (_name, m, ticker, notional, nonce) => {
    const { local, backend } = both(m, ticker, notional, nonce);
    expect(local.decision).toBe(backend.decision);
    expect(local.reasonCode).toBe(backend.reasonCode);
    expect(Boolean(local.boundaryRequestAvailable)).toBe(Boolean(backend.boundaryRequestAvailable));
  });
});

describe("bounded autonomy semantics", () => {
  it("in-bounds actions never require guardian approval", () => {
    const { local } = both(mandate, "NVDA", 10);
    expect(local.decision).toBe("ALLOW");
    expect(local.guardianApprovalRequired).toBe(false);
  });

  it("out-of-bounds actions refuse with a boundary request available", () => {
    const { local } = both(mandate, "NVDA", 20);
    expect(local.decision).toBe("REFUSE");
    expect(local.reasonCode).toBe("MANDATE_LIMIT_EXCEEDED");
    expect(local.boundaryRequestAvailable).toBe(true);
    expect(local.standingLimit).toBe(10);
  });

  it("maxAllowedNow respects per-action, period and balance", () => {
    expect(maxAllowedNow(mandate, 50)).toBe(10);
    expect(maxAllowedNow({ ...mandate, spentThisPeriod: 46 }, 50)).toBe(4);
    expect(maxAllowedNow(mandate, 3)).toBe(3);
    expect(maxAllowedNow({ ...mandate, status: "PAUSED" }, 50)).toBe(0);
  });
});

describe("request staleness and copy (Q006, Q010)", () => {
  it("marks pending requests made under an older nonce as stale", async () => {
    const { isRequestStale } = await import("./policy");
    expect(isRequestStale({ status: "PENDING_HUMAN_DECISION", mandateNonce: mandate.nonce }, mandate)).toBe(false);
    expect(isRequestStale({ status: "PENDING_HUMAN_DECISION", mandateNonce: mandate.nonce - 1 }, mandate)).toBe(true);
    expect(isRequestStale({ status: "REFUSED", mandateNonce: mandate.nonce - 1 }, mandate)).toBe(false);
  });

  it("never tells a Practice user to ask a parent for money", async () => {
    const { explainEvaluation } = await import("./policy");
    const e = { decision: "REFUSE" as const, reasonCode: "INSUFFICIENT_BALANCE" as const, source: "local-preview" as const };
    expect(explainEvaluation(e, mandate, "Apple", "practice").body).not.toMatch(/parent/i);
    expect(explainEvaluation(e, mandate, "Apple", "money").title).toMatch(/Money balance/);
  });
});
