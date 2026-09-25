"use client";

import { ArrowRight, CheckCircle2, SlidersHorizontal, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CompanyLogo } from "@/components/finance";
import { EmptyState, useToast } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { ActionButton, Card, Chip, IconCircle, PageHeader, cn } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import type { GuardianDecision } from "@/domain/types";
import { canonicalReason } from "@/domain/policy";
import { allAssetSnapshots, boundaryRequests } from "@/services";
import { useSingleFlight } from "@/hooks/single-flight";
import { useStore } from "@/state/store";

function decidedCopy(status: string, keyVersion: number) {
  switch (status) {
    case "REFUSED":
      return `Not this time. Standing Key v${keyVersion} remains.`;
    case "WIDENED":
      return `Standing authority changed. Current Key is v${keyVersion}.`;
    case "WIDEN_PENDING_CHAIN":
      return "Changing the Key on Solana… The new limits apply once the transaction confirms.";
    case "ALLOW_ONCE_PENDING_CHAIN":
      return "Allowing once on Solana… This finishes when the transaction confirms.";
    case "ALLOWED_ONCE":
      return `Allowed once. Standing Key v${keyVersion} is unchanged.`;
    case "ALLOWED_ONCE_USED":
      return `Allowed once and used. Standing Key v${keyVersion} is unchanged.`;
    default:
      return "This request has been decided.";
  }
}

