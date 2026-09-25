"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CompanyCard, CompanyCardSkeleton, CompanyLogo } from "@/components/finance";
import { EmptyState, ErrorState, Provenance, Skeleton } from "@/components/ui/feedback";
import { BottomSheet } from "@/components/ui/overlay";
import { Chip, PageHeader, SearchInput, SectionHeader } from "@/components/ui/primitives";
import type { AssetCategory, MarketAsset, PricePoint } from "@/domain/types";
import { formatUsd } from "@/domain/format";
import { useAssets, useAsync } from "@/hooks/data";
import { listDiscovery, sparklineSeries } from "@/services";
import { keysBackendConfigured, type PythDiscoveryFeed, type PythMarketClass } from "@/services/keys-backend";

const FILTERS = ["All", "Technology", "Consumer", "Retail", "More"] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(filter: Filter, category: AssetCategory) {
  if (filter === "All") return true;
  if (filter === "More") return category === "Funds";
  return category === filter;
}

const norm = (s?: string | null) => (s ?? "").toLowerCase();

function companyMatches(a: MarketAsset, q: string) {
  return [a.companyName, a.ticker, a.tokenizedTicker, a.category, a.shortDescription, a.about].some((f) => norm(f).includes(q));
}

function privateMatches(a: MarketAsset, q: string) {
  const r = a.representation;
  return [a.companyName, a.ticker, a.tokenizedTicker, r?.underlyingCompany, r?.label, r?.source, r?.sector, "private", "pre-ipo"].some((f) =>
    norm(f).includes(q),
  );
}

function feedMatches(f: PythDiscoveryFeed, cls: PythMarketClass, q: string) {
  return [f.symbol, f.displaySymbol, f.description, cls.label, f.marketClass].some((v) => norm(v).includes(q));
}

/** Prices vary by market: FX needs more decimals than a stock. */
function formatFeedPrice(f: PythDiscoveryFeed) {
  if (typeof f.price !== "number") return "—";
  // FX pairs are exchange rates, not dollar prices (USD/JPY is yen per dollar).
  if (f.marketClass === "fx" || /\//.test(f.displaySymbol)) {
    return f.price.toLocaleString("en-US", { maximumFractionDigits: f.price < 10 ? 4 : 2, minimumFractionDigits: f.price < 10 ? 4 : 2 });
  }
  if (f.price < 10) return `$${f.price.toLocaleString("en-US", { maximumFractionDigits: 4, minimumFractionDigits: 4 })}`;
  return formatUsd(f.price);
}

