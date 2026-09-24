"use client";

/**
 * Local demo session provider.
 *
 * Until auth, profile and portfolio services exist on the backend, the
 * frontend keeps the demo family's state here and persists it in
 * localStorage. Nothing in this store is authority: Money-mode decisions are
 * made through services/moneyExecution, and learning/XP/P&L fields are never
 * read by any Mandate-changing code path.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type {
  BoundaryRequest,
  CurrentMandate,
  ExecutionProof,
  GoalId,
  Holding,
  Mode,
  Session,
} from "@/domain/types";
import {
  DEMO_MANDATE,
  DEMO_MONEY_BALANCE,
  DEMO_PRACTICE_CASH,
  DEMO_PRACTICE_HOLDINGS,
  DEMO_PROFILE,
} from "@/mocks/family";
import { setDemoFlags, type DemoFlags } from "@/services";
import { fetchFamilyState, keysBackendConfigured } from "@/services/keys-backend";

export type ActivityItem = {
  id: string;
  mode: Mode;
  ticker: string;
  amount: number;
  shares: number;
  reason?: string;
  proof: ExecutionProof;
  idempotencyKey?: string;
};

/** A Money intent whose outcome isn't confirmed yet. Re-checks must reuse its key. */
export type PendingExecution = {
  idempotencyKey: string;
  ticker: string;
  amount: number;
  createdAt: string;
};

export type AppState = {
  version: 1;
  session: Session | null;
  profile: {
    childName: string;
    parentName: string;
    age: number | null;
    goalId: GoalId;
    interests: string[];
    parentLinked: boolean;
  };
  mode: Mode;
  moneyIntroSeen: boolean;
  xp: number;
  streakDays: number;
  completedLessons: string[];
  priorLessonCount: number;
  researched: string[];
  learningMinutes: { at: string; minutes: number }[];
  practice: { holdings: Holding[]; cash: number };
  money: { holdings: Holding[]; balance: number };
  mandate: CurrentMandate;
  requests: BoundaryRequest[];
  activity: ActivityItem[];
  pendingExecutions: PendingExecution[];
  settings: {
    weeklyLessonGoal: number;
    notifyBoundaryRequests: boolean;
    notifyWeeklySummary: boolean;
    notifyLessons: boolean;
    allowanceAmount: number;
  };
  demoFlags: DemoFlags & { emptyPractice: boolean };
};

export const initialState: AppState = {
  version: 1,
  session: null,
  profile: {
    childName: DEMO_PROFILE.childName,
    parentName: DEMO_PROFILE.parentName,
    age: DEMO_PROFILE.age,
    goalId: DEMO_PROFILE.goalId,
    interests: [],
    parentLinked: DEMO_PROFILE.parentLinked,
  },
  mode: "practice",
  moneyIntroSeen: false,
  xp: DEMO_PROFILE.xp,
  streakDays: DEMO_PROFILE.streakDays,
  completedLessons: DEMO_PROFILE.completedLessons,
  priorLessonCount: DEMO_PROFILE.priorLessonCount,
  researched: DEMO_PROFILE.companiesResearched,
  learningMinutes: [],
  practice: { holdings: DEMO_PRACTICE_HOLDINGS, cash: DEMO_PRACTICE_CASH },
  money: { holdings: [], balance: DEMO_MONEY_BALANCE },
  mandate: DEMO_MANDATE,
  requests: [],
  activity: [],
  pendingExecutions: [],
  settings: {
    weeklyLessonGoal: 5,
    notifyBoundaryRequests: true,
    notifyWeeklySummary: true,
    notifyLessons: false,
    allowanceAmount: 0,
  },
  demoFlags: { marketFailure: false, slowNetwork: false, emptyPractice: false },
};

