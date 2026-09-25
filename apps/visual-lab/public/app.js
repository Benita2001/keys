const routes = ["garden", "playground", "family"];
const SANDBOX_KEY = "cresco.visualLab.sandbox.v2";

const fallbackMarkets = {
  source: "PYTH_PROOF_SNAPSHOT",
  classes: [
    { id: "equity", label: "Stocks & ETFs", learningAngle: "Companies, sectors, diversification and public-market sessions", accessibleFeedCount: 3, feeds: [
      { displaySymbol: "AAPL", symbol: "Equity.US.AAPL/USD", description: "APPLE INC / US DOLLAR", price: 336.13, entitlementStatus: "ACCESSIBLE", productMode: "PRIMARY_MONEY_PROOF" },
      { displaySymbol: "NVDA", symbol: "Equity.US.NVDA/USD", description: "NVIDIA CORP / US DOLLAR", price: 226.34, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "MSFT", symbol: "Equity.US.MSFT/USD", description: "MICROSOFT CORP / US DOLLAR", price: 496.72, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
    ]},
    { id: "crypto", label: "Crypto", learningAngle: "24/7 markets, volatility and digital-asset market structure", accessibleFeedCount: 3, feeds: [
      { displaySymbol: "BTC", symbol: "Crypto.BTC/USD", description: "BITCOIN / US DOLLAR", price: 84417.6, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "ETH", symbol: "Crypto.ETH/USD", description: "ETHEREUM / US DOLLAR", price: 2690.92, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "SOL", symbol: "Crypto.SOL/USD", description: "SOLANA / US DOLLAR", price: 117.27, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
    ]},
    { id: "fx", label: "FX", learningAngle: "Currency pairs, exchange rates and global purchasing power", accessibleFeedCount: 3, feeds: [
      { displaySymbol: "EUR/USD", symbol: "FX.EUR/USD", description: "EURO / US DOLLAR", price: 1.1392, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "USD/JPY", symbol: "FX.USD/JPY", description: "US DOLLAR / JAPANESE YEN", price: 158.103, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "GBP/USD", symbol: "FX.GBP/USD", description: "BRITISH POUND / US DOLLAR", price: 1.3233, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
    ]},
    { id: "metal", label: "Metals", learningAngle: "Precious metals, macro risk and non-company assets", accessibleFeedCount: 3, feeds: [
      { displaySymbol: "XAU", symbol: "Metal.XAU/USD", description: "GOLD / US DOLLAR", price: 4294.17, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "XAG", symbol: "Metal.XAG/USD", description: "SILVER / US DOLLAR", price: 64.57, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
      { displaySymbol: "AL3M", symbol: "Metal.AL3M/USD", description: "ALUMINIUM 3-MONTH", price: 3257.75, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
    ]},
    { id: "commodity", label: "Commodities & Energy", learningAngle: "Real-world inputs, futures and cyclical supply/demand markets", accessibleFeedCount: 1, feeds: [
      { displaySymbol: "BRENT", symbol: "Commodities.BRENT/USD", description: "BRENT FUTURE", price: 94.34, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
    ]}
  ]
};

const marketTints = {
  equity: "#fff1bb", crypto: "#e5f7ef", fx: "#e8eeff",
  metal: "#ffe8ef", commodity: "#e4f5f3", rates: "#f1edff"
};

const initialSandbox = () => ({
  schema: 2,
  child: "Alex",
  guardian: "Sam",
  mandate: {
    maxAction: 10,
    weeklyLimit: 50,
    spent: 0,
    version: 1,
    nonce: 1,
    status: "ACTIVE"
  },
  allowanceOnce: null,
  pendingRequest: null,
  lastDecision: null,
  money: { AAPL: { notional: 0, actions: 0 } },
  practice: { cash: 1000, positions: {} },
  events: []
});

function loadSandbox() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SANDBOX_KEY) || "null");
    return parsed && parsed.schema === 2 ? parsed : initialSandbox();
  } catch {
    return initialSandbox();
  }
}

let sandbox = loadSandbox();
let marketData = fallbackMarkets;
let marketIsLive = false;

function saveSandbox(event) {
  if (event) {
    sandbox.events.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      at: new Date().toISOString(),
      ...event
    });
    sandbox.events = sandbox.events.slice(0, 20);
  }
  localStorage.setItem(SANDBOX_KEY, JSON.stringify(sandbox));
  renderSandbox();
}