function titleCase(s?: string | null) {
  return (s ?? "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bUs\b/g, "US");
}

export default function ExplorePage() {
  const assets = useAssets();
  const discovery = useAsync(() => (keysBackendConfigured() ? listDiscovery() : Promise.resolve(null)), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [openFeed, setOpenFeed] = useState<{ feed: PythDiscoveryFeed; cls: PythMarketClass } | null>(null);
  const q = query.trim().toLowerCase();

  const companies = useMemo(
    () =>
      assets.status === "success"
        ? assets.data.filter((a) => a.category !== "Private" && matchesFilter(filter, a.category) && (!q || companyMatches(a, q)))
        : [],
    [assets, filter, q],
  );
  const privates = useMemo(
    () => (assets.status === "success" ? assets.data.filter((a) => a.category === "Private" && (!q || privateMatches(a, q))) : []),
    [assets, q],
  );
  const classes = useMemo(() => {
    if (discovery.status !== "success" || !discovery.data) return [];
    return discovery.data.classes
      .filter((c) => c.id !== "equity" && c.accessibleFeedCount > 0)
      .map((c) => ({ ...c, feeds: c.feeds.filter((f) => f.entitlementStatus === "ACCESSIBLE" && (!q || feedMatches(f, c, q))) }))
      .filter((c) => c.feeds.length > 0);
  }, [discovery, q]);

  // Sparklines: real Pyth 1D history where available, labeled sample otherwise.
  const [sparks, setSparks] = useState<Record<string, PricePoint[]>>({});
  useEffect(() => {
    let active = true;
    Promise.all(companies.map(async (a) => [a.ticker, await sparklineSeries(a)] as const)).then((pairs) => {
      if (active) setSparks(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, [companies]);

  const nothing = assets.status === "success" && companies.length === 0 && privates.length === 0 && classes.length === 0;

  return (
    <div className="animate-rise mx-auto max-w-[920px]">
      <PageHeader title="Explore" />
      <div className="mt-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search companies, industries..." label="Search companies, markets and private companies" />
      </div>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label="Filter companies by industry">
        {FILTERS.map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {/* 1. Familiar companies (xStocks-style universe) */}
      <section className="mt-5" aria-labelledby="companies-title">
        <SectionHeader title={<span id="companies-title">Companies you know</span>} />
        {assets.status === "loading" ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading companies">
            {Array.from({ length: 6 }).map((_, i) => (
              <CompanyCardSkeleton key={i} />
            ))}
          </ul>
        ) : assets.status === "error" ? (
          <ErrorState onRetry={assets.reload} />
        ) : companies.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {companies.map((a) => (
              <CompanyCard key={a.ticker} asset={a} series={sparks[a.ticker]} href={`/explore/${a.ticker}`} />
            ))}
          </ul>
        ) : q ? null : (
          <EmptyState title="No companies in this group" body="Try another filter." />
        )}
        {assets.status === "success" && companies.length ? (
          <p className="mt-3 text-[12px] font-semibold text-ink-3">
            Each company maps to a tokenized stock on Solana (for example AAPLx). Prices marked Live come from Pyth; Sample prices are
            for learning. Apple practice runs through KEYS on Solana Devnet; other companies practice in the sandbox. Money on Solana Mainnet isn&apos;t set up yet.
          </p>
        ) : null}
      </section>

      {/* 2. How markets move (Pyth discovery) */}
      {discovery.status === "loading" && keysBackendConfigured() ? (
        <section className="mt-7" aria-busy="true">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-3 h-24 w-full rounded-[20px]" />
        </section>
      ) : classes.length ? (
        <section className="mt-7" aria-labelledby="markets-title">
          <SectionHeader title={<span id="markets-title">Explore how markets move</span>} />
          <p className="-mt-1 mb-3 text-[13px] font-semibold text-ink-2">
            Live Pyth prices from other kinds of markets, for learning. A live price never makes something available in Money Mode.
          </p>
          <div className="space-y-4">
            {classes.map((c) => (
              <div key={c.id}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="text-[15px] font-extrabold text-navy-strong">{c.label}</h3>
                  <span className="text-[11.5px] font-bold text-ink-3">{c.learningAngle}</span>
                </div>
                <ul className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                  {c.feeds.map((f) => (
                    <li key={f.symbol} className="shrink-0 md:shrink">
                      <button
                        type="button"
                        onClick={() => setOpenFeed({ feed: f, cls: c })}
                        className="flex w-[168px] flex-col items-start rounded-[18px] border border-line-soft bg-surface p-3 text-left hover:shadow-soft md:w-full"
                      >
                        <span className="text-[15px] font-extrabold text-navy-strong">{f.displaySymbol}</span>
                        <span className="line-clamp-1 text-[11.5px] font-semibold text-ink-2">{titleCase(f.description)}</span>
                        <span className="mt-1.5 text-[15px] font-extrabold text-navy tabular">{formatFeedPrice(f)}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          <Provenance
                            kind={f.priceStatus === "FRESH" ? "live" : f.priceStatus === "STALE" ? "delayed" : "unavailable"}
                            className="text-[10px]"
                          />
                          <Provenance kind="learn-practice" label="Learn" className="text-[10px]" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : discovery.status === "error" ? (
        <section className="mt-7">
          <SectionHeader title="Explore how markets move" />
          <ErrorState title="Market data is taking a little longer to load." onRetry={discovery.reload} />
        </section>
      ) : null}

      {/* 3. Private companies (PreStocks + Tessera) */}
      {privates.length ? (
        <section className="mt-7" aria-labelledby="private-title">
          <SectionHeader
            title={<span id="private-title">Private companies</span>}
            action={
              <Link href="/lesson/what-is-a-pre-ipo-company" className="text-[13px] font-bold text-blue hover:underline">
                What is this?
              </Link>
            }
          />
          <p className="-mt-1 mb-3 text-[13px] font-semibold text-ink-2">
            Companies that aren&apos;t on a stock exchange yet. These tokens track their value but are not shares. Practice only.
          </p>
          {(["PRESTOCKS", "TESSERA"] as const).map((src) => {
            const items = privates.filter((a) => a.representation?.source === src);
            if (!items.length) return null;
            return (
              <div key={src} className="mb-4">
                <h3 className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-navy-strong">
                  {src === "PRESTOCKS" ? "PreStocks" : "Tessera"}
                  <span className="text-[11.5px] font-bold text-ink-3">
                    {src === "PRESTOCKS" ? "Pre-IPO economic exposure · not shares" : "Loan participation right · not direct equity"}
                  </span>
                </h3>
                <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {items.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/explore/${encodeURIComponent(a.ticker)}`}
                        className="flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface px-3.5 py-3 hover:shadow-soft"
                      >
                        <CompanyLogo asset={a} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-extrabold text-navy-strong">{a.companyName}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[13.5px] font-extrabold text-navy tabular">{formatUsd(a.price)}</span>
                            <Provenance kind={src === "PRESTOCKS" ? "live-prestocks" : "live-tessera"} className="text-[10px]" />
                            <Provenance kind="learn-practice" className="text-[10px]" />
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-5 text-ink-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      {nothing && q ? (
        <EmptyState className="mt-6" title="Nothing matches that search" body="Try a company name like Apple, a market like gold, or a private company like SpaceX." />
      ) : null}

      <BottomSheet
        open={!!openFeed}
        onClose={() => setOpenFeed(null)}
        title={openFeed ? `${openFeed.feed.displaySymbol} · ${openFeed.cls.label}` : ""}
        description={openFeed ? titleCase(openFeed.feed.description) : undefined}
      >
        {openFeed ? (
          <div>
            <div className="flex items-end gap-2">
              <span className="text-[28px] font-black text-navy-strong tabular">{formatFeedPrice(openFeed.feed)}</span>
              <Provenance kind={openFeed.feed.priceStatus === "FRESH" ? "live" : openFeed.feed.priceStatus === "STALE" ? "delayed" : "unavailable"} className="mb-1.5" />
            </div>
            <p className="mt-3 text-[14px] font-semibold text-ink-2">
              <span className="font-extrabold text-navy">Why it matters. </span>
              {openFeed.cls.learningAngle}.
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] font-semibold text-ink-2">
              <li>Source: Pyth Pro price feed #{openFeed.feed.feedId}</li>
              {openFeed.feed.publishTime ? <li>Updated: {new Date(openFeed.feed.publishTime).toLocaleString()}</li> : null}
              {openFeed.feed.marketSession ? <li>Market session: {openFeed.feed.marketSession}</li> : null}
            </ul>
            <p className="mt-4 rounded-[14px] bg-blue-soft px-3.5 py-3 text-[13px] font-semibold text-blue-strong">
              Learn only. A live market price doesn&apos;t make this available in Practice or Money Mode, and it never changes your limits.
            </p>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