type Action =
  | { type: "hydrate"; state: AppState }
  | {
      type: "syncBackend";
      remote: Awaited<ReturnType<typeof fetchFamilyState>>;
    }
  | { type: "signIn"; session: Session }
  | { type: "signOut" }
  | { type: "setProfile"; profile: Partial<AppState["profile"]> }
  | { type: "setMode"; mode: Mode }
  | { type: "seenMoneyIntro" }
  | { type: "completeLesson"; lessonId: string; xp: number }
  | { type: "researched"; ticker: string }
  | { type: "practiceBuy"; ticker: string; amount: number; shares: number; reason?: string; proof: ExecutionProof }
  | { type: "moneyBuy"; ticker: string; amount: number; shares: number; reason?: string; proof: ExecutionProof; usedRequestId?: string; idempotencyKey?: string }
  | { type: "trackPending"; pending: PendingExecution }
  | { type: "clearPending"; idempotencyKey: string }
  | { type: "addRequest"; request: BoundaryRequest }
  | { type: "decideRequest"; request: BoundaryRequest; mandate: CurrentMandate }
  | { type: "setMandate"; mandate: CurrentMandate }
  | { type: "addFunds"; amount: number }
  | { type: "setSettings"; settings: Partial<AppState["settings"]> }
  | { type: "setDemoFlags"; flags: Partial<AppState["demoFlags"]> }
  | { type: "reset" };

function addHolding(holdings: Holding[], ticker: string, shares: number, amount: number): Holding[] {
  const existing = holdings.find((h) => h.ticker === ticker);
  if (!existing) return [...holdings, { ticker, shares, costBasis: amount }];
  return holdings.map((h) =>
    h.ticker === ticker ? { ...h, shares: h.shares + shares, costBasis: h.costBasis + amount } : h,
  );
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "syncBackend":
      return {
        ...state,
        profile: {
          ...state.profile,
          childName: action.remote.profile.childName,
          parentName: action.remote.profile.parentName,
          parentLinked: action.remote.profile.parentLinked,
        },
        mandate: {
          ...state.mandate,
          ...action.remote.mandate,
        },
        money: {
          holdings: action.remote.moneyHoldings,
          balance: action.remote.balances.money,
        },
        requests: action.remote.requests,
        completedLessons: action.remote.learning.completedLessons,
        xp: action.remote.learning.xp,
        learningMinutes: action.remote.learning.weeklyMinutes ?? [],
      };
    case "signIn":
      return { ...state, session: action.session };
    case "signOut":
      return { ...state, session: null };
    case "setProfile":
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case "setMode":
      return { ...state, mode: action.mode };
    case "seenMoneyIntro":
      return { ...state, moneyIntroSeen: true };
    case "completeLesson":
      if (state.completedLessons.includes(action.lessonId)) return state;
      return {
        ...state,
        completedLessons: [...state.completedLessons, action.lessonId],
        xp: state.xp + action.xp,
        // Deliberately no mandate change here: LEARNING COMPLETION != AUTHORITY.
      };
    case "researched":
      if (state.researched.includes(action.ticker)) return state;
      return { ...state, researched: [...state.researched, action.ticker] };
    case "practiceBuy":
      return {
        ...state,
        practice: {
          holdings: addHolding(state.practice.holdings, action.ticker, action.shares, action.amount),
          cash: Math.max(0, state.practice.cash - action.amount),
        },
        activity: [
          { id: `a_${Date.now()}`, mode: "practice", ticker: action.ticker, amount: action.amount, shares: action.shares, reason: action.reason, proof: action.proof },
          ...state.activity,
        ],
      };
    case "moneyBuy":
      // One user intent is applied at most once, even if a re-check confirms it again.
      if (action.idempotencyKey && state.activity.some((a) => a.idempotencyKey === action.idempotencyKey)) return state;
      return {
        ...state,
        money: {
          holdings: addHolding(state.money.holdings, action.ticker, action.shares, action.amount),
          balance: Math.max(0, state.money.balance - action.amount),
        },
        mandate: { ...state.mandate, spentThisPeriod: state.mandate.spentThisPeriod + action.amount },
        pendingExecutions: state.pendingExecutions.filter((p) => p.idempotencyKey !== action.idempotencyKey),
        requests: action.usedRequestId
          ? state.requests.map((r) => (r.id === action.usedRequestId ? { ...r, status: "ALLOWED_ONCE_USED" } : r))
          : state.requests,
        activity: [
          { id: `a_${Date.now()}`, mode: "money", ticker: action.ticker, amount: action.amount, shares: action.shares, reason: action.reason, proof: action.proof, idempotencyKey: action.idempotencyKey },
          ...state.activity,
        ],
      };
    case "trackPending":
      if (state.pendingExecutions.some((p) => p.idempotencyKey === action.pending.idempotencyKey)) return state;
      return { ...state, pendingExecutions: [...state.pendingExecutions, action.pending] };
    case "clearPending":
      return { ...state, pendingExecutions: state.pendingExecutions.filter((p) => p.idempotencyKey !== action.idempotencyKey) };
    case "addRequest":
      return { ...state, requests: [action.request, ...state.requests] };
    case "decideRequest":
      return {
        ...state,
        mandate: action.mandate,
        requests: state.requests.map((r) => (r.id === action.request.id ? action.request : r)),
      };
    case "setMandate":
      return { ...state, mandate: action.mandate };
    case "addFunds":
      return { ...state, money: { ...state.money, balance: state.money.balance + action.amount } };
    case "setSettings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "setDemoFlags":
      return { ...state, demoFlags: { ...state.demoFlags, ...action.flags } };
    case "reset":
      return { ...initialState, session: state.session };
    default:
      return state;
  }
}

