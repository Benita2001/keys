"use client";

import { ArrowRight, ExternalLink, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LessonIllustration } from "@/components/illustrations/scenes";
import { LessonProgress, ModuleIcon, QuizOption } from "@/components/learning";
import { ActionButton, BackButton, XPBadge } from "@/components/ui/primitives";
import { useModuleStates } from "@/hooks/data";
import { lessonById, moduleById } from "@/mocks/learning";
import { useStore } from "@/state/store";
import {
  keysBackendConfigured,
  persistLearningProgress,
} from "@/services/keys-backend";

export function LessonPlayer({ lessonId }: { lessonId: string }) {
  const lesson = lessonById(lessonId)!;
  const mod = moduleById(lesson.moduleId)!;
  const { state, dispatch, refresh } = useStore();
  const modules = useModuleStates();
  const locked = modules.find((m) => m.id === mod.id)?.state === "locked";

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<"idle" | "correct" | "incorrect">("idle");
  const [done, setDone] = useState(false);

  const step = lesson.steps[index];
  const isLast = index === lesson.steps.length - 1;
  const alreadyDone = state.completedLessons.includes(lesson.id);

  const advance = () => {
    if (isLast) {
      dispatch({ type: "completeLesson", lessonId: lesson.id, xp: lesson.xp });
      if (keysBackendConfigured()) {
        void persistLearningProgress({
          lessonId: lesson.id,
          xp: alreadyDone ? 0 : lesson.xp,
          minutes: lesson.minutes,
        })
          // Learning never changes authority; this only refreshes XP/streak everywhere.
          .then(() => refresh())
          .catch(() => {
          // The lesson remains usable offline; backend sync can recover later.
        });
      }
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked("idle");
  };

  if (locked && !alreadyDone) {
    return (
      <Shell>
        <div className="mt-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-soft text-ink-3">
            <Lock className="size-6" />
          </span>
          <h1 className="mt-4 text-[24px] font-black text-navy-strong">{mod.title} is up next</h1>
          <p className="mx-auto mt-2 max-w-[30ch] text-[15px] font-semibold text-ink-2">Finish the module before it to unlock this one.</p>
          <ActionButton href="/learn" className="mx-auto mt-6 max-w-[280px]">
            Back to Learn
          </ActionButton>
        </div>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="animate-bloom relative">
            <ModuleIcon module={mod} size={96} />
            <Sparkles aria-hidden className="absolute -right-3 -top-2 size-7 text-yellow" />
          </div>
          <h1 className="mt-6 text-[28px] font-black text-navy-strong">Lesson complete!</h1>
          <p className="mt-1 text-[15px] font-semibold text-ink-2">{lesson.title}</p>
          <XPBadge xp={alreadyDone ? 0 : lesson.xp} className="mt-3 rounded-full bg-yellow-soft px-3 py-1.5 text-[15px]" />
          <div className="mt-6 w-full rounded-[18px] border border-line-soft bg-surface p-4 text-left">
            <p className="text-[14px] font-extrabold text-navy-strong">Put it into practice</p>
            <p className="mt-1 text-[13.5px] font-semibold text-ink-2">
              Try a small practice investment in a company you know. Want more room in your Key someday? That&apos;s a
              conversation with {state.profile.parentName}. Lessons don&apos;t change your limits on their own.
            </p>
          </div>
          <div className="mt-6 w-full space-y-3">
            <ActionButton href="/explore" arrow>
              Explore companies
            </ActionButton>
            <ActionButton href="/learn" variant="secondary">
              Back to Learn
            </ActionButton>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-2">
        <BackButton href="/learn" label="Leave lesson" />
        <LessonProgress step={index + 1} total={lesson.steps.length} className="flex-1" />
      </div>

      <h1 className="mt-5 text-[28px] font-black leading-tight tracking-[-0.01em] text-navy-strong">{step.title}</h1>

      <div key={index} className="animate-rise">
        <div className="mt-4 overflow-hidden rounded-[22px] border border-line-soft">
          <LessonIllustration
            kind={step.illustration}
            caption={step.kind === "concept" ? step.caption : step.illustration === "pizza" ? "1/100" : undefined}
            className="block w-full"
            title={step.kind === "concept" ? step.body : step.prompt}
          />
        </div>

        {step.kind === "concept" ? (
          <>
            <p className="mt-5 text-[17px] font-semibold leading-relaxed text-navy">{step.body}</p>
            {step.realityCheck ? (
              <div className="mt-4 rounded-[18px] border border-blue/15 bg-blue-soft px-4 py-3.5">
                <p className="text-[12px] font-black uppercase tracking-[0.08em] text-blue-strong">Reality check</p>
                <p className="mt-1.5 text-[13.5px] font-semibold leading-relaxed text-navy">{step.realityCheck}</p>
                {step.source ? (
                  <>
                    <a href={step.source.url} target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-blue hover:underline">
                      {step.source.organization} · {step.source.title}
                      <ExternalLink aria-hidden className="size-3.5" />
                      <span className="sr-only">opens in a new tab</span>
                    </a>
                    <p className="mt-1 text-[11.5px] font-bold text-ink-3">Checked <time dateTime={step.source.verifiedAt}>{step.source.verifiedAt}</time></p>
                  </>
                ) : null}
              </div>
            ) : null}
            {step.apply ? (
              <Link href={step.apply.href} className="mt-4 flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface p-4 transition-transform active:scale-[0.99]">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black uppercase tracking-[0.08em] text-green-strong">Try it in Cresco</p>
                  <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-ink-2">{step.apply.body}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-extrabold text-blue">{step.apply.label}<ArrowRight aria-hidden className="size-4" /></span>
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-4 text-[15px] font-semibold leading-relaxed text-ink-2">{step.prompt}</p>
            <div className="mt-4 rounded-[20px] border border-line-soft bg-surface p-4">
              <p id="quiz-q" className="text-[16px] font-extrabold leading-snug text-navy-strong">
                {step.question}
              </p>
              <div role="radiogroup" aria-labelledby="quiz-q" className="mt-3 space-y-2.5">
                {step.options.map((o) => (
                  <QuizOption
                    key={o.id}
                    label={o.label}
                    selected={selected === o.id}
                    state={selected === o.id ? checked : "idle"}
                    onSelect={() => {
                      if (checked === "correct") return;
                      setSelected(o.id);
                      setChecked("idle");
                    }}
                  />
                ))}
              </div>
              <div aria-live="polite">
                {checked === "correct" ? (
                  <p className="animate-rise mt-3 rounded-[12px] bg-green-soft px-3 py-2.5 text-[14px] font-bold text-green-strong">
                    {step.correctExplanation}
                  </p>
                ) : checked === "incorrect" ? (
                  <p className="animate-rise mt-3 rounded-[12px] bg-[#fff6ee] px-3 py-2.5 text-[14px] font-semibold text-navy">
                    <span className="font-extrabold">Not quite. </span>
                    {step.retryHint}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-bg via-bg to-bg/0 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5">
        {step.kind === "concept" ? (
          <ActionButton onClick={advance} arrow>
            {isLast ? "Finish lesson" : "Continue"}
          </ActionButton>
        ) : checked === "correct" ? (
          <ActionButton onClick={advance} arrow>
            {isLast ? "Finish lesson" : "Next Question"}
          </ActionButton>
        ) : (
          <ActionButton
            disabled={!selected}
            onClick={() => setChecked(selected === step.correctId ? "correct" : "incorrect")}
          >
            {checked === "incorrect" ? "Check again" : "Check answer"}
          </ActionButton>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pt-4 md:pt-8">
      {children}
    </main>
  );
}