function resetSandbox() {
  sandbox = initialSandbox();
  localStorage.setItem(SANDBOX_KEY, JSON.stringify(sandbox));
  renderSandbox();
}

function setRoute(route, push = true) {
  const next = routes.includes(route) ? route : "garden";
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === next);
  });
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === next);
  });
  if (push) history.pushState({ route: next }, "", next === "garden" ? "/" : "/" + next);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => setRoute(button.dataset.route));
});
document.querySelectorAll("[data-route-target]").forEach((button) => {
  button.addEventListener("click", () => setRoute(button.dataset.routeTarget));
});
window.addEventListener("popstate", () => {
  setRoute(location.pathname.replace(/^\//, "") || "garden", false);
});
setRoute(location.pathname.replace(/^\//, "") || "garden", false);

function money(value) {
  return "$" + Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0
  });
}

function formatPrice(value, marketClass) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const digits = marketClass === "fx" ? 4 : value < 10 ? 4 : value < 1000 ? 2 : 0;
  return "$" + value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: marketClass === "fx" ? 4 : 0
  });
}

function findFeed(symbol) {
  return (marketData.classes || [])
    .flatMap((group) => (group.feeds || []).map((feed) => ({ ...feed, marketClass: group.id })))
    .find((feed) => (feed.symbol || feed.displaySymbol) === symbol || feed.displaySymbol === symbol);
}

function currentAaplPrice() {
  return findFeed("Equity.US.AAPL/USD")?.price || findFeed("AAPL")?.price || null;
}

function tryMoneyMove(amount) {
  const m = sandbox.mandate;
  const allowance = sandbox.allowanceOnce;
  const exactAllowance =
    allowance &&
    !allowance.used &&
    allowance.amount === amount &&
    allowance.nonce === m.nonce;

  let decision = "REFUSE";
  let reason = "ACTION_LIMIT_EXCEEDED";

  if (m.status !== "ACTIVE") {
    reason = "MANDATE_NOT_ACTIVE";
  } else if (m.spent + amount > m.weeklyLimit) {
    reason = "PERIOD_LIMIT_EXCEEDED";
  } else if (amount <= m.maxAction) {
    decision = "ALLOW";
    reason = "WITHIN_KEY";
  } else if (exactAllowance) {
    decision = "ALLOW";
    reason = "ALLOW_ONCE";
  }

  if (decision === "ALLOW") {
    const usedAllowance = reason === "ALLOW_ONCE";
    m.spent += amount;
    sandbox.money.AAPL.notional += amount;
    sandbox.money.AAPL.actions += 1;
    if (usedAllowance) sandbox.allowanceOnce.used = true;
    m.nonce += 1;
    sandbox.lastDecision = { decision, reason, amount, price: currentAaplPrice(), at: Date.now() };
    saveSandbox({ type: "MONEY_ALLOW", label: `AAPL ${money(amount)} allowed · ${reason}` });
    return;
  }

  sandbox.lastDecision = { decision, reason, amount, price: currentAaplPrice(), at: Date.now() };
  saveSandbox({ type: "MONEY_REFUSE", label: `AAPL ${money(amount)} refused · ${reason}` });
}

function createBoundaryRequest(amount = 20) {
  sandbox.pendingRequest = {
    id: "REQ-" + Date.now().toString(36).toUpperCase(),
    amount,
    createdNonce: sandbox.mandate.nonce,
    status: "PENDING"
  };
  sandbox.lastDecision = {
    decision: "REQUESTED",
    reason: "BOUNDARY_REQUEST_CREATED",
    amount,
    at: Date.now()
  };
  saveSandbox({ type: "REQUEST", label: `Alex asked Sam for ${money(amount)} once` });
  setRoute("family");
}

