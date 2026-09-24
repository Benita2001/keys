/**
 * Execute integration against the MOCK KEYS API (scripts/mock-keys-api.mjs),
 * which implements the proposed POST /api/v0.2/actions/execute contract and
 * uses the repository's real bounded-autonomy policy.
 */
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMockKeysServer } from "../../scripts/mock-keys-api.mjs";
import { isVerifiableOnChain } from "@/components/proof";
import { assetRuleFor } from "@/domain/policy";
import type { BoundaryRequest } from "@/domain/types";
import { DEMO_MANDATE } from "@/mocks/family";
import { MOCK_ASSETS } from "@/mocks/market";
import { moneyExecution } from ".";
import { buildExecuteRequest, configureKeysBackend, executeAction } from "./keys-backend";

type Mock = { server: import("node:http").Server; stats: { executions: number } };

async function start(scenario: string): Promise<{ mock: Mock; url: string }> {
  const mock = createMockKeysServer({ scenario, slowMs: 400 }) as Mock;
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", r));
  const { port } = mock.server.address() as AddressInfo;
  return { mock, url: `http://127.0.0.1:${port}` };
}

const apple = MOCK_ASSETS.find((a) => a.ticker === "AAPL")!;
const input = (amount: number, idempotencyKey: string, extra: Record<string, unknown> = {}) => ({
  mandate: DEMO_MANDATE,
  assetRule: assetRuleFor(DEMO_MANDATE, "AAPL"),
  asset: apple,
  type: "BUY" as const,
  amount,
  balance: 50,
  idempotencyKey,
  ...extra,
});

const servers: Mock[] = [];
async function withScenario(scenario: string, timeoutMs = 2000) {
  const { mock, url } = await start(scenario);
  servers.push(mock);
  configureKeysBackend({ url, execution: "runtime", timeoutMs });
  return mock;
}

afterEach(() => configureKeysBackend(null));
afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise((r) => s.server.close(r))));
});

describe("runtime execute (mock KEYS API)", () => {
  it("executes an in-bounds action and returns a simulated, non-linkable proof", async () => {
    const mock = await withScenario("confirm");
    const res = await moneyExecution.execute(input(5, "intent-confirm-1"));
    expect(res.outcome).toBe("EXECUTED");
    expect(res.ok).toBe(true);
    expect(res.evaluation.source).toBe("keys-runtime");
    expect(res.evaluation.guardianApprovalRequired).toBe(false);
    expect(res.proof?.status).toBe("RUNTIME_CONFIRMED");
    expect(res.proof?.simulated).toBe(true);
    expect(res.proof?.signature?.startsWith("MOCK")).toBe(true);
    expect(isVerifiableOnChain(res.proof)).toBe(false);
    expect(mock.stats.executions).toBe(1);
  });

  it("refuses out-of-bounds actions without executing", async () => {
    const mock = await withScenario("confirm");
    const res = await moneyExecution.execute(input(20, "intent-over-limit"));
    expect(res.outcome).toBe("REFUSED");
    expect(res.evaluation.reasonCode).toBe("MANDATE_LIMIT_EXCEEDED");
    expect(res.evaluation.boundaryRequestAvailable).toBe(true);
    expect(res.proof).toBeUndefined();
    expect(mock.stats.executions).toBe(0);
  });

  it("is idempotent: the same key never executes twice", async () => {
    const mock = await withScenario("confirm");
    const a = await moneyExecution.execute(input(5, "intent-idem"));
    const b = await moneyExecution.execute(input(5, "intent-idem"));
    expect(a.proof?.signature).toBe(b.proof?.signature);
    expect(mock.stats.executions).toBe(1);
  });

  it("PENDING then confirmed on re-check with the same key", async () => {
    const mock = await withScenario("pending-once");
    const first = await moneyExecution.execute(input(5, "intent-pending"));
    expect(first.outcome).toBe("PENDING");
    expect(first.ok).toBe(false);
    const second = await moneyExecution.execute(input(5, "intent-pending"));
    expect(second.outcome).toBe("EXECUTED");
    expect(mock.stats.executions).toBe(1);
  });

  it("timeout is UNKNOWN (never success or failure); re-check confirms exactly once", async () => {
    const mock = await withScenario("slow", 100);
    const first = await moneyExecution.execute(input(5, "intent-slow"));
    expect(first.outcome).toBe("UNKNOWN");
    expect(first.evaluation.reasonCode).toBe("EXECUTION_UNCONFIRMED");
    configureKeysBackend({ url: (mock.server.address() as AddressInfo) && `http://127.0.0.1:${(mock.server.address() as AddressInfo).port}`, execution: "runtime", timeoutMs: 2000 });
    const second = await moneyExecution.execute(input(5, "intent-slow"));
    expect(second.outcome).toBe("EXECUTED");
    expect(mock.stats.executions).toBe(1);
  });

  it("a 5xx after executing is UNKNOWN, not a refusal", async () => {
    const mock = await withScenario("error500-once");
    expect((await moneyExecution.execute(input(5, "intent-500"))).outcome).toBe("UNKNOWN");
    expect((await moneyExecution.execute(input(5, "intent-500"))).outcome).toBe("EXECUTED");
    expect(mock.stats.executions).toBe(1);
  });

  it("a malformed success body is never shown as success", async () => {
    await withScenario("malformed");
    const res = await moneyExecution.execute(input(5, "intent-malformed"));
    expect(res.outcome).toBe("UNKNOWN");
    expect(res.ok).toBe(false);
  });

  it("an unreachable runtime is UNKNOWN", async () => {
    configureKeysBackend({ url: "http://127.0.0.1:1", execution: "runtime", timeoutMs: 500 });
    const res = await moneyExecution.execute(input(5, "intent-down"));
    expect(res.outcome).toBe("UNKNOWN");
  });

  it("a stale nonce is refused before execution", async () => {
    const mock = await withScenario("confirm");
    const body = buildExecuteRequest({
      mandate: DEMO_MANDATE,
      assetRule: assetRuleFor(DEMO_MANDATE, "AAPL"),
      asset: "AAPL",
      type: "BUY",
      notional: 5,
      idempotencyKey: "intent-stale-nonce",
    });
    const res = await executeAction({ ...body, expectedNonce: DEMO_MANDATE.nonce - 1 });
    expect(res.outcome).toBe("REFUSED");
    expect(res.evaluation.reasonCode).toBe("STALE_NONCE");
    expect(mock.stats.executions).toBe(0);
  });

  it("sends an allow-once id only when the guardian allowance covers the action", async () => {
    const mock = await withScenario("confirm");
    const allowOnce: BoundaryRequest = {
      id: "br_once",
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
    expect((await moneyExecution.execute(input(20, "intent-once-ok", { allowOnce }))).outcome).toBe("EXECUTED");
    expect((await moneyExecution.execute(input(25, "intent-once-too-big", { allowOnce }))).outcome).toBe("REFUSED");
    expect(mock.stats.executions).toBe(1);
  });
});

describe("demo mode is unchanged without runtime config", () => {
  beforeAll(() => configureKeysBackend(null));
  it("labels the proof DEMO_NOT_EXECUTED", async () => {
    const res = await moneyExecution.execute(input(5, "intent-demo"));
    expect(res.outcome).toBe("EXECUTED");
    expect(res.proof?.status).toBe("DEMO_NOT_EXECUTED");
    expect(res.proof?.signature).toBeUndefined();
  });
});
