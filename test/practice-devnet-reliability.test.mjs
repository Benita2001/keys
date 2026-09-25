import test from "node:test";
import assert from "node:assert/strict";

import {
  FamilyState,
  RESERVATION_TTL_MS,
  sweepStaleReservations
} from "../src/cloudflare-family-state.mjs";
import {
  handleFamilyApi,
  practicePeriod,
  resetChainViewCacheForTests,
  setDevnetProviderForTests
} from "../src/cloudflare-family-api.mjs";
import {
  SolanaRpcUnavailableError,
  createResilientRpcFetch,
  isTransientRpcError
} from "../src/solana-rpc.mjs";

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

function memoryState() {
  const values = new Map();
  return {
    storage: {
      async get(key) {
        return values.get(key);
      },
      async put(key, value) {
        values.set(key, structuredClone(value));
      }
    }
  };
}

function familyEnv() {
  const instance = new FamilyState(memoryState());
  return {
    instance,
    FAMILY_STATE: {
      idFromName: (name) => name,
      get: () => ({ fetch: (url, init = {}) => instance.fetch(new Request(url, init)) })
    }
  };
}

async function call(env, path, { method = "GET", token, body } = {}) {
  const res = await handleFamilyApi(
    new Request("https://keys.example" + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    }),
    env
  );
  return { status: res.status, body: await res.json() };
}

async function session(env, role) {
  const out = await call(env, "/api/v0.2/auth/demo-session", {
    method: "POST",
    body: { role, displayName: role === "child" ? "Alex" : "Sam" }
  });
  return out.body.token;
}

async function familyState(env) {
  const res = await env.instance.fetch(new Request("https://family.internal/state"));
  return res.json();
}

function runtime({ nonce = 5, version = 6, spentMicro = 0, maxPeriod = 100 } = {}) {
  return {
    programId: "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
    mandate: {
      status: "ACTIVE",
      version,
      nonce,
      maxActionNotionalMicroUsd: 10_000_000,
      maxPeriodNotionalMicroUsd: maxPeriod * 1_000_000
    },
    assetRule: {
      enabled: true,
      spentThisPeriodNotionalMicroUsd: spentMicro,
      periodSeconds: 30 * 24 * 3600,
      periodStartedAt: Math.floor(Date.now() / 1000) - 3600
    }
  };
}

const confirmedProof = (key, signature = "SIG_CONFIRMED") => ({
  status: "CONFIRMED",
  network: "solana-devnet",
  signature,
  programId: "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
  idempotencyKey: key,
  simulated: false,
  executionAsset: "DEMO_TOKEN",
  pyth: { status: "FRESH", feedId: 922, unitPriceMicroUsd: 336_000_000 }
});

function fakeProvider(overrides = {}) {
  const calls = { execute: 0, check: 0 };
  const provider = {
    calls,
    state: runtime(),
    async getState() {
      return provider.state;
    },
    async execute(input) {
      calls.execute += 1;
      return overrides.execute
        ? overrides.execute(input, calls.execute)
        : {
            evaluation: { decision: "ALLOW", reasonCode: "WITHIN_MANDATE" },
            executionProof: confirmedProof(input.idempotencyKey)
          };
    },
    async checkSignature(input) {
      calls.check += 1;
      return overrides.checkSignature ? overrides.checkSignature(input, calls.check) : { status: "PENDING" };
    },
    async grantAllowanceOnce() {
      return { signature: "SIG_GRANT", allowanceReceipt: "R", requestHash: "H", maxNotionalMicroUsd: 1, expiresAt: 0 };
    }
  };
  return provider;
}

const exec = (key, notional = 5) => ({
  asset: "AAPL",
  type: "BUY",
  notional,
  expectedNonce: 5,
  idempotencyKey: key
});

test.afterEach(() => {
  setDevnetProviderForTests(null);
  resetChainViewCacheForTests();
});

/* ------------------------------------------------------------------ */
/* RPC transport                                                       */
/* ------------------------------------------------------------------ */

test("resilient RPC fetch retries 429 with backoff and rotates to the fallback URL", async () => {
  const hits = [];
  const delays = [];
  const fetchImpl = async (url) => {
    hits.push(url);
    return hits.length < 3 ? new Response("{}", { status: 429 }) : new Response('{"ok":true}', { status: 200 });
  };
  const rpcFetch = createResilientRpcFetch({
    urls: "https://dedicated.example,https://public.example",
    fetchImpl,
    sleep: async (ms) => delays.push(ms),
    random: () => 1
  });
  const res = await rpcFetch("ignored", { method: "POST", body: "{}" });
  assert.equal(res.status, 200);
  assert.deepEqual(hits, ["https://dedicated.example", "https://public.example", "https://dedicated.example"]);
  assert.deepEqual(delays, [250, 500]);
});

