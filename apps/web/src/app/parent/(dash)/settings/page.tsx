"use client";

import Link from "next/link";
import { Card, Chip, PageHeader, SectionHeader, Toggle } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { useStore } from "@/state/store";

export default function ParentSettingsPage() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const set = (settings: Partial<typeof s>) => dispatch({ type: "setSettings", settings });
  const child = state.profile.childName;

  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="Settings" back="/parent" />

      <section id="learning" className="mt-6 scroll-mt-24">
        <SectionHeader title="Learning goals" />
        <Card className="p-4">
          <p className="text-[14px] font-bold text-navy">Lessons per week</p>
          <div className="mt-2 flex gap-2">
            {[3, 5, 7].map((n) => (
              <Chip key={n} selected={s.weeklyLessonGoal === n} onClick={() => set({ weeklyLessonGoal: n })} className="h-11 flex-1">
                {n}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] font-semibold text-ink-2">Goals shape reminders only. They never change {child}&apos;s Money limits.</p>
        </Card>
      </section>

      <section id="notifications" className="mt-6 scroll-mt-24">
        <SectionHeader title="Notifications" />
        <Card className="divide-y divide-line-soft px-4">
          <Row label="Requests for more room" checked={s.notifyBoundaryRequests} onChange={(v) => set({ notifyBoundaryRequests: v })} />
          <Row label="Weekly summary" checked={s.notifyWeeklySummary} onChange={(v) => set({ notifyWeeklySummary: v })} />
          <Row label="Each finished lesson" checked={s.notifyLessons} onChange={(v) => set({ notifyLessons: v })} />
        </Card>
        <p className="mt-2 px-1 text-[12.5px] font-semibold text-ink-3">
          Cresco doesn&apos;t notify you about actions inside {child}&apos;s limits. Notification delivery isn&apos;t connected in this demo.
        </p>
      </section>

      <section id="allowance" className="mt-6 scroll-mt-24">
        <SectionHeader title="Allowance" />
        <Card className="p-4">
          <p className="text-[14px] font-bold text-navy">Monthly allowance to Money Mode</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 10, 20, 50].map((n) => (
              <Chip key={n} selected={s.allowanceAmount === n} onClick={() => set({ allowanceAmount: n })} className="h-11 px-4">
                {n === 0 ? "Off" : formatAmount(n)}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] font-semibold text-ink-2">
            Saved as a preference. Recurring funding needs a payment provider, which isn&apos;t connected yet. Spending limits live in{" "}
            <Link href="/parent/limits" className="font-extrabold text-blue">
              Limits
            </Link>
            .
          </p>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[14px] font-bold text-navy">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
