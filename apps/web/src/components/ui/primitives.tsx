"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, Flame, Search, Star } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { KidBust, ParentBust } from "@/components/illustrations/people";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Buttons                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet" | "success";

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-extrabold transition-[transform,background-color,box-shadow,color] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 select-none";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-blue text-white shadow-button hover:bg-blue-strong",
  secondary: "bg-surface text-blue border-2 border-blue hover:bg-blue-soft",
  ghost: "bg-blue-soft text-blue hover:bg-[#dce9ff]",
  quiet: "bg-surface text-navy border border-line hover:bg-surface-soft",
  success: "bg-green text-white hover:bg-green-strong",
};

const buttonSizes = {
  lg: "h-[52px] px-6 rounded-[15px] text-[15px] w-full",
  md: "h-11 px-5 rounded-[14px] text-[14px]",
  sm: "h-9 px-3.5 rounded-[11px] text-[13px]",
};

type ActionButtonProps = {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  arrow?: boolean;
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"button">, "className" | "children">;

export function ActionButton({ variant = "primary", size = "lg", arrow, href, children, className, ...rest }: ActionButtonProps) {
  const classes = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
  const content = (
    <>
      <span>{children}</span>
      {arrow ? <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.6} /> : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}

export function SecondaryButton(props: ActionButtonProps) {
  return <ActionButton variant="secondary" {...props} />;
}

export function BackButton({ href, label = "Back", className }: { href?: string; label?: string; className?: string }) {
  const router = useRouter();
  const classes = cn(
    "grid size-11 place-items-center rounded-full text-navy hover:bg-white/70 -ml-2",
    className,
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        <ChevronLeft className="size-6" strokeWidth={2.6} />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={() => router.back()} className={classes}>
      <ChevronLeft className="size-6" strokeWidth={2.6} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                             */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  as: Tag = "div",
  ...rest
}: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" } & Record<string, unknown>) {
  return (
    <Tag className={cn("rounded-[20px] border border-line-soft bg-surface", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | true;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start gap-2", className)}>
      {back ? <BackButton href={back === true ? undefined : back} /> : null}
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em] text-navy-strong md:text-[30px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[14px] font-semibold text-ink-2">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

export function SectionHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[18px] font-extrabold leading-tight text-navy-strong">{title}</h2>
      {action}
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("rounded-md text-[13px] font-bold text-blue hover:underline", className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

export function Chip({
  selected,
  children,
  onClick,
  className,
  ...rest
}: { selected?: boolean; children: ReactNode; onClick?: () => void; className?: string } & Omit<ComponentProps<"button">, "onClick" | "className" | "children">) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-[11px] px-3.5 text-[13px] font-bold transition-colors duration-150",
        selected ? "bg-blue text-white" : "bg-surface text-ink-2 border border-line-soft hover:text-navy",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PeriodSelector<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex items-center justify-between gap-1 rounded-[14px] bg-surface-soft p-1", className)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={cn(
            "h-8 flex-1 rounded-[10px] text-[12.5px] font-extrabold transition-colors duration-150",
            o === value ? "bg-blue text-white shadow-[0_3px_8px_rgba(23,105,246,0.3)]" : "text-ink-2 hover:text-navy",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="flex h-12 items-center gap-2.5 rounded-[15px] border border-line-soft bg-surface px-4 focus-within:border-blue focus-within:ring-2 focus-within:ring-blue/20">
      <Search aria-hidden className="size-[18px] text-ink-3" strokeWidth={2.4} />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-navy placeholder:text-ink-3 focus:outline-none"
      />
    </label>
  );
}

export function ProgressBar({
  value,
  tone = "blue",
  className,
  label,
  height = 8,
}: {
  value: number;
  tone?: "blue" | "green" | "yellow" | "white";
  className?: string;
  label?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = {
    blue: "bg-blue",
    green: "bg-green",
    yellow: "bg-gradient-to-r from-yellow to-orange",
    white: "bg-white",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("w-full overflow-hidden rounded-full", tone === "white" ? "bg-white/30" : "bg-[#e7edf6]", className)}
      style={{ height }}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-blue" : "bg-[#d5dde9]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] duration-200",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Identity + rewards                                                   */
/* ------------------------------------------------------------------ */

export function Avatar({ who = "child", size = 48, className, label }: { who?: "child" | "parent"; size?: number; className?: string; label?: string }) {
  const Art = who === "child" ? KidBust : ParentBust;
  return (
    <span className={cn("inline-block shrink-0 rounded-full ring-2 ring-white", className)} style={{ width: size, height: size }}>
      <Art className="size-full" title={label} />
    </span>
  );
}

export function XPBadge({ xp, className }: { xp: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] font-extrabold text-orange tabular", className)}>
      <Star aria-hidden className="size-3.5 fill-yellow text-yellow" />+{xp} XP
    </span>
  );
}

export function StreakBadge({ days, className }: { days: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1.5 rounded-[16px] border border-line-soft bg-surface px-3 py-2", className)}
      aria-label={`${days}-day learning streak`}
    >
      <Flame aria-hidden className="size-6 fill-orange text-[#ff5a2e]" />
      <div className="leading-none">
        <div className="text-[18px] font-extrabold text-navy-strong tabular">{days}</div>
        <div className="mt-0.5 text-[10.5px] font-bold text-ink-2">day streak</div>
      </div>
    </div>
  );
}

export function IconCircle({
  tone,
  children,
  size = 44,
  className,
}: {
  tone: "blue" | "green" | "orange" | "lavender" | "aqua" | "pink" | "yellow" | "loss" | "navy";
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  const tones = {
    blue: "bg-blue-soft text-blue",
    green: "bg-green-soft text-green-strong",
    orange: "bg-[#fff0e6] text-orange",
    lavender: "bg-lavender-soft text-lavender",
    aqua: "bg-aqua-soft text-[#1ea79c]",
    pink: "bg-pink-soft text-[#e44f86]",
    yellow: "bg-yellow-soft text-warning",
    loss: "bg-loss-soft text-loss",
    navy: "bg-[#e8edf7] text-navy",
  };
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", tones[tone], className)} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}
