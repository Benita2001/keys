/**
 * MOCK MARKET DATA — the only place sample prices live.
 *
 * Rule: mock the data, never invent the asset universe. Every entry maps to an
 * intended xStocks-style tokenized product on Solana. Prices and daily changes
 * below are illustrative samples, marked dataStatus "mock" / priceSource "mock".
 *
 * The hosted KEYS backend may overlay an entitled Pyth quote when it is FRESH.
 * AAPL is the current proven Money proof asset; TSLA retains historical proof.
 * Unentitled/unconfigured symbols remain these clearly labeled sample values.
 */
import type { MarketAsset, Period, PricePoint } from "@/domain/types";

type Seed = Omit<MarketAsset, "network" | "provider" | "priceSource" | "dataStatus">;

const seeds: Seed[] = [
  {
    id: "aapl",
    companyName: "Apple",
    ticker: "AAPL",
    tokenizedTicker: "AAPLx",
    category: "Technology",
    shortDescription: "Technology & devices",
    about:
      "Apple makes iPhones, iPads, Macs and digital services used by people around the world. It helps people create, learn and stay connected.",
    thingsToKnow: [
      { icon: "devices", text: "Makes popular devices like iPhone and Mac", tone: "green" },
      { icon: "globe", text: "Sells products and services globally", tone: "blue" },
      { icon: "heart", text: "Strong brand and loyal customers", tone: "pink" },
      { icon: "swords", text: "Competes with other tech companies", tone: "aqua" },
    ],
    price: 189.32,
    dayChangePercent: 2.4,
    brand: { background: "#1d1d1f", foreground: "#ffffff", mark: "A" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "nvda",
    companyName: "NVIDIA",
    ticker: "NVDA",
    tokenizedTicker: "NVDAx",
    category: "Technology",
    shortDescription: "AI chips & computing",
    about:
      "NVIDIA designs the powerful chips that run video games, graphics and a lot of today's artificial intelligence.",
    thingsToKnow: [
      { icon: "chip", text: "Designs chips for games and AI", tone: "green" },
      { icon: "cloud", text: "Big data centers are major customers", tone: "blue" },
      { icon: "bolt", text: "Grew very fast, so its price can swing a lot", tone: "orange" },
      { icon: "swords", text: "Other chipmakers want the same customers", tone: "aqua" },
    ],
    price: 875.2,
    dayChangePercent: 3.1,
    brand: { background: "#0b0b0b", foreground: "#76b900", mark: "N" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "nflx",
    companyName: "Netflix",
    ticker: "NFLX",
    tokenizedTicker: "NFLXx",
    category: "Consumer",
    shortDescription: "Streaming & entertainment",
    about:
      "Netflix is a streaming service. People pay a monthly subscription to watch shows, movies and games on their screens.",
    thingsToKnow: [
      { icon: "film", text: "Makes and licenses shows and movies", tone: "pink" },
      { icon: "users", text: "Earns money from monthly subscriptions", tone: "blue" },
      { icon: "globe", text: "Available in most countries", tone: "green" },
      { icon: "swords", text: "Competes with other streaming services", tone: "aqua" },
    ],
    price: 612.18,
    dayChangePercent: 1.8,
    brand: { background: "#141414", foreground: "#e50914", mark: "N" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "mcd",
    companyName: "McDonald's",
    ticker: "MCD",
    tokenizedTicker: "MCDx",
    category: "Retail",
    shortDescription: "Food & restaurants",
    about:
      "McDonald's runs and franchises fast-food restaurants in more than 100 countries. Many restaurants are owned by local business owners.",
    thingsToKnow: [
      { icon: "burger", text: "Serves millions of meals every day", tone: "orange" },
      { icon: "users", text: "Most restaurants are run by franchise owners", tone: "blue" },
      { icon: "globe", text: "Restaurants in over 100 countries", tone: "green" },
      { icon: "swords", text: "Competes with other restaurants", tone: "aqua" },
    ],
    price: 296.32,
    dayChangePercent: 0.6,
    brand: { background: "#da291c", foreground: "#ffc72c", mark: "M" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "amzn",
    companyName: "Amazon",
    ticker: "AMZN",
    tokenizedTicker: "AMZNx",
    category: "Retail",
    shortDescription: "E-commerce & cloud",
    about:
      "Amazon runs a huge online store and delivers packages. It also rents out computer power to other companies through the cloud.",
    thingsToKnow: [
      { icon: "cart", text: "One of the world's biggest online stores", tone: "orange" },
      { icon: "cloud", text: "Its cloud business powers other apps", tone: "blue" },
      { icon: "basket", text: "Sells groceries, devices and subscriptions", tone: "green" },
      { icon: "swords", text: "Competes with stores and cloud companies", tone: "aqua" },
    ],
    price: 178.44,
    dayChangePercent: -1.2,
    brand: { background: "#232f3e", foreground: "#ff9900", mark: "a" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "tsla",
    companyName: "Tesla",
    ticker: "TSLA",
    tokenizedTicker: "TSLAx",
    category: "Consumer",
    shortDescription: "Electric cars & energy",
    about:
      "Tesla makes electric cars, home batteries and solar products. Its price often moves a lot in a single day.",
    thingsToKnow: [
      { icon: "car", text: "Makes electric cars", tone: "blue" },
      { icon: "bolt", text: "Also sells batteries and solar power", tone: "green" },
      { icon: "heart", text: "Its price can swing a lot day to day", tone: "orange" },
      { icon: "swords", text: "Other carmakers now build electric cars too", tone: "aqua" },
    ],
    price: 379.7,
    dayChangePercent: 1.1,
    brand: { background: "#ffffff", foreground: "#e31937", mark: "T" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "msft",
    companyName: "Microsoft",
    ticker: "MSFT",
    tokenizedTicker: "MSFTx",
    category: "Technology",
    shortDescription: "Software & cloud",
    about:
      "Microsoft makes Windows, Office apps, Xbox and cloud services that businesses and schools use every day.",
    thingsToKnow: [
      { icon: "devices", text: "Makes Windows, Office and Xbox", tone: "blue" },
      { icon: "cloud", text: "Big cloud business for companies", tone: "aqua" },
      { icon: "users", text: "Many customers pay every month or year", tone: "green" },
      { icon: "swords", text: "Competes with other tech giants", tone: "lavender" },
    ],
    price: 415.6,
    dayChangePercent: 0.8,
    brand: { background: "#f3f6fb", foreground: "#0078d4", mark: "M" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "meta",
    companyName: "Meta",
    ticker: "META",
    tokenizedTicker: "METAx",
    category: "Technology",
    shortDescription: "Social apps & VR",
    about:
      "Meta runs Facebook, Instagram and WhatsApp, and builds virtual reality headsets. Most of its money comes from ads.",
    thingsToKnow: [
      { icon: "users", text: "Billions of people use its apps", tone: "blue" },
      { icon: "heart", text: "Earns most of its money from ads", tone: "pink" },
      { icon: "devices", text: "Builds VR headsets", tone: "lavender" },
      { icon: "swords", text: "Competes for people's attention with other apps", tone: "aqua" },
    ],
    price: 502.3,
    dayChangePercent: 1.5,
    brand: { background: "#eaf2ff", foreground: "#0866ff", mark: "M" },
    practiceEnabled: true,
    moneyModeStatus: "unavailable",
  },
  {
    id: "spy",
    companyName: "S&P 500 ETF",
    ticker: "SPY",
    tokenizedTicker: "SPYx",
    category: "Funds",
    shortDescription: "500 big US companies in one",
    about:
      "SPY is a fund that holds pieces of about 500 of the largest US companies. Owning one share is like owning a tiny slice of all of them.",
    thingsToKnow: [
      { icon: "basket", text: "Holds about 500 companies at once", tone: "green" },
      { icon: "globe", text: "Follows the S&P 500 index", tone: "blue" },
      { icon: "heart", text: "Spreading out can smooth the ups and downs", tone: "pink" },
      { icon: "swords", text: "Still goes down when the whole market does", tone: "aqua" },
    ],
    price: 548.2,
    dayChangePercent: 0.4,
    brand: { background: "#102b63", foreground: "#ffffff", mark: "S&P" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
  {
    id: "qqq",
    companyName: "Nasdaq-100 ETF",
    ticker: "QQQ",
    tokenizedTicker: "QQQx",
    category: "Funds",
    shortDescription: "100 big tech-heavy companies",
    about:
      "QQQ is a fund that holds about 100 of the biggest companies on the Nasdaq market, many of them in technology.",
    thingsToKnow: [
      { icon: "basket", text: "Holds about 100 companies at once", tone: "green" },
      { icon: "chip", text: "Lots of technology companies inside", tone: "lavender" },
      { icon: "bolt", text: "Can move more than the wider market", tone: "orange" },
      { icon: "swords", text: "Less spread out than a 500-company fund", tone: "aqua" },
    ],
    price: 472.1,
    dayChangePercent: 0.7,
    brand: { background: "#f0edff", foreground: "#6a4fe0", mark: "Q" },
    practiceEnabled: true,
    moneyModeStatus: "demo",
  },
];

export const MOCK_ASSETS: MarketAsset[] = seeds.map((s) => ({
  ...s,
  network: "solana",
  provider: "xstocks",
  priceSource: "mock",
  dataStatus: "mock",
}));

/** Tickers shown first in Explore, in mockup order. */
export const EXPLORE_ORDER = ["AAPL", "NVDA", "NFLX", "MCD", "AMZN", "TSLA", "MSFT", "META", "SPY", "QQQ"];

/* ------------------------------------------------------------------ */
/* Deterministic sample price series                                   */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PERIOD_SHAPE: Record<Period, { points: number; stepMs: number; drift: number; vol: number }> = {
  "1D": { points: 32, stepMs: 15 * 60_000, drift: 1, vol: 0.004 },
  "1W": { points: 35, stepMs: 4 * 3_600_000, drift: 1.6, vol: 0.008 },
  "1M": { points: 30, stepMs: 86_400_000, drift: 3.2, vol: 0.013 },
  "1Y": { points: 52, stepMs: 7 * 86_400_000, drift: 9, vol: 0.03 },
  All: { points: 60, stepMs: 30 * 86_400_000, drift: 18, vol: 0.05 },
};

/**
 * Sample series that ends exactly at `endValue`. The overall move over the
 * period follows the sign of `changePercent` so charts agree with labels.
 */
export function sampleSeries(key: string, endValue: number, changePercent: number, period: Period): PricePoint[] {
  const { points, stepMs, drift, vol } = PERIOD_SHAPE[period];
  const rand = mulberry32(hash(`${key}:${period}`));
  const totalMove = (period === "1D" ? changePercent : changePercent * drift) / 100;
  const start = endValue / (1 + totalMove);
  const now = Date.UTC(2026, 8, 24, 20, 0, 0);
  const raw: number[] = [];
  let noise = 0;
  for (let i = 0; i < points; i++) {
    noise += (rand() - 0.5) * vol * 2;
    noise *= 0.86;
    const progress = i / (points - 1);
    raw.push(start + (endValue - start) * progress + start * noise);
  }
  const correction = endValue - raw[raw.length - 1];
  return raw.map((v, i) => ({
    t: now - (points - 1 - i) * stepMs,
    v: Math.max(0.01, v + correction * (i / (points - 1))),
  }));
}
