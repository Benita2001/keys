"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Dumbbell,
  PauseCircle,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { explainEvaluation, isLimitRefusal, isRequestStale, learningContextFor, remainingThisPeriod } from "@/domain/policy";
import { formatAmount, formatPercent, formatUsd } from "@/domain/format";
import type { ActionEvaluation, BoundaryRequest, CurrentMandate, Mode, PortfolioView } from "@/domain/types";
import { useStore } from "@/state/store";
import { PlantPot } from "./illustrations/objects";
import { DataStatusTag, DemoMoneyTag, Provenance, Skeleton } from "./ui/feedback";
import { BottomSheet } from "./ui/overlay";
import { ActionButton, Card, cn, IconCircle } from "./ui/primitives";

/* ------------------------------------------------------------------ */
/* Mode switch                                                          */
/* ------------------------------------------------------------------ */

export function ModeSwitch({ className }: { className?: string }) {
  const { state, dispatch } = useStore();
  const [introOpen, setIntroOpen] = useState(false);
  const mode = state.mode;

  const choose = (next: Mode) => {
    if (next === mode) return;
    dispatch({ type: "setMode", mode: next });
    if (next === "money" && !state.moneyIntroSeen) setIntroOpen(true);
  };

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Portfolio mode"
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            choose("practice");
          } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            choose("money");
          }
        }}
        className={cn("relative grid h-10 grid-cols-2 rounded-[14px] bg-[#edf1f7] p-1", className)}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[11px] shadow-[0_3px_8px_rgba(16,43,99,0.12)] transition-transform duration-200 ease-out",
            mode === "money" ? "translate-x-full bg-navy" : "translate-x-0 bg-blue",
          )}
        />
        {(["practice", "money"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            tabIndex={mode === m ? 0 : -1}
            onClick={() => choose(m)}
            className={cn(
              "relative z-10 rounded-[11px] text-[13.5px] font-extrabold transition-colors duration-200",
              mode === m ? "text-white" : "text-ink-2 hover:text-navy",
            )}
          >
            {m === "practice" ? "Practice" : "Money"}
          </button>
        ))}
      </div>
      <MoneyIntroSheet
        open={introOpen}
        onClose={() => {
          setIntroOpen(false);
          dispatch({ type: "seenMoneyIntro" });
        }}
      />
    </>
  );
}

/** First-time Money Mode activation explainer. */
export function MoneyIntroSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const { mandate, profile } = state;
  return (
    <BottomSheet open={open} onClose={onClose} title="Your Key" description="Standing room to act on your own, with a clear family boundary.">
      {profile.parentLinked ? (
        <>
          <ul className="space-y-3">
            <IntroRow icon={<CheckCircle2 className="size-5" />} tone="green" title="Inside your Key, just go">
              Act up to {formatAmount(mandate.maxActionNotional)} at a time. In-bounds actions need no parent approval.
            </IntroRow>
            <IntroRow icon={<SlidersHorizontal className="size-5" />} tone="blue" title="At the boundary, ask">
              {profile.parentName} can say not this time, allow this request once, or create a wider standing Key.
            </IntroRow>
            <IntroRow icon={<Dumbbell className="size-5" />} tone="lavender" title="Practice is always open">
              Try anything first with practice money.
            </IntroRow>
          </ul>
          <div className="mt-4 rounded-[14px] bg-yellow-soft p-3 text-[13px] font-semibold text-[#7a5207]">
            <DemoMoneyTag className="mb-1.5" />
            <p>
              Money Mode uses Devnet test capital and a demo SPL token. It is not connected to a bank, broker or custodian, and it does not buy real securities.
            </p>
          </div>
          <ActionButton className="mt-5" onClick={onClose} data-autofocus>
            Got it
          </ActionButton>
        </>
      ) : (
        <>
          <p className="text-[14px] font-semibold text-ink-2">
            Money Mode needs a parent or guardian to set your limits first. Until then, you can keep practicing.
          </p>
          <ActionButton className="mt-5" href="/profile/parent" arrow>
            Connect a parent or guardian
          </ActionButton>
        </>
      )}
    </BottomSheet>
  );
}

