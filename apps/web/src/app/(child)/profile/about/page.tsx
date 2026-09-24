"use client";

import { ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/feedback";
import { ActionButton, Card, PageHeader, SectionHeader, Toggle } from "@/components/ui/primitives";
import { getCapabilities } from "@/services";
import { keysApiUrl } from "@/services/keys-backend";
import { useStore } from "@/state/store";

const PROGRAM_ID = "ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk";

export default function AboutPage() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const caps = getCapabilities();
  const flags = state.demoFlags;

  const truths = [
    {
      title: "Prices",
      body:
        caps.marketData === "mock"
          ? "Company prices and charts are samples for learning, not live quotes. Every company maps to a real tokenized stock on Solana, like AAPLx."
          : "Prices are samples, except Tesla, which shows live Pyth market data from the KEYS backend when it's available.",
    },
    {
      title: "Practice",
      body: "Practice uses virtual money. It has no real value and can't be withdrawn.",
    },
    {
      title: "Money Mode",
      body:
        caps.execution === "keys-runtime"
          ? "Money actions run through the KEYS program on Solana devnet using demo tokens. No real money moves and no real shares are bought. Each result says whether it was confirmed on devnet or came from a test server."
          : "Money Mode is a demo. It isn't connected to a bank, broker or custodian, so no real money moves and nothing is bought.",
    },
    {
      title: "Limits",
      body: "Your parent sets your limits. Inside them you can act right away. Only a parent can change them. Lessons, XP and results never do.",
    },
  ];

  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="How Cresco works" back="/profile" />
      <ul className="mt-4 space-y-3">
        {truths.map((t) => (
          <Card as="li" key={t.title} className="p-4">
            <p className="text-[15px] font-extrabold text-navy-strong">{t.title}</p>
            <p className="mt-1 text-[14px] font-semibold text-ink-2">{t.body}</p>
          </Card>
        ))}
      </ul>

      <details className="group mt-5 rounded-[20px] border border-line-soft bg-surface p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[15px] font-extrabold text-navy-strong">
          Technical details
          <ChevronDown aria-hidden className="size-5 text-ink-3 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-3 space-y-2 text-[13px]">
          <Detail k="Authority engine" v="KEYS bounded-autonomy Mandate (contract v0.2, draft)" />
          <Detail k="Backend" v={caps.backend === "none" ? "Not configured, using the local policy preview" : `KEYS API at ${keysApiUrl()}`} />
          <Detail k="Solana program (devnet)" v={PROGRAM_ID} mono />
          <Detail
            k="Money execution from this app"
            v={caps.execution === "keys-runtime" ? "KEYS execute route (devnet demo tokens)" : "Not connected (demo only)"}
          />
          <Detail k="Mandate version" v={`v${state.mandate.version} · nonce ${state.mandate.nonce}`} />
          <Detail k="Proven live market feed" v="Pyth Pro Equity.US.TSLA/USD (server-side only)" />
        </dl>
        <a
          className="mt-3 inline-block text-[13px] font-extrabold text-blue hover:underline"
          href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
        >
          View program on Solana Explorer
        </a>
      </details>

      <section className="mt-6">
        <SectionHeader title="Demo controls" />
        <Card className="divide-y divide-line-soft px-4">
          <ControlRow
            label="Parent connected"
            hint="Turn off to see Money Mode before a parent sets limits."
            checked={state.profile.parentLinked}
            onChange={(v) => dispatch({ type: "setProfile", profile: { parentLinked: v } })}
          />
          <ControlRow
            label="Market data fails"
            hint="Shows the price-data error states."
            checked={flags.marketFailure}
            onChange={(v) => dispatch({ type: "setDemoFlags", flags: { marketFailure: v } })}
          />
          <ControlRow
            label="Slow network"
            hint="Shows loading skeletons for longer."
            checked={flags.slowNetwork}
            onChange={(v) => dispatch({ type: "setDemoFlags", flags: { slowNetwork: v } })}
          />
          <ControlRow
            label="Empty practice portfolio"
            hint="Shows the empty portfolio state."
            checked={flags.emptyPractice}
            onChange={(v) => dispatch({ type: "setDemoFlags", flags: { emptyPractice: v } })}
          />
        </Card>
        <ActionButton
          variant="quiet"
          className="mt-3"
          onClick={() => {
            dispatch({ type: "reset" });
            toast("Demo reset");
          }}
        >
          Reset demo data
        </ActionButton>
      </section>
    </div>
  );
}

function Detail({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-bold text-ink-3">{k}</dt>
      <dd className={`break-all font-extrabold text-navy ${mono ? "font-mono text-[12px]" : ""}`}>{v}</dd>
    </div>
  );
}

function ControlRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-navy-strong">{label}</p>
        <p className="text-[12.5px] font-semibold text-ink-2">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
