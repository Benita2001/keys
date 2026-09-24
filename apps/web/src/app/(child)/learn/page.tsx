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
  const complete = modules.filter((m) => m.state === "complete").length;

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
            {complete}/{MODULES.length} modules
          </span>
        </div>
        <ProgressBar value={complete / MODULES.length} tone="green" className="mt-2" label="Modules completed" />
      </div>

      <ol className="mt-4 space-y-3" aria-label="Modules">
        {MODULES.map((m) => {
          const s = modules.find((x) => x.id === m.id)!;
          return <ModuleRow key={m.id} module={m} state={s.state} href={s.state === "locked" ? undefined : hrefFor(m.id)} />;
        })}
      </ol>

      <div className="mt-5">
        <InsightBanner tone="blue">
          Learning helps you understand what you&apos;re doing. It doesn&apos;t change your Money Mode limits. Those are a family decision.
        </InsightBanner>
      </div>
    </div>
  );
}
