"use client";

import { CheckCircle2, CloudOff, Info, RefreshCw, WifiOff } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { DataStatus } from "@/domain/types";
import { ActionButton, cn } from "./primitives";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-[12px]", className)} />;
}

export function EmptyState({
  art,
  title,
  body,
  action,
  className,
}: {
  art?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[20px] border border-dashed border-line bg-surface px-6 py-8 text-center", className)}>
      {art ? <div className="mb-3">{art}</div> : null}
      <p className="text-[16px] font-extrabold text-navy-strong">{title}</p>
      {body ? <p className="mt-1 max-w-[30ch] text-[14px] font-semibold text-ink-2">{body}</p> : null}
      {action ? <div className="mt-4 w-full max-w-[260px]">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Price data is taking a little longer to load.",
  body = "Nothing is lost. Try again in a moment.",
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-[20px] border border-line-soft bg-surface p-4", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-yellow-soft text-warning">
        <CloudOff aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-extrabold text-navy-strong">{title}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink-2">{body}</p>
        {onRetry ? (
          <ActionButton variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw aria-hidden className="size-3.5" /> Try again
            </span>
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
}

export function OfflineState() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-[14px] bg-navy px-4 py-2.5 text-[13px] font-bold text-white">
      <WifiOff aria-hidden className="size-4" /> You&apos;re offline. We&apos;ll catch up when you&apos;re back.
    </div>
  );
}

/**
 * Truth label for prices. Mock prices must never look live.
 */
export function DataStatusTag({ status, className }: { status: DataStatus; className?: string }) {
  const map = {
    mock: { text: "Sample prices", cls: "bg-surface-soft text-ink-2 border border-line-soft" },
    live: { text: "Live · Pyth", cls: "bg-green-soft text-green-strong" },
    stale: { text: "Delayed", cls: "bg-yellow-soft text-warning" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", map.cls, className)}>
      {status === "live" ? <span aria-hidden className="size-1.5 rounded-full bg-green" /> : <Info aria-hidden className="size-3" />}
      {map.text}
    </span>
  );
}

/** Truth label for Money Mode while no real funding/custody is integrated. */
export function DemoMoneyTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-yellow-soft px-2 py-0.5 text-[11px] font-extrabold text-[#8a5406]", className)}>
      <Info aria-hidden className="size-3" /> Demo money
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                                */
/* ------------------------------------------------------------------ */

type ToastItem = { id: number; text: string };
const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);
  const push = useCallback((text: string) => {
    const id = ++next.current;
    setItems((prev) => [...prev, { id, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className="animate-rise flex max-w-sm items-center gap-2 rounded-[14px] bg-navy-strong px-4 py-3 text-[14px] font-bold text-white shadow-card">
            <CheckCircle2 aria-hidden className="size-4 text-[#7be49f]" />
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