export default function RequestDecisionPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch, refresh } = useStore();
  const guard = useSingleFlight();
  const toast = useToast();
  const request = state.requests.find((r) => r.id === id);
  const [choice, setChoice] = useState<GuardianDecision | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [widenOpen, setWidenOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = state.mandate;
  const child = state.profile.childName;

  const widenOptions = request ? [request.requestedNotional, Math.max(request.requestedNotional, 25), 50].filter((v, i, a) => a.indexOf(v) === i && v > m.maxActionNotional) : [];
  const [newPerAction, setNewPerAction] = useState<number>(widenOptions[0] ?? m.maxActionNotional);
  const minPeriod = request ? Math.ceil((m.spentThisPeriod + request.requestedNotional) / 10) * 10 : m.maxPeriodNotional;
  const periodOptions = [minPeriod, 100, 150].filter((v, i, a) => a.indexOf(v) === i && v > m.maxPeriodNotional && v >= minPeriod);
  const [pickedPeriod, setPickedPeriod] = useState<number | null>(null);

  if (!request) {
    return <EmptyState className="mt-6" title="Request not found" body="It may have been decided already." action={<ActionButton href="/parent">Back to overview</ActionButton>} />;
  }
  const asset = allAssetSnapshots().find((a) => a.ticker === request.asset);
  const decided = request.status !== "PENDING_HUMAN_DECISION";
  const stale = request.mandateNonce !== m.nonce;
  const periodRequest = canonicalReason(request.reasonCode) === "PERIOD_LIMIT_EXCEEDED";
  const newPerPeriod = periodRequest
    ? (pickedPeriod ?? periodOptions[0] ?? m.maxPeriodNotional)
    : Math.max(m.maxPeriodNotional, newPerAction);

  const decide = guard(async () => {
    if (!choice) return;
    setBusy(true);
    setError(null);
    let res;
    try {
      res = await boundaryRequests.decide({
        request,
        decision: choice,
        mandate: m,
        newLimits: choice === "WIDEN_MANDATE" ? { maxActionNotional: periodRequest ? m.maxActionNotional : newPerAction, maxPeriodNotional: newPerPeriod } : undefined,
        note: note.trim() || undefined,
      });
    } catch {
      setBusy(false);
      setError("That decision didn't go through. Nothing changed. The request may already be decided, or the limits changed. Try again.");
      void refresh();
      return;
    }
    dispatch({ type: "decideRequest", request: res.request, mandate: res.mandate });
    void refresh({ chain: true });
    setBusy(false);
    setWidenOpen(false);
    setChoice(null);
    toast(choice === "ALLOW_ONCE" ? `Allowed once · Key v${m.version} unchanged` : choice === "WIDEN_MANDATE" ? "New standing Key saved" : "Not this time");
  });

  const options: { id: GuardianDecision; title: string; body: string; icon: React.ReactNode; tone: "green" | "blue" | "navy" }[] = [
    {
      id: "REFUSE",
      title: "Not this time",
      body: `Keep Key v${m.version} exactly where it is.`,
      icon: <XCircle className="size-5" />,
      tone: "navy",
    },
    {
      id: "ALLOW_ONCE",
      title: "Allow once",
      body: `Let this request run once. Standing Key v${m.version} stays unchanged.`,
      icon: <CheckCircle2 className="size-5" />,
      tone: "green",
    },
    {
      id: "WIDEN_MANDATE",
      title: "Widen the Key",
      body: `Create Key v${m.version + 1} with more standing room from now on.`,
      icon: <SlidersHorizontal className="size-5" />,
      tone: "blue",
    },
  ];

  return (
    <div className="animate-rise mx-auto max-w-[640px]">
      <PageHeader title="Request for more room" back="/parent" />
      <Card className="mt-5 p-4">
        <div className="flex items-center gap-3">
          {asset ? <CompanyLogo asset={asset} size={44} /> : null}
          <div className="flex-1">
            <p className="text-[17px] font-extrabold text-navy-strong">
              {formatAmount(request.requestedNotional)} in {asset?.companyName ?? request.asset}
            </p>
            <p className="text-[13px] font-semibold text-ink-2">
              {periodRequest
                ? `Would go past the ${formatAmount(m.maxPeriodNotional)} monthly limit`
                : `Current limit: ${formatAmount(request.standingLimit)} per action`}
            </p>
          </div>
        </div>
        <blockquote className="mt-3 rounded-[14px] bg-surface-soft px-3.5 py-3 text-[14.5px] font-semibold text-navy">
          &ldquo;{request.reason}&rdquo;
          <footer className="mt-1 text-[12px] font-bold text-ink-3">{child}</footer>
        </blockquote>
      </Card>

      {decided ? (
        <Card className="mt-4 p-4 text-center">
          <p className="text-[16px] font-extrabold text-navy-strong">
            {decidedCopy(request.status, m.version)}
          </p>
        </Card>
      ) : stale ? (
        <Card className="mt-4 p-4">
          <p className="text-[15px] font-extrabold text-navy-strong">Limits changed since this request</p>
          <p className="mt-1 text-[13.5px] font-semibold text-ink-2">
            This request was made under v{request.mandateVersion}. Current limits are v{m.version}. {child} can try again under the new
            limits.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-4 border-2 border-blue/15 bg-blue-soft p-4">
            <p className="text-[12px] font-black uppercase tracking-[0.08em] text-blue-strong">Standing Key v{m.version}</p>
            <p className="mt-1 text-[13.5px] font-semibold text-navy">
              Choose the relationship to this boundary: keep the Key, allow this request once, or create a new standing Key.
            </p>
          </Card>
          <div role="radiogroup" aria-label="Your decision" className="mt-4 space-y-2.5">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={choice === o.id}
                onClick={() => setChoice(o.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[18px] border-2 bg-surface p-4 text-left transition-colors",
                  choice === o.id ? "border-blue" : "border-line-soft hover:border-line",
                )}
              >
                <IconCircle tone={o.tone} size={40}>
                  {o.icon}
                </IconCircle>
                <span>
                  <span className="block text-[15px] font-extrabold text-navy-strong">{o.title}</span>
                  <span className="block text-[13.5px] font-semibold text-ink-2">{o.body}</span>
                </span>
              </button>
            ))}
          </div>
          {choice === "REFUSE" ? (
            <label className="mt-3 block">
              <span className="text-[13.5px] font-extrabold text-navy-strong">Note for {child} (optional)</span>
              <input
                value={note}
                maxLength={120}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Let's talk about it this weekend"
                className="mt-1.5 h-12 w-full rounded-[14px] border border-line bg-surface px-3.5 text-[15px] font-semibold text-navy focus:border-blue focus:outline-none"
              />
            </label>
          ) : null}
          {error ? (
          <p role="alert" className="mt-3 rounded-[12px] bg-loss-soft px-3 py-2 text-[13px] font-bold text-loss-text">
            {error}
          </p>
        ) : null}
          <ActionButton className="mt-5" onClick={() => (choice === "WIDEN_MANDATE" ? setWidenOpen(true) : decide())}
            disabled={!choice || busy}>
            {choice === "WIDEN_MANDATE" ? "Review new limits" : "Confirm decision"}
          </ActionButton>
        </>
      )}

      <Modal open={widenOpen && !decided} onClose={() => setWidenOpen(false)} title={`Create a wider Key for ${child}`}>
        {!periodRequest ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {widenOptions.map((v) => (
              <Chip key={v} selected={newPerAction === v} onClick={() => setNewPerAction(v)}>
                {formatAmount(v)} per action
              </Chip>
            ))}
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap gap-2">
            {periodOptions.map((v) => (
              <Chip key={v} selected={newPerPeriod === v} onClick={() => setPickedPeriod(v)}>
                {formatAmount(v)} per month
              </Chip>
            ))}
          </div>
        )}
        <ul className="space-y-2 rounded-[16px] border border-line-soft p-3.5 text-[14px] font-semibold">
          <li className="flex items-center justify-between">
            <span className="text-ink-2">Per action</span>
            <span className="flex items-center gap-2 font-extrabold tabular">
              {periodRequest || newPerAction === m.maxActionNotional ? (
                <span className="text-navy-strong">{formatAmount(m.maxActionNotional)}</span>
              ) : (
                <>
                  <span className="text-ink-3 line-through">{formatAmount(m.maxActionNotional)}</span>
                  <ArrowRight aria-hidden className="size-4 text-ink-3" />
                  <span className="text-navy-strong">{formatAmount(newPerAction)}</span>
                </>
              )}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-ink-2">Per month</span>
            <span className="flex items-center gap-2 font-extrabold tabular">
              <span className={newPerPeriod === m.maxPeriodNotional ? "text-navy-strong" : "text-ink-3 line-through"}>
                {formatAmount(m.maxPeriodNotional)}
              </span>
              {newPerPeriod !== m.maxPeriodNotional ? (
                <>
                  <ArrowRight aria-hidden className="size-4 text-ink-3" />
                  <span className="text-navy-strong">{formatAmount(newPerPeriod)}</span>
                </>
              ) : null}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          This is the only choice on this screen that changes standing authority. It creates Key v{m.version + 1}. Only you can make this change.
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-[12px] bg-loss-soft px-3 py-2 text-[13px] font-bold text-loss-text">
            {error}
          </p>
        ) : null}
        <ActionButton className="mt-4" onClick={decide} disabled={busy} data-autofocus>
          {busy ? "Saving…" : "Confirm new limits"}
        </ActionButton>
      </Modal>
    </div>
  );
}
