"use client";

import { useEffect } from "react";
import { PlantPot } from "@/components/illustrations/objects";
import { ActionButton } from "@/components/ui/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-center px-5 text-center">
      <PlantPot className="size-24" />
      <h1 className="mt-4 text-[26px] font-black text-navy-strong">Something went wrong</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-2">Nothing was bought or sent. You can try again, or reset the demo on this device.</p>
      <div className="mt-6 w-full space-y-3">
        <ActionButton onClick={reset}>Try again</ActionButton>
        <ActionButton
          variant="secondary"
          onClick={() => {
            try {
              window.localStorage.removeItem("cresco-demo-v1");
            } catch {
              /* ignore */
            }
            // A full reload is intended: it drops the in-memory store along with storage.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign("/home");
          }}
        >
          Reset demo data
        </ActionButton>
      </div>
    </main>
  );
}