function guardianDecision(action) {
  const req = sandbox.pendingRequest;
  if (!req || req.status !== "PENDING") return;

  if (action === "allow-once") {
    sandbox.allowanceOnce = {
      requestId: req.id,
      amount: req.amount,
      nonce: sandbox.mandate.nonce,
      used: false
    };
    req.status = "APPROVED_ONCE";
    sandbox.lastDecision = { decision: "GUARDIAN_ALLOW_ONCE", amount: req.amount, at: Date.now() };
    saveSandbox({ type: "GUARDIAN", label: `Sam allowed ${money(req.amount)} once` });
  } else if (action === "widen") {
    sandbox.mandate.maxAction = Math.max(sandbox.mandate.maxAction, req.amount);
    sandbox.mandate.version += 1;
    sandbox.mandate.nonce += 1;
    sandbox.allowanceOnce = null;
    req.status = "KEY_WIDENED";
    sandbox.lastDecision = { decision: "GUARDIAN_WIDEN", amount: req.amount, at: Date.now() };
    saveSandbox({ type: "GUARDIAN", label: `Sam widened the Key to ${money(req.amount)}` });
  } else {
    req.status = "DENIED";
    sandbox.allowanceOnce = null;
    sandbox.lastDecision = { decision: "GUARDIAN_DENY", amount: req.amount, at: Date.now() };
    saveSandbox({ type: "GUARDIAN", label: "Sam said not now" });
  }
}

function practiceBuy(symbol, amount = 25) {
  if (sandbox.practice.cash < amount) {
    sandbox.lastDecision = { decision: "PRACTICE_REFUSE", reason: "NOT_ENOUGH_VIRTUAL_CASH", amount, symbol, at: Date.now() };
    saveSandbox({ type: "PRACTICE", label: `Practice refused · not enough virtual cash` });
    return;
  }
  const feed = findFeed(symbol);
  if (!feed || typeof feed.price !== "number" || feed.price <= 0) return;

  const position = sandbox.practice.positions[symbol] || {
    symbol,
    displaySymbol: feed.displaySymbol || symbol,
    quantity: 0,
    cost: 0,
    lastPrice: feed.price
  };
  position.quantity += amount / feed.price;
  position.cost += amount;
  position.lastPrice = feed.price;
  sandbox.practice.positions[symbol] = position;
  sandbox.practice.cash -= amount;
  sandbox.lastDecision = { decision: "PRACTICE_BUY", symbol, amount, price: feed.price, at: Date.now() };
  saveSandbox({ type: "PRACTICE", label: `Practiced ${money(amount)} in ${position.displaySymbol}` });
}

function resetPractice() {
  sandbox.practice = { cash: 1000, positions: {} };
  sandbox.lastDecision = { decision: "PRACTICE_RESET", at: Date.now() };
  saveSandbox({ type: "PRACTICE", label: "Practice wallet reset" });
}

function renderDecision() {
  const box = document.getElementById("sandbox-decision");
  const requestButton = document.getElementById("sandbox-request-button");
  if (!box || !requestButton) return;

  const last = sandbox.lastDecision;
  requestButton.hidden = true;
  box.className = "sandbox-decision neutral";

  if (!last) {
    box.textContent = "Choose an amount. Inside the Key is instant; outside the Key is refused.";
    return;
  }

  if (last.decision === "ALLOW") {
    box.className = "sandbox-decision allow";
    box.innerHTML = `<strong>ALLOW</strong> · ${money(last.amount)} AAPL sandbox move · ${last.reason === "ALLOW_ONCE" ? "one-time permission consumed" : "inside Alex's Key"}`;
    return;
  }

  if (last.decision === "REFUSE") {
    box.className = "sandbox-decision refuse";
    box.innerHTML = `<strong>REFUSE</strong> · ${last.reason === "PERIOD_LIMIT_EXCEEDED" ? "weekly space reached" : "outside Alex's current Key"}`;
    if (last.reason === "ACTION_LIMIT_EXCEEDED" && last.amount === 20) {
      requestButton.hidden = false;
    }
    return;
  }

  if (last.decision === "GUARDIAN_ALLOW_ONCE") {
    box.className = "sandbox-decision allow";
    box.innerHTML = "<strong>Sam allowed $20 once.</strong> Go back to Key Garden and try the $20 move again.";
    return;
  }

  if (last.decision === "GUARDIAN_WIDEN") {
    box.className = "sandbox-decision allow";
    box.innerHTML = `<strong>Key widened.</strong> Alex can now move up to ${money(sandbox.mandate.maxAction)} without asking.`;
    return;
  }

  if (last.decision === "GUARDIAN_DENY") {
    box.className = "sandbox-decision refuse";
    box.innerHTML = "<strong>Not now.</strong> Alex's Key stays unchanged.";
  }
}

