import { evaluateBoundedAction } from "./bounded-autonomy.mjs";
import { configuredDevnetExecutionProviderFromEnv } from "./devnet-execution-provider.mjs";
import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSnapshot,
  fetchPythProHistory,
} from "./pyth-adapter.mjs";

const FAMILY_NAME = "stocklana-demo-family";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function familyStub(env) {
  if (!env?.FAMILY_STATE) return null;
  const id = env.FAMILY_STATE.idFromName(FAMILY_NAME);
  return env.FAMILY_STATE.get(id);
}

async function callFamily(env, path, { method = "GET", body = null } = {}) {
  const stub = familyStub(env);
  if (!stub) throw new Error("FAMILY_STATE_BINDING_UNAVAILABLE");
  const init = { method, headers: { "content-type": "application/json" } };
  if (body != null) init.body = JSON.stringify(body);
  return stub.fetch("https://family.internal" + path, init);
}

async function familyJson(env, path, options) {
  const response = await callFamily(env, path, options);
  const body = await response.json();
  return { status: response.status, body };
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function validateSession(env, request) {
  const token = bearerToken(request);
  if (!token) return null;

  const validated = await familyJson(env, "/session/validate", {
    method: "POST",
    body: { token }
  });
  if (validated.status !== 200 || validated.body?.valid !== true) return null;
  return validated.body;
}

async function requireFamilySession(env, request, allowedRoles = ["child", "guardian"]) {
  const session = await validateSession(env, request);
  if (!session) return json({ error: "FAMILY_SESSION_REQUIRED" }, 401);
  if (!allowedRoles.includes(session.role)) {
    return json({ error: "ROLE_NOT_ALLOWED" }, 403);
  }
  return null;
}

async function requireGuardian(env, request) {
  const denied = await requireFamilySession(env, request, ["guardian"]);
  if (!denied) return null;
  const status = denied.status === 401 ? 401 : 403;
  return json({ error: "GUARDIAN_SESSION_REQUIRED" }, status);
}

function currentAssetRule(family, runtime) {
  return {
    asset: "AAPL",
    enabled: runtime.assetRule?.enabled === true,
    allowedActions: ["BUY"],
    maxActionNotional: Number(runtime.mandate.maxActionNotionalMicroUsd || 0) / 1_000_000,
    maxPeriodNotional: Number(runtime.mandate.maxPeriodNotionalMicroUsd || 0) / 1_000_000,
    spentThisPeriod: Number(family.mandate?.spentThisPeriod || 0),
    requiresMarketEvidence: false
  };
}

function mergedMandate(family, runtime) {
  return {
    ...family.mandate,
    status: runtime.mandate.status,
    version: runtime.mandate.version,
    nonce: runtime.mandate.nonce,
    maxActionNotional:
      Number(runtime.mandate.maxActionNotionalMicroUsd || 0) / 1_000_000,
    maxPeriodNotional:
      Number(runtime.mandate.maxPeriodNotionalMicroUsd || 0) / 1_000_000,
    allowedAssets: runtime.assetRule?.enabled === true ? ["AAPL"] : [],
    allowedActions: ["BUY"],
    updatedAt: new Date().toISOString()
  };
}

async function loadRuntimeAndFamily(env) {
  const provider = configuredDevnetExecutionProviderFromEnv();
  if (!provider) throw new Error("DEVNET_EXECUTION_RUNTIME_UNAVAILABLE");

  const [runtime, familyResult] = await Promise.all([
    provider.getState(),
    familyJson(env, "/state")
  ]);
  const family = familyResult.body;
  const mandate = mergedMandate(family, runtime);
  await familyJson(env, "/sync-mandate", {
    method: "POST",
    body: { mandate }
  });
  return { provider, runtime, family: { ...family, mandate } };
}

function evaluationForReserve(family, runtime, body) {
  const requestedNotional = Number(
    body.notional ?? body.action?.notional ?? body.action?.amount ?? 0
  );
  const action = {
    asset: String(body.asset ?? body.action?.asset ?? "").toUpperCase(),
    type: String(body.type ?? body.action?.type ?? "BUY").toUpperCase(),
    amount: requestedNotional,
    notional: requestedNotional,
    expectedNonce: body.expectedNonce ?? body.action?.expectedNonce
  };
  const result = evaluateBoundedAction({
    mandate: family.mandate,
    assetRule: currentAssetRule(family, runtime),
    action
  });

  if (
    result.decision === "ALLOW" &&
    Number(body.notional || 0) > Number(family.balances?.money || 0)
  ) {
    return {
      ...result,
      decision: "REFUSE",
      reasonCode: "INSUFFICIENT_BALANCE"
    };
  }
  return result;
}

async function handleMandateTransition(env, body) {
  const { provider, runtime, family } = await loadRuntimeAndFamily(env);
  const expectedNonce = Number(body.expectedNonce ?? runtime.mandate.nonce);
  if (expectedNonce !== Number(runtime.mandate.nonce)) {
    return json({ error: "STALE_NONCE", mandate: family.mandate }, 409);
  }

  const changes = body.changes || {};
  const signatures = [];
  let state = runtime;

  const limitChange =
    changes.maxActionNotional != null || changes.maxPeriodNotional != null;

  if (limitChange) {
    const currentAction =
      Number(state.mandate.maxActionNotionalMicroUsd || 0) / 1_000_000;
    const currentPeriod =
      Number(state.mandate.maxPeriodNotionalMicroUsd || 0) / 1_000_000;

    const result = await provider.configureMandatePolicy({
      expectedNonce: state.mandate.nonce,
      maxActionNotional: Number(changes.maxActionNotional ?? currentAction),
      maxPeriodNotional: Number(changes.maxPeriodNotional ?? currentPeriod),
      expiresAt: 0,
      maxMarketAgeSeconds: 30,
      maxConfidenceBps: 100
    });
    signatures.push(result.signature);
    state = result.state;
  }

  if (changes.status && changes.status !== state.mandate.status) {
    const result = await provider.setMandateStatus({
      expectedNonce: state.mandate.nonce,
      status: changes.status
    });
    signatures.push(result.signature);
    state = result.state;
  }

  if (Array.isArray(changes.allowedAssets)) {
    const shouldEnableAapl = changes.allowedAssets.includes("AAPL");
    if (shouldEnableAapl !== (state.assetRule?.enabled === true)) {
      const result = await provider.setCurrentAssetEnabled({
        expectedNonce: state.mandate.nonce,
        enabled: shouldEnableAapl
      });
      signatures.push(result.signature);
      state = result.state;
    }
  }

  const mandate = mergedMandate(family, state);
  const synced = await familyJson(env, "/sync-mandate", {
    method: "POST",
    body: { mandate }
  });

  return json({
    contractVersion: "0.2",
    type: "V0_2_MANDATE_TRANSITION",
    mandate: synced.body.mandate,
    proof: {
      network: "solana-devnet",
      signatures,
      programId: state.programId,
      simulated: false
    }
  });
}

async function handleExecute(env, body) {
  const { provider, runtime, family } = await loadRuntimeAndFamily(env);
  const key = String(body.idempotencyKey || "");

  const reserved = await familyJson(env, "/reserve", {
    method: "POST",
    body: {
      asset: body.asset,
      notional: body.notional,
      idempotencyKey: key,
      allowOnceRequestId: body.allowOnceRequestId || null
    }
  });

  if (reserved.body?.result) return json(reserved.body.result);

  if (reserved.body?.reservation && reserved.body.replay) {
    return json({
      contractVersion: "0.2",
      type: "V0_2_ACTION_EXECUTION",
      evaluation: {
        decision: "ALLOW",
        reasonCode: "EXECUTION_PENDING",
        mandateVersion: runtime.mandate.version,
        mandateNonce: runtime.mandate.nonce
      },
      executionProof: {
        status: "PENDING",
        network: "solana-devnet",
        programId: runtime.programId,
        mandateVersion: runtime.mandate.version,
        mandateNonce: runtime.mandate.nonce,
        executedAt: reserved.body.reservation.createdAt,
        idempotencyKey: key,
        simulated: false
      }
    });
  }

  if (reserved.body?.allowed === false) {
    return json({
      contractVersion: "0.2",
      type: "V0_2_ACTION_EXECUTION",
      evaluation: {
        decision: "REFUSE",
        reasonCode: reserved.body.reasonCode,
        boundaryRequestAvailable:
          reserved.body.boundaryRequestAvailable === true,
        requestedNotional: Number(body.notional || 0),
        mandateVersion: runtime.mandate.version,
        mandateNonce: runtime.mandate.nonce
      },
      executionProof: null
    });
  }

  const result = await provider.execute({
    asset: body.asset,
    type: body.type,
    notional: body.notional,
    expectedNonce: runtime.mandate.nonce,
    idempotencyKey: key,
    allowOnceRequestId:
      reserved.body?.reservation?.allowOnceRequestId ||
      body.allowOnceRequestId ||
      null
  });

  const confirmed =
    result.evaluation?.decision === "ALLOW" &&
    result.executionProof?.status === "CONFIRMED";

  const priceMicro = Number(result.executionProof?.pyth?.unitPriceMicroUsd || 0);
  const shares =
    confirmed && priceMicro > 0
      ? Number(body.notional || 0) / (priceMicro / 1_000_000)
      : 0;

  await familyJson(env, "/finalize", {
    method: "POST",
    body: {
      idempotencyKey: key,
      success: confirmed,
      shares,
      proof: result.executionProof || null,
      result: {
        contractVersion: "0.2",
        type: "V0_2_ACTION_EXECUTION",
        runtimeMode: "SERVER_HELD_DEVNET_DEMO",
        idempotencyScope: "DURABLE_OBJECT_FAMILY",
        ...result
      }
    }
  });

  return json({
    contractVersion: "0.2",
    type: "V0_2_ACTION_EXECUTION",
    runtimeMode: "SERVER_HELD_DEVNET_DEMO",
    idempotencyScope: "DURABLE_OBJECT_FAMILY",
    ...result
  });
}

const MARKET_UNIVERSE = [
  "AAPL",
  "NVDA",
  "TSLA",
  "NFLX",
  "AMZN",
  "MSFT",
  "META",
  "MCD",
  "SPY",
  "QQQ",
];

async function marketQuote(symbol) {
  const normalized = String(symbol || "").toUpperCase();
  const feed = PYTH_PRO_EQUITY_FEEDS[normalized];
  if (!feed) {
    return {
      symbol: normalized,
      status: "UNAVAILABLE",
      source: "PYTH_PRO",
      reasonCode: "PYTH_FEED_NOT_CONFIGURED",
    };
  }

  const snapshot = await fetchPythProSnapshot({
    apiKey: process.env.PYTH_PRO_API_KEY,
    feed,
  });

  return {
    symbol: normalized,
    tokenizedSymbol: normalized + "x",
    source: "PYTH_PRO",
    feedId: feed.feedId,
    status: snapshot.status,
    price: snapshot.price ?? null,
    publishTime: snapshot.publishTime ?? null,
    confidenceBps: snapshot.confidenceBps ?? null,
    reasonCode: snapshot.reasonCode ?? null,
  };
}

const SERIES_WINDOWS = Object.freeze({
  "1D": { seconds: 24 * 60 * 60, resolution: "15" },
  "1W": { seconds: 7 * 24 * 60 * 60, resolution: "60" },
  "7D": { seconds: 7 * 24 * 60 * 60, resolution: "60" },
  "1M": { seconds: 30 * 24 * 60 * 60, resolution: "D" },
  "30D": { seconds: 30 * 24 * 60 * 60, resolution: "D" },
  "1Y": { seconds: 365 * 24 * 60 * 60, resolution: "D" },
  "All": { seconds: 540 * 24 * 60 * 60, resolution: "D" },
});

async function marketSeries(symbol, period) {
  const normalized = String(symbol || "").toUpperCase();
  const feed = PYTH_PRO_EQUITY_FEEDS[normalized];
  const window = SERIES_WINDOWS[period] || SERIES_WINDOWS["1M"];

  if (!feed) {
    return {
      contractVersion: "0.2",
      type: "V0_2_MARKET_SERIES",
      symbol: normalized,
      period,
      status: "UNAVAILABLE",
      source: "PYTH_PRO_HISTORY",
      points: [],
      reasonCode: "PYTH_HISTORY_FEED_NOT_CONFIGURED",
      truthBoundary: { fabricatedHistory: false },
    };
  }

  const to = Math.floor(Date.now() / 1000);
  const from = Math.max(
    Math.floor(Date.UTC(2025, 3, 1) / 1000),
    to - window.seconds,
  );
  const history = await fetchPythProHistory({
    apiKey: process.env.PYTH_PRO_API_KEY,
    feed,
    from,
    to,
    resolution: window.resolution,
  });

  return {
    contractVersion: "0.2",
    type: "V0_2_MARKET_SERIES",
    symbol: normalized,
    period,
    status: history.status,
    source: history.source,
    feedId: feed.feedId,
    resolution: history.resolution,
    points: history.points || [],
    reasonCode: history.reasonCode ?? null,
    truthBoundary: {
      fabricatedHistory: false,
      apiKeyExposedToBrowser: false,
    },
  };
}

async function handleConcurrencyProof(env) {
  const before = (await familyJson(env, "/state")).body;
  const pendingBefore = Object.values(before.reservations || {}).reduce(
    (sum, item) => sum + Number(item.notional || 0),
    0
  );
  const maxAction = Number(before.mandate?.maxActionNotional || 0);
  const periodRemaining = Math.max(
    0,
    Number(before.mandate?.maxPeriodNotional || 0) -
      Number(before.mandate?.spentThisPeriod || 0) -
      pendingBefore
  );
  const balanceRemaining = Math.max(
    0,
    Number(before.balances?.money || 0) - pendingBefore
  );
  const capacity = Math.min(periodRemaining, balanceRemaining);

  if (!(maxAction > 0) || !(capacity > 0)) {
    return {
      contractVersion: "0.2",
      type: "V0_2_CONCURRENCY_PROOF",
      status: "UNAVAILABLE",
      reasonCode: "NO_AVAILABLE_DEMO_CAPACITY",
      truthBoundary: { executesTrades: false }
    };
  }

  const amount = Math.min(maxAction, capacity);
  const attemptCount = Math.floor(capacity / amount) + 1;
  if (attemptCount < 2 || attemptCount > 64) {
    return {
      contractVersion: "0.2",
      type: "V0_2_CONCURRENCY_PROOF",
      status: "UNAVAILABLE",
      reasonCode: "PROOF_SHAPE_OUT_OF_RANGE",
      attemptCount,
      truthBoundary: { executesTrades: false }
    };
  }

  const proofId = crypto.randomUUID();
  const intents = Array.from({ length: attemptCount }, (_, index) => ({
    asset: index % 2 === 0 ? "AAPL" : "TSLA",
    notional: amount,
    idempotencyKey: `concurrency-proof-${proofId}-${index}`
  }));

  const results = await Promise.all(
    intents.map((intent) =>
      familyJson(env, "/reserve", { method: "POST", body: intent })
    )
  );

  const allowed = results
    .map((result, index) => ({ ...result.body, intent: intents[index] }))
    .filter((result) => result.allowed === true && result.reservation);
  const refused = results
    .map((result, index) => ({ ...result.body, intent: intents[index] }))
    .filter((result) => result.allowed === false);

  await Promise.all(
    allowed.map((entry) =>
      familyJson(env, "/finalize", {
        method: "POST",
        body: {
          idempotencyKey: entry.intent.idempotencyKey,
          success: false,
          result: {
            contractVersion: "0.2",
            type: "V0_2_CONCURRENCY_PROOF_RELEASE",
            released: true,
          },
        },
      })
    )
  );

  const after = (await familyJson(env, "/state")).body;
  const mutated =
    Number(after.balances?.money || 0) !== Number(before.balances?.money || 0) ||
    Number(after.mandate?.spentThisPeriod || 0) !==
      Number(before.mandate?.spentThisPeriod || 0);
  const allowedNotional = allowed.reduce(
    (sum, entry) => sum + Number(entry.intent.notional || 0),
    0
  );
  const pass =
    allowed.length >= 1 &&
    refused.length >= 1 &&
    allowedNotional <= capacity + 1e-9 &&
    !mutated;

  return {
    contractVersion: "0.2",
    type: "V0_2_CONCURRENCY_PROOF",
    status: pass ? "PASS" : "FAIL",
    attempted: intents.length,
    allowed: allowed.length,
    refused: refused.length,
    amountPerIntent: amount,
    availableCapacity: capacity,
    allowedNotional,
    assetsAttempted: [...new Set(intents.map((intent) => intent.asset))],
    refusalCodes: [...new Set(refused.map((entry) => entry.reasonCode).filter(Boolean))],
    stateUnchangedAfterRelease: !mutated,
    truthBoundary: {
      executesTrades: false,
      provesDurableReservationSerialization: true,
      aaplMoneyLaneProven: true,
      tslaExecutionClaimed: false,
    },
  };
}

export async function handleFamilyApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const body =
    ["POST", "PUT", "PATCH"].includes(method)
      ? await request.clone().json().catch(() => ({}))
      : {};

  if (method === "GET" && path === "/api/v0.2/market/quotes") {
    const requested = (url.searchParams.get("symbols") || MARKET_UNIVERSE.join(","))
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter((item) => MARKET_UNIVERSE.includes(item));

    const quotes = await Promise.all(requested.map(marketQuote));
    return json({
      contractVersion: "0.2",
      type: "V0_2_MARKET_QUOTES",
      quotes,
      truthBoundary: {
        onlyFreshPythIsLive: true,
        unavailableIsNeverZero: true,
      },
    });
  }

  if (method === "GET" && path === "/api/v0.2/market/series") {
    const symbol = String(url.searchParams.get("symbol") || "").toUpperCase();
    const period = String(url.searchParams.get("period") || "1M");
    return json(await marketSeries(symbol, period));
  }

  if (method === "POST" && path === "/api/v0.2/proofs/concurrency") {
    const denied = await requireGuardian(env, request);
    if (denied) return denied;
    return json(await handleConcurrencyProof(env));
  }

  if (method === "GET" && path === "/api/v0.2/family/state") {
    const denied = await requireFamilySession(env, request);
    if (denied) return denied;
    const out = await familyJson(env, "/state");
    return json(out.body, out.status);
  }

  if (method === "POST" && path === "/api/v0.2/auth/demo-session") {
    const out = await familyJson(env, "/session", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "POST" && path === "/api/v0.2/family/link") {
    const denied = await requireFamilySession(env, request, ["child"]);
    if (denied) return denied;
    const out = await familyJson(env, "/link", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/mandates/current") {
    const denied = await requireFamilySession(env, request);
    if (denied) return denied;
    const { runtime, family } = await loadRuntimeAndFamily(env);
    return json({
      contractVersion: "0.2",
      type: "V0_2_CURRENT_MANDATE",
      mandate: family.mandate,
      assetRule: currentAssetRule(family, runtime),
      source: "SOLANA_DEVNET_PLUS_DURABLE_FAMILY_STATE"
    });
  }

  if (method === "POST" && path === "/api/v0.2/mandates/transition") {
    const denied = await requireGuardian(env, request);
    if (denied) return denied;
    return handleMandateTransition(env, body);
  }

  if (method === "POST" && path === "/api/v0.2/actions/evaluate") {
    const denied = await requireFamilySession(env, request, ["child"]);
    if (denied) return denied;
    const { runtime, family } = await loadRuntimeAndFamily(env);
    return json({
      ...evaluationForReserve(family, runtime, body),
      type: "V0_2_ACTION_EVALUATION",
      source: "SERVER_OWNED_MANDATE"
    });
  }

  if (method === "POST" && path === "/api/v0.2/actions/execute") {
    const denied = await requireFamilySession(env, request, ["child"]);
    if (denied) return denied;
    return handleExecute(env, body);
  }

  if (method === "POST" && path === "/api/v0.2/boundary-requests") {
    const denied = await requireFamilySession(env, request, ["child"]);
    if (denied) return denied;
    const { family } = await loadRuntimeAndFamily(env);
    const evaluation = body.evaluation || {};
    const out = await familyJson(env, "/requests", {
      method: "POST",
      body: {
        asset: body.asset || body.action?.asset,
        type: body.type || body.action?.type,
        notional: body.notional ?? body.action?.notional,
        standingLimit:
          evaluation.standingLimit ?? family.mandate.maxActionNotional,
        reasonCode:
          evaluation.reasonCode || body.reasonCode || "MANDATE_LIMIT_EXCEEDED",
        reason: body.reason || ""
      }
    });
    return json(out.body, out.status);
  }

  if (
    method === "GET" &&
    ["/api/v0.2/boundary-requests", "/api/v0.2/boundary-requests/mine"].includes(path)
  ) {
    const denied = await requireFamilySession(env, request);
    if (denied) return denied;
    const suffix = url.searchParams.get("status")
      ? "?status=" + encodeURIComponent(url.searchParams.get("status"))
      : "";
    const out = await familyJson(env, "/requests" + suffix);
    return json(out.body, out.status);
  }

  const decisionMatch =
    method === "POST"
      ? path.match(/^\/api\/v0\.2\/boundary-requests\/([^/]+)\/decision$/)
      : null;
  if (decisionMatch) {
    const denied = await requireGuardian(env, request);
    if (denied) return denied;
    const id = decisionMatch[1];

    let first;
    if (body.decision === "ALLOW_ONCE") {
      const family = await familyJson(env, "/state");
      const existing = family.body?.requests?.find((item) => item.id === id);

      if (existing?.status === "ALLOWED_ONCE") {
        return json({ request: existing, mandate: family.body.mandate });
      }

      if (existing?.status === "ALLOW_ONCE_PENDING_CHAIN") {
        first = {
          status: 200,
          body: { request: existing, mandate: family.body.mandate }
        };
      } else {
        first = await familyJson(env, `/requests/${id}/decision`, {
          method: "POST",
          body
        });
      }
    } else {
      first = await familyJson(env, `/requests/${id}/decision`, {
        method: "POST",
        body
      });
    }

    if (first.status !== 200) {
      return json(first.body, first.status);
    }

    if (body.decision === "ALLOW_ONCE") {
      const { provider } = await loadRuntimeAndFamily(env);
      const item = first.body.request;

      let grant;
      try {
        grant = await provider.grantAllowanceOnce({
          requestId: id,
          expectedNonce: item.mandateNonce,
          maxNotional: item.requestedNotional,
        });
      } catch (error) {
        return json(
          {
            error: "ALLOW_ONCE_CHAIN_COMMIT_FAILED",
            retryable: true,
            request: item,
            message: error?.message ?? "Unable to commit one-time allowance"
          },
          503
        );
      }

      const completed = await familyJson(
        env,
        `/requests/${id}/complete-allowance`,
        {
          method: "POST",
          body: {
            chainProof: {
              network: "solana-devnet",
              programId: "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
              signature: grant.signature,
              allowanceReceipt: grant.allowanceReceipt,
              requestHash: grant.requestHash,
              maxNotionalMicroUsd: grant.maxNotionalMicroUsd,
              expiresAt: grant.expiresAt,
              reusedExistingReceipt: grant.reusedExistingReceipt === true,
              simulated: false
            }
          }
        }
      );
      return json(completed.body, completed.status);
    }

    if (body.decision !== "WIDEN_MANDATE") {
      return json(first.body, first.status);
    }

    const current = await handleMandateTransition(env, {
      expectedNonce: first.body.mandate.nonce,
      changes: body.newLimits || {}
    });
    const transition = await current.json();
    if (!current.ok) return json(transition, current.status);

    const completed = await familyJson(env, `/requests/${id}/complete-widen`, {
      method: "POST",
      body: {
        mandate: transition.mandate,
        chainProof: transition.proof
      }
    });
    return json(completed.body, completed.status);
  }

  if (method === "POST" && path === "/api/v0.2/funding/deposits") {
    const denied = await requireGuardian(env, request);
    if (denied) return denied;
    const out = await familyJson(env, "/funding", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/balances") {
    const denied = await requireFamilySession(env, request);
    if (denied) return denied;
    const out = await familyJson(env, "/state");
    return json({
      money: out.body.balances.money,
      practice: out.body.balances.practice,
      fundingMode: "DEVNET_TEST_CREDIT",
      realPaymentTaken: false
    });
  }

  if (method === "POST" && path === "/api/v0.2/learning/progress") {
    const denied = await requireFamilySession(env, request, ["child"]);
    if (denied) return denied;
    const out = await familyJson(env, "/learning", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/learning/summary") {
    const denied = await requireFamilySession(env, request);
    if (denied) return denied;
    const out = await familyJson(env, "/learning");
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/portfolio") {
    const denied = await requireFamilySession(env, request);
    if (denied) return denied;
    const mode = url.searchParams.get("mode") || "money";
    if (mode !== "money") return null;
    const out = await familyJson(env, "/portfolio");
    return json(out.body, out.status);
  }

  return null;
}
