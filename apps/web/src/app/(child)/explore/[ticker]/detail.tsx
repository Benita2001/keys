"use client";

import Link from "next/link";
import {
  Bolt,
  Hamburger,
  Car,
  ChevronLeft,
  Cloud,
  Cpu,
  Film,
  Globe,
  Heart,
  MonitorSmartphone,
  ShoppingBasket,
  ShoppingCart,
  Swords,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CompanyHero } from "@/components/illustrations/scenes";
import { ThinkingKid } from "@/components/illustrations/people";
import { CompanyLogo, PriceChange, PriceChart } from "@/components/finance";
import { MoneyModeUnavailable, MoneySyncState, ModeSwitch } from "@/components/mode";
import { DataStatusTag, DemoMoneyTag, EmptyState, ErrorState, Provenance, Skeleton } from "@/components/ui/feedback";
import { BottomSheet } from "@/components/ui/overlay";
import { ActionButton, Card, IconCircle, PeriodSelector } from "@/components/ui/primitives";
import { formatAmount, formatUsd } from "@/domain/format";
import { assetRuleFor, evaluateBoundedAction, explainEvaluation, maxAllowedNow } from "@/domain/policy";
import type { MarketAsset, Period, ThingToKnow } from "@/domain/types";
import { useAsset, useSeries } from "@/hooks/data";
import { MONEY_PROOF_TICKER } from "@/services";
import { useMoneyTruth, useStore } from "@/state/store";

const THING_ICONS: Record<ThingToKnow["icon"], React.ComponentType<{ className?: string }>> = {
  devices: MonitorSmartphone,
  globe: Globe,
  heart: Heart,
  swords: Swords,
  film: Film,
  cart: ShoppingCart,
  chip: Cpu,
  burger: Hamburger,
  car: Car,
  cloud: Cloud,
  users: Users,
  basket: ShoppingBasket,
  bolt: Bolt,
};

const PERIODS = ["1D", "1W", "1M", "1Y"] as const;

export function CompanyDetail({ ticker }: { ticker: string }) {
  const asset = useAsset(ticker);
  const { dispatch } = useStore();

  useEffect(() => {
    if (asset.status === "success" && asset.data) dispatch({ type: "researched", ticker: asset.data.ticker });
  }, [asset.status, asset.data, dispatch]);

  if (asset.status === "loading") {
    return (
      <div aria-busy="true">
        <Skeleton className="-mx-5 -mt-5 h-[200px] rounded-none md:mx-0 md:mt-0 md:rounded-[24px]" />
        <Skeleton className="mt-4 h-28 w-full rounded-[20px]" />
        <Skeleton className="mt-4 h-44 w-full rounded-[20px]" />
      </div>
    );
  }
  if (asset.status === "error") return <ErrorState onRetry={asset.reload} />;
  if (!asset.data) {
    return (
      <EmptyState
        title="We couldn't find that company"
        body="Cresco only lists companies with a matching tokenized stock."
        action={<ActionButton href="/explore">Back to Explore</ActionButton>}
      />
    );
  }
  return <Loaded asset={asset.data} />;
}

