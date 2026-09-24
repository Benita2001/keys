"use client";

import { Dumbbell, ShieldCheck, Sparkles } from "lucide-react";
import { OnboardingFrame } from "@/components/onboarding";
import { PlantPot } from "@/components/illustrations/objects";
import { ActionButton, IconCircle } from "@/components/ui/primitives";
import { useStore } from "@/state/store";

export default function ReadyStep() {
  const { state } = useStore();
  const rows = [
    { icon: <Sparkles className="size-5" />, tone: "blue" as const, title: "Learn in small steps", body: "Short lessons with real companies." },
    { icon: <Dumbbell className="size-5" />, tone: "green" as const, title: "Practice with virtual money", body: "Try ideas with no real money at risk." },
    { icon: <ShieldCheck className="size-5" />, tone: "lavender" as const, title: "Money Mode, with family limits", body: "A parent sets the limits. Inside them, you decide." },
  ];
  return (
    <OnboardingFrame
      step={4}
      total={4}
      back="/onboarding/interests"
      title={`You're all set, ${state.profile.childName}!`}
      subtitle="Here's how Cresco works."
      footer={
        <ActionButton href="/home" arrow>
          Let&apos;s go
        </ActionButton>
      }
    >
      <PlantPot className="mx-auto size-28 animate-bloom" />
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.title} className="flex items-center gap-3 rounded-[18px] border border-line-soft bg-surface p-3.5">
            <IconCircle tone={r.tone} size={42}>
              {r.icon}
            </IconCircle>
            <div>
              <p className="text-[15px] font-extrabold text-navy-strong">{r.title}</p>
              <p className="text-[13.5px] font-semibold text-ink-2">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </OnboardingFrame>
  );
}
