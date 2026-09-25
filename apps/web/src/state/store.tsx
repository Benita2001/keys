"use client";

/**
 * Cresco session state (a cache, never authority).
 *
 * Network separation (see domain/network.ts):
 * - practiceChain: Practice capital on Solana Devnet, synced from the KEYS
 *   backend (Family Durable Object + Devnet program). Never written locally.
 * - sandbox: local practice for assets without a Devnet lane. Simulated, not on-chain.
 * - money: real-value Money on Solana Mainnet. Empty until Mainnet setup is
 *   proven; nothing on Devnet or in the sandbox can write to it.
 * The Key (`mandate`) is the Practice Key enforced on Devnet. Learning/XP never
 * feed any Key-changing path.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
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
  DEMO_PRACTICE_CASH,
  DEMO_PRACTICE_HOLDINGS,
  DEMO_PROFILE,
  PRACTICE_SEED,
} from "@/mocks/family";


import { setDemoFlags, type DemoFlags } from "@/services";
import {
  ensureBackendSession,
  fetchDevnetDemoRuntime,
  fetchFamilyState,
  keysBackendConfigured,
  toExecutionProof,
  type FamilyState,
} from "@/services/keys-backend";

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

/** A confirmed Practice execution on Solana Devnet (from the backend). */
export type PracticeReceipt = {
  id: string;
  ticker: string;
  amount: number;
  shares: number;
  createdAt: string;
  proof?: ExecutionProof;
  network: "solana-devnet";
  realValue: false;
};

/** Real-value Money on Solana Mainnet. Setup-required until every requirement is proven. */
export type MainnetMoneyState = {
  network: "solana-mainnet";
  realValue: true;
  status: "setup-required" | "live";
  balance: number | null;
  holdings: Holding[];
};

export const MAINNET_MONEY_SETUP_REQUIRED: MainnetMoneyState = {
  network: "solana-mainnet",
  realValue: true,
  status: "setup-required",
  balance: null,
  holdings: [],
};

/** A Practice (Devnet) intent whose outcome isn't confirmed yet. Re-checks must reuse its key. */
export type PendingExecution = {
  idempotencyKey: string;
  ticker: string;
  amount: number;
  createdAt: string;
};

