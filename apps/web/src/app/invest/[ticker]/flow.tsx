"use client";

import { CheckCircle2, Clock, Info, Send, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CompanyLogo } from "@/components/finance";
import { PlantPot } from "@/components/illustrations/objects";
import { BoundaryMessage, BoundaryRequestSheet, KeyUnavailable, MoneySetupRequired, PracticeSyncState } from "@/components/mode";
import { DataStatusTag, EmptyState, ErrorState, NetworkTag, Provenance, Skeleton, useToast } from "@/components/ui/feedback";
import { BottomSheet } from "@/components/ui/overlay";
import { ActionButton, BackButton, Card, Chip, cn } from "@/components/ui/primitives";
import { formatAmount, formatShares, formatUsd } from "@/domain/format";
import { assetRuleFor, evaluateBoundedAction, explainEvaluation, maxAllowedNow, remainingThisPeriod } from "@/domain/policy";
import type { ActionEvaluation, ExecutionResult, MarketAsset, Mode } from "@/domain/types";
import { useAsset } from "@/hooks/data";
import { boundaryRequests, practiceDevnetExecution, practiceSandboxExecution } from "@/services";
import { keysBackendConfigured, newIdempotencyKey } from "@/services/keys-backend";
import { ExecutionProofNote, ProofDetails } from "@/components/proof";
import { useSingleFlight } from "@/hooks/single-flight";
import { usePracticeChain, useStore } from "@/state/store";

type Phase =
  | { kind: "edit" }
  | { kind: "submitting" }
  | { kind: "done"; result: ExecutionResult; allowedOnce: boolean }
  | { kind: "boundary"; evaluation: ActionEvaluation }
  | { kind: "requested" }
  | { kind: "unconfirmed"; result: ExecutionResult; idempotencyKey: string; checking: boolean };

/**
 * Where an action runs. Decided from mode + asset support, never from copy:
 * - devnet:  Practice through the KEYS Devnet runtime (Key-enforced, real Devnet receipts)
 * - sandbox: Practice for assets without a Devnet lane (local, not on-chain)
 * - mainnet: Money. Setup-required today; never falls back to Devnet.
 */
type Lane = "devnet" | "sandbox" | "mainnet";

function laneFor(mode: Mode, asset: MarketAsset): Lane {
  if (mode === "money") return "mainnet";
  return practiceDevnetExecution.supports(asset) ? "devnet" : "sandbox";
}

export function InvestFlow({ ticker, initialMode, initialAmount }: { ticker: string; initialMode?: Mode; initialAmount?: number }) {
  const { state } = useStore();
  const chain = usePracticeChain();
  const asset = useAsset(ticker);
  const mode = initialMode ?? state.mode;
  const lane = asset.status === "success" && asset.data ? laneFor(mode, asset.data) : null;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pt-4 md:pt-8">
      <div className="flex items-center gap-2">
        <BackButton label="Back" />
        <p className="flex-1 text-center text-[15px] font-extrabold text-navy-strong">
          {mode === "practice" ? "Practice" : "Money"}
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
      ) : lane === "mainnet" ? (
        <div className="mt-6">
          <MoneySetupRequired />
          <ActionButton className="mt-4" href={`/invest/${asset.data.ticker}?mode=practice`} arrow>
            Practice {asset.data.companyName} on Solana Devnet
          </ActionButton>
        </div>
      ) : lane === "devnet" && !chain.ready ? (
        <div className="mt-6">
          <PracticeSyncState status={chain.status} onRetry={chain.refresh} />
        </div>
      ) : lane === "devnet" && !state.profile.parentLinked ? (
        <div className="mt-6">
          <KeyUnavailable reason="parent" />
        </div>
      ) : (
        <Flow asset={asset.data} lane={lane === "devnet" ? "devnet" : "sandbox"} initialAmount={initialAmount} />
      )}
    </main>
  );
}

const STUCK_AFTER_MS = 2 * 60_000;

