"use client";

import { useEffect, useMemo, useState } from "react";
import { CompanyCard, CompanyCardSkeleton } from "@/components/finance";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Chip, PageHeader, SearchInput } from "@/components/ui/primitives";
import type { AssetCategory, PricePoint } from "@/domain/types";
import { useAssets } from "@/hooks/data";
import { sparklineFor } from "@/services";
import {
  fetchPythMarketDiscovery,
  fetchTesseraRepresentations,
  type PythMarketClass,
  type TesseraRepresentation,
} from "@/services/keys-backend";

const FILTERS = ["All", "Technology", "Consumer", "Retail", "More"] as const;
type Filter = (typeof FILTERS)[number];

function matches(filter: Filter, category: AssetCategory) {
  if (filter === "All") return true;
  if (filter === "More") return category === "Funds";
  return category === filter;
}

export default function ExplorePage() {
  const assets = useAssets();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [markets, setMarkets] = useState<PythMarketClass[]>([]);
  const [tessera, setTessera] = useState<TesseraRepresentation[]>([]);

  useEffect(() => {
    let active = true;
    fetchPythMarketDiscovery()
      .then((result) => {
        if (active) {
          setMarkets(
            result.classes.filter((group) => group.accessibleFeedCount > 0),
          );
        }
      })
      .catch(() => {
        if (active) setMarkets([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchTesseraRepresentations()
      .then((result) => {
        if (active) setTessera(result.assets);
      })
      .catch(() => {
        if (active) setTessera([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const list = useMemo(() => {
    if (assets.status !== "success") return [];
    const q = query.trim().toLowerCase();
    return assets.data.filter(
      (a) =>
        matches(filter, a.category) &&
        (!q ||
          a.companyName.toLowerCase().includes(q) ||
          a.ticker.toLowerCase().includes(q) ||
          a.shortDescription.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)),
    );
  }, [assets, query, filter]);

  // Sparklines are 1D sample series derived from the same sample price.
  const sparks = useMemo(() => {
    const map: Record<string, PricePoint[]> = {};
    for (const a of list) map[a.ticker] = sparklineFor(a);
    return map;
  }, [list]);

  return (
    <div className="animate-rise mx-auto max-w-[920px]">
      <PageHeader title="Explore" />
      <div className="mt-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search companies, industries..." label="Search companies" />
      </div>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label="Filter by industry">
        {FILTERS.map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {markets.length > 0 ? (
        <section className="mt-5" aria-labelledby="explore-markets">
          <div className="mb-3">
            <p id="explore-markets" className="text-[15px] font-extrabold text-navy-strong">
              Explore how different markets move
            </p>
            <p className="mt-1 max-w-[720px] text-[12.5px] font-semibold text-ink-3">
              Live Pyth market truth for learning and Practice. AAPL stays the primary Money proof; access to a market feed never grants Money authority.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((group) => {
              const liveFeeds = group.feeds.filter(
                (feed) => feed.entitlementStatus === "ACCESSIBLE",
              );
              return (
                <li key={group.id} className="rounded-[18px] border border-line-soft bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-extrabold text-navy-strong">{group.label}</p>
                      <p className="mt-1 text-[11.5px] font-semibold leading-snug text-ink-3">
                        {group.learningAngle}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-green-soft px-2 py-1 text-[10px] font-extrabold text-green-strong">
                      Live · Pyth
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {liveFeeds.slice(0, 3).map((feed) => (
                      <div key={feed.symbol} className="flex items-center justify-between gap-3 rounded-[12px] bg-bg px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-extrabold text-navy-strong">
                            {feed.displaySymbol}
                          </p>
                          <p className="text-[10.5px] font-bold text-ink-3">
                            {feed.productMode === "PRIMARY_MONEY_PROOF"
                              ? "Primary Money proof"
                              : "Learn · Practice"}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-[12px] font-extrabold text-navy-strong">
                          {typeof feed.price === "number"
                            ? `${feed.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                            : feed.priceStatus}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10.5px] font-bold text-ink-3">
                    Feed access ≠ Money eligibility · Authority effect: none
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="mt-4">
        {assets.status === "loading" ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading companies">
            {Array.from({ length: 6 }).map((_, i) => (
              <CompanyCardSkeleton key={i} />
            ))}
          </ul>
        ) : assets.status === "error" ? (
          <ErrorState onRetry={assets.reload} />
        ) : list.length === 0 ? (
          <EmptyState title="No companies match that search" body="Try a company name like Apple, or a word like games or food." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {list.map((a) => (
              <CompanyCard key={a.ticker} asset={a} series={sparks[a.ticker]} href={`/explore/${a.ticker}`} />
            ))}
          </ul>
        )}
      </div>
      {tessera.length > 0 ? (
        <section className="mt-8" aria-labelledby="private-market-representations">
          <div className="mb-3">
            <p id="private-market-representations" className="text-[15px] font-extrabold text-navy-strong">
              How private-market tokens differ
            </p>
            <p className="mt-1 text-[12.5px] font-semibold text-ink-3">
              Live Tessera representations for learning and Practice. These are loan participation rights, not direct company shares, and they are not enabled for Money Mode.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {tessera.slice(0, 3).map((asset) => (
              <li key={asset.id} className="rounded-[18px] border border-line-soft bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-extrabold text-navy-strong">{asset.underlyingCompany}</p>
                    <p className="mt-0.5 text-[12px] font-bold text-ink-3">{asset.id} · Tessera</p>
                  </div>
                  <span className="rounded-full bg-green-soft px-2 py-1 text-[10px] font-extrabold text-green-strong">
                    Learn / Practice
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] font-semibold text-ink-2">
                  Loan participation right · not direct equity
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">Tessera mark</p>
                    <p className="mt-0.5 text-[14px] font-extrabold text-navy-strong">
                      {typeof asset.market.markPrice === "number"
                        ? `${asset.market.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : "Unavailable"}
                    </p>
                  </div>
                  <p className="text-right text-[10.5px] font-bold text-ink-3">
                    Eligibility not inferred
                    <br />
                    Authority effect: none
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-center text-[12px] font-semibold text-ink-3">
        Fresh entitled Pyth quotes are labeled Live · Pyth. Configured entitled feeds also use Pyth history; unavailable prices or history stay clearly sample for learning.
      </p>
    </div>
  );
}
