"use client";

import { CompanyLogo } from "@/components/finance";
import { KeyUnavailable, MandateSummaryCard, RequestStatusCard } from "@/components/mode";
import { NetworkTag, Provenance } from "@/components/ui/feedback";
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
      <PageHeader title="My Key" subtitle={`Practice Key v${mandate.version} on Solana Devnet · set with ${state.profile.parentName}. Inside it, you decide.`} back="/profile" />
      <div className="mt-4">
        {!state.profile.parentLinked ? (
          <KeyUnavailable reason="parent" />
        ) : (
          <>
            <MandateSummaryCard mandate={mandate} who="Practice Key" />
            <Card className="mt-4 p-4">
              <p className="text-[15px] font-extrabold text-navy-strong">How your freedom works</p>
              <ul className="mt-2 space-y-2 text-[14px] font-semibold text-ink-2">
                <li><strong>Inside:</strong> act right away. No parent approval is needed.</li>
                <li><strong>At the boundary:</strong> adjust, practice, or ask for more room.</li>
                <li><strong>Learning never mints permission:</strong> lessons, scores and results can inform a conversation, but only {state.profile.parentName} can create a wider standing Key.</li>
              </ul>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-ink-3">
                <NetworkTag mode="practice" /> <Provenance kind="no-real-value" /> Enforced on-chain by the KEYS program.
              </p>
              <p className="mt-2 text-[12.5px] font-semibold text-ink-3">
                Money on Solana Mainnet will get its own Key, set by {state.profile.parentName}, once Money Mode is verified.
              </p>
            </Card>
            <Card className="mt-4 p-4">
              <p className="text-[15px] font-extrabold text-navy-strong">How independence grows</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] font-semibold">
                <div className="rounded-[14px] bg-green-soft p-3 text-green-strong">
                  <p className="font-extrabold">Allow once</p>
                  <p className="mt-1">One boundary crossing. Key v{mandate.version} stays the same.</p>
                </div>
                <div className="rounded-[14px] bg-blue-soft p-3 text-blue-strong">
                  <p className="font-extrabold">Widen the Key</p>
                  <p className="mt-1">A guardian creates Key v{mandate.version + 1} with more standing room.</p>
                </div>
              </div>
            </Card>

            <section className="mt-5">
              <SectionHeader title="Companies in your Practice Key" />
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
              Need a different boundary? Ask when you reach it. Learning and performance can improve the conversation, but they never change your Key automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