test("resilient RPC fetch gives up with a retryable SOLANA_RPC_UNAVAILABLE error", async () => {
  const rpcFetch = createResilientRpcFetch({
    urls: ["https://only.example"],
    fetchImpl: async () => new Response("", { status: 503 }),
    maxAttempts: 3,
    sleep: async () => {}
  });
  await assert.rejects(rpcFetch("x", {}), (error) => {
    assert.ok(error instanceof SolanaRpcUnavailableError);
    assert.equal(error.code, "SOLANA_RPC_UNAVAILABLE");
    assert.equal(error.retryable, true);
    return true;
  });
});

test("RPC outages are transient; program errors are not", () => {
  assert.equal(isTransientRpcError(new Error("failed to get info about account X: Error: 429 Too Many Requests")), true);
  assert.equal(isTransientRpcError(new Error("fetch failed")), true);
  const programError = new Error("Simulation failed: custom program error: 0x1771");
  programError.logs = ["Program log: AllowanceAlreadyUsed"];
  assert.equal(isTransientRpcError(programError), false);
  assert.equal(isTransientRpcError(new Error("AllowanceAlreadyUsed")), false);
});

/* ------------------------------------------------------------------ */
/* Reservations                                                        */
/* ------------------------------------------------------------------ */

test("stale unsent reservations are swept; sent ones wait for reconciliation", () => {
  const old = new Date(Date.now() - RESERVATION_TTL_MS - 1000).toISOString();
  const state = {
    reservations: {
      unsent: { idempotencyKey: "unsent", notional: 5, createdAt: old },
      fresh: { idempotencyKey: "fresh", notional: 5, createdAt: new Date().toISOString() },
      sent: { idempotencyKey: "sent", notional: 5, createdAt: old, pendingProof: { signature: "S" } }
    }
  };
  assert.equal(sweepStaleReservations(state), 1);
  assert.deepEqual(Object.keys(state.reservations).sort(), ["fresh", "sent"]);
});

test("a pre-send RPC failure returns 503 and never holds practice capital", async () => {
  const env = familyEnv();
  const provider = fakeProvider({
    execute: () => {
      throw new SolanaRpcUnavailableError("429 Too Many Requests", { sent: false });
    }
  });
  setDevnetProviderForTests(provider);
  const child = await session(env, "child");
  const before = await familyState(env);

  const out = await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-presend") });
  assert.equal(out.status, 503);
  assert.equal(out.body.error, "SOLANA_RPC_UNAVAILABLE");
  assert.equal(out.body.retryable, true);

  const after = await familyState(env);
  assert.deepEqual(after.reservations, {});
  assert.equal(after.balances.money, before.balances.money);

  // Same key retried once the RPC recovers: executes exactly once.
  provider.execute = async (input) => ({
    evaluation: { decision: "ALLOW", reasonCode: "WITHIN_MANDATE" },
    executionProof: confirmedProof(input.idempotencyKey)
  });
  const retry = await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-presend") });
  assert.equal(retry.body.executionProof.status, "CONFIRMED");
  assert.equal((await familyState(env)).balances.money, before.balances.money - 5);
});

test("an unconfirmed send stays PENDING, then reconciles to one confirmed practice receipt", async () => {
  const env = familyEnv();
  const provider = fakeProvider({
    execute: async (input) => {
      await input.onBeforeSend({ ...confirmedProof(input.idempotencyKey, "SIG_UNOBSERVED"), status: "PENDING", lastValidBlockHeight: 100 });
      return {
        evaluation: { decision: "ALLOW", reasonCode: "EXECUTION_PENDING" },
        executionProof: { status: "PENDING", signature: "SIG_UNOBSERVED" },
        unconfirmed: true
      };
    },
    checkSignature: () => ({ status: "CONFIRMED" })
  });
  setDevnetProviderForTests(provider);
  const child = await session(env, "child");
  const before = await familyState(env);

  const first = await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-pending") });
  assert.equal(first.body.executionProof.status, "PENDING");
  assert.equal(first.body.executionProof.signature, "SIG_UNOBSERVED");
  assert.equal((await familyState(env)).reservations["k-pending"].pendingProof.signature, "SIG_UNOBSERVED");

  const second = await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-pending") });
  assert.equal(second.body.executionProof.status, "CONFIRMED");
  assert.equal(second.body.network, "solana-devnet");
  assert.equal(second.body.realValue, false);
  assert.equal(provider.calls.execute, 1);

  const third = await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-pending") });
  assert.equal(third.body.executionProof.signature, "SIG_UNOBSERVED");

  const after = await familyState(env);
  assert.equal(after.balances.money, before.balances.money - 5);
  assert.deepEqual(after.reservations, {});
  const receipt = after.activity.find((a) => a.kind === "MONEY_EXECUTION");
  assert.equal(receipt.mode, "practice");
  assert.equal(receipt.network, "solana-devnet");
  assert.equal(receipt.realValue, false);
});

