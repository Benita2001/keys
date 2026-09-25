import { evaluateBoundedAction } from "./bounded-autonomy.mjs";
import { configuredDevnetExecutionProviderFromEnv } from "./devnet-execution-provider.mjs";
import { PRACTICE_DEVNET } from "./cloudflare-family-state.mjs";
import { isTransientRpcError } from "./solana-rpc.mjs";
import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSnapshot,
  fetchPythProHistory,
  discoverPythProMarkets,
} from "./pyth-adapter.mjs";

const FAMILY_NAME = "stocklana-demo-family";

let marketDiscoveryCache = null;
const MARKET_DISCOVERY_TTL_MS = 5 * 60 * 1000;

async function marketDiscovery(env) {
  const now = Date.now();
  if (marketDiscoveryCache && marketDiscoveryCache.expiresAt > now) {
    return marketDiscoveryCache.value;
  }

  const apiKey =
    env?.PYTH_PRO_API_KEY ||
    (typeof process !== "undefined" ? process.env?.PYTH_PRO_API_KEY : null);
  const value = await discoverPythProMarkets({
    apiKey,
    perClass: 3,
  });
  marketDiscoveryCache = {
    expiresAt: now + MARKET_DISCOVERY_TTL_MS,
    value,
  };
  return value;
}

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

let providerOverride = null;
/** Test seam: inject a fake Devnet provider. */
export function setDevnetProviderForTests(provider) {
  providerOverride = provider;
}
function devnetProvider() {
  return providerOverride ?? configuredDevnetExecutionProviderFromEnv();
}

