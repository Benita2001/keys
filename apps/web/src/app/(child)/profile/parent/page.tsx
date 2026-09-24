"use client";

import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Avatar, ActionButton, Card, PageHeader } from "@/components/ui/primitives";
import { useStore } from "@/state/store";

export default function ParentConnectPage() {
  const { state, dispatch } = useStore();
  const linked = state.profile.parentLinked;
  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="Parent or guardian" back="/profile" />
      {linked ? (
        <>
          <Card className="mt-4 flex items-center gap-3 p-4">
            <Avatar who="parent" size={52} />
            <div className="flex-1">
              <p className="text-[17px] font-extrabold text-navy-strong">{state.profile.parentName}</p>
              <p className="flex items-center gap-1 text-[13px] font-bold text-green-strong">
                <CheckCircle2 aria-hidden className="size-4" /> Connected
              </p>
            </div>
          </Card>
          <Card className="mt-4 p-4">
            <p className="flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">
              <Eye aria-hidden className="size-4 text-blue" /> {state.profile.parentName} can see
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] font-semibold text-ink-2">
              <li>Your learning progress and streak</li>
              <li>Your Money Mode balance, limits and requests</li>
              <li>A weekly summary</li>
            </ul>
            <p className="mt-4 flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">
              <EyeOff aria-hidden className="size-4 text-ink-3" /> Not a feed of every tap
            </p>
            <p className="mt-1 text-[14px] font-semibold text-ink-2">
              {state.profile.parentName} sets the boundary. Inside it, your choices are yours.
            </p>
          </Card>
        </>
      ) : (
        <Card className="mt-4 p-5 text-center">
          <p className="text-[15px] font-semibold text-ink-2">Show this code to your parent or guardian. They enter it in the parent view.</p>
          <p className="mt-3 text-[32px] font-black tracking-[0.15em] text-navy-strong">CRES-4821</p>
          <p className="mt-1 text-[12px] font-semibold text-ink-3">Demo code. Family linking isn&apos;t connected to a real account service yet.</p>
          <ActionButton className="mt-5" onClick={() => dispatch({ type: "setProfile", profile: { parentLinked: true } })}>
            Simulate parent connecting
          </ActionButton>
        </Card>
      )}
    </div>
  );
}
