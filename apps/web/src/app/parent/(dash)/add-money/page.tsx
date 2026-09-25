"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { PracticeBalanceCard } from "@/components/mode";
import { NetworkTag, Provenance, useToast } from "@/components/ui/feedback";
import { ActionButton, Card, Chip, PageHeader } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { funding } from "@/services";
import { useSingleFlight } from "@/hooks/single-flight";
import { useStore } from "@/state/store";

const AMOUNTS = [10, 25, 50, 100];

/**
 * Practice capital: Devnet test credit to the family ledger (no payment, no real value).
 * Money: real USDC on Solana Mainnet. Unavailable until Money Mode is set up; never faked.
 */
export default function AddMoneyPage() {
  const { state, refresh, sync } = useStore();
  const backend = sync.status !== "off";
  const [error, setError] = useState<string | null>(null);
  const guard = useSingleFlight();
  const toast = useToast();
  const [amount, setAmount] = useState<number | "custom">(25);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const value = amount === "custom" ? Number(custom) : amount;
  const valid = Number.isFinite(value) && value > 0 && value <= 500;

  const add = guard(async () => {
    setBusy(true);
    setError(null);
    let res;
    try {
      res = await funding.addPracticeCapital({ amount: value });
    } catch {
      setBusy(false);
      setError("We couldn't add practice capital right now. Nothing changed. Try again.");
      return;
    }
    await refresh();
    setBusy(false);
    setDone(res.amount);
    toast(`${formatAmount(res.amount)} of practice capital added`);
  });

  return (
    <div className="animate-rise mx-auto max-w-[560px]">
      <PageHeader title="Add funds" subtitle={`For ${state.profile.childName}`} back="/parent" />

      <h2 className="mt-5 flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">
        Practice capital <NetworkTag mode="practice" />
      </h2>
      <div className="mt-2">
        <PracticeBalanceCard balance={state.practiceChain.balance} caption="Available practice capital" />
      </div>

      {!backend ? (
        <Card className="mt-4 p-4 text-[13.5px] font-semibold text-ink-2">
          Practice on Solana Devnet needs the KEYS backend. The sandbox has its own virtual balance.
        </Card>
      ) : done != null ? (
        <Card className="mt-4 p-5 text-center">
          <CheckCircle2 aria-hidden className="animate-bloom mx-auto size-12 text-green" />
          <p className="mt-2 text-[18px] font-extrabold text-navy-strong">{formatAmount(done)} of practice capital added</p>
          <p className="mt-1 text-[13.5px] font-semibold text-ink-2">
            Devnet test credit only. No payment was taken and it has no real financial value.
          </p>
          <ActionButton className="mt-4" href="/parent" variant="secondary">
            Back to overview
          </ActionButton>
        </Card>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Amount">
            {AMOUNTS.map((a) => (
              <Chip key={a} selected={amount === a} onClick={() => setAmount(a)} className="h-12 flex-1 px-4 text-[15px]">
                {formatAmount(a)}
              </Chip>
            ))}
            <Chip selected={amount === "custom"} onClick={() => setAmount("custom")} className="h-12 flex-1 px-4 text-[15px]">
              Custom
            </Chip>
          </div>
          {amount === "custom" ? (
            <label className="mt-3 block">
              <span className="text-[14px] font-extrabold text-navy-strong">Custom amount (up to $500)</span>
              <input
                inputMode="decimal"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="$0"
                className="mt-1.5 h-[52px] w-full rounded-[15px] border border-line bg-surface px-4 text-[16px] font-bold text-navy focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </label>
          ) : null}
          <p className="mt-4 rounded-[14px] bg-lavender-soft px-3.5 py-3 text-[13px] font-semibold text-[#4a3a9c]">
            Practice capital is Devnet test credit. No payment is taken and it has no real financial value.
          </p>
          {error ? (
            <p role="alert" className="mt-4 rounded-[12px] bg-loss-soft px-3 py-2 text-[13px] font-bold text-loss-text">
              {error}
            </p>
          ) : null}
          <ActionButton className="mt-4" disabled={!valid || busy} onClick={add}>
            {busy ? "Adding…" : `Add ${valid ? formatAmount(value) : ""} practice capital`}
          </ActionButton>
        </>
      )}

      <h2 className="mt-8 flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">
        Money <NetworkTag mode="money" />
      </h2>
      <Card className="mt-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Provenance kind="real-money" />
          <Provenance kind="verification-required" />
        </div>
        <p className="mt-2 text-[14px] font-extrabold text-navy-strong">Deposit USDC on Solana Mainnet</p>
        <p className="mt-1 text-[13px] font-semibold text-ink-2">
          Real funding opens once Money Mode is set up: your verification, a supported Mainnet account and the Mainnet KEYS program.
          Card and bank funding aren&apos;t available.
        </p>
        <ActionButton className="mt-3" variant="secondary" disabled>
          Deposit USDC · not available yet
        </ActionButton>
      </Card>
    </div>
  );
}