function renderPractice() {
  const cash = document.getElementById("practice-cash");
  const list = document.getElementById("practice-position-list");
  const count = document.getElementById("practice-position-count");
  if (!cash || !list || !count) return;

  cash.textContent = `${money(sandbox.practice.cash)} virtual cash`;
  const positions = Object.values(sandbox.practice.positions);
  count.textContent = `${positions.length} market${positions.length === 1 ? "" : "s"}`;

  if (!positions.length) {
    list.innerHTML = '<p class="empty-practice">Choose a market above and try $25 in Practice.</p>';
    return;
  }

  list.innerHTML = positions.map((position) => {
    const feed = findFeed(position.symbol);
    const price = feed?.price || position.lastPrice;
    const value = position.quantity * price;
    const delta = value - position.cost;
    return `
      <article class="practice-position">
        <div>
          <strong>${position.displaySymbol}</strong>
          <small>${position.quantity.toFixed(6)} units · ${money(position.cost)} practiced</small>
        </div>
        <div>
          <strong>${money(value)}</strong>
          <small class="${delta >= 0 ? "practice-up" : "practice-down"}">${delta >= 0 ? "+" : ""}${money(delta)}</small>
        </div>
      </article>
    `;
  }).join("");
}

function renderFamilyRequest() {
  const empty = document.getElementById("guardian-request-empty");
  const live = document.getElementById("guardian-request-live");
  const decision = document.getElementById("guardian-decision");
  if (!empty || !live || !decision) return;

  const req = sandbox.pendingRequest;
  const actionable = req && req.status === "PENDING";
  empty.hidden = Boolean(req);
  live.hidden = !req;

  if (req) {
    document.getElementById("guardian-current-limit").textContent = money(sandbox.mandate.maxAction);
    document.getElementById("guardian-request-amount").textContent = money(req.amount);
    live.querySelectorAll("[data-guardian-action]").forEach((button) => {
      button.disabled = !actionable;
    });
  }

  if (!req) {
    decision.textContent = "";
  } else if (req.status === "PENDING") {
    decision.textContent = "Sam chooses what changes. Learning progress does not decide this.";
  } else if (req.status === "APPROVED_ONCE") {
    decision.innerHTML = "<strong>Allowed once.</strong> The permission is exact and single-use.";
  } else if (req.status === "KEY_WIDENED") {
    decision.innerHTML = `<strong>Key widened.</strong> New per-move limit: ${money(sandbox.mandate.maxAction)}.`;
  } else {
    decision.innerHTML = "<strong>Not now.</strong> The Key did not change.";
  }
}

function renderSandbox() {
  const m = sandbox.mandate;
  const actionLimit = document.getElementById("key-action-limit");
  const weeklyLimit = document.getElementById("key-weekly-limit");
  const familyAction = document.getElementById("family-action-limit");
  const familyMax = document.getElementById("family-limit-max");

  if (actionLimit) actionLimit.textContent = money(m.maxAction);
  if (weeklyLimit) weeklyLimit.textContent = money(m.weeklyLimit);
  if (familyAction) familyAction.textContent = `${money(m.maxAction)} each move`;
  if (familyMax) familyMax.textContent = money(m.maxAction);

  const spent = document.getElementById("sandbox-spent");
  const version = document.getElementById("sandbox-version");
  const allowance = document.getElementById("sandbox-allowance");
  if (spent) spent.textContent = `${money(m.spent)} / ${money(m.weeklyLimit)}`;
  if (version) version.textContent = `v${m.version} · nonce ${m.nonce}`;
  if (allowance) {
    allowance.textContent = sandbox.allowanceOnce
      ? sandbox.allowanceOnce.used
        ? "Consumed"
        : `${money(sandbox.allowanceOnce.amount)} once`
      : "None";
  }

  renderDecision();
  renderPractice();
  renderFamilyRequest();
}