async function loadRuntimeAndFamily(env) {
  const provider = devnetProvider();
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


/* ------------------------------------------------------------------ */
/* Practice (Devnet) state view + reconciliation                        */
/* ------------------------------------------------------------------ */

// Chain reads for passive state polling are rate-limited per isolate.
const CHAIN_VIEW_TTL_MS = 30_000;
const PENDING_CHAIN_RECONCILE_AFTER_MS = 30_000;
let chainViewCache = { at: 0, runtime: null };
let lastPendingSweepAt = 0;

async function cachedRuntime(provider, { fresh = false } = {}) {
  if (!fresh && chainViewCache.runtime && Date.now() - chainViewCache.at < CHAIN_VIEW_TTL_MS) {
    return chainViewCache.runtime;
  }
  const runtime = await provider.getState();
  chainViewCache = { at: Date.now(), runtime };
  return runtime;
}

export function resetChainViewCacheForTests() {
  chainViewCache = { at: 0, runtime: null };
  lastPendingSweepAt = 0;
}

/**
 * Period truth for Practice on Devnet: the on-chain asset rule is authoritative
 * for spend; the family ledger only adds amounts it is currently holding.
 */
export function practicePeriod(family, runtime) {
  const held = Object.values(family.reservations || {}).reduce(
    (sum, r) => sum + Number(r.notional || 0),
    0
  );
  const maxPeriod = Number(family.mandate?.maxPeriodNotional || 0);
  if (!runtime?.assetRule) {
    const spent = Number(family.mandate?.spentThisPeriod || 0);
    return {
      source: "FAMILY_LEDGER_ONLY",
      startedAt: null,
      seconds: null,
      onChainSpent: null,
      ledgerSpent: spent,
      held,
      maxPeriod,
      remaining: Math.max(0, maxPeriod - spent - held)
    };
  }
  const onChainSpent =
    Number(runtime.assetRule.spentThisPeriodNotionalMicroUsd || 0) / 1_000_000;
  const seconds = Number(runtime.assetRule.periodSeconds || 0) || null;
  const startedAtSec = Number(runtime.assetRule.periodStartedAt || 0);
  const startedAt = startedAtSec > 0 ? new Date(startedAtSec * 1000).toISOString() : null;
  const expired = seconds && startedAtSec > 0 && Date.now() / 1000 > startedAtSec + seconds;
  const spent = expired ? 0 : onChainSpent;
  return {
    source: "SOLANA_DEVNET_ASSET_RULE",
    startedAt,
    seconds,
    resetsAt: seconds && startedAt ? new Date((startedAtSec + seconds) * 1000).toISOString() : null,
    onChainSpent: spent,
    ledgerSpent: Number(family.mandate?.spentThisPeriod || 0),
    held,
    maxPeriod,
    remaining: Math.max(0, maxPeriod - spent - held)
  };
}

function withNetworkNamespaces(family, period) {
  const practiceActivity = (family.activity || []).filter((a) => a.kind === "MONEY_EXECUTION");
  const held = period.held;
  return {
    ...family,
    // Explicit network truth. The historical `balances.money` / `moneyHoldings`
    // fields are Practice capital on Solana Devnet.
    practice: {
      ...PRACTICE_DEVNET,
      programId: "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk",
      capital: "DEMO_TOKEN",
      balance: Number(family.balances?.money || 0),
      availableBalance: Math.max(0, Number(family.balances?.money || 0) - held),
      holdings: (family.moneyHoldings || []).map((h) => ({ ...h, ...PRACTICE_DEVNET })),
      activity: practiceActivity.map((a) => ({ ...a, ...PRACTICE_DEVNET })),
      period
    },
    money: {
      mode: "money",
      network: "solana-mainnet",
      realValue: true,
      status: "SETUP_REQUIRED",
      programId: null,
      balance: null,
      holdings: [],
      requirements: [
        "MAINNET_KEYS_PROGRAM_DEPLOYMENT",
        "GUARDIAN_IDENTITY_AND_ELIGIBILITY",
        "VERIFIED_TOKENIZED_STOCK_ROUTE",
        "REAL_USDC_FUNDING"
      ]
    }
  };
}

async function reconcilePendingChainRequests(env, provider, family, runtime, { force = false } = {}) {
  const stuck = (family.requests || []).filter(
    (r) =>
      (r.status === "WIDEN_PENDING_CHAIN" || r.status === "ALLOW_ONCE_PENDING_CHAIN") &&
      (force || Date.now() - Date.parse(r.decidedAt || 0) > PENDING_CHAIN_RECONCILE_AFTER_MS)
  );
  const results = [];
  for (const item of stuck) {
    if (item.status === "WIDEN_PENDING_CHAIN") {
      // The decision was taken at item.mandateNonce. If the chain nonce moved
      // past it, the widen transaction landed: finalize app state from chain.
      if (Number(runtime.mandate.nonce) > Number(item.mandateNonce)) {
        const out = await familyJson(env, `/requests/${item.id}/complete-widen`, {
          method: "POST",
          body: {
            mandate: mergedMandate(family, runtime),
            chainProof: {
              network: "solana-devnet",
              reconciledFromChain: true,
              mandateVersion: runtime.mandate.version,
              mandateNonce: runtime.mandate.nonce,
              simulated: false
            }
          }
        });
        results.push({ id: item.id, status: out.body?.request?.status });
      } else if (item.newLimits) {
        const current = await handleMandateTransition(env, {
          expectedNonce: runtime.mandate.nonce,
          changes: item.newLimits
        });
        const transition = await current.json();
        if (current.ok) {
          const out = await familyJson(env, `/requests/${item.id}/complete-widen`, {
            method: "POST",
            body: { mandate: transition.mandate, chainProof: transition.proof }
          });
          results.push({ id: item.id, status: out.body?.request?.status });
        }
      }
    } else {
      // Granting the allowance is idempotent (an existing receipt is reused).
      const grant = await provider.grantAllowanceOnce({
        requestId: item.id,
        expectedNonce: item.mandateNonce,
        maxNotional: item.requestedNotional
      });
      const out = await familyJson(env, `/requests/${item.id}/complete-allowance`, {
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
            reconciled: true,
            simulated: false
          }
        }
      });
      results.push({ id: item.id, status: out.body?.request?.status });
    }
  }
  return results;
}

async function practiceStateView(env) {
  const familyResult = await familyJson(env, "/state");
  let family = familyResult.body;
  const provider = devnetProvider();
  let runtime = null;
  if (provider) {
    try {
      runtime = await cachedRuntime(provider);
      const due =
        Date.now() - lastPendingSweepAt > PENDING_CHAIN_RECONCILE_AFTER_MS &&
        (family.requests || []).some((r) => /_PENDING_CHAIN$/.test(r.status));
      if (due) {
        lastPendingSweepAt = Date.now();
        const fresh = await cachedRuntime(provider, { fresh: true });
        const merged = { ...family, mandate: mergedMandate(family, fresh) };
        const done = await reconcilePendingChainRequests(env, provider, merged, fresh);
        if (done.length) {
          runtime = await cachedRuntime(provider, { fresh: true });
          family = (await familyJson(env, "/state")).body;
        }
      }
    } catch {
      // Chain view is best effort for reads; the ledger is still returned.
      runtime = chainViewCache.runtime;
    }
  }
  if (runtime) {
    const period = practicePeriod(family, runtime);
    // Chain is authoritative for on-chain spend: reconcile the ledger to it.
    if (Math.abs(period.onChainSpent - Number(family.mandate?.spentThisPeriod || 0)) > 0.000001) {
      const mandate = { ...mergedMandate(family, runtime), spentThisPeriod: period.onChainSpent };
      await familyJson(env, "/sync-mandate", { method: "POST", body: { mandate } });
      family = { ...family, mandate };
    }
    return withNetworkNamespaces(family, practicePeriod(family, runtime));
  }
  return withNetworkNamespaces(family, practicePeriod(family, null));
}

