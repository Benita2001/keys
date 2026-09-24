"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Inbox,
  MapPin,
  PauseCircle,
  PlayCircle,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PriceChange, PriceChart, WeeklyBars } from "@/components/finance";
import { MandateSummaryCard, MoneyBalanceCard } from "@/components/mode";
import { ErrorState, Skeleton, useToast } from "@/components/ui/feedback";
import { ActionButton, Avatar, Card, IconCircle, SectionHeader } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { isRequestStale } from "@/domain/policy";
import type { PricePoint } from "@/domain/types";
import { usePortfolio } from "@/hooks/data";
import { MODULES } from "@/mocks/learning";
import { allAssetSnapshots, mandates, seriesFor } from "@/services";
import { useSingleFlight } from "@/hooks/single-flight";
import { useStore } from "@/state/store";

const TOPIC_LABEL: Record<string, string> = {
  "money-basics": "Money Basics",
  "what-is-a-company": "Companies",
  "what-is-a-stock": "Stocks",
  "why-prices-move": "Prices",
  "risk-and-reward": "Risk & Reward",
  "build-your-portfolio": "Diversification",
};

export default function ParentDashboard() {
  const { state, dispatch } = useStore();
  const guard = useSingleFlight();
  const toast = useToast();
  const { assets, view } = usePortfolio("practice");
  const child = state.profile.childName;
  const [rangeDays, setRangeDays] = useState<7 | 30>(30);
  const [clockNow, setClockNow] = useState(0);
  useEffect(() => setClockNow(Date.now()), []);
  const pending = state.requests.filter((r) => r.status === "PENDING_HUMAN_DECISION" && !isRequestStale(r, state.mandate));
  const lessonsCompleted = state.priorLessonCount + state.completedLessons.length;
  const topics = MODULES.filter((m) => m.lessonIds.some((id) => state.completedLessons.includes(id))).map((m) => TOPIC_LABEL[m.id]);
  const nameOf = (t: string) => allAssetSnapshots().find((a) => a.ticker === t)?.companyName ?? t;

  const perf = useMemo<PricePoint[] | null>(() => {
    if (!view || !view.holdings.length) return null;
    const series = view.holdings.map((h) => ({
      h,
      s: seriesFor(h.asset, rangeDays === 7 ? "1W" : "1M"),
    }));
    return series[0].s.map((p, i) => ({ t: p.t, v: series.reduce((sum, { h, s }) => sum + h.shares * s[i].v, 0) }));
  }, [view, rangeDays]);

  const togglePause = guard(async () => {
    const next = await mandates.update({
      mandate: state.mandate,
      changes: { status: state.mandate.status === "ACTIVE" ? "PAUSED" : "ACTIVE" },
    });
    dispatch({ type: "setMandate", mandate: next });
    toast(next.status === "PAUSED" ? "Money Mode paused" : "Money Mode resumed");
  });

  const learningBars = useMemo(() => {
    const now = clockNow;
    const windowMs = rangeDays * 24 * 60 * 60 * 1000;
    const entries = state.learningMinutes.filter(
      (entry) => now - Date.parse(entry.at) <= windowMs,
    );

    if (rangeDays === 7) {
      return Array.from({ length: 7 }, (_, index) => {
        const start = new Date(now - (6 - index) * 24 * 60 * 60 * 1000);
        const key = start.toISOString().slice(0, 10);
        return {
          day: start.toLocaleDateString("en-US", { weekday: "short" }),
          minutes: entries
            .filter((entry) => entry.at.slice(0, 10) === key)
            .reduce((sum, entry) => sum + entry.minutes, 0),
        };
      });
    }

    return Array.from({ length: 6 }, (_, index) => {
      const from = now - (30 - index * 5) * 24 * 60 * 60 * 1000;
      const to = from + 5 * 24 * 60 * 60 * 1000;
      return {
        day: `${index * 5 + 1}–${index * 5 + 5}`,
        minutes: entries
          .filter((entry) => {
            const t = Date.parse(entry.at);
            return t >= from && t < to;
          })
          .reduce((sum, entry) => sum + entry.minutes, 0),
      };
    });
  }, [clockNow, rangeDays, state.learningMinutes]);

  const settings = [
    { href: "/parent/limits", icon: <CircleDollarSign className="size-5" />, tone: "blue" as const, title: "Funding & investment limits", sub: "Add money and set limits" },
    { href: "/parent/settings#learning", icon: <MapPin className="size-5" />, tone: "green" as const, title: "Learning goals", sub: "Set and update goals" },
    { href: "/parent/settings#notifications", icon: <Bell className="size-5" />, tone: "orange" as const, title: "Notifications", sub: "Learning activity updates" },
    { href: "/parent/settings#allowance", icon: <Wallet className="size-5" />, tone: "green" as const, title: "Allowance / spending limits", sub: "Set monthly limits" },
  ];

  return (
    <div className="animate-rise">
      <header className="flex items-center gap-3">
        <Avatar size={52} />
        <h1 className="min-w-0 flex-1 text-[23px] font-black leading-tight text-navy-strong md:text-[28px]">{child}&apos;s Progress</h1>
        <label className="relative inline-flex h-9 shrink-0 items-center rounded-[11px] border border-line-soft bg-surface text-[12.5px] font-extrabold text-ink-2">
          <span className="sr-only">Dashboard period</span>
          <select
            value={rangeDays}
            onChange={(event) => setRangeDays(Number(event.target.value) as 7 | 30)}
            className="h-full appearance-none rounded-[11px] bg-transparent pl-3 pr-8 font-extrabold outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 size-3.5" />
        </label>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Column 1 */}
        <div className="min-w-0 space-y-5">
          <Card className="grid grid-cols-3 divide-x divide-line-soft py-3">
            <Stat icon={<BookOpen className="size-4" />} tone="blue" value={String(lessonsCompleted)} label="Lessons completed" />
            <Stat icon={<Flame className="size-4" />} tone="orange" value={String(state.streakDays)} label="Day streak" />
            <Stat icon={<Building2 className="size-4" />} tone="lavender" value={String(state.researched.length)} label="Companies researched" />
          </Card>

          <MoneyBalanceCard
            balance={state.money.balance}
            action={
              <ActionButton size="sm" href="/parent/add-money" arrow>
                Add money
              </ActionButton>
            }
          />

          {pending.length ? (
            <Card className="border-[#ffd9b8] bg-[#fff9f3] p-4">
              <p className="flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">
                <Inbox aria-hidden className="size-5 text-orange-text" /> {pending.length === 1 ? "1 request" : `${pending.length} requests`} for
                more room
              </p>
              <ul className="mt-2 space-y-2">
                {pending.map((r) => (
                  <li key={r.id}>
                    <Link href={`/parent/requests/${r.id}`} className="flex items-center gap-3 rounded-[14px] bg-surface p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-extrabold text-navy-strong">
                          {formatAmount(r.requestedNotional)} in {nameOf(r.asset)}
                        </p>
                        <p className="truncate text-[12.5px] font-semibold text-ink-2">&ldquo;{r.reason}&rdquo;</p>
                      </div>
                      <span className="text-[13px] font-extrabold text-blue">Review</span>
                      <ChevronRight aria-hidden className="size-4 text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <MandateSummaryCard
            mandate={state.mandate}
            who={`${child}'s current limits`}
            actions={
              <>
                <ActionButton size="sm" variant="ghost" href="/parent/limits">
                  Adjust limits
                </ActionButton>
                <ActionButton size="sm" variant="quiet" onClick={togglePause}>
                  <span className="inline-flex items-center gap-1.5">
                    {state.mandate.status === "ACTIVE" ? <PauseCircle aria-hidden className="size-4" /> : <PlayCircle aria-hidden className="size-4" />}
                    {state.mandate.status === "ACTIVE" ? "Pause" : "Resume"}
                  </span>
                </ActionButton>
              </>
            }
          />
          <p className="-mt-2 px-1 text-[12.5px] font-semibold text-ink-3">
            You define the boundary. Inside it, {child} can act without asking. You&apos;ll only hear about actions outside it.
          </p>
        </div>

        {/* Column 2 */}
        <div className="min-w-0 space-y-5">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-navy-strong">Portfolio Performance</h2>
              {view ? <PriceChange percent={view.totalChangePercent} size="md" /> : null}
            </div>
            <p className="text-[12px] font-bold text-ink-3">Practice portfolio · sample prices</p>
            {assets.status === "error" ? (
              <ErrorState className="mt-3" onRetry={assets.reload} />
            ) : perf ? (
              <PriceChart
                points={perf}
                trend={view?.totalChangePercent ?? 0}
                label={`Practice portfolio value, last ${rangeDays} days`}
                height={120}
                className="mt-2"
              />
            ) : assets.status === "loading" ? (
              <Skeleton className="mt-2 h-[120px] w-full" />
            ) : (
              <p className="mt-3 text-[14px] font-semibold text-ink-2">No practice investments yet.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-[16px] font-extrabold text-navy-strong">Topics Learned</h2>
            {topics.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <li key={t} className="rounded-full bg-blue-soft px-3 py-1 text-[12.5px] font-extrabold text-blue-strong">
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] font-semibold text-ink-2">No topics finished yet.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-[16px] font-extrabold text-navy-strong">Learning activity</h2>
            <p className="text-[12px] font-bold text-ink-3">
              Synced lesson minutes · last {rangeDays} days
            </p>
            <WeeklyBars data={learningBars} className="mt-3" />
          </Card>
        </div>

        {/* Column 3 */}
        <div className="min-w-0 space-y-5">
          <SectionHeader title="Controls" className="mb-0 lg:hidden" />
          <ul className="overflow-hidden rounded-[20px] border border-line-soft bg-surface">
            {settings.map((s, i) => (
              <li key={s.href} className={i ? "border-t border-line-soft" : undefined}>
                <Link href={s.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-soft">
                  <IconCircle tone={s.tone} size={38}>
                    {s.icon}
                  </IconCircle>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-extrabold text-navy-strong">{s.title}</span>
                    <span className="block text-[12.5px] font-semibold text-ink-2">{s.sub}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
          <Card className="p-4">
            <p className="text-[14px] font-extrabold text-navy-strong">About Money Mode</p>
            <p className="mt-1 text-[13px] font-semibold text-ink-2">
              Money Mode uses Solana Devnet test capital and a demo SPL token. It is not connected to a bank, broker or custodian and does not represent real securities.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, tone, value, label }: { icon: React.ReactNode; tone: "blue" | "orange" | "lavender"; value: string; label: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <span className="mx-auto flex w-fit items-center gap-1.5">
        <IconCircle tone={tone} size={26}>
          {icon}
        </IconCircle>
        <span className="text-[22px] font-black text-navy-strong tabular">{value}</span>
      </span>
      <p className="mt-1 text-[11.5px] font-bold leading-tight text-ink-2">{label}</p>
    </div>
  );
}
