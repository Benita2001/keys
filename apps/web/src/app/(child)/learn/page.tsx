"use client";

import { ModuleRow } from "@/components/learning";
import { Skyline } from "@/components/illustrations/objects";
import { InsightBanner } from "@/components/finance";
import { PageHeader, ProgressBar } from "@/components/ui/primitives";
import { useModuleStates } from "@/hooks/data";
import { MODULES } from "@/mocks/learning";
import { useStore } from "@/state/store";

export default function LearnPage() {
  const { state } = useStore();
  const modules = useModuleStates();
  const core = MODULES.filter((m) => m.track !== "explore");
  const explore = MODULES.filter((m) => m.track === "explore");
  const complete = modules.filter((m) => m.state === "complete" && core.some((c) => c.id === m.id)).length;

  const hrefFor = (moduleId: string) => {
    const mod = MODULES.find((m) => m.id === moduleId)!;
    const next = mod.lessonIds.find((id) => !state.completedLessons.includes(id)) ?? mod.lessonIds[0];
    return `/lesson/${next}`;
  };

  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <div className="flex items-end justify-between gap-3">
        <PageHeader title="Learn Investing" />
        <Skyline className="h-12 w-[104px] shrink-0 md:w-[180px]" />
      </div>
      <div className="mt-4 rounded-[18px] border border-line-soft bg-surface p-4">
        <div className="flex items-center justify-between text-[13px] font-extrabold">
          <span className="text-navy-strong">Your Progress</span>
          <span className="text-ink-2 tabular">
            {complete}/{core.length} modules
          </span>
        </div>
        <ProgressBar value={complete / core.length} tone="green" className="mt-2" label="Modules completed" />
      </div>

      <div className="mt-4 rounded-[18px] border border-blue/15 bg-blue-soft p-4">
        <p className="text-[13px] font-black text-blue-strong">Source-backed · applied</p>
        <p className="mt-1 text-[13.5px] font-semibold leading-relaxed text-navy">
          Core investing lessons show the official source behind important claims, when it was checked, and a Practice or Explore action so you can apply the idea immediately.
        </p>
        <p className="mt-2 text-[12px] font-bold text-ink-3">Education, not personalized investment advice · learning never changes your Key.</p>
      </div>

      <ol className="mt-4 space-y-3" aria-label="Modules">
        {core.map((m) => {
          const s = modules.find((x) => x.id === m.id)!;
          return <ModuleRow key={m.id} module={m} state={s.state} href={s.state === "locked" ? undefined : hrefFor(m.id)} />;
        })}
      </ol>

      <h2 className="mt-7 text-[18px] font-extrabold text-navy-strong">Explore more</h2>
      <p className="mt-1 text-[13px] font-semibold text-ink-2">Open anytime. These don&apos;t unlock anything in Money Mode.</p>
      <ul className="mt-3 space-y-3" aria-label="Explore modules">
        {explore.map((m) => {
          const s = modules.find((x) => x.id === m.id)!;
          return <ModuleRow key={m.id} module={m} state={s.state} href={hrefFor(m.id)} />;
        })}
      </ul>

      <div className="mt-5">
        <InsightBanner tone="blue">
          Learning helps you understand what you&apos;re doing. It doesn&apos;t change your Money Mode limits. Those are a family decision.
        </InsightBanner>
      </div>
    </div>
  );
}
