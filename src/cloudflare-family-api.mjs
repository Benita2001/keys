import { evaluateBoundedAction } from "./bounded-autonomy.mjs";
import { configuredDevnetExecutionProviderFromEnv } from "./devnet-execution-provider.mjs";

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
    allowedAssets: ["AAPL"],
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
  const action = {
    asset: String(body.asset || "").toUpperCase(),
    type: String(body.type || "BUY").toUpperCase(),
    amount: Number(body.notional || 0),
    notional: Number(body.notional || 0),
    expectedNonce: body.expectedNonce
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
      idempotencyKey: key
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
    idempotencyKey: key
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

export async function handleFamilyApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const body =
    ["POST", "PUT", "PATCH"].includes(method)
      ? await request.clone().json().catch(() => ({}))
      : {};

  if (method === "GET" && path === "/api/v0.2/family/state") {
    const out = await familyJson(env, "/state");
    return json(out.body, out.status);
  }

  if (method === "POST" && path === "/api/v0.2/auth/demo-session") {
    const out = await familyJson(env, "/session", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "POST" && path === "/api/v0.2/family/link") {
    const out = await familyJson(env, "/link", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/mandates/current") {
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
    return handleMandateTransition(env, body);
  }

  if (method === "POST" && path === "/api/v0.2/actions/evaluate") {
    const { runtime, family } = await loadRuntimeAndFamily(env);
    return json({
      ...evaluationForReserve(family, runtime, body),
      type: "V0_2_ACTION_EVALUATION",
      source: "SERVER_OWNED_MANDATE"
    });
  }

  if (method === "POST" && path === "/api/v0.2/actions/execute") {
    return handleExecute(env, body);
  }

  if (method === "POST" && path === "/api/v0.2/boundary-requests") {
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
    const id = decisionMatch[1];
    const first = await familyJson(env, `/requests/${id}/decision`, {
      method: "POST",
      body
    });
    if (first.status !== 200 || body.decision !== "WIDEN_MANDATE") {
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
    const out = await familyJson(env, "/funding", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/balances") {
    const out = await familyJson(env, "/state");
    return json({
      money: out.body.balances.money,
      practice: out.body.balances.practice,
      fundingMode: "DEVNET_TEST_CREDIT",
      realPaymentTaken: false
    });
  }

  if (method === "POST" && path === "/api/v0.2/learning/progress") {
    const out = await familyJson(env, "/learning", { method: "POST", body });
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/learning/summary") {
    const out = await familyJson(env, "/learning");
    return json(out.body, out.status);
  }

  if (method === "GET" && path === "/api/v0.2/portfolio") {
    const mode = url.searchParams.get("mode") || "money";
    if (mode !== "money") return null;
    const out = await familyJson(env, "/portfolio");
    return json(out.body, out.status);
  }

  return null;
}
