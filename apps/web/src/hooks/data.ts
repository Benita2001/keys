"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DataStatus,
  Holding,
  HoldingView,
  MarketAsset,
  Mode,
  ModuleState,
  Period,
  PortfolioView,
  PricePoint,
} from "@/domain/types";
import { MODULES } from "@/mocks/learning";
import { levelFor } from "@/mocks/family";
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
  return useAsync(() => marketData.listAssets(), [key]);
}

export function useAsset(ticker: string) {
  const key = useFlagsKey();
  return useAsync(() => marketData.getAsset(ticker), [ticker, key]);
}

export function useSeries(ticker: string, period: Period) {
  const key = useFlagsKey();
  return useAsync<PricePoint[]>(() => marketData.getSeries(ticker, period), [ticker, period, key]);
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
  const firstIncomplete = MODULES.findIndex((m) => !m.lessonIds.every((id) => completedLessons.includes(id)));
  return MODULES.map((m, i) => {
    const done = m.lessonIds.filter((id) => completedLessons.includes(id)).length;
    const state: ModuleState = done === m.lessonIds.length ? "complete" : i === firstIncomplete ? "current" : "locked";
    return { id: m.id, state, done, total: m.lessonIds.length };
  });
}

export function useModuleStates() {
  const { state } = useStore();
  return useMemo(() => moduleStates(state.completedLessons), [state.completedLessons]);
}
