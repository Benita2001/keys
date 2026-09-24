import test from "node:test";
import assert from "node:assert/strict";

import { FamilyState } from "../src/cloudflare-family-state.mjs";
import { handleFamilyApi } from "../src/cloudflare-family-api.mjs";

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
    FAMILY_STATE: {
      idFromName(name) {
        return name;
      },
      get() {
        return {
          fetch(url, init = {}) {
            return instance.fetch(new Request(url, init));
          }
        };
      }
    }
  };
}

async function body(response) {
  return response.json();
}

test("guardian-only funding refuses missing or child sessions and accepts a guardian demo session", async () => {
  const env = familyEnv();

  const noSession = await handleFamilyApi(
    new Request("https://keys.example/api/v0.2/funding/deposits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 10 })
    }),
    env
  );
  assert.equal(noSession.status, 401);

  const childLogin = await handleFamilyApi(
    new Request("https://keys.example/api/v0.2/auth/demo-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "child", displayName: "Alex" })
    }),
    env
  );
  const child = await body(childLogin);
  assert.equal(typeof child.token, "string");

  const childFunding = await handleFamilyApi(
    new Request("https://keys.example/api/v0.2/funding/deposits", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${child.token}`
      },
      body: JSON.stringify({ amount: 10 })
    }),
    env
  );
  assert.equal(childFunding.status, 403);

  const guardianLogin = await handleFamilyApi(
    new Request("https://keys.example/api/v0.2/auth/demo-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "guardian", displayName: "Sam" })
    }),
    env
  );
  const guardian = await body(guardianLogin);
  assert.equal(typeof guardian.token, "string");

  const funded = await handleFamilyApi(
    new Request("https://keys.example/api/v0.2/funding/deposits", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${guardian.token}`
      },
      body: JSON.stringify({ amount: 10 })
    }),
    env
  );
  assert.equal(funded.status, 200);
  const fundedBody = await body(funded);
  assert.equal(fundedBody.status, "DEVNET_TEST_CREDITED");
  assert.equal(fundedBody.realPaymentTaken, false);
  assert.equal(fundedBody.availableBalance, 60);
});

test("durable reservations enforce one family-wide period and balance boundary", async () => {
  const state = new FamilyState(memoryState());

  for (let i = 0; i < 5; i += 1) {
    const response = await state.fetch(
      new Request("https://family.internal/reserve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          asset: "AAPL",
          notional: 10,
          idempotencyKey: `intent-${i}`
        })
      })
    );
    const result = await body(response);
    assert.equal(result.allowed, true);
  }

  const sixth = await state.fetch(
    new Request("https://family.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        asset: "AAPL",
        notional: 10,
        idempotencyKey: "intent-6"
      })
    })
  );
  const sixthBody = await body(sixth);
  assert.equal(sixthBody.allowed, false);
  assert.equal(sixthBody.reasonCode, "PERIOD_LIMIT_EXCEEDED");
});

test("market universe never fabricates a live quote when Pyth is unavailable", async () => {
  const previous = process.env.PYTH_PRO_API_KEY;
  delete process.env.PYTH_PRO_API_KEY;

  try {
    const response = await handleFamilyApi(
      new Request(
        "https://keys.example/api/v0.2/market/quotes?symbols=AAPL,NVDA"
      ),
      {}
    );
    assert.equal(response.status, 200);
    const result = await body(response);
    assert.equal(result.type, "V0_2_MARKET_QUOTES");
    assert.equal(result.quotes.length, 2);

    for (const quote of result.quotes) {
      assert.equal(quote.status, "UNAVAILABLE");
      assert.notEqual(quote.price, 0);
    }
  } finally {
    if (previous == null) delete process.env.PYTH_PRO_API_KEY;
    else process.env.PYTH_PRO_API_KEY = previous;
  }
});


test("allow-once becomes executable only after chain proof and is consumed once", async () => {
  const state = new FamilyState(memoryState());

  const createdResponse = await state.fetch(
    new Request("https://family.internal/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        asset: "AAPL",
        type: "BUY",
        notional: 20,
        standingLimit: 10,
        reasonCode: "MANDATE_LIMIT_EXCEEDED",
        reason: "One-time test"
      })
    })
  );
  const created = await body(createdResponse);

  const decisionResponse = await state.fetch(
    new Request(`https://family.internal/requests/${created.id}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "ALLOW_ONCE" })
    })
  );
  const decided = await body(decisionResponse);
  assert.equal(decided.request.status, "ALLOW_ONCE_PENDING_CHAIN");

  const beforeChain = await state.fetch(
    new Request("https://family.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        asset: "AAPL",
        notional: 20,
        idempotencyKey: "allow-before-chain",
        allowOnceRequestId: created.id
      })
    })
  );
  const beforeChainBody = await body(beforeChain);
  assert.equal(beforeChainBody.allowed, false);
  assert.equal(beforeChainBody.reasonCode, "MANDATE_LIMIT_EXCEEDED");

  const completedResponse = await state.fetch(
    new Request(
      `https://family.internal/requests/${created.id}/complete-allowance`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainProof: {
            network: "solana-devnet",
            allowanceReceipt: "Receipt111111111111111111111111111111111",
            signature: "Sig1111111111111111111111111111111111111111111111111111111111"
          }
        })
      }
    )
  );
  const completed = await body(completedResponse);
  assert.equal(completed.request.status, "ALLOWED_ONCE");

  const reserveResponse = await state.fetch(
    new Request("https://family.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        asset: "AAPL",
        notional: 20,
        idempotencyKey: "allow-once-use",
        allowOnceRequestId: created.id
      })
    })
  );
  const reserved = await body(reserveResponse);
  assert.equal(reserved.allowed, true);
  assert.equal(reserved.reservation.allowOnceRequestId, created.id);

  await state.fetch(
    new Request("https://family.internal/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: "allow-once-use",
        success: true,
        shares: 0.05,
        proof: { status: "CONFIRMED" }
      })
    })
  );

  const after = await body(
    await state.fetch(new Request("https://family.internal/requests"))
  );
  const consumed = after.requests.find((item) => item.id === created.id);
  assert.equal(consumed.status, "ALLOWED_ONCE_USED");

  const reuseResponse = await state.fetch(
    new Request("https://family.internal/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        asset: "AAPL",
        notional: 20,
        idempotencyKey: "allow-once-reuse",
        allowOnceRequestId: created.id
      })
    })
  );
  const reuse = await body(reuseResponse);
  assert.equal(reuse.allowed, false);
  assert.equal(reuse.reasonCode, "MANDATE_LIMIT_EXCEEDED");
});