function IntroRow({ icon, tone, title, children }: { icon: React.ReactNode; tone: "green" | "blue" | "lavender"; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <IconCircle tone={tone} size={40}>
        {icon}
      </IconCircle>
      <div>
        <p className="text-[15px] font-extrabold text-navy-strong">{title}</p>
        <p className="text-[13.5px] font-semibold text-ink-2">{children}</p>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Portfolio hero cards                                                 */
/* ------------------------------------------------------------------ */

export function PracticeHeroCard({ view, href = "/portfolio" }: { view: PortfolioView | null; href?: string }) {
  return (
    <Link
      href={href}
      className="relative block overflow-hidden rounded-[24px] bg-gradient-to-br from-[#10864f] via-[#0d7d49] to-[#0b6e40] p-5 text-white shadow-[0_10px_24px_rgba(33,182,111,0.28)]"
    >
      <svg aria-hidden viewBox="0 0 300 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[70px] w-full opacity-40">
        <path d="M0 80 L40 64 L80 70 L120 46 L160 54 L200 30 L240 36 L300 8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 80 L40 64 L80 70 L120 46 L160 54 L200 30 L240 36 L300 8 V90 H0 Z" fill="#fff" opacity=".12" />
      </svg>
      <PlantPot className="absolute -bottom-1 right-2 size-[92px]" />
      <p className="relative text-[15px] font-bold text-white">Practice Portfolio</p>
      {view ? (
        <>
          <p className="relative mt-1 text-[34px] font-extrabold leading-none tracking-[-0.01em] tabular">{formatUsd(view.totalValue)}</p>
          <p className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[14px] font-extrabold tabular">
            {view.totalChange >= 0 ? "▲" : "▼"} {formatPercent(view.totalChangePercent)}
          </p>
        </>
      ) : (
        <div className="relative mt-2 space-y-2">
          <div className="h-9 w-40 rounded-[10px] bg-white/25" />
          <div className="h-5 w-16 rounded-full bg-white/25" />
        </div>
      )}
      <p className="relative mt-3 text-[11.5px] font-bold text-white">Virtual money · sample prices</p>
    </Link>
  );
}

export function MoneyHeroCard({ view, mandate, balance }: { view: PortfolioView | null; mandate: CurrentMandate; balance: number }) {
  const invested = view?.totalValue ?? 0;
  return (
    <Link
      href="/portfolio"
      className="relative block overflow-hidden rounded-[24px] bg-gradient-to-br from-[#16357a] via-[#102b63] to-[#0b2152] p-5 text-white shadow-[0_10px_24px_rgba(16,43,99,0.28)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-white">Money Portfolio</p>
        <DemoMoneyTag />
      </div>
      <p className="mt-1 text-[34px] font-extrabold leading-none tracking-[-0.01em] tabular">{formatUsd(invested + balance)}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-white">
        {formatUsd(balance)} available to invest · {formatUsd(invested)} invested
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-[14px] bg-white/10 px-3 py-2 text-[12.5px] font-bold">
        <ShieldCheck aria-hidden className="size-4 text-[#7be49f]" />
        {mandate.status === "ACTIVE"
          ? `Up to ${formatAmount(mandate.maxActionNotional)} per action · ${formatAmount(remainingThisPeriod(mandate))} left ${mandate.periodLabel}`
          : "Money Mode is paused by your parent"}
      </div>
    </Link>
  );
}

export function HeroSkeleton() {
  return <Skeleton className="h-[172px] w-full rounded-[24px]" />;
}

/* ------------------------------------------------------------------ */
/* Money + Mandate                                                      */
/* ------------------------------------------------------------------ */

export function MoneyBalanceCard({ balance, action, caption = "Available to invest" }: { balance: number; action?: React.ReactNode; caption?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-green text-white">
          <CircleDollarSign aria-hidden className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-[12.5px] font-bold text-ink-2">Money Mode balance</p>
          <p className="text-[26px] font-extrabold leading-tight text-navy-strong tabular">{formatUsd(balance)}</p>
        </div>
        {action}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-2">
        {caption} <DemoMoneyTag />
      </p>
    </Card>
  );
}

export function LimitRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-soft text-blue">{icon}</span>
      <span className="flex-1 text-[14px] font-semibold text-ink-2">{label}</span>
      <span className="text-right text-[14px] font-extrabold text-navy-strong tabular">{value}</span>
    </li>
  );
}

