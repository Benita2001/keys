"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoalCard } from "@/components/learning";
import { OnboardingFrame } from "@/components/onboarding";
import { ActionButton } from "@/components/ui/primitives";
import type { GoalId } from "@/domain/types";
import { GOALS } from "@/mocks/family";
import { useStore } from "@/state/store";

export default function GoalStep() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [goal, setGoal] = useState<GoalId>(state.profile.goalId);
  const grid = GOALS.slice(0, 4);
  const last = GOALS[4];

  return (
    <OnboardingFrame
      step={2}
      total={4}
      back="/onboarding/about"
      title="What are you saving for?"
      subtitle="Choose a goal to personalize your learning journey."
      footer={
        <ActionButton
          arrow
          onClick={() => {
            dispatch({ type: "setProfile", profile: { goalId: goal } });
            router.push("/onboarding/interests");
          }}
        >
          Next
        </ActionButton>
      }
    >
      <div role="radiogroup" aria-label="Saving goal" className="grid grid-cols-2 gap-3">
        {grid.map((g) => (
          <GoalCard key={g.id} goal={g} selected={goal === g.id} onSelect={() => setGoal(g.id)} className="h-[150px]" />
        ))}
        <GoalCard goal={last} selected={goal === last.id} onSelect={() => setGoal(last.id)} className="col-span-2 mx-auto h-[150px] w-[calc(50%-6px)]" />
      </div>
    </OnboardingFrame>
  );
}
