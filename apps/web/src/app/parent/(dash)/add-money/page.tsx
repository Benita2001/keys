"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { MoneyBalanceCard } from "@/components/mode";
import { useToast } from "@/components/ui/feedback";
import { ActionButton, Card, Chip, PageHeader } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { funding } from "@/services";
import { useStore } from "@/state/store";

const AMOUNTS = [10, 25, 50, 100];

export default function AddMoneyPage() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [amount, setAmount] = useState<number | "custom">(25);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const value = amount === "custom" ? Number(custom) : amount;
  const valid = Number.isFinite(value) && value > 0 && value <= 500;

  const add = async () => {
    setBusy(true);
    const res = await funding.addMoney({ amount: value });
    dispatch({ type: "addFunds", amount: res.amount });
    setBusy(false);
    setDone(res.amount);
    toast(`${formatAmount(res.amount)} demo money added`);
  };

  return (
    <div className="animate-rise mx-auto max-w-[560px]">
      <PageHeader title="Add money" subtitle={`To ${state.profile.childName}'s Money Mode balance`} back="/parent" />
      <div className="mt-5">
        <MoneyBalanceCard balance={state.money.balance} />
      </div>

      {done != null ? (
        <Card className="mt-5 p-5 text-center">
          <CheckCircle2 aria-hidden className="animate-bloom mx-auto size-12 text-green" />
          <p className="mt-2 text-[18px] font-extrabold text-navy-strong">{formatAmount(done)} added</p>
          <p className="mt-1 text-[13.5px] font-semibold text-ink-2">Demo funds only. No payment was taken.</p>
          <ActionButton className="mt-4" href="/parent" variant="secondary">
            Back to overview
          </ActionButton>
        </Card>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Amount">
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
          <p className="mt-4 rounded-[14px] bg-yellow-soft px-3.5 py-3 text-[13px] font-semibold text-[#6f4a06]">
            Demo mode: no bank or card is connected, and no payment is taken. This adds demo money so you can try Money Mode.
          </p>
          <ActionButton className="mt-5" disabled={!valid || busy} onClick={add}>
            {busy ? "Adding…" : `Add ${valid ? formatAmount(value) : ""} demo money`}
          </ActionButton>
        </>
      )}
    </div>
  );
}
