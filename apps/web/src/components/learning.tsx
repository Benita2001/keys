"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Layers,
  Lock,
  PieChart,
  Plus,
  Rocket,
  Scale,
  TrendingUp,
} from "lucide-react";
import type { Achievement, Goal, LearningModule, Lesson, ModuleState } from "@/domain/types";
import { BadgeArt } from "./illustrations/badges";
import { GoalArt, Target } from "./illustrations/objects";
import { cn } from "./ui/primitives";

export function MissionCard({ title, body, href, done }: { title: string; body: string; xp: number; href: string; done?: boolean }) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-3.5 overflow-hidden rounded-[22px] border border-[#ffe7a6] bg-gradient-to-br from-[#fff8e3] to-[#fff1cf] p-4 pr-3"
    >
      <Target className="size-[62px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold text-navy-strong">{title}</p>
        <p className="mt-0.5 text-[13.5px] font-semibold leading-snug text-ink-2">{body}</p>
        <p className="mt-1.5 text-[13px] font-extrabold text-green-strong">{done ? "Completed" : "Learning progress only · never changes your Key"}</p>
      </div>
      <div className="flex flex-col items-end justify-between self-stretch">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-yellow text-white">
          {done ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
        </span>
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-blue text-white shadow-button">
          <ArrowRight className="size-4" strokeWidth={2.8} />
        </span>
      </div>
    </Link>
  );
}

const MODULE_ICONS = {
  coins: Coins,
  building: Building2,
  pie: PieChart,
  trend: TrendingUp,
  scale: Scale,
  layers: Layers,
  rocket: Rocket,
};

const TONE_BG: Record<LearningModule["tone"], string> = {
  green: "from-[#4fd98a] to-[#139459]",
  blue: "from-[#4f93ff] to-[#0f57e8]",
  lavender: "from-[#a996ff] to-[#6a4fe0]",
  orange: "from-[#ffb05a] to-[#f0602e]",
  aqua: "from-[#7ce3da] to-[#1ea79c]",
  pink: "from-[#ff9fbf] to-[#e44f86]",
};

export function ModuleIcon({ module, size = 44, muted }: { module: LearningModule; size?: number; muted?: boolean }) {
  const Icon = MODULE_ICONS[module.icon];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]",
        TONE_BG[module.tone],
        muted && "opacity-60 saturate-50",
      )}
      style={{ width: size, height: size }}
    >
      <Icon className="size-[46%]" strokeWidth={2.4} />
    </span>
  );
}

export function LessonCard({ lesson, module, href, locked }: { lesson: Lesson; module: LearningModule; href: string; locked?: boolean }) {
  return (
    <Link href={href} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[18px] border border-line-soft bg-surface p-3">
      <ModuleIcon module={module} size={40} muted={locked} />
      <div className="min-w-0">
        <p className="text-[13.5px] font-extrabold leading-tight text-navy-strong">{lesson.title}</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] font-bold text-ink-2">
          {locked ? <Lock aria-hidden className="size-3" /> : <Clock aria-hidden className="size-3" />}
          {locked ? "Up next" : `${lesson.minutes} min`}
        </p>
      </div>
    </Link>
  );
}

