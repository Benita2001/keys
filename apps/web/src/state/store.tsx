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

export type ActivityItem = {
  id: string;
  mode: Mode;
  ticker: string;
  amount: number;
  shares: number;
  reason?: string;
  proof: ExecutionProof;
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
  practice: { holdings: Holding[]; cash: number };
  money: { holdings: Holding[]; balance: number };
  mandate: CurrentMandate;
  requests: BoundaryRequest[];
  activity: ActivityItem[];
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
  practice: { holdings: DEMO_PRACTICE_HOLDINGS, cash: DEMO_PRACTICE_CASH },
  money: { holdings: [], balance: DEMO_MONEY_BALANCE },
  mandate: DEMO_MANDATE,
  requests: [],
  activity: [],
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
  | { type: "signIn"; session: Session }
  | { type: "signOut" }
  | { type: "setProfile"; profile: Partial<AppState["profile"]> }
  | { type: "setMode"; mode: Mode }
  | { type: "seenMoneyIntro" }
  | { type: "completeLesson"; lessonId: string; xp: number }
  | { type: "researched"; ticker: string }
  | { type: "practiceBuy"; ticker: string; amount: number; shares: number; reason?: string; proof: ExecutionProof }
  | { type: "moneyBuy"; ticker: string; amount: number; shares: number; reason?: string; proof: ExecutionProof; usedRequestId?: string }
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
      return {
        ...state,
        money: {
          holdings: addHolding(state.money.holdings, action.ticker, action.shares, action.amount),
          balance: Math.max(0, state.money.balance - action.amount),
        },
        mandate: { ...state.mandate, spentThisPeriod: state.mandate.spentThisPeriod + action.amount },
        requests: action.usedRequestId
          ? state.requests.map((r) => (r.id === action.usedRequestId ? { ...r, status: "ALLOWED_ONCE_USED" } : r))
          : state.requests,
        activity: [
          { id: `a_${Date.now()}`, mode: "money", ticker: action.ticker, amount: action.amount, shares: action.shares, reason: action.reason, proof: action.proof },
          ...state.activity,
        ],
      };
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
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.version === 1) dispatch({ type: "hydrate", state: { ...initialState, ...parsed } });
      }
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