function Loaded({ asset }: { asset: MarketAsset }) {
  const [period, setPeriod] = useState<Period>("1M");
  const series = useSeries(asset.ticker, period);
  const [learnOpen, setLearnOpen] = useState(false);

  return (
    <div className="animate-rise lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
      <div>
        {/* Hero */}
        <div className="relative -mx-5 -mt-5 overflow-hidden md:mx-0 md:mt-0 md:rounded-[24px]">
          <CompanyHero asset={asset} className="block h-[200px] w-full" />
          <Link
            href="/explore"
            aria-label="Back to Explore"
            className="absolute left-4 top-4 grid size-11 place-items-center rounded-full bg-white/90 text-navy shadow-soft backdrop-blur"
          >
            <ChevronLeft className="size-6" strokeWidth={2.6} />
          </Link>
        </div>

        {/* Identity card overlaps hero */}
        <Card className="relative -mt-10 p-4 shadow-card">
          <div className="flex items-start gap-3">
            <CompanyLogo asset={asset} size={52} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-black leading-tight text-navy-strong">{asset.companyName}</h1>
              <p className="text-[12.5px] font-bold text-ink-3">
                {asset.representation
                  ? `${asset.representation.label}`
                  : `${asset.ticker} · ${asset.tokenizedTicker} on Solana`}
              </p>
            </div>
            <Provenance kind={asset.moneyModeStatus === "eligible" ? "money-proof" : "learn-practice"} />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="text-[30px] font-black leading-none text-navy-strong tabular">{formatUsd(asset.price)}</span>
            {asset.changeSource !== "unknown" ? (
              <>
                <PriceChange percent={asset.dayChangePercent} size="lg" className="mb-0.5" />
                <span className="mb-1 text-[12px] font-bold text-ink-3">today</span>
              </>
            ) : null}
            <DataStatusTag status={asset.dataStatus} source={asset.priceSource} className="mb-1 ml-auto" />
          </div>
          {asset.representation ? <RepresentationFacts asset={asset} /> : null}
        </Card>

        {asset.representation ? null : (
          <div className="mt-4">
            <PeriodSelector options={PERIODS} value={period as (typeof PERIODS)[number]} onChange={setPeriod} label="Chart period" />
            <div className="mt-2 min-h-[130px]">
              {series.status === "success" && series.data.points.length > 1 ? (
                <PriceChart
                  points={series.data.points}
                  trend={series.data.points[series.data.points.length - 1].v - series.data.points[0].v}
                  label={`${asset.companyName} ${series.data.source === "pyth-history" ? "Pyth price history" : "sample chart"}, ${period}`}
                  height={130}
                />
              ) : series.status === "error" ? (
                <ErrorState onRetry={series.reload} />
              ) : series.status === "success" ? (
                <div className="grid h-[130px] place-items-center rounded-[16px] bg-surface-soft text-[13px] font-semibold text-ink-2">
                  Price history is unavailable right now.
                </div>
              ) : (
                <Skeleton className="h-[130px] w-full" />
              )}
            </div>
            {series.status === "success" ? (
              <p className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-ink-3">
                <Provenance kind={series.data.source === "pyth-history" ? "pyth-history" : "sample-chart"} />
                {series.data.source === "pyth-history"
                  ? "Real Pyth Pro price history."
                  : "Illustrative sample chart. Real history isn't connected for this company yet."}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <section className="mt-6 lg:mt-0" aria-labelledby="about-title">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h2 id="about-title" className="text-[18px] font-extrabold text-navy-strong">
                What does this company do?
              </h2>
              <p className="mt-1.5 text-[14.5px] font-semibold leading-relaxed text-ink-2">{asset.about}</p>
            </div>
            <ThinkingKid className="size-[92px] shrink-0" />
          </div>
        </section>

        <section className="mt-5" aria-labelledby="things-title">
          <h2 id="things-title" className="text-[18px] font-extrabold text-navy-strong">
            Things to Know
          </h2>
          <ul className="mt-2 space-y-1">
            {asset.thingsToKnow.map((t) => {
              const Icon = THING_ICONS[t.icon];
              return (
                <li key={t.text} className="flex items-center gap-3 py-1.5">
                  <IconCircle tone={t.tone} size={36}>
                    <Icon className="size-[18px]" />
                  </IconCircle>
                  <span className="text-[14px] font-semibold text-navy">{t.text}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-5">
          {asset.representation ? null : <ModeSwitch className="mb-3" />}
          <ActionPanel asset={asset} onLearn={() => setLearnOpen(true)} />
        </div>
      </div>

      <BottomSheet open={learnOpen} onClose={() => setLearnOpen(false)} title={`Before you invest in ${asset.companyName}`}>
        <ul className="space-y-3 text-[14px] font-semibold text-ink-2">
          <li>
            <span className="font-extrabold text-navy-strong">What you&apos;d own. </span>A share is a small piece of {asset.companyName}.
            On Cresco it&apos;s represented by {asset.tokenizedTicker}, a tokenized version of {asset.ticker} on Solana.
          </li>
          <li>
            <span className="font-extrabold text-navy-strong">Prices move. </span>It can be worth more or less later. Nobody knows for
            sure.
          </li>
          <li>
            <span className="font-extrabold text-navy-strong">Don&apos;t put it all in one place. </span>Owning a few different
            companies means one bad day hurts less.
          </li>
          <li>
            <span className="font-extrabold text-navy-strong">Know your why. </span>Can you explain in one line why you like this
            business?
          </li>
        </ul>
        <ActionButton className="mt-5" onClick={() => setLearnOpen(false)} data-autofocus>
          Got it
        </ActionButton>
      </BottomSheet>
    </div>
  );
}

/** CTA area. Practice → add; Money → evaluated against the active Mandate. */
function ActionPanel({ asset, onLearn }: { asset: MarketAsset; onLearn: () => void }) {
  const { state } = useStore();
  const money = useMoneyTruth();
  const { mandate } = state;
  const learn = (
    <ActionButton variant="secondary" onClick={onLearn} className="mt-2.5">
      Learn About This Company
    </ActionButton>
  );

  if (state.mode === "practice" || asset.representation) {
    return (
      <>
        <ActionButton href={`/invest/${asset.ticker}?mode=practice`}>Add to Practice Portfolio</ActionButton>
        {asset.representation ? (
          <ActionButton variant="secondary" href="/lesson/what-is-a-pre-ipo-company" className="mt-2.5">
            Learn about private companies
          </ActionButton>
        ) : (
          learn
        )}
      </>
    );
  }

  if (!money.ready) return <MoneySyncState status={money.status} onRetry={money.refresh} />;
  if (!state.profile.parentLinked) return <MoneyModeUnavailable reason="parent" />;
  if (mandate.status !== "ACTIVE") return <MoneyModeUnavailable reason="paused" />;

  if (asset.moneyModeStatus === "unavailable") {
    return (
      <>
        <MoneyLine
          asset={asset}
          note={`${asset.companyName} is Practice-only for now. Apple is the only company connected to Money Mode today.`}
        />
        <ActionButton href={`/invest/${asset.ticker}?mode=practice`}>Practice with {asset.companyName}</ActionButton>
        <ActionButton variant="secondary" href={`/explore/${MONEY_PROOF_TICKER}`} className="mt-2.5">
          See Apple in Money Mode
        </ActionButton>
      </>
    );
  }

  const quick = Math.min(5, mandate.maxActionNotional);
  const preview = evaluateBoundedAction({
    mandate,
    assetRule: assetRuleFor(mandate, asset.ticker),
    action: { asset: asset.ticker, type: "BUY", notional: quick },
  });

  if (preview.reasonCode === "ASSET_OUTSIDE_MANDATE") {
    const { body } = explainEvaluation(preview, mandate, asset.companyName);
    return (
      <>
        <MoneyLine asset={asset} note={body} />
        <ActionButton href={`/invest/${asset.ticker}?mode=practice`}>Practice this instead</ActionButton>
        {learn}
      </>
    );
  }

  const canNow = maxAllowedNow(mandate, state.money.balance);
  return (
    <>
      <MoneyLine
        asset={asset}
        note={`You can invest up to ${formatAmount(mandate.maxActionNotional)} per action. ${formatAmount(canNow)} available right now.`}
      />
      {canNow >= quick ? (
        <ActionButton href={`/invest/${asset.ticker}?mode=money&amount=${quick}`}>Invest {formatAmount(quick)}</ActionButton>
      ) : (
        <ActionButton href={`/invest/${asset.ticker}?mode=money`}>Choose an amount</ActionButton>
      )}
      {learn}
    </>
  );
}

function MoneyLine({ note }: { asset: MarketAsset; note: string }) {
  const { state } = useStore();
  return (
    <div className="mb-3 rounded-[16px] border border-line-soft bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink-2">Available to invest</span>
        <span className="flex items-center gap-2">
          <DemoMoneyTag />
          <span className="text-[16px] font-extrabold text-navy-strong tabular">{formatUsd(state.money.balance)}</span>
        </span>
      </div>
      <p className="mt-1.5 text-[13px] font-semibold text-ink-2">{note}</p>
    </div>
  );
}

function compactUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
}

/** PreStocks / Tessera facts. Always states what the token is not. */
function RepresentationFacts({ asset }: { asset: MarketAsset }) {
  const r = asset.representation!;
  const rows: [string, string][] = [
    ["What it is", r.kind === "PRE_IPO_ECONOMIC_EXPOSURE" ? "A token tracking an estimated company value" : "A loan participation right"],
    ["Shares, votes, dividends", "None. Not direct equity"],
    ["Source", r.source === "PRESTOCKS" ? "PreStocks public API" : "Tessera public API"],
  ];
  if (typeof r.valuation === "number") rows.push(["Estimated valuation", compactUsd(r.valuation)]);
  if (typeof r.premiumDiscountPct === "number")
    rows.push([
      "Token vs. estimate",
      `${r.premiumDiscountPct >= 0 ? "+" : "−"}${Math.abs(r.premiumDiscountPct).toFixed(1)}% ${r.premiumDiscountPct >= 0 ? "premium" : "discount"}`,
    ]);
  rows.push(["Eligibility", r.eligibility === "UNKNOWN" ? "Not verified · Practice only" : r.eligibility]);
  return (
    <dl className="mt-3 divide-y divide-line-soft rounded-[14px] bg-surface-soft px-3 text-[12.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-3 py-2">
          <dt className="font-bold text-ink-2">{k}</dt>
          <dd className="text-right font-extrabold text-navy-strong">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
