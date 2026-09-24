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
  reservations: {},
  executionResults: {}
};

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

    if (method === "GET" && path === "/state") return json(state);

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
            ? "ALLOWED_ONCE"
            : d === "WIDEN_MANDATE"
              ? "WIDEN_PENDING_CHAIN"
              : "REFUSED",
        decidedAt: now(),
        guardianNote: String(body.note || "").slice(0, 140),
        usedAt: null
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

    if (method === "POST" && path === "/reset") {
      const next = copy(INITIAL);
      next.mandate.updatedAt = now();
      await this.save(next);
      return json(next);
    }

    return json({ error: "NOT_FOUND", path }, 404);
  }
}
