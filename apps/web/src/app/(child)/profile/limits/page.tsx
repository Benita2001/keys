"use client";

import { CompanyLogo } from "@/components/finance";
import { MandateSummaryCard, MoneyModeUnavailable, RequestStatusCard } from "@/components/mode";
import { DemoMoneyTag } from "@/components/ui/feedback";
import { Card, PageHeader, SectionHeader } from "@/components/ui/primitives";
import { allAssetSnapshots } from "@/services";
import { useStore } from "@/state/store";

export default function MyLimitsPage() {
  const { state } = useStore();
  const { mandate } = state;
  const assets = allAssetSnapshots();
  const allowed = assets.filter((a) => mandate.allowedAssets.includes(a.ticker));
  const nameOf = (t: string) => assets.find((a) => a.ticker === t)?.companyName ?? t;

  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="My limits" subtitle={`Set by ${state.profile.parentName}. Inside them, you decide.`} back="/profile" />
      <div className="mt-4">
        {!state.profile.parentLinked ? (
          <MoneyModeUnavailable reason="parent" />
        ) : (
          <>
            <MandateSummaryCard mandate={mandate} who="Money Mode" />
            <Card className="mt-4 p-4">
              <p className="text-[15px] font-extrabold text-navy-strong">How it works</p>
              <ul className="mt-2 space-y-2 text-[14px] font-semibold text-ink-2">
                <li>Inside your limits, you can invest right away. No need to ask.</li>
                <li>If something is outside them, you&apos;ll see why, and you can adjust, practice, or ask for more room.</li>
                <li>Only {state.profile.parentName} can change your limits. Lessons, XP and results never change them on their own.</li>
              </ul>
              <DemoMoneyTag className="mt-3" />
            </Card>

            <section className="mt-5">
              <SectionHeader title="Companies in Money Mode" />
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {allowed.map((a) => (
                  <li key={a.ticker} className="flex items-center gap-2 rounded-[14px] border border-line-soft bg-surface p-2.5">
                    <CompanyLogo asset={a} size={30} className="rounded-[10px]" />
                    <span className="truncate text-[13.5px] font-bold text-navy">{a.companyName}</span>
                  </li>
                ))}
              </ul>
            </section>

            {state.requests.length ? (
              <section className="mt-5">
                <SectionHeader title="My requests" />
                <div className="space-y-2">
                  {state.requests.map((r) => (
                    <RequestStatusCard key={r.id} request={r} companyName={nameOf(r.asset)} />
                  ))}
                </div>
              </section>
            ) : null}

            <p className="mt-5 rounded-[16px] bg-blue-soft px-4 py-3 text-[13.5px] font-semibold text-blue-strong">
              Finished a few lessons? You can ask {state.profile.parentName} to review your limits together.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
