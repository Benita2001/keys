"use client";

import { CheckCircle2, Clock, Info, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CompanyLogo } from "@/components/finance";
import { PlantPot } from "@/components/illustrations/objects";
import { BoundaryMessage, BoundaryRequestSheet, MoneyModeUnavailable, MoneySyncState } from "@/components/mode";
import { DataStatusTag, DemoMoneyTag, EmptyState, ErrorState, Skeleton, useToast } from "@/components/ui/feedback";
import { BottomSheet } from "@/components/ui/overlay";
import { ActionButton, BackButton, Card, Chip, cn } from "@/components/ui/primitives";
import { formatAmount, formatShares, formatUsd } from "@/domain/format";
import { assetRuleFor, evaluateBoundedAction, explainEvaluation, maxAllowedNow, remainingThisPeriod } from "@/domain/policy";
import type { ActionEvaluation, ExecutionResult, MarketAsset, Mode } from "@/domain/types";
import { useAsset } from "@/hooks/data";
import { boundaryRequests, moneyExecution, practiceExecution } from "@/services";
import { keysBackendConfigured, newIdempotencyKey } from "@/services/keys-backend";
import { ExecutionProofNote, ProofDetails } from "@/components/proof";
import { useSingleFlight } from "@/hooks/single-flight";
import { useMoneyTruth, useStore } from "@/state/store";

type Phase =
  | { kind: "edit" }
  | { kind: "submitting" }
  | { kind: "done"; result: ExecutionResult; allowedOnce: boolean }
  | { kind: "boundary"; evaluation: ActionEvaluation }
  | { kind: "requested" }
  | { kind: "unconfirmed"; result: ExecutionResult; idempotencyKey: string; checking: boolean };

export function InvestFlow({ ticker, initialMode, initialAmount }: { ticker: string; initialMode?: Mode; initialAmount?: number }) {
  const { state } = useStore();
  const moneyTruth = useMoneyTruth();
  const asset = useAsset(ticker);
  const mode = initialMode ?? state.mode;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pt-4 md:pt-8">
      <div className="flex items-center gap-2">
        <BackButton label="Back" />
        <p className="flex-1 text-center text-[15px] font-extrabold text-navy-strong">
          {mode === "practice" ? "Practice investment" : "Money investment"}
        </p>
        <span className="w-9" />
      </div>
      {asset.status === "loading" ? (
        <div className="mt-6 space-y-4" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-[20px]" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
        </div>
      ) : asset.status === "error" ? (
        <ErrorState className="mt-6" onRetry={asset.reload} />
      ) : !asset.data ? (
        <EmptyState className="mt-6" title="We couldn't find that company" action={<ActionButton href="/explore">Explore</ActionButton>} />
      ) : mode === "money" && !moneyTruth.ready ? (
        <div className="mt-6">
          <MoneySyncState status={moneyTruth.status} onRetry={moneyTruth.refresh} />
        </div>
      ) : mode === "money" && !state.profile.parentLinked ? (
        <div className="mt-6">
          <MoneyModeUnavailable reason="parent" />
        </div>
      ) : (
        <Flow asset={asset.data} mode={mode} initialAmount={initialAmount} />
      )}
    </main>
  );
}

const STUCK_AFTER_MS = 2 * 60_000;

