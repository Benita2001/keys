"use client";

import { useState } from "react";
import { AllocationChart, HoldingRow, InsightBanner, PriceChange, allocationColor } from "@/components/finance";
import { PlantPot } from "@/components/illustrations/objects";
import { MandateSummaryCard, MoneyModeUnavailable, MoneySyncState, ModeSwitch, PriceTruthLine, RequestStatusCard } from "@/components/mode";
import { DevnetReceipts } from "@/components/receipts";
import { DemoMoneyTag, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { ActionButton, Card, PageHeader, PeriodSelector, SectionHeader } from "@/components/ui/primitives";
import { formatUsd } from "@/domain/format";
import type { PortfolioView } from "@/domain/types";
import { usePortfolio } from "@/hooks/data";
import { allAssetSnapshots, seriesFor } from "@/services";
import { useMoneyTruth, useStore } from "@/state/store";

const PERIODS = ["1D", "1W", "1M", "1Y", "All"] as const;
const PERIOD_LABEL: Record<(typeof PERIODS)[number], string> = {
  "1D": "Today",
  "1W": "Past week",
  "1M": "Past month",
  "1Y": "Since you started",
  All: "Since you started",
};

/**
 * Change over a period. The demo portfolio was started about a month ago, so
 * 1M and longer equal "since you started" (cost basis). Shorter periods use
 * sample price history.
 */
function periodChange(view: PortfolioView, period: (typeof PERIODS)[number]) {
  if (period === "1M" || period === "1Y" || period === "All") {
    return { amount: view.totalChange, percent: view.totalChangePercent };
  }
  let start = 0;
  for (const h of view.holdings) {
    const series = seriesFor(h.asset, period);
    start += h.shares * (series[0]?.v ?? h.asset.price);
  }
  const amount = view.totalValue - start;
  return { amount, percent: start > 0 ? (amount / start) * 100 : 0 };
}

function insightFor(view: PortfolioView): { text: string; tone: "green" | "yellow" | "blue" } {
  const n = view.holdings.length;
  const top = view.holdings[0];
  const categories = new Set(view.holdings.map((h) => h.asset.category)).size;
  if (top && top.weight > 0.6) {
    return { text: `Most of your money is in ${top.asset.companyName}. Spreading it out means one bad day hurts less.`, tone: "yellow" };
  }
  if (n >= 3 && categories >= 2) return { text: "Nice! Your money is spread across different companies.", tone: "green" };
  return { text: "Tip: owning a few different companies helps spread out the ups and downs.", tone: "blue" };
}

export default function PortfolioPage() {
  const { state } = useStore();
  const money = useMoneyTruth();
  const mode = state.mode;
  const { assets, view } = usePortfolio(mode);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1M");

  const title = mode === "practice" ? "My Practice Portfolio" : "My Money Portfolio";

  let body: React.ReactNode;
  if (mode === "money" && !money.ready) {
    body = <MoneySyncState status={money.status} onRetry={money.refresh} />;
  } else if (mode === "money" && !state.profile.parentLinked) {
    body = <MoneyModeUnavailable reason="parent" />;
  } else if (assets.status === "loading") {
    body = (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-36 w-full rounded-[20px]" />
        <Skeleton className="h-52 w-full rounded-[20px]" />
      </div>
    );
  } else if (assets.status === "error" || !view) {
    body = <ErrorState onRetry={assets.reload} />;
  } else if (view.holdings.length === 0) {
    body = (
      <>
        {mode === "money" ? <MoneySummary balance={state.money.balance} /> : null}
        <EmptyState
          className="mt-4"
          art={<PlantPot className="size-20" />}
          title="Your portfolio is ready when you are."
          body="Explore a company you know."
          action={<ActionButton href="/explore">Explore companies</ActionButton>}
        />
      </>
    );
  } else {
    const insight = insightFor(view);
    const change = periodChange(view, period);
    body = (
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div>
          <PeriodSelector options={PERIODS} value={period} onChange={setPeriod} label="Performance period" />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              {mode === "money" ? <DemoMoneyTag className="mb-1" /> : null}
              <p className="text-[34px] font-black leading-none text-navy-strong tabular">{formatUsd(view.totalValue)}</p>
              <PriceChange percent={change.percent} amount={change.amount} size="md" className="mt-2" />
              <p className="mt-1 text-[12px] font-bold text-ink-3">{PERIOD_LABEL[period]}</p>
            </div>
            <PlantPot className="-mt-2 size-[84px] shrink-0" />
          </div>

          <Card className="mt-4 flex items-center gap-5 p-4">
            <AllocationChart holdings={view.holdings} />
            <ul className="min-w-0 flex-1 space-y-2">
              {view.holdings.map((h, i) => (
                <li key={h.ticker} className="flex items-center gap-2 text-[13.5px] font-bold">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: allocationColor(i) }} />
                  <span className="flex-1 truncate text-navy">{h.asset.companyName}</span>
                  <span className="text-ink-2 tabular">{Math.round(h.weight * 100)}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-3">
            <InsightBanner tone={insight.tone}>{insight.text}</InsightBanner>
          </div>
        </div>

        <div>
          <section className="mt-6 lg:mt-0" aria-labelledby="holdings-title">
            <SectionHeader title={<span id="holdings-title">My Holdings</span>} />
            <Card className="px-4 py-2">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-line-soft pb-2 pt-1 text-[11.5px] font-extrabold uppercase tracking-wide text-ink-3">
                <span>Company</span>
                <span className="w-[76px] text-right">Value</span>
                <span className="w-[64px] text-right">Change</span>
              </div>
              <ul className="divide-y divide-line-soft">
                {view.holdings.map((h) => (
                  <HoldingRow key={h.ticker} holding={h} href={`/explore/${h.ticker}`} />
                ))}
              </ul>
            </Card>
          </section>

          {mode === "practice" ? (
            <p className="mt-3 text-[13px] font-semibold text-ink-2">
              Practice balance: <span className="font-extrabold text-navy-strong tabular">{formatUsd(view.cash)}</span> virtual money to
              invest.
            </p>
          ) : (
            <>
              <div className="mt-4">
                <MoneySummary balance={view.cash} />
              </div>
              <MandateSummaryCard className="mt-4" mandate={state.mandate} who="My limits" />
              <DevnetReceipts
                receipts={state.moneyReceipts}
                nameOf={(t) => allAssetSnapshots().find((a) => a.ticker === t)?.companyName ?? t}
              />
            </>
          )}
          <PriceTruthLine view={view} className="mt-4" />
        </div>
      </div>
    );
  }

  const latestRequest = mode === "money" ? state.requests[0] : undefined;

  return (
    <div className="animate-rise">
      <PageHeader title={title} />
      <ModeSwitch className="mt-4 lg:max-w-[360px]" />
      {latestRequest ? (
        <div className="mt-3">
          <RequestStatusCard
            request={latestRequest}
            companyName={allAssetSnapshots().find((a) => a.ticker === latestRequest.asset)?.companyName ?? latestRequest.asset}
          />
        </div>
      ) : null}
      <div className="mt-4">{body}</div>
    </div>
  );
}

function MoneySummary({ balance }: { balance: number }) {
  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <p className="text-[12.5px] font-bold text-ink-2">Available to invest</p>
        <p className="text-[22px] font-extrabold text-navy-strong tabular">{formatUsd(balance)}</p>
      </div>
      <DemoMoneyTag />
    </Card>
  );
}
