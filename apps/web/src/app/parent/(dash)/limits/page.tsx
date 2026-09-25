"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { CompanyLogo } from "@/components/finance";
import { NetworkTag, useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { ActionButton, Card, Chip, PageHeader, SectionHeader, Toggle } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { allAssetSnapshots, mandates } from "@/services";
import { useSingleFlight } from "@/hooks/single-flight";
import { useStore } from "@/state/store";

const PER_ACTION = [5, 10, 20, 25, 50];
const PER_PERIOD = [25, 50, 100, 200];

export default function ParentLimitsPage() {
  const { state, dispatch, refresh } = useStore();
  const [saveError, setSaveError] = useState<string | null>(null);
  const guard = useSingleFlight();
  const toast = useToast();
  const m = state.mandate;
  const [perAction, setPerAction] = useState(m.maxActionNotional);
  const [perPeriod, setPerPeriod] = useState(m.maxPeriodNotional);
  const [allowed, setAllowed] = useState<string[]>(m.allowedAssets);
  const [paused, setPaused] = useState(m.status === "PAUSED");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const assets = allAssetSnapshots();
  const provenMoneyAsset = "AAPL";
  const child = state.profile.childName;

  const changed =
    perAction !== m.maxActionNotional ||
    perPeriod !== m.maxPeriodNotional ||
    paused !== (m.status === "PAUSED") ||
    allowed.slice().sort().join() !== m.allowedAssets.slice().sort().join();

  const save = guard(async () => {
    setSaving(true);
    setSaveError(null);
    let next;
    try {
      next = await mandates.update({
        mandate: m,
        changes: { maxActionNotional: perAction, maxPeriodNotional: perPeriod, allowedAssets: allowed, status: paused ? "PAUSED" : "ACTIVE" },
      });
    } catch {
      setSaving(false);
      setSaveError("The new limits weren't saved on Solana. Nothing changed. The limits may have changed in another session; check them and try again.");
      void refresh({ chain: true });
      return;
    }
    dispatch({ type: "setMandate", mandate: next });
    void refresh({ chain: true });
    setSaving(false);
    setConfirm(false);
    toast(`${child}'s limits updated`);
  });

  const added = allowed.filter((t) => !m.allowedAssets.includes(t));
  const removed = m.allowedAssets.filter((t) => !allowed.includes(t));
  const name = (t: string) => allAssetSnapshots().find((a) => a.ticker === t)?.companyName ?? t;

  return (
    <div className="animate-rise mx-auto max-w-[760px]">
      <PageHeader title={`${child}'s Practice Key`} subtitle={`Enforced on Solana Devnet. Inside these limits, ${child} can practice without asking you.`} back="/parent" />

      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">Practice Key <NetworkTag mode="practice" /></p>
          <span className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-ink-2">{paused ? "Paused" : "Active"}</span>
            <Toggle checked={!paused} onChange={(v) => setPaused(!v)} label="Practice Key active" />
          </span>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink-2">Pausing stops Devnet practice actions right away. The sandbox keeps working. Money on Solana Mainnet will have its own Key.</p>
      </Card>

      <section className="mt-5">
        <SectionHeader title="Up to, per action" />
        <div className="flex flex-wrap gap-2">
          {PER_ACTION.map((v) => (
            <Chip key={v} selected={perAction === v} onClick={() => setPerAction(v)} className="h-11 px-4 text-[14px]">
              {formatAmount(v)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionHeader title="Up to, per month" />
        <div className="flex flex-wrap gap-2">
          {PER_PERIOD.map((v) => (
            <Chip key={v} selected={perPeriod === v} onClick={() => setPerPeriod(v)} className="h-11 px-4 text-[14px]">
              {formatAmount(v)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionHeader title="Companies allowed" />
        <p className="mb-3 text-[12.5px] font-semibold text-ink-3">
          The Practice Key covers AAPL on Solana Devnet, the proven KEYS lane. Other companies practice in the local sandbox until their own Devnet lane is connected.
        </p>
        <Card className="divide-y divide-line-soft px-4">
          {assets.map((a) => (
            <div key={a.ticker} className="flex items-center gap-3 py-2.5">
              <CompanyLogo asset={a} size={32} className="rounded-[10px]" />
              <span className="flex-1 text-[14px] font-bold text-navy">
                {a.companyName} <span className="text-ink-3">{a.ticker}</span>
              </span>
              <div className="flex items-center gap-3">
                {a.ticker === provenMoneyAsset ? (
                  <span className="hidden text-[11px] font-extrabold text-green-strong sm:inline">
                    Devnet practice lane
                  </span>
                ) : (
                  <span className="hidden text-[11px] font-bold text-ink-3 sm:inline">
                    Sandbox only
                  </span>
                )}
                <Toggle
                  checked={a.ticker === provenMoneyAsset && allowed.includes(a.ticker)}
                  disabled={a.ticker !== provenMoneyAsset}
                  onChange={(v) =>
                    setAllowed((p) =>
                      v
                        ? Array.from(new Set([...p.filter((t) => t === provenMoneyAsset), provenMoneyAsset]))
                        : p.filter((t) => t !== provenMoneyAsset),
                    )
                  }
                  label={
                    a.ticker === provenMoneyAsset
                      ? `Allow ${a.companyName} in the Practice Key`
                      : `${a.companyName} practices in the sandbox (no Devnet lane yet)`
                  }
                />
              </div>
            </div>
          ))}
        </Card>
      </section>

      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#fbfcfe] via-[#fbfcfe] to-transparent pb-4 pt-4">
        <ActionButton disabled={!changed} onClick={() => setConfirm(true)}>
          Review changes
        </ActionButton>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm new limits" description={<NetworkTag mode="practice" />}>
        <ul className="space-y-2 rounded-[16px] border border-line-soft p-3.5 text-[14px] font-semibold">
          <Diff label="Per action" from={formatAmount(m.maxActionNotional)} to={formatAmount(perAction)} />
          <Diff label="Per month" from={formatAmount(m.maxPeriodNotional)} to={formatAmount(perPeriod)} />
          <Diff label="Practice Key" from={m.status === "PAUSED" ? "Paused" : "Active"} to={paused ? "Paused" : "Active"} />
          {added.length ? <li className="text-green-strong">Adding: {added.map(name).join(", ")}</li> : null}
          {removed.length ? <li className="text-ink-2">Removing: {removed.map(name).join(", ")}</li> : null}
        </ul>
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          This creates a new version of {child}&apos;s limits (v{m.version + 1}). Anything prepared under the old limits gets checked again.
        </p>
        {saveError ? (
          <p role="alert" className="mt-3 rounded-[12px] bg-loss-soft px-3 py-2 text-[13px] font-bold text-loss-text">
            {saveError}
          </p>
        ) : null}
        <ActionButton className="mt-4" onClick={save} disabled={saving} data-autofocus>
          {saving ? "Saving on Solana…" : "Confirm change"}
        </ActionButton>
      </Modal>
    </div>
  );
}

function Diff({ label, from, to }: { label: string; from: string; to: string }) {
  const same = from === to;
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-ink-2">{label}</span>
      <span className="flex items-center gap-2 font-extrabold tabular">
        <span className={same ? "text-navy-strong" : "text-ink-3 line-through"}>{from}</span>
        {same ? null : (
          <>
            <ArrowRight aria-hidden className="size-4 text-ink-3" />
            <span className="text-navy-strong">{to}</span>
          </>
        )}
      </span>
    </li>
  );
}