function Flow({ asset, mode, initialAmount }: { asset: MarketAsset; mode: Mode; initialAmount?: number }) {
  const { state, dispatch, refresh } = useStore();
  const backend = keysBackendConfigured();
  const guard = useSingleFlight();
  const toast = useToast();
  const { mandate } = state;

  const allowOnce = state.requests.find(
    (r) => r.status === "ALLOWED_ONCE" && r.asset === asset.ticker && r.mandateNonce === mandate.nonce,
  );
  const presets = mode === "practice" ? [25, 50, 100, 250] : [2, 5, 10, 20];
  const [amountText, setAmountText] = useState(
    String(
      (mode === "money" ? state.pendingExecutions.find((p) => p.ticker === asset.ticker)?.amount : undefined) ??
        initialAmount ??
        allowOnce?.requestedNotional ??
        (mode === "practice" ? 50 : 5),
    ),
  );
  const [reason, setReason] = useState("");
  // A previously unconfirmed intent for this company resumes with the same key.
  const resumable = mode === "money" ? state.pendingExecutions.find((p) => p.ticker === asset.ticker) : undefined;
  const [phase, setPhase] = useState<Phase>(() =>
    resumable
      ? {
          kind: "unconfirmed",
          idempotencyKey: resumable.idempotencyKey,
          checking: false,
          result: {
            ok: false,
            outcome: "UNKNOWN",
            evaluation: { decision: "REFUSE", reasonCode: "EXECUTION_UNCONFIRMED", source: "keys-runtime" },
            ticker: resumable.ticker,
            amount: resumable.amount,
          },
        }
      : { kind: "edit" },
  );
  const [askOpen, setAskOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const amount = Number(amountText);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const cash = mode === "practice" ? state.practice.cash : state.money.balance;

  // Instant, local explanation while typing. The real decision happens on submit.
  const preview = useMemo<ActionEvaluation | null>(() => {
    if (mode !== "money" || !validAmount) return null;
    return evaluateBoundedAction({
      mandate,
      assetRule: assetRuleFor(mandate, asset.ticker),
      action: { asset: asset.ticker, type: "BUY", notional: amount },
    });
  }, [mode, validAmount, mandate, asset.ticker, amount]);

  const coveredByAllowOnce = !!allowOnce && validAmount && amount <= allowOnce.requestedNotional;

  const submit = guard(async () => {
    if (!validAmount) return;
    setPhase({ kind: "submitting" });
    if (mode === "practice") {
      const result = await practiceExecution.buy({ asset, amount, cash });
      if (result.ok && result.shares != null && result.proof) {
        dispatch({ type: "practiceBuy", ticker: asset.ticker, amount, shares: result.shares, reason: reason.trim() || undefined, proof: result.proof });
        setPhase({ kind: "done", result, allowedOnce: false });
      } else {
        setPhase({ kind: "boundary", evaluation: result.evaluation });
      }
      return;
    }
    await runMoney(intentKeyFor(amount));
  });

  // One idempotency key per user intent (asset + amount). Re-checks reuse it.
  const [intent, setIntent] = useState<{ amount: number; key: string } | null>(null);
  const intentKeyFor = (value: number) => {
    if (intent && intent.amount === value) return intent.key;
    const next = { amount: value, key: newIdempotencyKey() };
    setIntent(next);
    return next.key;
  };

  const runMoney = async (idempotencyKey: string, recheck = false) => {
    const result = await moneyExecution.execute({
      mandate,
      assetRule: assetRuleFor(mandate, asset.ticker),
      asset,
      type: "BUY",
      amount,
      balance: state.money.balance,
      allowOnce: allowOnce ?? null,
      idempotencyKey,
      recheck,
    });
    // The allowance is only "used" when the standing Mandate alone would have refused.
    const usedAllowOnce = coveredByAllowOnce && preview?.decision !== "ALLOW";
    if (result.outcome === "EXECUTED" && result.shares != null && result.proof) {
      if (backend) {
        // The Family Durable Object is the source of truth for balance, holdings and
        // allowance state: re-fetch instead of applying a local optimistic update.
        dispatch({ type: "clearPending", idempotencyKey });
        await refresh({ chain: true });
      } else {
        dispatch({
          type: "moneyBuy",
          ticker: asset.ticker,
          amount,
          shares: result.shares,
          reason: reason.trim() || undefined,
          proof: result.proof,
          usedRequestId: usedAllowOnce ? allowOnce?.id : undefined,
          idempotencyKey,
        });
      }
      setIntent(null);
      setPhase({ kind: "done", result, allowedOnce: usedAllowOnce });
    } else if (result.outcome === "PENDING" || result.outcome === "UNKNOWN") {
      // Never shown as success or failure. Balance is unchanged until confirmed.
      dispatch({ type: "trackPending", pending: { idempotencyKey, ticker: asset.ticker, amount, createdAt: new Date().toISOString() } });
      setPhase({ kind: "unconfirmed", result, idempotencyKey, checking: false });
    } else {
      dispatch({ type: "clearPending", idempotencyKey });
      setIntent(null);
      // Limits or allowances may have changed under us: pull the current state.
      if (backend) void refresh({ chain: true });
      setPhase({ kind: "boundary", evaluation: result.evaluation });
    }
  };

  // Clock for the "taking longer than usual" escape hatch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (phase.kind !== "unconfirmed") return;
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, [phase.kind]);

  // Drop the local tracker only. Any backend result for the old key still
  // arrives through sync and shows in Money activity.
  const stopWaiting = () => {
    if (phase.kind !== "unconfirmed") return;
    dispatch({ type: "clearPending", idempotencyKey: phase.idempotencyKey });
    setIntent(null);
    if (backend) void refresh({ chain: true });
    setPhase({ kind: "edit" });
  };

  const recheck = guard(async () => {
    if (phase.kind !== "unconfirmed") return;
    setPhase({ ...phase, checking: true });
    await runMoney(phase.idempotencyKey, true);
  });

  const sendRequest = guard(async (why: string) => {
    if (phase.kind !== "boundary") return;
    setAsking(true);
    setRequestError(null);
    let request;
    try {
      request = await boundaryRequests.create({
        mandate,
        evaluation: phase.evaluation,
        asset: asset.ticker,
        type: "BUY",
        amount,
        reason: why,
      });
    } catch {
      setAsking(false);
      setRequestError("We couldn't send your request. Nothing changed. Try again in a moment.");
      if (backend) void refresh();
      return;
    }
    dispatch({ type: "addRequest", request });
    if (backend) void refresh();
    setAsking(false);
    setAskOpen(false);
    setPhase({ kind: "requested" });
    toast(`Request sent to ${state.profile.parentName}`);
  });

  /* ---------------- Results ---------------- */

  if (phase.kind === "done") {
    const shares = phase.result.shares ?? 0;
    return (
      <div className="animate-rise mt-8 flex flex-1 flex-col items-center text-center">
        <PlantPot className="animate-bloom size-28" />
        <h1 className="mt-4 text-[26px] font-black text-navy-strong">
          {mode === "practice"
            ? "Added to your Practice Portfolio"
            : phase.result.proof?.status === "RUNTIME_CONFIRMED" && !phase.result.proof.simulated
              ? "Action confirmed on Solana Devnet"
              : phase.allowedOnce
                ? `Done. ${state.profile.parentName} allowed this once.`
                : "Done. Inside your limits."}
        </h1>
        <p className="mt-2 max-w-[36ch] text-[15px] font-semibold text-ink-2">
          {phase.result.proof?.network
            ? `${formatAmount(amount)} of ${asset.companyName} exposure${
                typeof phase.result.proof.pyth?.unitPrice === "number"
                  ? ` at a live Pyth price of ${formatUsd(phase.result.proof.pyth.unitPrice)}`
                  : ""
              } · Devnet demo tokens, not real shares.`
            : mode === "practice"
              ? `${formatAmount(amount)} in ${asset.companyName} · about ${formatShares(shares)} ${asset.representation ? "units" : "shares"} of virtual practice money at a ${asset.dataStatus === "live" ? "live" : "sample"} price of ${formatUsd(asset.price)}.`
              : `${formatAmount(amount)} in ${asset.companyName} · demo only, nothing was bought.`}
        </p>
        {mode === "money" ? (
          <ExecutionProofNote
            className="mt-4"
            proof={phase.result.proof}
            approvalText={
              phase.allowedOnce
                ? `${state.profile.parentName} approved this one action. Your standing limits didn't change.`
                : "Cresco checked your limits and this was allowed with no parent approval needed."
            }
          />
        ) : null}
        <div className="mt-auto w-full space-y-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-8">
          <ActionButton href="/portfolio" arrow>
            See my portfolio
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => setDetailsOpen(true)}>
            View transaction details
          </ActionButton>
        </div>
        <BottomSheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Transaction details">
          <ProofDetails
            proof={phase.result.proof}
            asset={`${asset.companyName} (${asset.ticker})`}
            amount={formatAmount(amount)}
            decisionSource={`${phase.result.evaluation.decision} · ${SOURCE_LABEL[phase.result.evaluation.source] ?? phase.result.evaluation.source}`}
          />
          {phase.result.proof?.status === "DEMO_NOT_EXECUTED" ? (
            <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
              Demo mode: no transaction was sent. Connected to the KEYS runtime, this shows the Devnet signature and an explorer link.
            </p>
          ) : null}
        </BottomSheet>
      </div>
    );
  }

  if (phase.kind === "unconfirmed") {
    const pending = phase.result.outcome === "PENDING";
    const since = state.pendingExecutions.find((p) => p.idempotencyKey === phase.idempotencyKey)?.createdAt;
    const stuck = !!since && now - new Date(since).getTime() > STUCK_AFTER_MS;
    return (
      <div className="animate-rise mt-10 flex flex-1 flex-col items-center text-center" role="status">
        <span className="grid size-20 place-items-center rounded-full bg-blue-soft text-blue">
          <Clock className="size-9" />
        </span>
        <h1 className="mt-5 text-[26px] font-black text-navy-strong">
          {pending ? "Still processing." : "We're still checking on this."}
        </h1>
        <p className="mt-2 max-w-[34ch] text-[15px] font-semibold text-ink-2">
          {pending
            ? `${formatAmount(amount)} in ${asset.companyName} was accepted and isn't confirmed on Solana Devnet yet.`
            : `We couldn't confirm whether ${formatAmount(amount)} in ${asset.companyName} went through.`}{" "}
          Your balance won&apos;t change until it&apos;s confirmed, and checking again can never make it happen twice.
        </p>
        <div className="mt-auto w-full space-y-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-8">
          <ActionButton onClick={recheck} disabled={phase.checking}>
            {phase.checking ? "Checking…" : "Check again"}
          </ActionButton>
          {stuck ? (
            <ActionButton variant="secondary" onClick={stopWaiting}>
              Stop waiting and start over
            </ActionButton>
          ) : (
            <ActionButton variant="secondary" href="/home">
              Back to Home
            </ActionButton>
          )}
          {stuck ? (
            <p className="text-[12.5px] font-semibold text-ink-3">
              This is taking longer than usual. If it went through, it will show up in your Money activity.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase.kind === "requested") {
    return (
      <div className="animate-rise mt-10 flex flex-1 flex-col items-center text-center">
        <span className="animate-bloom grid size-20 place-items-center rounded-full bg-blue-soft text-blue">
          <Send className="size-9" />
        </span>
        <h1 className="mt-5 text-[26px] font-black text-navy-strong">Request sent</h1>
        <p className="mt-2 max-w-[32ch] text-[15px] font-semibold text-ink-2">
          {state.profile.parentName} can allow it once, change your limits, or say not this time. You&apos;ll see the answer on Home.
        </p>
        <div className="mt-auto w-full space-y-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-8">
          <ActionButton href={`/invest/${asset.ticker}?mode=practice&amount=${amount}`} arrow>
            Practice it while you wait
          </ActionButton>
          <ActionButton variant="secondary" href="/home">
            Back to Home
          </ActionButton>
        </div>
      </div>
    );
  }

  /* ---------------- Edit ---------------- */

  const submitting = phase.kind === "submitting";
  const shares = validAmount ? amount / asset.price : 0;
  const moneyBlockedPreview =
    mode === "money" && preview && preview.decision !== "ALLOW" && !(coveredByAllowOnce && preview.boundaryRequestAvailable);

  return (
    <div className="animate-rise mt-4 flex flex-1 flex-col">
      <Card className="flex items-center gap-3 p-3.5">
        <CompanyLogo asset={asset} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-extrabold text-navy-strong">{asset.companyName}</p>
          <p className="text-[12.5px] font-bold text-ink-3">
            {formatUsd(asset.price)} · {asset.ticker}
          </p>
        </div>
        <DataStatusTag status={asset.dataStatus} />
      </Card>

      {mode === "money" && mandate.status !== "ACTIVE" ? (
        <div className="mt-4">
          <MoneyModeUnavailable reason="paused" />
        </div>
      ) : (
        <>
          {allowOnce ? (
            <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-green-soft px-3.5 py-3 text-[13.5px] font-bold text-green-strong">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.profile.parentName} allowed {formatAmount(allowOnce.requestedNotional)} in {asset.companyName} once.
            </div>
          ) : null}

          <label className="mt-5 block text-center">
            <span className="text-[14px] font-extrabold text-ink-2">How much?</span>
            <span className="mt-1 flex items-center justify-center gap-1">
              <span className="text-[40px] font-black text-ink-3">$</span>
              <input
                inputMode="decimal"
                maxLength={7}
                value={amountText}
                onChange={(e) => {
                  setAmountText(e.target.value.replace(/[^0-9.]/g, ""));
                  if (phase.kind === "boundary") setPhase({ kind: "edit" });
                }}
                aria-label="Amount in dollars"
                style={{ width: `${Math.max(1, amountText.length) + 0.6}ch` }}
                className="min-w-[1.6ch] max-w-[7ch] bg-transparent text-center text-[48px] font-black text-navy-strong tabular focus:outline-none"
              />
            </span>
          </label>
          <div className="mt-2 flex justify-center gap-2">
            {presets.map((p) => (
              <Chip
                key={p}
                selected={amount === p}
                onClick={() => {
                  setAmountText(String(p));
                  if (phase.kind === "boundary") setPhase({ kind: "edit" });
                }}
              >
                ${p}
              </Chip>
            ))}
          </div>

          <div className="mt-4 rounded-[16px] border border-line-soft bg-surface p-3.5">
            <div className="flex items-center justify-between text-[13.5px] font-bold">
              <span className="text-ink-2">{mode === "practice" ? "Practice balance" : "Available to invest"}</span>
              <span className="flex items-center gap-2">
                {mode === "money" ? <DemoMoneyTag /> : null}
                <span className="font-extrabold text-navy-strong tabular">{formatUsd(cash)}</span>
              </span>
            </div>
            {mode === "money" ? (
              <p className="mt-2 flex items-start gap-2 text-[13px] font-semibold text-ink-2">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-green" />
                Up to {formatAmount(mandate.maxActionNotional)} per action · {formatAmount(remainingThisPeriod(mandate))} left{" "}
                {mandate.periodLabel}. Inside these limits, you don&apos;t need to ask.
              </p>
            ) : null}
          </div>

          {phase.kind === "boundary" ? (
            <BoundaryMessage
              className="mt-4"
              evaluation={phase.evaluation}
              mandate={mandate}
              companyName={asset.companyName}
              onAdjust={() => {
                const max = mode === "money" ? maxAllowedNow(mandate, state.money.balance) : Math.floor(cash);
                setAmountText(String(max > 0 ? max : ""));
                setPhase({ kind: "edit" });
              }}
              practiceHref={mode === "money" ? `/invest/${asset.ticker}?mode=practice&amount=${amount}` : undefined}
              onAsk={mode === "money" ? () => setAskOpen(true) : undefined}
              mode={mode}
            />
          ) : (
            <>
              {moneyBlockedPreview && preview ? (
                <p role="status" className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#fff7ef] px-3.5 py-3 text-[13px] font-semibold text-navy">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-orange-text" />
                  {explainEvaluation(preview, mandate, asset.companyName, mode).body}
                </p>
              ) : null}

              <div className="mt-4 rounded-[16px] bg-surface-soft p-3.5 text-[13.5px] font-semibold text-ink-2">
                {validAmount ? (
                  <>
                    {mode === "money" && backend ? (
                      <>
                        That&apos;s about <span className="font-extrabold text-navy-strong tabular">{formatShares(shares)}</span> {asset.ticker} of
                        exposure in Devnet demo tokens, not real shares. The price is checked with live Pyth data when you invest.
                      </>
                    ) : (
                      <>
                        You&apos;d own about <span className="font-extrabold text-navy-strong tabular">{formatShares(shares)}</span>{" "}
                        {asset.representation ? "units" : "shares"} of {asset.companyName} with practice money. Prices go up and down, so
                        this could be worth more or less later.
                      </>
                    )}
                  </>
                ) : (
                  "Enter an amount to see what you'd own."
                )}
              </div>

              <label className="mt-4 block">
                <span className="text-[14px] font-extrabold text-navy-strong">
                  Why this company? <span className="font-semibold text-ink-3">(optional)</span>
                </span>
                <input
                  value={reason}
                  maxLength={120}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="I use their products every day"
                  className="mt-1.5 h-12 w-full rounded-[14px] border border-line bg-surface px-3.5 text-[15px] font-semibold text-navy placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
              </label>
            </>
          )}

          <div className={cn("sticky bottom-0 mt-auto bg-gradient-to-t from-bg via-bg to-bg/0 pb-[calc(16px+env(safe-area-inset-bottom))] pt-6")}>
            {phase.kind === "boundary" ? null : (
              <ActionButton onClick={submit} disabled={!validAmount || submitting} arrow={!submitting}>
                {submitting
                  ? mode === "money"
                    ? "Checking your limits…"
                    : "Adding…"
                  : mode === "practice"
                    ? `Add ${validAmount ? formatAmount(amount) : ""} to Practice`
                    : `Invest ${validAmount ? formatAmount(amount) : ""}`}
              </ActionButton>
            )}
          </div>
        </>
      )}

      <BoundaryRequestSheet
        open={askOpen}
        onClose={() => setAskOpen(false)}
        onSubmit={sendRequest}
        amount={validAmount ? amount : 0}
        companyName={asset.companyName}
        limit={
          phase.kind === "boundary" && phase.evaluation.reasonCode === "PERIOD_LIMIT_EXCEEDED"
            ? remainingThisPeriod(mandate)
            : mandate.maxActionNotional
        }
        parentName={state.profile.parentName}
        submitting={asking}
        error={requestError}
        limitLabel={
          phase.kind === "boundary" && phase.evaluation.reasonCode === "PERIOD_LIMIT_EXCEEDED"
            ? `Left ${mandate.periodLabel}`
            : "Your limit per action"
        }
      />
    </div>
  );
}

const SOURCE_LABEL: Record<ActionEvaluation["source"], string> = {
  "keys-runtime": "KEYS runtime",
  "keys-backend": "KEYS backend",
  "local-preview": "local preview",
};

