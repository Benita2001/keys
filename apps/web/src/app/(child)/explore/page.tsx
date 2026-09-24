"use client";

import { useMemo, useState } from "react";
import { CompanyCard, CompanyCardSkeleton } from "@/components/finance";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Chip, PageHeader, SearchInput } from "@/components/ui/primitives";
import type { AssetCategory, PricePoint } from "@/domain/types";
import { useAssets } from "@/hooks/data";
import { sparklineFor } from "@/services";

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
      <p className="mt-4 text-center text-[12px] font-semibold text-ink-3">
        Fresh entitled Pyth quotes are labeled Live · Pyth. Configured entitled feeds also use Pyth history; unavailable prices or history stay clearly sample for learning.
      </p>
    </div>
  );
}
