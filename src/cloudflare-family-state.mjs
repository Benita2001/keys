const INITIAL = {
  familyId: "cresco-stocklana-demo-family",
  familyCode: "CRES-4821",
  profile: { childName: "Alex", parentName: "Sam", parentLinked: true },
  mandate: {
    status: "ACTIVE",
    version: 5,
    nonce: 4,
    allowedAssets: ["AAPL"],
    allowedActions: ["BUY"],
    maxActionNotional: 10,
    maxPeriodNotional: 50,
    spentThisPeriod: 0,
    periodLabel: "this month"
  },
  balances: { money: 50, practice: 1000 },
  moneyHoldings: [],
  requests: [],
  learning: { completedLessons: [], xp: 0, weeklyMinutes: [] },
  activity: [],
  sessions: {},
  reservations: {},
  executionResults: {}
};

/**
 * Network truth for everything this Durable Object records today.
 * The `balances.money` / `moneyHoldings` / MONEY_EXECUTION storage names are
 * historical: they hold PRACTICE capital on Solana Devnet (demo SPL token).
 * Real-value Money (Solana Mainnet) is not stored here.
 */
export const PRACTICE_DEVNET = Object.freeze({
  mode: "practice",
  network: "solana-devnet",
  realValue: false
});

/** An unsent reservation older than this was abandoned by a crashed/failed request. */
export const RESERVATION_TTL_MS = 3 * 60 * 1000;

/** Drop unsent reservations past their TTL. Sent ones wait for chain reconciliation. */
export function sweepStaleReservations(state, nowMs = Date.now()) {
  let released = 0;
  for (const [key, reservation] of Object.entries(state.reservations || {})) {
    if (reservation.pendingProof?.signature) continue;
    const age = nowMs - Date.parse(reservation.createdAt || 0);
    if (Number.isFinite(age) && age > RESERVATION_TTL_MS) {
      delete state.reservations[key];
      released += 1;
    }
  }
  return released;
}

const copy = (x) => JSON.parse(JSON.stringify(x));
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
const now = () => new Date().toISOString();

export class FamilyState {
  constructor(state) {
    this.state = state;
  }

  async load() {
    let value = await this.state.storage.get("family");
    if (!value) {
      value = copy(INITIAL);
      value.mandate.updatedAt = now();
      await this.state.storage.put("family", value);
    }
    return value;
  }

