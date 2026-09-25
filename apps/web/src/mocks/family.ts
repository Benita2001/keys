/**
 * DEMO FAMILY FIXTURE — the starting state of the local demo session.
 *
 * Everything here is sample data for the "Alex" demo family. Money Mode values
 * are demo-only: no funding provider, custody or brokerage is connected, and
 * no real money moves (see docs/CRESCO-BACKEND-INTEGRATION-HANDOFF.md).
 */
import type {
  Achievement,
  Challenge,
  CurrentMandate,
  Goal,
  Holding,
} from "@/domain/types";
import { MOCK_ASSETS } from "./market";

export const GOALS: Goal[] = [
  { id: "bike", label: "New Bike", target: 350, tone: "blue" },
  { id: "gaming", label: "Gaming Setup", target: 600, tone: "pink" },
  { id: "college", label: "College", target: 10000, tone: "yellow" },
  { id: "trip", label: "Dream Trip", target: 1500, tone: "aqua" },
  { id: "first-1000", label: "My First $1,000", target: 1000, tone: "rose" },
];

export const INTERESTS = [
  { id: "games", label: "Games", tickers: ["NVDA", "MSFT"] },
  { id: "phones", label: "Phones & gadgets", tickers: ["AAPL"] },
  { id: "shows", label: "Shows & movies", tickers: ["NFLX"] },
  { id: "food", label: "Food", tickers: ["MCD"] },
  { id: "shopping", label: "Shopping", tickers: ["AMZN"] },
  { id: "cars", label: "Cars", tickers: ["TSLA"] },
] as const;

const price = (ticker: string) => MOCK_ASSETS.find((a) => a.ticker === ticker)!.price;

/**
 * Practice holdings sized so that, at sample prices, the portfolio shows
 * $1,248.50, up $57.30 (+4.8%) — the approved mockup reference.
 */
export const PRACTICE_SEED: { ticker: string; value: number; costBasis: number }[] = [
  { ticker: "AAPL", value: 399.2, costBasis: 369.6 },
  { ticker: "NVDA", value: 299.1, costBasis: 281.3 },
  { ticker: "AMZN", value: 275.4, costBasis: 263.28 },
  { ticker: "NFLX", value: 274.8, costBasis: 277.02 },
];

export const DEMO_PRACTICE_HOLDINGS: Holding[] = PRACTICE_SEED.map((h) => ({
  ticker: h.ticker,
  shares: h.value / price(h.ticker),
  costBasis: h.costBasis,
}));

/** Practice cash is virtual and has no economic value. */
export const DEMO_PRACTICE_CASH = 751.5;

export const DEMO_MONEY_BALANCE = 50;

export const DEMO_MANDATE: CurrentMandate = {
  status: "ACTIVE",
  version: 4,
  nonce: 3,
  familyStage: "BOUNDED",
  maxActionNotional: 10,
  maxPeriodNotional: 50,
  periodLabel: "this month",
  spentThisPeriod: 0,
  allowedAssets: ["AAPL", "NVDA", "AMZN", "MSFT", "NFLX", "MCD", "SPY", "QQQ"],
  allowedActions: ["BUY"],
  updatedAt: "2026-09-01T09:00:00.000Z",
};

export const DEMO_PROFILE = {
  childName: "Alex",
  parentName: "Sam",
  age: 13,
  goalId: "bike" as Goal["id"],
  xp: 1450,
  streakDays: 7,
  companiesResearched: ["AAPL", "NVDA", "NFLX", "MCD"],
  completedLessons: ["needs-and-wants", "why-save", "what-is-a-company"],
  /** Lessons counted before this demo session (for "12 lessons completed"). */
  priorLessonCount: 9,
  parentLinked: true,
};

export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 950, 1200, 1400, 2000, 2600, 3300, 4100];

export function levelFor(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
  return { level, next, toNext: Math.max(0, next - xp), progress: Math.min(1, xp / next) };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-investor", title: "First Investor", caption: "Made your first practice investment", earned: true },
  { id: "streak-5", title: "5-Day Streak", caption: "Learned 5 days in a row", earned: true },
  { id: "company-detective", title: "Company Detective", caption: "Researched 4 companies", earned: true },
  { id: "diversification-pro", title: "Diversification Pro", caption: "Invested in 4 industries", earned: true },
  { id: "money-master", title: "Money Master", caption: "Completed all money basics", earned: true },
  { id: "ten-lessons", title: "10 Lessons Completed", caption: "Finished 10 lessons", earned: true },
];

export const CHALLENGES: Challenge[] = [
  { id: "research-5", title: "Research 5 companies", caption: "Read about a company you use", progress: 4, target: 5, xp: 40 },
  { id: "stock-module", title: "Finish What Is a Stock?", caption: "Complete both lessons", progress: 0, target: 2, xp: 50 },
  { id: "reasons", title: "Explain 3 practice investments", caption: "Add a one-line reason when you invest", progress: 1, target: 3, xp: 30 },
  { id: "streak-10", title: "10-day learning streak", caption: "Learn a little every day", progress: 7, target: 10, xp: 60 },
];

export const WEEKLY_ACTIVITY = [
  { day: "Mon", minutes: 8 },
  { day: "Tue", minutes: 12 },
  { day: "Wed", minutes: 6 },
  { day: "Thu", minutes: 14 },
  { day: "Fri", minutes: 9 },
  { day: "Sat", minutes: 16 },
  { day: "Sun", minutes: 20 },
];