function renderMarkets(data, live) {
  marketData = data;
  marketIsLive = live;
  const grid = document.getElementById("market-grid");
  const badge = document.getElementById("market-source-badge");
  const groups = (data.classes || []).filter((group) => group.accessibleFeedCount > 0);
  badge.textContent = live ? "Live · Pyth via KEYS" : "Canonical Pyth proof snapshot";
  badge.style.background = live ? "#183247" : "#6a5aa1";

  grid.innerHTML = groups.map((group) => {
    const feeds = (group.feeds || []).filter((feed) => feed.entitlementStatus === "ACCESSIBLE").slice(0, 3);
    return `
      <article class="market-card" style="--market-tint:${marketTints[group.id] || "#f1edff"}">
        <div class="market-card-head">
          <h3>${group.label}</h3>
          <span class="live-label">${live ? "Live · Pyth" : "Proof snapshot"}</span>
        </div>
        <p class="learning-angle">${group.learningAngle}</p>
        <div class="feed-list">
          ${feeds.map((feed) => `
            <div class="feed-row feed-row-interactive">
              <div class="feed-name">
                <strong>${feed.displaySymbol || feed.symbol}</strong>
                <small>${feed.productMode === "PRIMARY_MONEY_PROOF" ? "Primary Money proof" : "Learn · Practice"}</small>
              </div>
              <div class="feed-actions">
                <span class="feed-price">${formatPrice(feed.price, group.id)}</span>
                <button type="button" class="practice-buy" data-practice-symbol="${feed.symbol || feed.displaySymbol}">Practice $25</button>
              </div>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-practice-symbol]").forEach((button) => {
    button.addEventListener("click", () => practiceBuy(button.dataset.practiceSymbol, 25));
  });
  renderPractice();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

document.querySelectorAll("[data-money-amount]").forEach((button) => {
  button.addEventListener("click", () => tryMoneyMove(Number(button.dataset.moneyAmount)));
});
document.getElementById("sandbox-request-button")?.addEventListener("click", () => createBoundaryRequest(20));
document.querySelectorAll("[data-guardian-action]").forEach((button) => {
  button.addEventListener("click", () => guardianDecision(button.dataset.guardianAction));
});
document.getElementById("practice-reset")?.addEventListener("click", resetPractice);
document.getElementById("sandbox-reset-all")?.addEventListener("click", resetSandbox);

async function hydrate() {
  renderMarkets(fallbackMarkets, false);
  renderSandbox();

  try {
    const markets = await fetchJson("/api/markets");
    renderMarkets(markets, true);
    document.getElementById("live-pill").innerHTML = '<span class="live-dot"></span> Live markets · Sandbox actions';
  } catch {
    document.getElementById("live-pill").innerHTML = '<span class="live-dot"></span> Proof snapshot · Sandbox actions';
  }

  try {
    const tessera = await fetchJson("/api/tessera");
    const count = Array.isArray(tessera.assets) ? tessera.assets.length : 0;
    document.getElementById("tessera-status").textContent = count
      ? `${count} live representations · Practice context`
      : "Live representation feed available";
  } catch {
    document.getElementById("tessera-status").textContent = "Representation layer · Practice context";
  }

  try {
    const prestocks = await fetchJson("/api/prestocks");
    const assets = prestocks.assets || prestocks.items || prestocks.catalog || [];
    const count = Array.isArray(assets) ? assets.length : 0;
    document.getElementById("prestocks-status").textContent = count
      ? `${count} representations · Practice context`
      : "Representation layer · Practice context";
  } catch {
    document.getElementById("prestocks-status").textContent = "Representation layer · Practice context";
  }
}

hydrate();