test("a sent transaction that expired without landing is released and the intent retried", async () => {
  const env = familyEnv();
  let n = 0;
  const provider = fakeProvider({
    execute: async (input) => {
      n += 1;
      if (n === 1) {
        await input.onBeforeSend({ signature: "SIG_LOST", lastValidBlockHeight: 1, status: "PENDING" });
        return { evaluation: { decision: "ALLOW" }, executionProof: { status: "PENDING", signature: "SIG_LOST" }, unconfirmed: true };
      }
      return { evaluation: { decision: "ALLOW", reasonCode: "WITHIN_MANDATE" }, executionProof: confirmedProof(input.idempotencyKey, "SIG_RETRY") };
    },
    checkSignature: () => ({ status: "EXPIRED" })
  });
  setDevnetProviderForTests(provider);
  const child = await session(env, "child");
  const before = await familyState(env);

  await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-expired") });
  const retry = await call(env, "/api/v0.2/actions/execute", { method: "POST", token: child, body: exec("k-expired") });
  assert.equal(retry.body.executionProof.signature, "SIG_RETRY");
  assert.equal((await familyState(env)).balances.money, before.balances.money - 5);
});

/* ------------------------------------------------------------------ */
/* Network truth + ledger reconciliation                               */
/* ------------------------------------------------------------------ */

test("family state separates Practice (Devnet, no real value) from Money (Mainnet, setup required)", async () => {
  const env = familyEnv();
  const provider = fakeProvider();
  provider.state = runtime({ spentMicro: 52_997_324 });
  setDevnetProviderForTests(provider);
  const child = await session(env, "child");

  const out = await call(env, "/api/v0.2/family/state", { token: child });
  assert.equal(out.status, 200);
  assert.equal(out.body.practice.network, "solana-devnet");
  assert.equal(out.body.practice.realValue, false);
  assert.equal(out.body.practice.capital, "DEMO_TOKEN");
  assert.equal(out.body.money.network, "solana-mainnet");
  assert.equal(out.body.money.realValue, true);
  assert.equal(out.body.money.status, "SETUP_REQUIRED");
  assert.equal(out.body.money.balance, null);

  // Chain is authoritative for on-chain spend; the ledger reconciles to it.
  assert.equal(out.body.practice.period.source, "SOLANA_DEVNET_ASSET_RULE");
  assert.ok(Math.abs(out.body.practice.period.onChainSpent - 52.997324) < 1e-9);
  assert.ok(Math.abs(out.body.mandate.spentThisPeriod - 52.997324) < 1e-9);
  assert.ok(out.body.practice.period.resetsAt);
});

test("practice period remaining = max period - on-chain spend - held reservations", () => {
  const period = practicePeriod(
    { mandate: { maxPeriodNotional: 100, spentThisPeriod: 15 }, reservations: { a: { notional: 5 } } },
    runtime({ spentMicro: 53_000_000 })
  );
  assert.equal(period.onChainSpent, 53);
  assert.equal(period.held, 5);
  assert.equal(period.remaining, 42);
});

test("a widen that landed on-chain but stayed WIDEN_PENDING_CHAIN is reconciled", async () => {
  const env = familyEnv();
  const provider = fakeProvider();
  setDevnetProviderForTests(provider);
  const child = await session(env, "child");
  const guardian = await session(env, "guardian");

  // Chain at nonce 4 when the request is created and decided.
  provider.state = runtime({ nonce: 4, version: 5, maxPeriod: 50 });
  await call(env, "/api/v0.2/actions/evaluate", { method: "POST", token: child, body: { action: exec("x", 5) } });
  const created = await call(env, "/api/v0.2/boundary-requests", {
    method: "POST",
    token: child,
    body: { asset: "AAPL", type: "BUY", notional: 20, reason: "test", evaluation: { reasonCode: "PERIOD_LIMIT_EXCEEDED" } }
  });
  await env.instance.fetch(
    new Request(`https://family.internal/requests/${created.body.id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "WIDEN_MANDATE", newLimits: { maxPeriodNotional: 100 } })
    })
  );
  assert.equal((await familyState(env)).requests[0].status, "WIDEN_PENDING_CHAIN");

  // The widen transaction landed (nonce moved), but the app never heard back.
  provider.state = runtime({ nonce: 5, version: 6, maxPeriod: 100 });
  const out = await call(env, `/api/v0.2/boundary-requests/${created.body.id}/reconcile`, { method: "POST", token: guardian });
  assert.equal(out.status, 200);
  assert.equal(out.body.request.status, "WIDENED");
  assert.equal(out.body.request.chainProof.reconciledFromChain, true);
  assert.equal(out.body.mandate.maxPeriodNotional, 100);
});
