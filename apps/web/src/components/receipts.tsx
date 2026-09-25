"use client";

import { CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatAmount } from "@/domain/format";
import type { PracticeReceipt } from "@/state/store";
import { ProofDetails, isVerifiableOnChain } from "./proof";
import { BottomSheet } from "./ui/overlay";
import { SectionHeader } from "./ui/primitives";

/** Confirmed Money actions from the Family backend, each with its Devnet proof drawer. */
export function DevnetReceipts({ receipts, nameOf }: { receipts: PracticeReceipt[]; nameOf: (ticker: string) => string }) {
  const [open, setOpen] = useState<PracticeReceipt | null>(null);
  if (!receipts.length) return null;
  return (
    <section className="mt-6" aria-labelledby="receipts-title">
      <SectionHeader title={<span id="receipts-title">Practice activity on Solana Devnet</span>} />
      <ul className="overflow-hidden rounded-[20px] border border-line-soft bg-surface">
        {receipts.slice(0, 8).map((r, i) => (
          <li key={r.id} className={i ? "border-t border-line-soft" : undefined}>
            <button type="button" onClick={() => setOpen(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-soft">
              <CheckCircle2 aria-hidden className="size-5 shrink-0 text-green-strong" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-navy-strong">
                  {formatAmount(r.amount)} · {nameOf(r.ticker)}
                </span>
                <span className="block text-[12px] font-semibold text-ink-2">
                  {isVerifiableOnChain(r.proof) ? "Practice action confirmed on Solana Devnet" : "Recorded"} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-ink-3" />
            </button>
          </li>
        ))}
      </ul>
      <BottomSheet open={!!open} onClose={() => setOpen(null)} title="Action receipt">
        {open ? <ProofDetails proof={open.proof} asset={`${nameOf(open.ticker)} (${open.ticker})`} amount={formatAmount(open.amount)} /> : null}
      </BottomSheet>
    </section>
  );
}
