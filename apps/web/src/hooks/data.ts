"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Achievement,
  AchievementId,
  DataStatus,
  Holding,
  HoldingView,
  MarketAsset,
  Mode,
  ModuleState,
  Period,
  PortfolioView,
  SeriesResult,
} from "@/domain/types";
import { MODULES } from "@/mocks/learning";
import { ACHIEVEMENTS, levelFor } from "@/mocks/family";
import { marketData } from "@/services";
import { useStore } from "@/state/store";

export type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to loading on dependency change
    setState({ status: "loading" });
    fn().then(
      (data) => !cancelled && setState({ status: "success", data }),
      (error: Error) => !cancelled && setState({ status: "error", error }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}

function useFlagsKey() {
  const { state } = useStore();
  return `${state.demoFlags.marketFailure}:${state.demoFlags.slowNetwork}`;
}

export function useAssets() {
  const key = useFlagsKey();
  const { dispatch, hydrated } = useStore();
  const assets = useAsync(() => marketData.listAssets(), [key]);
  // Size the demo practice seed at loaded prices (upgraded once live prices arrive).
  // Waits for hydration so a stored portfolio is never overwritten by a pre-hydration pass.
  useEffect(() => {
    if (!hydrated || assets.status !== "success") return;
    dispatch({
      type: "pricePracticeSeed",
      prices: Object.fromEntries(
        assets.data.map((a) => [a.ticker, { price: a.price, live: a.dataStatus === "live" || a.dataStatus === "stale" }]),
      ),
    });
  }, [hydrated, assets.status, assets.data, dispatch]);
  return assets;
}

export function useAsset(ticker: string) {
  const key = useFlagsKey();
  return useAsync(() => marketData.getAsset(ticker), [ticker, key]);
}

export function useSeries(ticker: string, period: Period) {
  const key = useFlagsKey();
  return useAsync<SeriesResult>(() => marketData.getSeries(ticker, period), [ticker, period, key]);
}

export function buildPortfolio(mode: Mode, holdings: Holding[], cash: number, assets: MarketAsset[]): PortfolioView {
  const views: HoldingView[] = [];
  for (const h of holdings) {
    const asset = assets.find((a) => a.ticker === h.ticker);
    if (!asset) continue;
    const value = h.shares * asset.price;
    const change = value - h.costBasis;
    views.push({
      ...h,
      asset,
      value,
      change,
      changePercent: h.costBasis > 0 ? (change / h.costBasis) * 100 : 0,
      weight: 0,
    });
  }
  const totalValue = views.reduce((s, v) => s + v.value, 0);
  const totalCost = views.reduce((s, v) => s + v.costBasis, 0);
  for (const v of views) v.weight = totalValue > 0 ? v.value / totalValue : 0;
  views.sort((a, b) => b.value - a.value);
  const dataStatus: DataStatus = views.some((v) => v.asset.dataStatus === "mock") || views.length === 0 ? "mock" : "live";
  return {
    mode,
    holdings: views,
    totalValue,
    totalCost,
    totalChange: totalValue - totalCost,
    totalChangePercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    cash,
    dataStatus,
  };
}

/** Portfolio for the given mode, valued with the loaded market data. */
export function usePortfolio(mode: Mode) {
  const { state } = useStore();
  const assets = useAssets();
  const emptyPractice = state.demoFlags.emptyPractice;
  const practiceHoldings = state.practice.holdings;
  const moneyHoldings = state.money.holdings;
  const cash = mode === "practice" ? state.practice.cash : state.money.balance;

  const view = useMemo(() => {
    if (assets.status !== "success") return null;
    const holdings = mode === "practice" ? (emptyPractice ? [] : practiceHoldings) : moneyHoldings;
    return buildPortfolio(mode, holdings, cash, assets.data);
  }, [assets.status, assets.data, mode, emptyPractice, practiceHoldings, moneyHoldings, cash]);

  return { assets, view };
}

export function useLevel() {
  const { state } = useStore();
  return { xp: state.xp, ...levelFor(state.xp) };
}

/** Modules unlock in order: the first incomplete module is current, later ones are locked. */
export function moduleStates(completedLessons: string[]): { id: string; state: ModuleState; done: number; total: number }[] {
  const firstIncomplete = MODULES.findIndex((m) => m.track !== "explore" && !m.lessonIds.every((id) => completedLessons.includes(id)));
  return MODULES.map((m, i) => {
    const done = m.lessonIds.filter((id) => completedLessons.includes(id)).length;
    const state: ModuleState =
      done === m.lessonIds.length ? "complete" : m.track === "explore" ? "open" : i === firstIncomplete ? "current" : "locked";
    return { id: m.id, state, done, total: m.lessonIds.length };
  });
}

export function useModuleStates() {
  const { state } = useStore();
  return useMemo(() => moduleStates(state.completedLessons), [state.completedLessons]);
}

/** Consecutive days (ending today or yesterday) with learning minutes. */
export function learningStreak(minutes: { at: string; minutes: number }[], now = new Date()): number {
  const days = new Set(
    minutes.filter((m) => m.minutes > 0).map((m) => new Date(m.at).toISOString().slice(0, 10)),
  );
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
  let streak = 0;
  while (days.has(day.toISOString().slice(0, 10))) {
    streak++;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return streak;
}

/**
 * Learning stats. With a backend they come from the synchronized learning
 * summary (shared across devices); without one, from the local demo profile.
 * Never an input to authority.
 */
export function useLearningStats() {
  const { state, sync } = useStore();
  const backend = sync.status !== "off";
  return {
    lessonsCompleted: backend ? state.completedLessons.length : state.priorLessonCount + state.completedLessons.length,
    streakDays: backend ? learningStreak(state.learningMinutes) : state.streakDays,
    researched: state.researched.length,
  };
}

/**
 * Badges earned from real activity (learning, curiosity, diversification).
 * Never from trade frequency, risk or P&L, and never an input to authority.
 */
export function useAchievements(): Achievement[] {
  const { state } = useStore();
  const stats = useLearningStats();
  const moneyBasics = MODULES.find((m) => m.id === "money-basics")?.lessonIds ?? [];
  const practiceTickers = new Set(state.practice.holdings.map((h) => h.ticker));
  const earned: Record<AchievementId, boolean> = {
    "first-investor": practiceTickers.size > 0 || state.moneyReceipts.length > 0,
    "streak-5": stats.streakDays >= 5,
    "company-detective": stats.researched >= 4,
    "diversification-pro": practiceTickers.size >= 4,
    "money-master": moneyBasics.length > 0 && moneyBasics.every((id) => state.completedLessons.includes(id)),
    "ten-lessons": stats.lessonsCompleted >= 10,
  };
  return ACHIEVEMENTS.map((a) => ({ ...a, earned: earned[a.id] }));
}