  async save(value) {
    await this.state.storage.put("family", value);
    return value;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const body = ["POST", "PUT", "PATCH"].includes(method)
      ? await request.json().catch(() => ({}))
      : {};
    const state = await this.load();

    if (method === "GET" && path === "/state") {
      if (sweepStaleReservations(state) > 0) await this.save(state);
      return json(state);
    }

    // Record the signature of a signed transaction right BEFORE it is sent.
    if (method === "POST" && path === "/reservation/sending") {
      const key = String(body.idempotencyKey || "");
      const reservation = state.reservations[key];
      if (!reservation) return json({ error: "RESERVATION_NOT_FOUND" }, 404);
      reservation.pendingProof = body.pendingProof || null;
      reservation.sendingAt = now();
      await this.save(state);
      return json({ reservation });
    }

    // Release a reservation that provably did not execute. Idempotent.
    // A reservation with a signature is only released with `force` after the
    // caller has checked the chain (EXPIRED / FAILED).
    if (method === "POST" && path === "/release") {
      const key = String(body.idempotencyKey || "");
      const reservation = state.reservations[key];
      if (!reservation) return json({ released: false, reason: "NOT_HELD" });
      if (reservation.pendingProof?.signature && body.force !== true)
        return json({ error: "RESERVATION_SENT_NEEDS_RECONCILE", reservation }, 409);
      delete state.reservations[key];
      await this.save(state);
      return json({ released: true, reason: String(body.reason || "RELEASED") });
    }

    if (method === "POST" && path === "/session") {
      const role = body.role === "guardian" ? "guardian" : "child";
      const token = crypto.randomUUID();
      state.sessions ||= {};
      state.sessions[token] = {
        role,
        displayName: String(
          body.displayName ||
            (role === "guardian" ? state.profile.parentName : state.profile.childName)
        ).slice(0, 80),
        createdAt: now()
      };
      await this.save(state);
      return json({
        kind: "devnet-demo",
        role,
        displayName: state.sessions[token].displayName,
        familyId: state.familyId,
        familyCode: state.familyCode,
        token
      });
    }

    if (method === "POST" && path === "/session/validate") {
      const token = String(body.token || "");
      const session = state.sessions?.[token] || null;
      if (!session) return json({ valid: false, role: null }, 401);

      const created = Date.parse(session.createdAt);
      const expired =
        !Number.isFinite(created) ||
        Date.now() - created > 24 * 60 * 60 * 1000;
      if (expired) {
        delete state.sessions[token];
        await this.save(state);
        return json({ valid: false, role: null }, 401);
      }

      return json({
        valid: true,
        role: session.role,
        displayName: session.displayName
      });
    }

    if (method === "POST" && path === "/link") {
      const linked =
        String(body.code || "").trim().toUpperCase() === state.familyCode;
      if (linked) {
        state.profile.parentLinked = true;
        await this.save(state);
      }
      return json(
        { linked, familyId: linked ? state.familyId : null },
        linked ? 200 : 404
      );
    }

    if (method === "POST" && path === "/sync-mandate") {
      state.mandate = { ...state.mandate, ...(body.mandate || {}), updatedAt: now() };
      await this.save(state);
      return json({ mandate: state.mandate });
    }

    if (method === "GET" && path === "/requests") {
      const status = url.searchParams.get("status");
      return json({
        requests: status
          ? state.requests.filter((r) => r.status === status)
          : state.requests
      });
    }

    if (method === "POST" && path === "/requests") {
      const item = {
        id: "br_" + crypto.randomUUID(),
        status: "PENDING_HUMAN_DECISION",
        mandateVersion: state.mandate.version,
        mandateNonce: state.mandate.nonce,
        asset: String(body.asset || "AAPL").toUpperCase(),
        actionType: String(body.type || "BUY").toUpperCase(),
        requestedNotional: Number(body.notional || 0),
        standingLimit: Number(body.standingLimit ?? state.mandate.maxActionNotional),
        reasonCode: body.reasonCode || "MANDATE_LIMIT_EXCEEDED",
        reason: String(body.reason || "").trim().slice(0, 140),
        createdAt: now()
      };
      state.requests.unshift(item);
      await this.save(state);
      return json(item);
    }

    const decision = method === "POST"
      ? path.match(/^\/requests\/([^/]+)\/decision$/)
      : null;
    if (decision) {
      const index = state.requests.findIndex((r) => r.id === decision[1]);
      if (index < 0) return json({ error: "REQUEST_NOT_FOUND" }, 404);
      const item = state.requests[index];
      if (item.status !== "PENDING_HUMAN_DECISION")
        return json({ error: "REQUEST_ALREADY_DECIDED", request: item }, 409);
      if (item.mandateNonce !== state.mandate.nonce)
        return json({ error: "STALE_NONCE", request: item }, 409);

      const d = body.decision;
      if (!["ALLOW_ONCE", "WIDEN_MANDATE", "REFUSE"].includes(d))
        return json({ error: "UNKNOWN_DECISION" }, 400);

      state.requests[index] = {
        ...item,
        status:
          d === "ALLOW_ONCE"
            ? "ALLOW_ONCE_PENDING_CHAIN"
            : d === "WIDEN_MANDATE"
              ? "WIDEN_PENDING_CHAIN"
              : "REFUSED",
        decidedAt: now(),
        guardianNote: String(body.note || "").slice(0, 140),
        // Kept so a widen that lands on-chain can be reconciled later.
        newLimits: d === "WIDEN_MANDATE" ? body.newLimits || null : null,
        usedAt: null
      };
      await this.save(state);
      return json({ request: state.requests[index], mandate: state.mandate });
    }

    const allowanceComplete = method === "POST"
      ? path.match(/^\/requests\/([^/]+)\/complete-allowance$/)
      : null;
    if (allowanceComplete) {
      const index = state.requests.findIndex((r) => r.id === allowanceComplete[1]);
      if (index < 0) return json({ error: "REQUEST_NOT_FOUND" }, 404);
      if (state.requests[index].status !== "ALLOW_ONCE_PENDING_CHAIN") {
        return json({ error: "REQUEST_NOT_PENDING_ALLOWANCE_CHAIN", request: state.requests[index] }, 409);
      }
      state.requests[index] = {
        ...state.requests[index],
        status: "ALLOWED_ONCE",
        chainProof: body.chainProof || null
      };
      await this.save(state);
      return json({ request: state.requests[index], mandate: state.mandate });
    }

    const widen = method === "POST"
      ? path.match(/^\/requests\/([^/]+)\/complete-widen$/)
      : null;
    if (widen) {
      const index = state.requests.findIndex((r) => r.id === widen[1]);
      if (index < 0) return json({ error: "REQUEST_NOT_FOUND" }, 404);
      state.requests[index] = {
        ...state.requests[index],
        status: "WIDENED",
        chainProof: body.chainProof || null
      };
      state.mandate = { ...state.mandate, ...(body.mandate || {}), updatedAt: now() };
      await this.save(state);
      return json({ request: state.requests[index], mandate: state.mandate });
    }

    if (method === "POST" && path === "/funding") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 500)
        return json({ error: "INVALID_TEST_FUNDING_AMOUNT" }, 400);
      state.balances.money += amount;
      state.activity.unshift({ id: "fund_" + crypto.randomUUID(), kind: "TEST_FUNDING", amount, createdAt: now() });
      await this.save(state);
      return json({
        status: "DEVNET_TEST_CREDITED",
        amount,
        availableBalance: state.balances.money,
        realPaymentTaken: false
      });
    }

    if (method === "POST" && path === "/learning") {
      const lessonId = String(body.lessonId || "");
      if (lessonId && !state.learning.completedLessons.includes(lessonId)) {
        state.learning.completedLessons.push(lessonId);
        state.learning.xp += Math.max(0, Number(body.xp || 0));
      }
      const minutes = Math.max(0, Math.min(240, Number(body.minutes || 0)));
      if (minutes > 0) {
        state.learning.weeklyMinutes.push({ at: now(), minutes });
        state.learning.weeklyMinutes = state.learning.weeklyMinutes.slice(-100);
      }
      await this.save(state);
      return json({ learning: state.learning, authorityEffect: "NONE" });
    }

    if (method === "GET" && path === "/learning")
      return json({ ...state.learning, authorityEffect: "NONE" });

    if (method === "GET" && path === "/portfolio")
      return json({
        balance: state.balances.money,
        holdings: state.moneyHoldings,
        activity: state.activity
      });

    if (method === "POST" && path === "/reserve") {
      const key = String(body.idempotencyKey || "");
      const amount = Number(body.notional || 0);
      const asset = String(body.asset || "").toUpperCase();
      if (!key) return json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, 400);

      if (state.executionResults[key])
        return json({ replay: true, result: state.executionResults[key] });
      sweepStaleReservations(state);
      if (state.reservations[key])
        return json({ replay: true, reservation: state.reservations[key] });

      const pending = Object.values(state.reservations).reduce(
        (sum, item) => sum + Number(item.notional || 0),
        0
      );
      const allowOnceRequestId = String(body.allowOnceRequestId || "");
      const allowance = allowOnceRequestId
        ? state.requests.find(
            (r) =>
              r.id === allowOnceRequestId &&
              r.status === "ALLOWED_ONCE" &&
              !!r.chainProof?.allowanceReceipt &&
              !r.usedAt &&
              r.asset === asset &&
              r.mandateNonce === state.mandate.nonce &&
              amount <= r.requestedNotional
          )
        : null;

      const actionOk = amount <= state.mandate.maxActionNotional;
      const periodOk =
        state.mandate.spentThisPeriod + pending + amount <=
        state.mandate.maxPeriodNotional;
      const balanceOk = pending + amount <= state.balances.money;

      if ((!actionOk || !periodOk) && !allowance) {
        return json({
          allowed: false,
          reasonCode: !actionOk
            ? "MANDATE_LIMIT_EXCEEDED"
            : "PERIOD_LIMIT_EXCEEDED",
          boundaryRequestAvailable: true
        });
      }
      if (!balanceOk)
        return json({ allowed: false, reasonCode: "INSUFFICIENT_BALANCE" });

      const reservation = {
        idempotencyKey: key,
        asset,
        notional: amount,
        mandateNonce: state.mandate.nonce,
        allowOnceRequestId: allowance?.id || null,
        createdAt: now()
      };
      state.reservations[key] = reservation;
      await this.save(state);
      return json({ allowed: true, reservation });
    }

    if (method === "POST" && path === "/finalize") {
      const key = String(body.idempotencyKey || "");
      if (state.executionResults[key])
        return json({ replay: true, result: state.executionResults[key] });

      const reservation = state.reservations[key];
      if (!reservation)
        return json({ error: "RESERVATION_NOT_FOUND" }, 404);

      if (body.success === true) {
        const amount = Number(reservation.notional);
        state.balances.money = Math.max(0, state.balances.money - amount);
        state.mandate.spentThisPeriod += amount;

        if (reservation.allowOnceRequestId) {
          const index = state.requests.findIndex(
            (r) => r.id === reservation.allowOnceRequestId
          );
          if (index >= 0) {
            state.requests[index] = {
              ...state.requests[index],
              status: "ALLOWED_ONCE_USED",
              usedAt: now()
            };
          }
        }

        const shares = Math.max(0, Number(body.shares || 0));
        if (shares > 0) {
          const existing = state.moneyHoldings.find(
            (h) => h.ticker === reservation.asset
          );
          if (existing) {
            existing.shares += shares;
            existing.costBasis += amount;
          } else {
            state.moneyHoldings.push({
              ticker: reservation.asset,
              shares,
              costBasis: amount,
              ...PRACTICE_DEVNET
            });
          }
        }

        state.activity.unshift({
          id: "act_" + crypto.randomUUID(),
          kind: "MONEY_EXECUTION",
          ...PRACTICE_DEVNET,
          ticker: reservation.asset,
          amount,
          shares,
          proof: body.proof || null,
          createdAt: now()
        });
      }

      const result = body.result || {
        success: body.success === true,
        proof: body.proof || null
      };
      state.executionResults[key] = result;
      delete state.reservations[key];
      await this.save(state);
      return json({ result, state });
    }

    if (method === "POST" && path === "/reset") {
      const next = copy(INITIAL);
      next.mandate.updatedAt = now();
      await this.save(next);
      return json(next);
    }

    return json({ error: "NOT_FOUND", path }, 404);
  }
}