export function MandateSummaryCard({
  mandate,
  who,
  actions,
  className,
}: {
  mandate: CurrentMandate;
  who: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const active = mandate.status === "ACTIVE";
  return (
    <Card className={cn("p-4", className)}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-extrabold text-navy-strong">{who}</h3>
          <p className="mt-0.5 text-[12px] font-extrabold text-blue">Key v{mandate.version} · standing authority</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-extrabold",
            active ? "bg-green-soft text-green-strong" : "bg-yellow-soft text-[#8a5a07]",
          )}
        >
          {active ? <CheckCircle2 aria-hidden className="size-3.5" /> : <PauseCircle aria-hidden className="size-3.5" />}
          {active ? "Active" : mandate.status === "PAUSED" ? "Paused" : "Off"}
        </span>
      </div>
      <div className="my-3 overflow-hidden rounded-[14px] border-2 border-blue/20 bg-blue-soft p-3">
        <div className="flex items-center justify-between gap-3 text-[12.5px] font-extrabold">
          <span className="text-blue-strong">Inside Key v{mandate.version}</span>
          <span className="text-green-strong">Act on your own</span>
        </div>
        <div className="mt-2 border-t border-blue/20 pt-2 text-[12.5px] font-semibold text-ink-2">
          At the boundary: ask. A one-time permission can cross once without moving this boundary.
        </div>
      </div>
      <ul className="divide-y divide-line-soft">
        <LimitRow icon={<CircleDollarSign className="size-4" />} label="Per action" value={`Up to ${formatAmount(mandate.maxActionNotional)}`} />
        <LimitRow
          icon={<CalendarDays className="size-4" />}
          label={`Per month`}
          value={
            <>
              Up to {formatAmount(mandate.maxPeriodNotional)}
              <span className="block text-[11.5px] font-bold text-ink-3">{formatAmount(remainingThisPeriod(mandate))} left</span>
            </>
          }
        />
        <LimitRow icon={<Store className="size-4" />} label="Allowed" value={`${mandate.allowedAssets.length} selected assets`} />
      </ul>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Boundary                                                             */
/* ------------------------------------------------------------------ */

export function BoundaryMessage({
  evaluation,
  mandate,
  companyName,
  onAdjust,
  practiceHref,
  onAsk,
  mode = "money",
  className,
}: {
  mode?: Mode;
  evaluation: ActionEvaluation;
  mandate: CurrentMandate;
  companyName?: string;
  onAdjust?: () => void;
  practiceHref?: string;
  onAsk?: () => void;
  className?: string;
}) {
  const { title, body } = explainEvaluation(evaluation, mandate, companyName, mode);
  const ctx = learningContextFor(evaluation);
  return (
    <div role="status" className={cn("rounded-[20px] border border-[#ffd9b8] bg-[#fff7ef] p-4", className)}>
      <div className="flex gap-3">
        <IconCircle tone="orange" size={40}>
          <SlidersHorizontal className="size-5" />
        </IconCircle>
        <div className="min-w-0 flex-1">
          <p className="text-[15.5px] font-extrabold text-navy-strong">{title}</p>
          <p className="mt-1 text-[14px] font-semibold text-ink-2">{body}</p>
        </div>
      </div>
      {ctx ? (
        <p className="mt-3 rounded-[12px] bg-white/80 px-3 py-2 text-[12.5px] font-semibold text-ink-2">
          <span className="font-extrabold text-navy">{ctx.title}. </span>
          {ctx.body}
        </p>
      ) : null}
      <div className="mt-4 grid gap-2">
        {onAsk && (evaluation.boundaryRequestAvailable || isLimitRefusal(evaluation.reasonCode)) ? (
          <ActionButton size="md" className="w-full" onClick={onAsk}>
            Ask for more room
          </ActionButton>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {onAdjust ? (
            <ActionButton variant="quiet" size="md" onClick={onAdjust}>
              Adjust amount
            </ActionButton>
          ) : null}
          {practiceHref ? (
            <ActionButton variant="ghost" size="md" href={practiceHref}>
              Practice instead
            </ActionButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BoundaryRequestSheet({
  open,
  onClose,
  onSubmit,
  amount,
  companyName,
  limit,
  parentName,
  submitting,
  error,
  limitLabel = "Your current limit",
}: {
  error?: string | null;
  limitLabel?: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  amount: number;
  companyName: string;
  limit: number;
  parentName: string;
  submitting?: boolean;
}) {
  const [reason, setReason] = useState("");
  const max = 140;
  return (
    <BottomSheet open={open} onClose={onClose} title="Ask for more room" description={`${parentName} will see your request and decide.`}>
      <div className="rounded-[16px] bg-surface-soft p-3.5">
        <div className="flex items-center justify-between text-[14px] font-semibold text-ink-2">
          <span>You want to invest</span>
          <span className="font-extrabold text-navy-strong tabular">
            {formatAmount(amount)} in {companyName}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[14px] font-semibold text-ink-2">
          <span>{limitLabel}</span>
          <span className="font-extrabold text-navy-strong tabular">{formatAmount(limit)}</span>
        </div>
      </div>
      <label className="mt-4 block">
        <span className="text-[14px] font-extrabold text-navy-strong">Why? (one line)</span>
        <textarea
          data-autofocus
          value={reason}
          maxLength={max}
          rows={2}
          onChange={(e) => setReason(e.target.value)}
          placeholder="I've learned about this company and want to own a bit more."
          className="mt-1.5 w-full resize-none rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[15px] font-semibold text-navy placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
        />
        <span className="mt-1 block text-right text-[12px] font-bold text-ink-3 tabular">
          {reason.length}/{max}
        </span>
      </label>
      <p className="text-[12.5px] font-semibold text-ink-3">Your reason stays private to your family. It is never published on a blockchain.</p>
      {error ? (
        <p role="alert" className="mt-3 rounded-[12px] bg-loss-soft px-3 py-2 text-[13px] font-bold text-loss-text">
          {error}
        </p>
      ) : null}
      <ActionButton className="mt-4" disabled={!reason.trim() || submitting} onClick={() => onSubmit(reason)} arrow={!submitting}>
        {submitting ? "Sending…" : `Send to ${parentName}`}
      </ActionButton>
    </BottomSheet>
  );
}

export function RequestStatusCard({ request, companyName }: { request: BoundaryRequest; companyName: string }) {
  const { state } = useStore();
  const stale = isRequestStale(request, state.mandate);
  const map = stale
    ? { text: "Limits changed", tone: "bg-surface-soft text-ink-2" }
    : {
    PENDING_HUMAN_DECISION: { text: "Waiting for your parent", tone: "bg-yellow-soft text-[#8a5a07]" },
    ALLOW_ONCE_PENDING_CHAIN: { text: "Finishing on Solana…", tone: "bg-blue-soft text-blue-strong" },
    WIDEN_PENDING_CHAIN: { text: "Finishing on Solana…", tone: "bg-blue-soft text-blue-strong" },
    ALLOWED_ONCE: { text: "One-time ready", tone: "bg-green-soft text-green-strong" },
    ALLOWED_ONCE_USED: { text: "One-time used", tone: "bg-surface-soft text-ink-2" },
    WIDENED: { text: "New Key", tone: "bg-green-soft text-green-strong" },
    REFUSED: { text: "Not this time", tone: "bg-surface-soft text-ink-2" },
      }[request.status];
  const body = (
    <>
      <IconCircle tone="blue" size={38}>
        <UserPlus className="size-[18px]" />
      </IconCircle>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold text-navy-strong">
          {formatAmount(request.requestedNotional)} in {companyName}
        </p>
        <p className="truncate text-[12.5px] font-semibold text-ink-2">
          {stale
            ? "Your limits changed. Check them and try again."
            : request.status === "ALLOWED_ONCE"
            ? `One-time permission ready · Key v${request.mandateVersion} stays unchanged`
            : request.status === "ALLOWED_ONCE_USED"
              ? "One-time permission used · standing Key stays unchanged"
              : request.guardianNote
              ? `Note: ${request.guardianNote}`
              : `\u201c${request.reason}\u201d`}
        </p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold", map.tone)}>{map.text}</span>
    </>
  );
  if (request.status === "ALLOWED_ONCE") {
    return (
      <Link
        href={`/invest/${request.asset}?mode=money&amount=${request.requestedNotional}`}
        className="flex items-center gap-3 rounded-[20px] border border-green/40 bg-surface p-3.5"
      >
        {body}
      </Link>
    );
  }
  return <Card className="flex items-center gap-3 p-3.5">{body}</Card>;
}

export function MoneyModeUnavailable({ reason }: { reason: "parent" | "paused" }) {
  return (
    <Card className="p-5 text-center">
      <IconCircle tone={reason === "paused" ? "yellow" : "blue"} size={52} className="mx-auto">
        {reason === "paused" ? <PauseCircle className="size-6" /> : <UserPlus className="size-6" />}
      </IconCircle>
      <p className="mt-3 text-[17px] font-extrabold text-navy-strong">
        {reason === "paused" ? "Money Mode is paused" : "Connect a parent or guardian"}
      </p>
      <p className="mx-auto mt-1 max-w-[32ch] text-[14px] font-semibold text-ink-2">
        {reason === "paused"
          ? "Your parent or guardian paused Money Mode for now. Your Practice portfolio still works."
          : "Money Mode uses family money, so a parent or guardian sets your limits first."}
      </p>
      {reason === "parent" ? (
        <ActionButton className="mx-auto mt-4 max-w-[280px]" href="/profile/parent" arrow>
          Connect a parent
        </ActionButton>
      ) : null}
    </Card>
  );
}

export function PriceTruthLine({ view, className }: { view: PortfolioView; className?: string }) {
  const live = view.holdings.filter((h) => h.asset.dataStatus === "live").length;
  const total = view.holdings.length;
  const status: PortfolioView["dataStatus"] = total > 0 && live === total ? "live" : live > 0 ? "stale" : "mock";
  return (
    <p className={cn("flex items-center gap-1.5 text-[12px] font-semibold text-ink-3", className)}>
      {status === "live" ? (
        <Provenance kind="live" label="Live prices" />
      ) : status === "mock" ? (
        <DataStatusTag status="mock" />
      ) : (
        <Provenance kind="sample" label="Mixed" />
      )}
      {status === "live"
        ? "Every holding is valued with a live price."
        : status === "mock"
          ? "Prices are samples for learning, not live quotes."
          : `${live} of ${total} holdings use live prices (Pyth or PreStocks/Tessera); the rest use sample prices.`}
    </p>
  );
}

export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-extrabold text-blue">
      {children} <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/**
 * Money surfaces wait for backend truth. Nothing Money-related renders from
 * local defaults while connecting, and a failed sync fails closed.
 */
export function MoneySyncState({ status, onRetry }: { status: string; onRetry: () => void }) {
  if (status === "connecting") {
    return (
      <div role="status" aria-busy="true" className="rounded-[20px] border border-line-soft bg-surface p-4">
        <p className="text-[14px] font-extrabold text-navy-strong">Connecting to your family&apos;s Money account…</p>
        <div className="skeleton mt-3 h-4 w-2/3 rounded-[8px]" />
        <div className="skeleton mt-2 h-4 w-1/2 rounded-[8px]" />
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-[20px] border border-line-soft bg-surface p-4">
      <p className="text-[15px] font-extrabold text-navy-strong">We can&apos;t reach your family&apos;s Money account.</p>
      <p className="mt-1 text-[13.5px] font-semibold text-ink-2">
        Nothing will be invested until it&apos;s back. Practice still works.
      </p>
      <ActionButton variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </ActionButton>
    </div>
  );
}
