/**
 * Execute integration against the MOCK KEYS API (scripts/mock-keys-api.mjs).
 *
 * These tests intentionally exercise the isolated technical execution adapter
 * directly. The normal Family Money lane remains demo/policy-only and must not
 * be globally routed into the single-asset devnet proof runtime.
 */
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMockKeysServer } from "../../scripts/mock-keys-api.mjs";
import { isVerifiableOnChain } from "@/components/proof";
import { assetRuleFor } from "@/domain/policy";
import { DEMO_MANDATE } from "@/mocks/family";
import { MOCK_ASSETS } from "@/mocks/market";
import { moneyExecution } from ".";
import {
  buildExecuteRequest,
  configureKeysBackend,
  executeAction,
} from "./keys-backend";

type Mock = { server: import("node:http").Server; stats: { executions: number } };

async function start(scenario: string): Promise<{ mock: Mock; url: string }> {
  const mock = createMockKeysServer({ scenario, slowMs: 400 }) as Mock;
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", r));
  const { port } = mock.server.address() as AddressInfo;
  return { mock, url: `http://127.0.0.1:${port}` };
}

const apple = MOCK_ASSETS.find((a) => a.ticker === "AAPL")!;

const familyInput = (
  amount: number,
  idempotencyKey: string,
  extra: Record<string, unknown> = {},
) => ({
  mandate: DEMO_MANDATE,
  assetRule: assetRuleFor(DEMO_MANDATE, "AAPL"),
  asset: apple,
  type: "BUY" as const,
  amount,
  balance: 50,
  idempotencyKey,
  ...extra,
});

const runtimeRequest = (
  amount: number,
  idempotencyKey: string,
  allowOnceRequestId?: string,
) =>
  buildExecuteRequest({
    mandate: DEMO_MANDATE,
    assetRule: assetRuleFor(DEMO_MANDATE, "AAPL"),
    asset: "AAPL",
    type: "BUY",
    notional: amount,
    idempotencyKey,
    allowOnceRequestId,
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

describe("isolated runtime execute adapter (mock KEYS API)", () => {
  it("executes an in-bounds action and returns a simulated, non-linkable proof", async () => {
    const mock = await withScenario("confirm");
    const res = await executeAction(runtimeRequest(5, "intent-confirm-1"));
    expect(res.outcome).toBe("EXECUTED");
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
    const res = await executeAction(runtimeRequest(20, "intent-over-limit"));
    expect(res.outcome).toBe("REFUSED");
    expect(res.evaluation.reasonCode).toBe("MANDATE_LIMIT_EXCEEDED");
    expect(res.evaluation.boundaryRequestAvailable).toBe(true);
    expect(res.proof).toBeUndefined();
    expect(mock.stats.executions).toBe(0);
  });

  it("is idempotent: the same key never executes twice", async () => {
    const mock = await withScenario("confirm");
    const a = await executeAction(runtimeRequest(5, "intent-idem"));
    const b = await executeAction(runtimeRequest(5, "intent-idem"));
    expect(a.proof?.signature).toBe(b.proof?.signature);
    expect(mock.stats.executions).toBe(1);
  });

  it("PENDING then confirmed on re-check with the same key", async () => {
    const mock = await withScenario("pending-once");
    const first = await executeAction(runtimeRequest(5, "intent-pending"));
    expect(first.outcome).toBe("PENDING");
    const second = await executeAction(runtimeRequest(5, "intent-pending"));
    expect(second.outcome).toBe("EXECUTED");
    expect(mock.stats.executions).toBe(1);
  });

  it("timeout is UNKNOWN; re-check confirms exactly once", async () => {
    const mock = await withScenario("slow", 100);
    const first = await executeAction(runtimeRequest(5, "intent-slow"));
    expect(first.outcome).toBe("UNKNOWN");
    expect(first.evaluation.reasonCode).toBe("EXECUTION_UNCONFIRMED");

    const address = mock.server.address() as AddressInfo;
    configureKeysBackend({
      url: `http://127.0.0.1:${address.port}`,
      execution: "runtime",
      timeoutMs: 2000,
    });

    const second = await executeAction(runtimeRequest(5, "intent-slow"));
    expect(second.outcome).toBe("EXECUTED");
    expect(mock.stats.executions).toBe(1);
  });

  it("a 5xx after executing is UNKNOWN, not a refusal", async () => {
    const mock = await withScenario("error500-once");
    expect(
      (await executeAction(runtimeRequest(5, "intent-500"))).outcome,
    ).toBe("UNKNOWN");
    expect(
      (await executeAction(runtimeRequest(5, "intent-500"))).outcome,
    ).toBe("EXECUTED");
    expect(mock.stats.executions).toBe(1);
  });

  it("a malformed success body is never shown as success", async () => {
    await withScenario("malformed");
    const res = await executeAction(runtimeRequest(5, "intent-malformed"));
    expect(res.outcome).toBe("UNKNOWN");
  });

  it("an unreachable runtime is UNKNOWN", async () => {
    configureKeysBackend({
      url: "http://127.0.0.1:1",
      execution: "runtime",
      timeoutMs: 500,
    });
    const res = await executeAction(runtimeRequest(5, "intent-down"));
    expect(res.outcome).toBe("UNKNOWN");
  });

  it("a stale nonce is refused before execution", async () => {
    const mock = await withScenario("confirm");
    const body = runtimeRequest(5, "intent-stale-nonce");
    const res = await executeAction({
      ...body,
      expectedNonce: DEMO_MANDATE.nonce - 1,
    });
    expect(res.outcome).toBe("REFUSED");
    expect(res.evaluation.reasonCode).toBe("STALE_NONCE");
    expect(mock.stats.executions).toBe(0);
  });

  it("passes an explicit allow-once request id through the technical adapter", async () => {
    const mock = await withScenario("confirm");
    const allowed = await executeAction(
      runtimeRequest(20, "intent-once-ok", "br_once"),
    );
    const tooBig = await executeAction(
      runtimeRequest(25, "intent-once-too-big"),
    );

    expect(allowed.outcome).toBe("EXECUTED");
    expect(tooBig.outcome).toBe("REFUSED");
    expect(mock.stats.executions).toBe(1);
  });
});

describe("Family Money lane uses the configured devnet-test runtime", () => {
  it("routes an in-bounds Money action through the runtime and surfaces proof", async () => {
    const mock = await withScenario("confirm");
    const res = await moneyExecution.execute(familyInput(5, "intent-family-runtime"));

    expect(res.outcome).toBe("EXECUTED");
    expect(res.proof?.status).toBe("RUNTIME_CONFIRMED");
    expect(res.proof?.simulated).toBe(true);
    expect(res.proof?.signature?.startsWith("MOCK")).toBe(true);
    expect(mock.stats.executions).toBe(1);
  });
});

describe("demo mode is unchanged without runtime config", () => {
  beforeAll(() => configureKeysBackend(null));

  it("labels the proof DEMO_NOT_EXECUTED", async () => {
    const res = await moneyExecution.execute(familyInput(5, "intent-demo"));
    expect(res.outcome).toBe("EXECUTED");
    expect(res.proof?.status).toBe("DEMO_NOT_EXECUTED");
    expect(res.proof?.signature).toBeUndefined();
  });
});
