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
