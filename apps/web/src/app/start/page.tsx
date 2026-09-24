"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingFrame } from "@/components/onboarding";
import { KidBust } from "@/components/illustrations/people";
import { ActionButton } from "@/components/ui/primitives";
import { auth } from "@/services";
import { useStore } from "@/state/store";

export default function StartPage() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"email" | "demo" | null>(null);

  const go = async (kind: "email" | "demo") => {
    setBusy(kind);
    const session = await auth.signInDemo("child", state.profile.childName);
    dispatch({ type: "signIn", session });
    router.push(kind === "demo" ? "/home" : "/onboarding/about");
  };

  return (
    <OnboardingFrame
      back="/"
      title="Let's get you started"
      subtitle="Learning comes first. You won't need a wallet or any money to begin."
      footer={
        <div className="space-y-3">
          <ActionButton onClick={() => go("email")} disabled={busy !== null || !/.+@.+\..+/.test(email)} arrow>
            {busy === "email" ? "Setting up…" : "Continue"}
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => go("demo")} disabled={busy !== null}>
            {busy === "demo" ? "Opening demo…" : `Try the demo as ${state.profile.childName}`}
          </ActionButton>
        </div>
      }
    >
      <div className="flex justify-center">
        <KidBust className="size-24" />
      </div>
      <label className="mt-6 block">
        <span className="text-[14px] font-extrabold text-navy-strong">Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 h-[52px] w-full rounded-[15px] border border-line bg-surface px-4 text-[15px] font-semibold text-navy placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
        />
      </label>
      <p className="mt-3 rounded-[14px] bg-surface-soft px-3.5 py-3 text-[12.5px] font-semibold text-ink-2">
        Demo sign-in: Cresco doesn&apos;t create an account or send email yet. Your progress is saved on this device only.
      </p>
    </OnboardingFrame>
  );
}
