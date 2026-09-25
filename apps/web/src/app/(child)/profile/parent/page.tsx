"use client";

import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Avatar, ActionButton, Card, PageHeader } from "@/components/ui/primitives";
import { useStore } from "@/state/store";
import { keysBackendConfigured, linkBackendFamily } from "@/services/keys-backend";

export default function ParentConnectPage() {
  const { state, dispatch } = useStore();
  const linked = state.profile.parentLinked;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      if (keysBackendConfigured()) {
        const result = await linkBackendFamily("CRES-4821");
        if (!result.linked) throw new Error("link failed");
      }
      dispatch({ type: "setProfile", profile: { parentLinked: true } });
    } catch {
      setError("We couldn't connect the demo family. Try again.");
    } finally {
      setBusy(false);
    }
  };

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
              <li>Your Practice capital on Solana Devnet, your Key and your requests</li>
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
          <p className="mt-1 text-[12px] font-semibold text-ink-3">
            Family code for the demo. It syncs the child and guardian views through the KEYS backend; it is not identity verification.
          </p>
          {error ? <p className="mt-3 text-[13px] font-bold text-red-600">{error}</p> : null}
          <ActionButton className="mt-5" onClick={connect} disabled={busy}>
            {busy ? "Connecting…" : "Connect demo family"}
          </ActionButton>
        </Card>
      )}
    </div>
  );
}