function executionEnvelope(result) {
  return {
    contractVersion: "0.2",
    type: "V0_2_ACTION_EXECUTION",
    runtimeMode: "SERVER_HELD_DEVNET_DEMO",
    idempotencyScope: "DURABLE_OBJECT_FAMILY",
    mode: PRACTICE_DEVNET.mode,
    network: PRACTICE_DEVNET.network,
    realValue: PRACTICE_DEVNET.realValue,
    ...result
  };
}

function rpcUnavailable(key, message) {
  return json(
    {
      error: "SOLANA_RPC_UNAVAILABLE",
      retryable: true,
      idempotencyKey: key,
      message: message || "Solana is taking longer than expected. Check again."
    },
    503
  );
}

function pendingResponse(runtime, key, proof, createdAt) {
  return json(
    executionEnvelope({
      evaluation: {
        decision: "ALLOW",
        reasonCode: "EXECUTION_PENDING",
        mandateVersion: runtime?.mandate?.version,
        mandateNonce: runtime?.mandate?.nonce
      },
      executionProof: {
        status: "PENDING",
        network: "solana-devnet",
        programId: proof?.programId ?? runtime?.programId,
        signature: proof?.signature ?? null,
        mandateVersion: runtime?.mandate?.version,
        mandateNonce: runtime?.mandate?.nonce,
        executedAt: createdAt,
        idempotencyKey: key,
        simulated: false
      }
    })
  );
}

async function finalizeExecution(env, key, notional, result) {
  const confirmed =
    result.evaluation?.decision === "ALLOW" &&
    result.executionProof?.status === "CONFIRMED";
  const priceMicro = Number(result.executionProof?.pyth?.unitPriceMicroUsd || 0);
  const shares =
    confirmed && priceMicro > 0 ? Number(notional || 0) / (priceMicro / 1_000_000) : 0;
  const envelope = executionEnvelope(result);
  await familyJson(env, "/finalize", {
    method: "POST",
    body: {
      idempotencyKey: key,
      success: confirmed,
      shares,
      proof: result.executionProof || null,
      result: envelope
    }
  });
  return envelope;
}

/**
 * A reservation whose transaction was signed but whose outcome was not observed.
 * CONFIRMED → finalize; FAILED → finalize as refused; EXPIRED → release (never
 * landed, safe to retry the same intent); PENDING → still unknown.
 */
async function reconcileReservation(env, provider, reservation) {
  const proof = reservation.pendingProof;
  const check = await provider.checkSignature({
    signature: proof.signature,
    lastValidBlockHeight: proof.lastValidBlockHeight
  });
  const key = reservation.idempotencyKey;
  if (check.status === "CONFIRMED") {
    const { lastValidBlockHeight, ...confirmedProof } = proof;
    return {
      status: "CONFIRMED",
      envelope: await finalizeExecution(env, key, reservation.notional, {
        evaluation: {
          decision: "ALLOW",
          reasonCode: "WITHIN_MANDATE",
          mandateVersion: proof.mandateVersion,
          mandateNonce: proof.mandateNonce
        },
        executionProof: { ...confirmedProof, status: "CONFIRMED", reconciled: true }
      })
    };
  }
  if (check.status === "FAILED") {
    return {
      status: "FAILED",
      envelope: await finalizeExecution(env, key, reservation.notional, {
        evaluation: { decision: "REFUSE", reasonCode: "SOLANA_EXECUTION_REFUSED" },
        executionProof: null
      })
    };
  }
  if (check.status === "EXPIRED") {
    await familyJson(env, "/release", {
      method: "POST",
      body: { idempotencyKey: key, force: true, reason: "BLOCKHASH_EXPIRED_NOT_LANDED" }
    });
    return { status: "EXPIRED" };
  }
  return { status: "PENDING" };
}