function Flow({ asset, lane, initialAmount }: { asset: MarketAsset; lane: "devnet" | "sandbox"; initialAmount?: number }) {
  const keyed = lane === "devnet";
  const { state, dispatch, refresh } = useStore();
  const backend = keysBackendConfigured();
  const guard = useSingleFlight();
  const toast = useToast();
  const { mandate } = state;

  const allowOnce = state.requests.find(
    (r) => r.status === "ALLOWED_ONCE" && r.asset === asset.ticker && r.mandateNonce === mandate.nonce,
  );
  const presets = keyed ? [2, 5, 10, 20] : [25, 50, 100, 250];
  const [amountText, setAmountText] = useState(
    String(
      (keyed ? state.pendingExecutions.find((p) => p.ticker === asset.ticker)?.amount : undefined) ??
        initialAmount ??
        allowOnce?.requestedNotional ??
        (keyed ? 5 : 50),
    ),
  );
  const [reason, setReason] = useState("");
  // A previously unconfirmed intent for this company resumes with the same key.
  const resumable = keyed ? state.pendingExecutions.find((p) => p.ticker === asset.ticker) : undefined;
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
  const cash = keyed ? state.practiceChain.balance : state.sandbox.cash;

  // Instant, local explanation while typing. The real decision happens on submit.
  const preview = useMemo<ActionEvaluation | null>(() => {
    if (!keyed || !validAmount) return null;
    return evaluateBoundedAction({
      mandate,
      assetRule: assetRuleFor(mandate, asset.ticker),
      action: { asset: asset.ticker, type: "BUY", notional: amount },
    });
  }, [keyed, validAmount, mandate, asset.ticker, amount]);

  const coveredByAllowOnce = !!allowOnce && validAmount && amount <= allowOnce.requestedNotional;

  const submit = guard(async () => {
    if (!validAmount) return;
    setPhase({ kind: "submitting" });
    if (!keyed) {
      const result = await practiceSandboxExecution.buy({ asset, amount, cash });
      if (result.ok && result.shares != null && result.proof) {
        dispatch({ type: "practiceBuy", ticker: asset.ticker, amount, shares: result.shares, reason: reason.trim() || undefined, proof: result.proof });
        setPhase({ kind: "done", result, allowedOnce: false });
      } else {
        setPhase({ kind: "boundary", evaluation: result.evaluation });
      }
      return;
    }
    await runKeyed(intentKeyFor(amount));
  });

  // One idempotency key per user intent (asset + amount). Re-checks reuse it.
  const [intent, setIntent] = useState<{ amount: number; key: string } | null>(null);
  const intentKeyFor = (value: number) => {
    if (intent && intent.amount === value) return intent.key;
    const next = { amount: value, key: newIdempotencyKey() };
    setIntent(next);
    return next.key;
  };

  const runKeyed = async (idempotencyKey: string, recheck = false) => {
    const result = await practiceDevnetExecution.execute({
      mandate,
      assetRule: assetRuleFor(mandate, asset.ticker),
      asset,
      type: "BUY",
      amount,
      balance: state.practiceChain.balance,
      allowOnce: allowOnce ?? null,
      idempotencyKey,
      recheck,
    });
    // The allowance is only "used" when the standing Key alone would have refused.
    const usedAllowOnce = coveredByAllowOnce && preview?.decision !== "ALLOW";
    if (result.outcome === "EXECUTED" && result.shares != null && result.proof) {
      // The Family Durable Object + Devnet program are the source of truth for
      // practice capital, positions and allowance state: re-fetch, never apply locally.
      dispatch({ type: "clearPending", idempotencyKey });
      await refresh({ chain: true });
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
  // arrives through sync and shows in Practice activity.
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
    await runKeyed(phase.idempotencyKey, true);
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
    return (
      <div className="animate-rise mt-8 flex flex-1 flex-col items-center text-center">
        <PlantPot className="animate-bloom size-28" />
        <h1 className="mt-4 text-[26px] font-black text-navy-strong">
          {!keyed
            ? "Added to your Practice sandbox"
            : phase.result.proof?.status === "RUNTIME_CONFIRMED" && !phase.result.proof.simulated
              ? "Practice action confirmed on Solana Devnet"
              : phase.allowedOnce
                ? "Done once. Your Key didn't change."
                : "Done. No parent approval needed."}
        </h1>
        <p className="mt-2 max-w-[36ch] text-[15px] font-semibold text-ink-2">
          {keyed
            ? `${formatAmount(amount)} of ${asset.companyName} practice exposure${
                typeof phase.result.proof?.pyth?.unitPrice === "number"
                  ? ` at a live Pyth price of ${formatUsd(phase.result.proof.pyth.unitPrice)}`
                  : ""
              }.`
            : `${formatAmount(amount)} of ${asset.companyName} practice exposure at a ${asset.dataStatus === "live" ? "live" : "sample"} price of ${formatUsd(asset.price)}. Sandbox only: this wasn't sent to Solana.`}
        </p>
        <p className="mt-2 flex flex-wrap justify-center gap-1.5">
          {keyed ? <NetworkTag mode="practice" /> : <Provenance kind="sandbox" />}
          <Provenance kind="no-real-value" label="Practice capital · no real financial value" />
        </p>
        {keyed && phase.allowedOnce ? (
          <div className="mt-4 w-full rounded-[16px] border-2 border-green/25 bg-green-soft px-4 py-3 text-left">
            <p className="text-[12px] font-black uppercase tracking-[0.08em] text-green-strong">One-time permission → USED</p>
            <p className="mt-1 text-[13.5px] font-semibold text-navy">
              This boundary crossing was consumed. Standing Key v{mandate.version} is still the same.
            </p>
          </div>
        ) : null}
        {keyed ? (
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
          {phase.result.proof?.status === "PRACTICE_LOCAL" ? (
            <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
              Sandbox practice: no transaction was sent. {asset.companyName} doesn&apos;t have a KEYS Devnet lane yet.
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
            ? `${formatAmount(amount)} of ${asset.companyName} practice was accepted and isn't confirmed on Solana Devnet yet.`
            : `Solana is taking longer than expected. We couldn't confirm whether ${formatAmount(amount)} of ${asset.companyName} practice went through.`}{" "}
          Your practice capital won&apos;t change until it&apos;s confirmed, and checking again can never make it happen twice.
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
              This is taking longer than usual. If it went through, it will show up in your Practice activity.
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
          {state.profile.parentName} can say not this time, allow this request once, or create a wider standing Key. You&apos;ll see the answer on Home.
        </p>
        <div className="mt-auto w-full space-y-3 pb-[calc(16px+env(safe-area-inset-bottom))] pt-8">
          <ActionButton href="/learn" arrow>
            Learn something while you wait
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
  const keyBlockedPreview =
    keyed && preview && preview.decision !== "ALLOW" && !(coveredByAllowOnce && preview.boundaryRequestAvailable);

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
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ink-3">
        {keyed ? <NetworkTag mode="practice" /> : <Provenance kind="sandbox" />}
        Practice capital · no real financial value
      </p>

      {keyed && mandate.status !== "ACTIVE" ? (
        <div className="mt-4">
          <KeyUnavailable reason="paused" />
        </div>
      ) : (
        <>
          {allowOnce ? (
            <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-green-soft px-3.5 py-3 text-[13.5px] font-bold text-green-strong">
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.profile.parentName} allowed this request once. Standing Key v{mandate.version} stays unchanged.
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
              <span className="text-ink-2">{keyed ? "Practice capital on Devnet" : "Sandbox balance"}</span>
              <span className="font-extrabold text-navy-strong tabular">{formatUsd(cash)}</span>
            </div>
            {keyed ? (
              <p className="mt-2 flex items-start gap-2 text-[13px] font-semibold text-ink-2">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-green" />
                Key v{mandate.version} · up to {formatAmount(mandate.maxActionNotional)} per action · {formatAmount(remainingThisPeriod(mandate))} left{" "}
                {mandate.periodLabel}. Inside this Key, you act on your own.
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
                const max = keyed ? maxAllowedNow(mandate, state.practiceChain.balance) : Math.floor(cash);
                setAmountText(String(max > 0 ? max : ""));
                setPhase({ kind: "edit" });
              }}
              onAsk={keyed ? () => setAskOpen(true) : undefined}
              mode={keyed ? "money" : "practice"}
            />
          ) : (
            <>
              {keyBlockedPreview && preview ? (
                <p role="status" className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#fff7ef] px-3.5 py-3 text-[13px] font-semibold text-navy">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-orange-text" />
                  {explainEvaluation(preview, mandate, asset.companyName, "practice").body}
                </p>
              ) : null}

              <div className="mt-4 rounded-[16px] bg-surface-soft p-3.5 text-[13.5px] font-semibold text-ink-2">
                {validAmount ? (
                  <>
                    {keyed ? (
                      <>
                        That&apos;s about <span className="font-extrabold text-navy-strong tabular">{formatShares(shares)}</span> {asset.ticker} of
                        practice exposure on Solana Devnet. Your Key and the live Pyth price are checked on-chain when you practice.
                      </>
                    ) : (
                      <>
                        That&apos;s about <span className="font-extrabold text-navy-strong tabular">{formatShares(shares)}</span>{" "}
                        {asset.representation ? "units" : "shares"} of {asset.companyName} practice exposure. Prices go up and down, so this
                        could be worth more or less later.
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
                  ? keyed
                    ? "Checking your Key…"
                    : "Adding…"
                  : `Practice ${validAmount ? formatAmount(amount) : ""}`}
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