const STORAGE_KEY = "cresco-demo-v1";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/**
 * Persisted demo state is untrusted (older app versions, manual edits).
 * Anything that doesn't match the current shape is discarded rather than
 * crashing the app on every load.
 */
export function restoreState(raw: string | null): AppState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed) || parsed.version !== 1) return null;
  const m = parsed.mandate;
  const ok =
    isObj(parsed.profile) &&
    typeof parsed.profile.childName === "string" &&
    isObj(m) &&
    ["ACTIVE", "PAUSED", "REVOKED"].includes(m.status as string) &&
    isNum(m.version) && isNum(m.nonce) && isNum(m.maxActionNotional) && isNum(m.maxPeriodNotional) && isNum(m.spentThisPeriod) &&
    Array.isArray(m.allowedAssets) &&
    isObj(parsed.practice) && Array.isArray(parsed.practice.holdings) && isNum(parsed.practice.cash) &&
    isObj(parsed.money) && Array.isArray(parsed.money.holdings) && isNum(parsed.money.balance) &&
    Array.isArray(parsed.requests) && Array.isArray(parsed.completedLessons) && isNum(parsed.xp);
  if (!ok) return null;
  return {
    ...initialState,
    ...(parsed as Partial<AppState>),
    pendingExecutions: Array.isArray(parsed.pendingExecutions) ? (parsed.pendingExecutions as PendingExecution[]) : [],
    learningMinutes: Array.isArray(parsed.learningMinutes)
      ? (parsed.learningMinutes as { at: string; minutes: number }[])
      : [],
    settings: { ...initialState.settings, ...(isObj(parsed.settings) ? parsed.settings : {}) },
    demoFlags: { ...initialState.demoFlags, ...(isObj(parsed.demoFlags) ? parsed.demoFlags : {}) },
  } as AppState;
}

type Store = {
  state: AppState;
  hydrated: boolean;
  dispatch: React.Dispatch<Action>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useReducer(() => true, false);

  useEffect(() => {
    try {
      const restored = restoreState(window.localStorage.getItem(STORAGE_KEY));
      if (restored) dispatch({ type: "hydrate", state: restored });
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: run with in-memory demo state */
    }
    setHydrated();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated || !keysBackendConfigured()) return;

    let cancelled = false;
    const sync = async () => {
      try {
        const remote = await fetchFamilyState();
        if (!cancelled) dispatch({ type: "syncBackend", remote });
      } catch {
        // Keep the last local snapshot. Money execution itself still fails closed.
      }
    };

    void sync();
    const id = window.setInterval(sync, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [hydrated]);

  useEffect(() => {
    setDemoFlags({ marketFailure: state.demoFlags.marketFailure, slowNetwork: state.demoFlags.slowNetwork });
  }, [state.demoFlags.marketFailure, state.demoFlags.slowNetwork]);

  const value = useMemo(() => ({ state, dispatch, hydrated }), [state, hydrated]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useMode() {
  const { state, dispatch } = useStore();
  const setMode = useCallback((mode: Mode) => dispatch({ type: "setMode", mode }), [dispatch]);
  return [state.mode, setMode] as const;
}
