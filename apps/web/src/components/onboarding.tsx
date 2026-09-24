"use client";

import type { ReactNode } from "react";
import { BackButton } from "./ui/primitives";

/** Shared frame for entry + onboarding steps: back, progress, title, content, sticky action. */
export function OnboardingFrame({
  step,
  total,
  back,
  title,
  subtitle,
  children,
  footer,
}: {
  step?: number;
  total?: number;
  back?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 md:pt-10">
      <div className="flex items-center gap-2">
        <BackButton href={back} />
        {step && total ? (
          <>
            <div
              role="progressbar"
              aria-label="Setup progress"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={step}
              className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7edf6]"
            >
              <div className="h-full rounded-full bg-blue transition-[width] duration-500" style={{ width: `${(step / total) * 100}%` }} />
            </div>
            <span className="w-12 text-right text-[12.5px] font-extrabold text-ink-3 tabular">
              {step} of {total}
            </span>
          </>
        ) : null}
      </div>
      <div className="mt-6 text-center">
        <h1 className="text-[28px] font-black leading-[1.12] tracking-[-0.015em] text-navy-strong">{title}</h1>
        {subtitle ? <p className="mx-auto mt-2 max-w-[32ch] text-[14.5px] font-semibold text-ink-2">{subtitle}</p> : null}
      </div>
      <div className="mt-6 flex-1 md:flex-none">{children}</div>
      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-bg via-bg to-bg/0 pt-3 md:static md:mt-8">{footer}</div>
    </main>
  );
}
