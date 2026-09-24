"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingFrame } from "@/components/onboarding";
import { ParentBust } from "@/components/illustrations/people";
import { ActionButton } from "@/components/ui/primitives";
import { auth } from "@/services";
import { useStore } from "@/state/store";

export default function ParentSignIn() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const session = await auth.signInDemo("parent", state.profile.parentName);
    dispatch({ type: "signIn", session });
    router.push("/parent");
  };

  return (
    <OnboardingFrame
      back="/"
      title="Welcome, parent"
      subtitle="You set the limits once. Inside them, your child learns to decide on their own."
      footer={
        <div className="space-y-3">
          <ActionButton onClick={signIn} disabled={busy || !/.+@.+\..+/.test(email)} arrow>
            Continue
          </ActionButton>
          <ActionButton variant="secondary" onClick={signIn} disabled={busy}>
            {busy ? "Opening…" : `Continue as ${state.profile.parentName} (demo)`}
          </ActionButton>
        </div>
      }
    >
      <div className="flex justify-center">
        <ParentBust className="size-24" />
      </div>
      <label className="mt-6 block">
        <span className="text-[14px] font-extrabold text-navy-strong">Parent email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@example.com"
          className="mt-1.5 h-[52px] w-full rounded-[15px] border border-line bg-surface px-4 text-[15px] font-semibold text-navy placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
        />
      </label>
      <p className="mt-3 rounded-[14px] bg-surface-soft px-3.5 py-3 text-[12.5px] font-semibold text-ink-2">
        Demo sign-in: parent accounts, identity checks and family linking aren&apos;t connected yet. Nothing is sent or stored beyond this
        device.
      </p>
    </OnboardingFrame>
  );
}
