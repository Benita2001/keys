const routes = ["garden", "playground", "family"];

const fallbackMarkets = {
  source: "PYTH_PROOF_SNAPSHOT",
  classes: [
    {
      id: "equity",
      label: "Stocks & ETFs",
      learningAngle: "Companies, sectors, diversification and public-market sessions",
      accessibleFeedCount: 3,
      feeds: [
        { displaySymbol: "AAPL", description: "APPLE INC / US DOLLAR", price: 336.13, entitlementStatus: "ACCESSIBLE", productMode: "PRIMARY_MONEY_PROOF" },
        { displaySymbol: "NVDA", description: "NVIDIA CORP / US DOLLAR", price: 226.34, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "MSFT", description: "MICROSOFT CORP / US DOLLAR", price: 496.72, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
      ]
    },
    {
      id: "crypto",
      label: "Crypto",
      learningAngle: "24/7 markets, volatility and digital-asset market structure",
      accessibleFeedCount: 3,
      feeds: [
        { displaySymbol: "BTC", description: "BITCOIN / US DOLLAR", price: 84417.6, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "ETH", description: "ETHEREUM / US DOLLAR", price: 2690.92, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "SOL", description: "SOLANA / US DOLLAR", price: 117.27, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
      ]
    },
    {
      id: "fx",
      label: "FX",
      learningAngle: "Currency pairs, exchange rates and global purchasing power",
      accessibleFeedCount: 3,
      feeds: [
        { displaySymbol: "EUR/USD", description: "EURO / US DOLLAR", price: 1.1392, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "USD/JPY", description: "US DOLLAR / JAPANESE YEN", price: 158.103, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "GBP/USD", description: "BRITISH POUND / US DOLLAR", price: 1.3233, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
      ]
    },
    {
      id: "metal",
      label: "Metals",
      learningAngle: "Precious metals, macro risk and non-company assets",
      accessibleFeedCount: 3,
      feeds: [
        { displaySymbol: "XAU", description: "GOLD / US DOLLAR", price: 4294.17, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "XAG", description: "SILVER / US DOLLAR", price: 64.57, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" },
        { displaySymbol: "AL3M", description: "ALUMINIUM 3-MONTH", price: 3257.75, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
      ]
    },
    {
      id: "commodity",
      label: "Commodities & Energy",
      learningAngle: "Real-world inputs, futures and cyclical supply/demand markets",
      accessibleFeedCount: 1,
      feeds: [
        { displaySymbol: "BRENT", description: "BRENT FUTURE", price: 94.34, entitlementStatus: "ACCESSIBLE", productMode: "LEARN_PRACTICE_ONLY" }
      ]
    }
  ]
};

const marketTints = {
  equity: "#fff1bb",
  crypto: "#e5f7ef",
  fx: "#e8eeff",
  metal: "#ffe8ef",
  commodity: "#e4f5f3",
  rates: "#f1edff"
};

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
  const route = location.pathname.replace(/^\//, "") || "garden";
  setRoute(route, false);
});
setRoute(location.pathname.replace(/^\//, "") || "garden", false);

function formatPrice(value, marketClass) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const digits = marketClass === "fx" ? 4 : value < 10 ? 4 : value < 1000 ? 2 : 0;
  return "$" + value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: marketClass === "fx" ? 4 : 0
  });
}

function renderMarkets(data, live) {
  const grid = document.getElementById("market-grid");
  const badge = document.getElementById("market-source-badge");
  const groups = (data.classes || []).filter((group) => group.accessibleFeedCount > 0);
  badge.textContent = live ? "Live · Pyth via KEYS" : "Canonical Pyth proof snapshot";
  badge.style.background = live ? "#183247" : "#6a5aa1";

  grid.innerHTML = groups.map((group) => {
    const feeds = (group.feeds || [])
      .filter((feed) => feed.entitlementStatus === "ACCESSIBLE")
      .slice(0, 3);
    return `
      <article class="market-card" style="--market-tint:${marketTints[group.id] || "#f1edff"}">
        <div class="market-card-head">
          <h3>${group.label}</h3>
          <span class="live-label">${live ? "Live · Pyth" : "Proof snapshot"}</span>
        </div>
        <p class="learning-angle">${group.learningAngle}</p>
        <div class="feed-list">
          ${feeds.map((feed) => `
            <div class="feed-row">
              <div class="feed-name">
                <strong>${feed.displaySymbol || feed.symbol}</strong>
                <small>${feed.productMode === "PRIMARY_MONEY_PROOF" ? "Primary Money proof" : "Learn · Practice"}</small>
              </div>
              <span class="feed-price">${formatPrice(feed.price, group.id)}</span>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function hydrate() {
  renderMarkets(fallbackMarkets, false);

  try {
    const markets = await fetchJson("/api/markets");
    renderMarkets(markets, true);
    document.getElementById("live-pill").innerHTML = '<span class="live-dot"></span> Live read-only data';
  } catch {
    document.getElementById("live-pill").innerHTML = '<span class="live-dot"></span> Proof snapshot';
  }

  try {
    const tessera = await fetchJson("/api/tessera");
    const count = Array.isArray(tessera.assets) ? tessera.assets.length : 0;
    document.getElementById("tessera-status").textContent = count
      ? `${count} live representations available · read-only`
      : "Live representation feed available";
  } catch {
    document.getElementById("tessera-status").textContent = "Representation layer · read-only";
  }

  try {
    const prestocks = await fetchJson("/api/prestocks");
    const assets = prestocks.assets || prestocks.items || prestocks.catalog || [];
    const count = Array.isArray(assets) ? assets.length : 0;
    document.getElementById("prestocks-status").textContent = count
      ? `${count} representations available · read-only`
      : "Representation layer · read-only";
  } catch {
    document.getElementById("prestocks-status").textContent = "Representation layer · read-only";
  }
}

hydrate();