export type AppState = {
  version: 2;
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
  /** Local practice for assets without a Devnet lane. Simulated, not on-chain. */
  sandbox: { holdings: Holding[]; cash: number };
  /** Practice capital on Solana Devnet (backend-synced). `balance` is available (minus holds). */
  practiceChain: { holdings: Holding[]; balance: number; synced: boolean };
  /** Real-value Money on Solana Mainnet. */
  money: MainnetMoneyState;
  /** The Practice Key, enforced by the KEYS program on Solana Devnet. */
  mandate: CurrentMandate;
  requests: BoundaryRequest[];
  activity: ActivityItem[];
  pendingExecutions: PendingExecution[];
  /** Confirmed Practice executions on Solana Devnet (backend receipts). Cache only. */
  practiceReceipts: PracticeReceipt[];
  familyCode: string | null;
  /** How each untouched seed lot was last sized: "live" is final, "sample" upgrades once live data arrives. */
  practiceSeedPriced: Record<string, "live" | "sample">;
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
  version: 2,
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
  sandbox: { holdings: DEMO_PRACTICE_HOLDINGS, cash: DEMO_PRACTICE_CASH },
  practiceChain: { holdings: [], balance: 0, synced: false },
  money: MAINNET_MONEY_SETUP_REQUIRED,
  mandate: DEMO_MANDATE,
  requests: [],
  activity: [],
  pendingExecutions: [],
  practiceReceipts: [],
  familyCode: null,
  practiceSeedPriced: {},
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
      remote: FamilyState;
      /** On-chain AAPL rule spend (Pyth USD) read via /demo/runtime (fallback for older backends). */
      chainSpent?: number | null;
    }
  | { type: "signIn"; session: Session }
  | { type: "signOut" }
  | { type: "setProfile"; profile: Partial<AppState["profile"]> }
  | { type: "setMode"; mode: Mode }
  | { type: "seenMoneyIntro" }
  | { type: "completeLesson"; lessonId: string; xp: number }
  | { type: "researched"; ticker: string }
  | { type: "practiceBuy"; ticker: string; amount: number; shares: number; reason?: string; proof: ExecutionProof }
  /** Size the untouched demo practice seed at the prices actually loaded. */
  | { type: "pricePracticeSeed"; prices: Record<string, { price: number; live: boolean }> }
  | { type: "trackPending"; pending: PendingExecution }
  | { type: "clearPending"; idempotencyKey: string }
  | { type: "addRequest"; request: BoundaryRequest }
  | { type: "decideRequest"; request: BoundaryRequest; mandate: CurrentMandate }
  | { type: "setMandate"; mandate: CurrentMandate }
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
    case "syncBackend": {
      const remote = action.remote;
      // Only Devnet practice executions are accepted into Practice. Anything else is dropped.
      const practiceReceipts: PracticeReceipt[] = (remote.activity ?? [])
        .filter((a) => a.kind === "MONEY_EXECUTION")
        .map((a) => ({ a, proof: a.proof ? toExecutionProof(a.proof) : undefined }))
        .filter(({ a, proof }) => (a.network ?? proof?.network ?? "solana-devnet") === "solana-devnet")
        .map(({ a, proof }) => ({
          id: a.id,
          ticker: a.ticker,
          amount: a.amount,
          shares: a.shares,
          createdAt: a.createdAt,
          proof,
          network: "solana-devnet" as const,
          realValue: false as const,
        }));
      // An unconfirmed intent that the backend has since recorded is no longer pending.
      const settled = new Set(practiceReceipts.map((r) => r.proof?.idempotencyKey).filter(Boolean));
      // Held reservations count against balance and period exactly as the backend's
      // reserve check does, so the UI never offers room the ledger won't grant.
      const held =
        remote.practice?.period?.held ??
        Object.values(remote.reservations ?? {}).reduce((sum, r) => sum + (Number(r.notional) || 0), 0);
      // Chain is authoritative for on-chain spend (newer backends report it directly).
      const period = remote.practice?.period;
      const spent =
        period && typeof period.onChainSpent === "number"
          ? period.onChainSpent + period.held
          : Math.max((remote.mandate.spentThisPeriod ?? 0) + held, action.chainSpent ?? 0);
      return {
        ...state,
        pendingExecutions: state.pendingExecutions.filter((p) => !settled.has(p.idempotencyKey)),
        profile: {
          ...state.profile,
          childName: remote.profile.childName,
          parentName: remote.profile.parentName,
          parentLinked: remote.profile.parentLinked,
        },
        mandate: { ...state.mandate, ...remote.mandate, spentThisPeriod: spent },
        practiceChain: {
          holdings: remote.practice?.holdings ?? remote.moneyHoldings,
          balance: Math.max(0, (remote.practice?.balance ?? remote.balances.money) - held),
          synced: true,
        },
        // Mainnet Money is never derived from Devnet state.
        money: state.money,
        requests: remote.requests,
        practiceReceipts,
        familyCode: remote.familyCode ?? state.familyCode,
        completedLessons: remote.learning.completedLessons,
        xp: remote.learning.xp,
        learningMinutes: remote.learning.weeklyMinutes ?? [],
      };
    }
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
      // Sandbox only (assets without a Devnet lane). Devnet practice comes from sync.
      return {
        ...state,
        sandbox: {
          holdings: addHolding(state.sandbox.holdings, action.ticker, action.shares, action.amount),
          cash: Math.max(0, state.sandbox.cash - action.amount),
        },
        activity: [
          { id: `a_${Date.now()}`, mode: "practice", ticker: action.ticker, amount: action.amount, shares: action.shares, reason: action.reason, proof: action.proof },
          ...state.activity,
        ],
      };
    case "pricePracticeSeed": {
      // Only untouched seed lots (cost basis still exactly the seed's) are sized
      // at the loaded price; anything the user bought keeps its real shares.
      // A lot sized at a sample price is re-sized once, when a live price arrives.
      let changed = false;
      const priced = { ...state.practiceSeedPriced };
      const holdings = state.sandbox.holdings.map((h) => {
        const seed = PRACTICE_SEED.find((p) => p.ticker === h.ticker && Math.abs(p.costBasis - h.costBasis) < 0.001);
        const quote = action.prices[h.ticker];
        if (!seed || !quote || !(quote.price > 0)) return h;
        const prev = priced[h.ticker];
        if (prev === "live" || (prev === "sample" && !quote.live)) return h;
        priced[h.ticker] = quote.live ? "live" : "sample";
        changed = true;
        return { ...h, shares: seed.value / quote.price };
      });
      return changed ? { ...state, sandbox: { ...state.sandbox, holdings }, practiceSeedPriced: priced } : state;
    }
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

