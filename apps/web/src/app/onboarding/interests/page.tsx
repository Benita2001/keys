"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingFrame } from "@/components/onboarding";
import { ActionButton, Chip } from "@/components/ui/primitives";
import { INTERESTS } from "@/mocks/family";
import { useStore } from "@/state/store";

export default function InterestsStep() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [picked, setPicked] = useState<string[]>(state.profile.interests);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <OnboardingFrame
      step={3}
      total={4}
      back="/onboarding/goal"
      title="What do you love?"
      subtitle="We'll start you with companies behind things you already use. Pick as many as you like."
      footer={
        <ActionButton
          arrow
          onClick={() => {
            dispatch({ type: "setProfile", profile: { interests: picked } });
            router.push("/onboarding/ready");
          }}
        >
          {picked.length ? "Next" : "Skip for now"}
        </ActionButton>
      }
    >
      <div className="flex flex-wrap justify-center gap-2.5">
        {INTERESTS.map((i) => (
          <Chip key={i.id} selected={picked.includes(i.id)} onClick={() => toggle(i.id)} className="h-12 px-5 text-[15px]">
            {i.label}
          </Chip>
        ))}
      </div>
    </OnboardingFrame>
  );
}
