"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingFrame } from "@/components/onboarding";
import { ActionButton, Chip } from "@/components/ui/primitives";
import { useStore } from "@/state/store";

const AGES = [10, 11, 12, 13, 14, 15];

export default function AboutStep() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [name, setName] = useState(state.profile.childName);
  const [age, setAge] = useState<number | null>(state.profile.age);

  return (
    <OnboardingFrame
      step={1}
      total={4}
      back="/start"
      title="What should we call you?"
      subtitle="We use this to personalize your lessons. Only your family sees it."
      footer={
        <ActionButton
          arrow
          disabled={!name.trim() || age == null}
          onClick={() => {
            dispatch({ type: "setProfile", profile: { childName: name.trim(), age } });
            router.push("/onboarding/goal");
          }}
        >
          Next
        </ActionButton>
      }
    >
      <label className="block">
        <span className="text-[14px] font-extrabold text-navy-strong">First name</span>
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
          className="mt-1.5 h-[52px] w-full rounded-[15px] border border-line bg-surface px-4 text-[16px] font-bold text-navy focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
        />
      </label>
      <fieldset className="mt-6">
        <legend className="text-[14px] font-extrabold text-navy-strong">How old are you?</legend>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {AGES.map((a) => (
            <Chip key={a} selected={age === a} onClick={() => setAge(a)} className="h-12 px-0 text-[15px]">
              {a}
            </Chip>
          ))}
        </div>
      </fieldset>
    </OnboardingFrame>
  );
}