/** v2: Practice = Devnet, Money = Mainnet. v1 caches used the reversed meaning and are discarded. */
const STORAGE_KEY = "cresco-demo-v2";

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
  if (!isObj(parsed) || parsed.version !== 2) return null;
  const m = parsed.mandate;
  const ok =
    isObj(parsed.profile) &&
    typeof parsed.profile.childName === "string" &&
    isObj(m) &&
    ["ACTIVE", "PAUSED", "REVOKED"].includes(m.status as string) &&
    isNum(m.version) && isNum(m.nonce) && isNum(m.maxActionNotional) && isNum(m.maxPeriodNotional) && isNum(m.spentThisPeriod) &&
    Array.isArray(m.allowedAssets) &&
    isObj(parsed.sandbox) && Array.isArray(parsed.sandbox.holdings) && isNum(parsed.sandbox.cash) &&
    isObj(parsed.practiceChain) && Array.isArray(parsed.practiceChain.holdings) && isNum(parsed.practiceChain.balance) &&
    Array.isArray(parsed.requests) && Array.isArray(parsed.completedLessons) && isNum(parsed.xp);
  if (!ok) return null;
  return {
    ...initialState,
    ...(parsed as Partial<AppState>),
    pendingExecutions: Array.isArray(parsed.pendingExecutions) ? (parsed.pendingExecutions as PendingExecution[]) : [],
    practiceReceipts: Array.isArray(parsed.practiceReceipts) ? (parsed.practiceReceipts as PracticeReceipt[]) : [],
    // Mainnet Money is never restored from a browser cache.
    money: MAINNET_MONEY_SETUP_REQUIRED,
    practiceChain: { ...(parsed.practiceChain as AppState["practiceChain"]), synced: false },
    familyCode: typeof parsed.familyCode === "string" ? parsed.familyCode : null,
    practiceSeedPriced:
      parsed.practiceSeedPriced && typeof parsed.practiceSeedPriced === "object"
        ? (parsed.practiceSeedPriced as Record<string, "live" | "sample">)
        : {},
    learningMinutes: Array.isArray(parsed.learningMinutes)
      ? (parsed.learningMinutes as { at: string; minutes: number }[])
      : [],
    settings: { ...initialState.settings, ...(isObj(parsed.settings) ? parsed.settings : {}) },
    demoFlags: { ...initialState.demoFlags, ...(isObj(parsed.demoFlags) ? parsed.demoFlags : {}) },
  } as AppState;
}

/**
 * Backend sync status. Money surfaces render only when `synced`; anything else
 * fails closed (skeleton, error or unavailable) so local defaults can never
 * pose as the family's real Money state.
 */
export type SyncStatus = "off" | "connecting" | "synced" | "error";