export function ModuleRow({
  module,
  state,
  href,
}: {
  module: LearningModule;
  state: ModuleState;
  href?: string;
}) {
  const current = state === "current";
  const inner = (
    <>
      <span className={cn("rounded-full", current && "bg-white/20 p-[3px]")}>
        <ModuleIcon module={module} size={current ? 40 : 44} muted={state === "locked"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-extrabold leading-tight", current ? "text-white" : state === "locked" ? "text-navy/70" : "text-navy-strong")}>
          {module.title}
        </p>
        <p className={cn("mt-0.5 text-[12.5px] font-semibold", current ? "text-white" : "text-ink-2")}>{module.subtitle}</p>
        <p className={cn("mt-0.5 text-[12.5px] font-extrabold", current ? "text-white" : "text-ink-3")}>
          Learning only · no authority unlock
        </p>
      </div>
      {state === "complete" ? (
        <span className="grid size-8 place-items-center rounded-full bg-green text-white" aria-label="Completed">
          <Check className="size-[18px]" strokeWidth={3} />
        </span>
      ) : state === "current" ? (
        <span className="grid size-9 place-items-center rounded-full bg-white text-blue" aria-hidden>
          <ChevronRight className="size-5" strokeWidth={3} />
        </span>
      ) : state === "open" ? (
        <span className="grid size-8 place-items-center rounded-full bg-blue-soft text-blue" aria-hidden>
          <ChevronRight className="size-5" strokeWidth={3} />
        </span>
      ) : (
        <span className="grid size-8 place-items-center text-ink-3" aria-label="Locked">
          <Lock className="size-[18px]" strokeWidth={2.4} />
        </span>
      )}
    </>
  );
  const cls = cn(
    "flex items-center gap-3 rounded-[20px] px-3.5 py-3",
    current ? "bg-blue shadow-button" : "border border-line-soft bg-surface",
    state === "locked" && "bg-surface-soft",
  );
  if (href && state !== "locked") {
    return (
      <li>
        <Link href={href} className={cls} aria-current={current ? "step" : undefined}>
          {inner}
        </Link>
      </li>
    );
  }
  return (
    <li className={cls} aria-disabled={state === "locked" || undefined}>
      {inner}
    </li>
  );
}

export function LessonProgress({ step, total, className }: { step: number; total: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e7edf6]"
      >
        <div className="h-full rounded-full bg-green transition-[width] duration-500 ease-out" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <span className="text-[13px] font-extrabold text-ink-2 tabular">
        {step} of {total}
      </span>
    </div>
  );
}

export function QuizOption({
  label,
  selected,
  state,
  onSelect,
}: {
  label: string;
  selected: boolean;
  state: "idle" | "correct" | "incorrect";
  onSelect: () => void;
}) {
  const correct = selected && state === "correct";
  const incorrect = selected && state === "incorrect";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex h-[52px] w-full items-center gap-3 rounded-[14px] border-2 px-4 text-left text-[15px] font-bold transition-[border-color,background-color,transform] duration-200",
        correct
          ? "animate-bloom border-green bg-green-soft text-green-strong"
          : incorrect
            ? "border-[#f2c6a0] bg-[#fff6ee] text-navy"
            : selected
              ? "border-blue bg-blue-soft text-navy"
              : "border-line-soft bg-surface text-navy hover:border-line",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          correct ? "border-green bg-green" : selected ? "border-blue" : "border-[#c5cfdd]",
        )}
      >
        {selected && !correct ? <span className="size-2.5 rounded-full bg-blue" /> : null}
        {correct ? <Check className="size-3 text-white" strokeWidth={4} /> : null}
      </span>
      <span className="flex-1">{label}</span>
      {correct ? (
        <span className="grid size-6 place-items-center rounded-full bg-green text-white" aria-label="Correct">
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <li className="flex flex-col items-center rounded-[18px] px-1 py-2 text-center">
      <BadgeArt badge={achievement.id} earned={achievement.earned} className="size-[68px]" />
      <p className="mt-1.5 text-[13px] font-extrabold leading-tight text-navy-strong">{achievement.title}</p>
      <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-ink-2">{achievement.caption}</p>
      {!achievement.earned ? <span className="sr-only">Not earned yet</span> : null}
    </li>
  );
}

const GOAL_TONES: Record<Goal["tone"], string> = {
  blue: "bg-[#e3eeff]",
  pink: "bg-[#fbe3f0]",
  yellow: "bg-[#fff1cc]",
  aqua: "bg-[#dcf6f1]",
  rose: "bg-[#ffe6ee]",
};

export function GoalCard({ goal, selected, onSelect, className }: { goal: Goal; selected: boolean; onSelect: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center justify-end gap-2 rounded-[20px] border-2 px-3 pb-3.5 pt-4 transition-[border-color,transform] duration-200 active:scale-[0.98]",
        GOAL_TONES[goal.tone],
        selected ? "border-blue" : "border-transparent",
        className,
      )}
    >
      {selected ? (
        <span className="animate-bloom absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-blue text-white">
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : null}
      <GoalArt goal={goal.id} className="h-[70px] w-[100px]" />
      <span className="text-[14px] font-extrabold text-navy-strong">{goal.label}</span>
    </button>
  );
}