async function handleExecute(env, body) {
  const key = String(body.idempotencyKey || "");
  let loaded;
  try {
    loaded = await loadRuntimeAndFamily(env);
  } catch (error) {
    if (isTransientRpcError(error)) return rpcUnavailable(key);
    throw error;
  }
  const { provider, runtime } = loaded;

  const reserveBody = {
    asset: body.asset,
    notional: body.notional,
    idempotencyKey: key,
    allowOnceRequestId: body.allowOnceRequestId || null
  };
  let reserved = await familyJson(env, "/reserve", { method: "POST", body: reserveBody });

  if (reserved.body?.result) return json(reserved.body.result);

  if (reserved.body?.reservation && reserved.body.replay) {
    const reservation = reserved.body.reservation;
    if (!reservation.pendingProof?.signature) {
      // Another request is executing this intent right now (or crashed pre-send;
      // the TTL sweep releases that case).
      return pendingResponse(runtime, key, null, reservation.createdAt);
    }
    let outcome;
    try {
      outcome = await reconcileReservation(env, provider, reservation);
    } catch (error) {
      if (isTransientRpcError(error)) return rpcUnavailable(key);
      throw error;
    }
    if (outcome.envelope) return json(outcome.envelope);
    if (outcome.status === "PENDING") {
      return pendingResponse(runtime, key, reservation.pendingProof, reservation.createdAt);
    }
    // EXPIRED: nothing landed and the hold is released. Retry the same intent.
    reserved = await familyJson(env, "/reserve", { method: "POST", body: reserveBody });
    if (reserved.body?.result) return json(reserved.body.result);
  }

  if (reserved.body?.allowed === false) {
    return json(
      executionEnvelope({
        evaluation: {
          decision: "REFUSE",
          reasonCode: reserved.body.reasonCode,
          boundaryRequestAvailable: reserved.body.boundaryRequestAvailable === true,
          requestedNotional: Number(body.notional || 0),
          mandateVersion: runtime.mandate.version,
          mandateNonce: runtime.mandate.nonce
        },
        executionProof: null
      })
    );
  }

  const reservation = reserved.body?.reservation;
  let result;
  try {
    result = await provider.execute({
      asset: body.asset,
      type: body.type,
      notional: body.notional,
      expectedNonce: runtime.mandate.nonce,
      idempotencyKey: key,
      allowOnceRequestId: reservation?.allowOnceRequestId || body.allowOnceRequestId || null,
      onBeforeSend: (pendingProof) =>
        familyJson(env, "/reservation/sending", {
          method: "POST",
          body: { idempotencyKey: key, pendingProof }
        })
    });
  } catch (error) {
    // Pre-send failures never consume capital: release the hold.
    if (error?.sent === false || isTransientRpcError(error)) {
      await familyJson(env, "/release", {
        method: "POST",
        body: { idempotencyKey: key, reason: "PRE_SEND_FAILURE" }
      });
      if (isTransientRpcError(error)) return rpcUnavailable(key);
    }
    throw error;
  }

  if (result.unconfirmed) {
    // Sent (or maybe sent) but not observed: keep the hold, reconcile on the next check.
    return pendingResponse(runtime, key, result.executionProof, reservation?.createdAt);
  }

  // Refusals from the runtime (and confirmed executions) finalize the reservation.
  return json(await finalizeExecution(env, key, body.notional, result));
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

  if (method === "GET" && path === "/api/v0.2/market/discovery") {
    const discovery = await marketDiscovery(env);
    return json({
      contractVersion: "0.2",
      type: "V0_2_MARKET_DISCOVERY",
      ...discovery
    });
  }

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
    return json(await practiceStateView(env));
  }

  const reconcileMatch =
    method === "POST"
      ? path.match(/^\/api\/v0\.2\/boundary-requests\/([^/]+)\/reconcile$/)
      : null;
  if (reconcileMatch) {
    const denied = await requireGuardian(env, request);
    if (denied) return denied;
    let loaded;
    try {
      loaded = await loadRuntimeAndFamily(env);
    } catch (error) {
      if (isTransientRpcError(error)) return rpcUnavailable(null);
      throw error;
    }
    const target = (loaded.family.requests || []).filter((r) => r.id === reconcileMatch[1]);
    if (!target.length) return json({ error: "REQUEST_NOT_FOUND" }, 404);
    const results = await reconcilePendingChainRequests(
      env,
      loaded.provider,
      { ...loaded.family, requests: target },
      loaded.runtime,
      { force: true }
    );
    const family = (await familyJson(env, "/state")).body;
    return json({
      reconciled: results,
      request: family.requests.find((r) => r.id === reconcileMatch[1]),
      mandate: family.mandate
    });
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
      // Deciding again on a widen stuck mid-chain reconciles it instead of failing.
      if (
        first.status === 409 &&
        first.body?.request?.status === "WIDEN_PENDING_CHAIN" &&
        body.decision === "WIDEN_MANDATE"
      ) {
        const loaded = await loadRuntimeAndFamily(env);
        await reconcilePendingChainRequests(
          env,
          loaded.provider,
          { ...loaded.family, requests: [first.body.request] },
          loaded.runtime,
          { force: true }
        );
        const family = (await familyJson(env, "/state")).body;
        return json({
          request: family.requests.find((r) => r.id === id),
          mandate: family.mandate
        });
      }
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