type Store = {
  state: AppState;
  hydrated: boolean;
  dispatch: React.Dispatch<Action>;
  sync: { status: SyncStatus; lastSyncedAt: number | null; error: string | null };
  /** Re-fetch shared Family state now (after funding, execution, decisions, learning). */
  refresh: (opts?: { chain?: boolean; passive?: boolean }) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

const POLL_MS = 15_000;
const MIN_PASSIVE_GAP_MS = 5_000;
/** Chain reads hit the backend's Solana RPC; keep them rare unless a mutation just happened. */
const CHAIN_READ_MS = 120_000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useReducer(() => true, false);
  const backend = keysBackendConfigured();
  const [sync, setSync] = useState<Store["sync"]>({
    status: backend ? "connecting" : "off",
    lastSyncedAt: null,
    error: null,
  });
  const role: "child" | "guardian" = state.session?.role === "parent" ? "guardian" : "child";
  const inflight = useRef<Promise<void> | null>(null);
  const lastSynced = useRef(0);
  // On-chain reads go through the backend's Devnet RPC, which is rate-limited.
  // Poll the Family Durable Object freely; read the chain at most once a minute
  // (and right after a mutation), keeping the last known value on failure.
  const chainRead = useRef<{ at: number; spent: number | null }>({ at: 0, spent: null });

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

  const refresh = useCallback(async (opts?: { chain?: boolean; passive?: boolean }) => {
    if (!backend) return;
    // Passive triggers (poll/focus/visibility) never hammer the API.
    if (opts?.passive && Date.now() - lastSynced.current < MIN_PASSIVE_GAP_MS) return;
    // Coalesce concurrent refreshes (poll + focus + post-mutation).
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        await ensureBackendSession(role);
        const readChain = opts?.chain || Date.now() - chainRead.current.at > CHAIN_READ_MS;
        const [remote, runtime] = await Promise.all([
          fetchFamilyState(),
          readChain ? fetchDevnetDemoRuntime().catch(() => null) : Promise.resolve(null),
        ]);
        if (typeof runtime?.assetRule?.spentThisPeriodNotionalMicroUsd === "number") {
          chainRead.current = {
            at: Date.now(),
            spent: Math.round(runtime.assetRule.spentThisPeriodNotionalMicroUsd / 10_000) / 100,
          };
        } else if (readChain) {
          chainRead.current = { ...chainRead.current, at: Date.now() };
        }
        dispatch({ type: "syncBackend", remote, chainSpent: chainRead.current.spent });
        lastSynced.current = Date.now();
        setSync({ status: "synced", lastSyncedAt: Date.now(), error: null });
      } catch (e) {
        setSync((prev) => ({
          status: prev.lastSyncedAt ? "synced" : "error",
          lastSyncedAt: prev.lastSyncedAt,
          error: e instanceof Error ? e.message : "sync failed",
        }));
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [backend, role]);

  useEffect(() => {
    if (!hydrated || !backend) return;
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh({ passive: true });
    }, POLL_MS);
    const onFocus = () => void refresh({ passive: true });
    const onVisible = () => document.visibilityState === "visible" && void refresh({ passive: true });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, backend, refresh]);

  useEffect(() => {
    setDemoFlags({ marketFailure: state.demoFlags.marketFailure, slowNetwork: state.demoFlags.slowNetwork });
  }, [state.demoFlags.marketFailure, state.demoFlags.slowNetwork]);

  const value = useMemo(() => ({ state, dispatch, hydrated, sync, refresh }), [state, hydrated, sync, refresh]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/**
 * Practice-on-Devnet state the UI may show. `ready` is false until the backend
 * has synced; without a backend there is no Devnet lane at all (`available` false).
 */
export function usePracticeChain() {
  const { state, sync, refresh } = useStore();
  const available = sync.status !== "off";
  return {
    available,
    ready: sync.status === "synced",
    status: sync.status,
    error: sync.error,
    refresh,
    network: "solana-devnet" as const,
    realValue: false as const,
    mandate: state.mandate,
    balance: state.practiceChain.balance,
    holdings: state.practiceChain.holdings,
    requests: state.requests,
    receipts: state.practiceReceipts,
  };
}

/** Real-value Money on Solana Mainnet. Setup-required until proven. */
export function useMainnetMoney() {
  const { state } = useStore();
  return state.money;
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
