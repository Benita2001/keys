"use client";

import { useCallback, useRef } from "react";

/**
 * Guards side-effecting handlers against double taps and rapid repeat clicks.
 * `disabled` only applies after React re-renders; this ref blocks re-entry
 * synchronously, so one user intent produces at most one side effect.
 */
export function useSingleFlight() {
  const busy = useRef(false);
  return useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
      async (...args: A) => {
        if (busy.current) return;
        busy.current = true;
        try {
          await fn(...args);
        } finally {
          busy.current = false;
        }
      },
    [],
  );
}
