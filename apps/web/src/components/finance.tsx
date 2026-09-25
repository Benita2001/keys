"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { useId, useMemo } from "react";
import { formatPercent, formatUsd, trendOf } from "@/domain/format";
import type { HoldingView, MarketAsset, PricePoint } from "@/domain/types";
import { Sprout } from "./illustrations/objects";
import { Card, cn } from "./ui/primitives";
import { DataStatusTag, Provenance, Skeleton } from "./ui/feedback";

/* ------------------------------------------------------------------ */
/* Identity                                                             */
/* ------------------------------------------------------------------ */

/**
 * Company identity tile. Uses brand colors and a lettermark rather than
 * reproducing trademarked logos.
 */
export function CompanyLogo({ asset, size = 44, className }: { asset: Pick<MarketAsset, "brand" | "companyName">; size?: number; className?: string }) {
  const { background, foreground, mark } = asset.brand;
  const light = background.toLowerCase() === "#ffffff" || background.toLowerCase().startsWith("#f");
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-[14px] font-black leading-none", light && "border border-line-soft", className)}
      style={{
        width: size,
        height: size,
        background,
        color: foreground,
        fontSize: mark.length > 2 ? size * 0.3 : size * 0.46,
        letterSpacing: mark.length > 2 ? "-0.02em" : "-0.03em",
      }}
    >
      {mark}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Movement                                                             */
/* ------------------------------------------------------------------ */

/** Direction is carried by icon + sign + color, never color alone. */
export function PriceChange({
  percent,
  amount,
  size = "sm",
  className,
  showIcon = true,
}: {
  percent: number;
  amount?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}) {
  const t = trendOf(percent);
  const color = t === "up" ? "text-green-strong" : t === "down" ? "text-loss-text" : "text-ink-2";
  const Icon = t === "up" ? ArrowUpRight : t === "down" ? ArrowDownRight : Minus;
  const text = { sm: "text-[12.5px]", md: "text-[14px]", lg: "text-[16px]" }[size];
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-extrabold tabular", color, text, className)}>
      {showIcon ? <Icon aria-hidden className={size === "lg" ? "size-4" : "size-3.5"} strokeWidth={2.8} /> : null}
      {amount != null ? `${formatUsd(amount, { sign: true })} (${formatPercent(percent)})` : formatPercent(percent)}
      <span className="sr-only">{t === "up" ? " up" : t === "down" ? " down" : " unchanged"}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                               */
/* ------------------------------------------------------------------ */

function toPath(points: PricePoint[], w: number, h: number, pad = 2) {
  if (points.length < 2) return { line: "", area: "", last: { x: 0, y: 0 } };
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const xy = points.map((p, i) => ({
    x: (i / (points.length - 1)) * w,
    y: pad + (1 - (p.v - min) / span) * (h - pad * 2),
  }));
  const line = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return { line, area, last: xy[xy.length - 1] };
}

export function MiniSparkline({ points, trend, className }: { points: PricePoint[]; trend: number; className?: string }) {
  const { line } = useMemo(() => toPath(points, 72, 28, 3), [points]);
  const stroke = trend < 0 ? "var(--cresco-loss)" : "var(--cresco-green)";
  return (
    <svg viewBox="0 0 72 28" className={cn("h-7 w-[72px]", className)} aria-hidden preserveAspectRatio="none">
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function PriceChart({
  points,
  trend,
  label,
  height = 160,
  className,
}: {
  points: PricePoint[];
  trend: number;
  label: string;
  height?: number;
  className?: string;
}) {
  const id = useId();
  const w = 340;
  const { line, area, last } = useMemo(() => toPath(points, w, height, 10), [points, height]);
  const color = trend < 0 ? "var(--cresco-loss)" : "var(--cresco-green)";
  const first = points[0]?.v;
  const end = points[points.length - 1]?.v;
  const summary =
    first != null && end != null
      ? `${label}: from ${formatUsd(first)} to ${formatUsd(end)}, ${end >= first ? "up" : "down"} ${formatPercent(((end - first) / first) * 100, { sign: false })}.`
      : label;
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} role="img" aria-label={summary} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".18" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="var(--cresco-border-soft)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${id}fill)`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={last.x - 4} cy={last.y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

const ALLOCATION_COLORS = ["#1769f6", "#21b66f", "#ff8a3d", "#e5484d", "#8b75f7", "#55cfc6", "#ffbc32", "#ff7aa8"];

export function allocationColor(index: number) {
  return ALLOCATION_COLORS[index % ALLOCATION_COLORS.length];
}

export function AllocationChart({ holdings, className }: { holdings: HoldingView[]; className?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const count = holdings.length;
  const offsets = holdings.map((_, i) => holdings.slice(0, i).reduce((sum, h) => sum + h.weight * c, 0));
  return (
    <div className={cn("relative size-[132px] shrink-0", className)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`Allocation across ${count} ${count === 1 ? "company" : "companies"}: ${holdings.map((h) => `${h.asset.companyName} ${Math.round(h.weight * 100)}%`).join(", ")}`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#eef2f8" strokeWidth="16" />
        {holdings.map((h, i) => {
          const len = Math.max(0, h.weight * c - (count > 1 ? 2 : 0));
          const el = (
            <circle
              key={`${h.lane ?? "x"}-${h.ticker}`}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={allocationColor(i)}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offsets[i]}
            />
          );
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[26px] font-extrabold leading-none text-navy-strong tabular">{count}</div>
          <div className="mt-0.5 text-[12px] font-bold text-ink-2">{count === 1 ? "Stock" : "Stocks"}</div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyBars({ data, className }: { data: { day: string; minutes: number }[]; className?: string }) {
  const max = Math.max(...data.map((d) => d.minutes), 1);
  return (
    <div className={cn("flex h-[88px] items-end justify-between gap-2", className)} role="img" aria-label={`Minutes learned this week: ${data.map((d) => `${d.day} ${d.minutes}`).join(", ")}`}>
      {data.map((d, i) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
          <div
            className={cn("w-full max-w-[22px] rounded-[6px]", i === data.length - 1 ? "bg-blue" : "bg-[#b9d2ff]")}
            style={{ height: `${Math.max(8, (d.minutes / max) * 64)}px` }}
          />
          <span className="text-[11px] font-bold text-ink-3">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rows                                                                 */
/* ------------------------------------------------------------------ */

export function CompanyCard({ asset, series, href }: { asset: MarketAsset; series?: PricePoint[]; href: string }) {
  const changeKnown = asset.changeSource !== "unknown";
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface px-3.5 py-3 transition-shadow duration-200 hover:shadow-soft"
      >
        <CompanyLogo asset={asset} size={44} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15.5px] font-extrabold text-navy-strong">{asset.companyName}</span>
            {asset.practiceLane === "devnet" ? <Provenance kind="money-proof" className="text-[10px]" /> : null}
          </div>
          <div className="text-[12px] font-bold text-ink-3">{asset.representation ? asset.shortDescription : asset.ticker}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-extrabold text-navy tabular">{formatUsd(asset.price)}</span>
            {changeKnown ? <PriceChange percent={asset.dayChangePercent} showIcon={false} /> : null}
            <DataStatusTag status={asset.dataStatus} source={asset.priceSource} className="text-[10px]" />
          </div>
          {asset.representation ? null : <div className="truncate text-[12px] font-semibold text-ink-2">{asset.shortDescription}</div>}
        </div>
        {asset.representation || !changeKnown ? null : series ? (
          <MiniSparkline points={series} trend={asset.dayChangePercent} />
        ) : (
          <Skeleton className="h-7 w-[72px]" />
        )}
      </Link>
    </li>
  );
}

export function CompanyCardSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface p-3.5">
      <Skeleton className="size-[46px] rounded-[14px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <Skeleton className="h-7 w-[72px]" />
    </li>
  );
}

export function HoldingRow({ holding, href }: { holding: HoldingView; href: string }) {
  return (
    <li>
      <Link href={href} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo asset={holding.asset} size={30} className="rounded-[10px]" />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-bold text-navy-strong">{holding.asset.companyName}</span>
            {holding.lane ? (
              <span className="block text-[11px] font-bold text-ink-3">
                {holding.lane === "devnet" ? "Solana Devnet · KEYS" : "Sandbox · not on-chain"}
              </span>
            ) : null}
          </span>
        </span>
        <span className="w-[76px] text-right text-[14px] font-bold text-navy tabular">{formatUsd(holding.value)}</span>
        <span className="flex w-[64px] items-center justify-end gap-0.5">
          <PriceChange percent={holding.changePercent} showIcon={false} />
          <ChevronRight aria-hidden className="size-4 text-ink-3" />
        </span>
      </Link>
    </li>
  );
}

export function InsightBanner({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "blue" | "yellow" }) {
  const cls = {
    green: "bg-green-soft text-green-strong",
    blue: "bg-blue-soft text-blue-strong",
    yellow: "bg-yellow-soft text-[#8a5a07]",
  }[tone];
  return (
    <div className={cn("flex items-center gap-3 rounded-[16px] px-4 py-3", cls)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/80">
        <Sprout className="size-6" />
      </span>
      <p className="text-[13.5px] font-bold leading-snug">{children}</p>
    </div>
  );
}

export function StatPill({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className={cn("px-3 py-2.5", className)}>
      <div className="text-[11.5px] font-bold text-ink-2">{label}</div>
      <div className="text-[16px] font-extrabold text-navy-strong tabular">{value}</div>
    </Card>
  );
}
