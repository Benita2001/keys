"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartPie, Compass, House, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/state/store";
import { CrescoMark } from "./illustrations/objects";
import { OfflineState } from "./ui/feedback";
import { Avatar, cn } from "./ui/primitives";

type NavItem = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: House, match: (p) => p === "/home" },
  { href: "/learn", label: "Learn", icon: BookOpen, match: (p) => p.startsWith("/learn") || p.startsWith("/lesson") },
  { href: "/explore", label: "Explore", icon: Compass, match: (p) => p.startsWith("/explore") || p.startsWith("/invest") },
  { href: "/portfolio", label: "Portfolio", icon: ChartPie, match: (p) => p.startsWith("/portfolio") },
  { href: "/profile", label: "Profile", icon: UserRound, match: (p) => p.startsWith("/profile") },
];

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "size-7", md: "size-8", lg: "size-11" }[size];
  const text = { sm: "text-[20px]", md: "text-[23px]", lg: "text-[32px]" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CrescoMark className={dims} />
      <span className={cn("font-black tracking-[-0.02em] text-navy-strong", text)}>Cresco</span>
    </span>
  );
}

export function MobileBottomNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-[var(--nav-height)] max-w-[520px] grid-cols-5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors duration-150",
                  active ? "text-blue" : "text-ink-3 hover:text-navy",
                )}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.6 : 2.1} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNavigation() {
  const pathname = usePathname();
  const { state } = useStore();
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line-soft bg-surface px-3 py-6 md:flex md:w-[92px] lg:w-[248px] lg:px-5">
      <Link href="/home" className="mb-8 flex justify-center lg:justify-start" aria-label="Cresco home">
        <span className="lg:hidden">
          <CrescoMark className="size-9" />
        </span>
        <span className="hidden lg:block">
          <Wordmark />
        </span>
      </Link>
      <nav aria-label="Main">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[14px] px-2 py-2.5 text-[11.5px] font-extrabold transition-colors duration-150 lg:flex-row lg:gap-3 lg:px-3.5 lg:text-[15px]",
                    active ? "bg-blue-soft text-blue" : "text-ink-2 hover:bg-surface-soft hover:text-navy",
                  )}
                >
                  <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.6 : 2.1} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto hidden items-center gap-3 rounded-[16px] bg-surface-soft p-3 lg:flex">
        <Avatar size={40} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-navy-strong">{state.profile.childName}</p>
          <p className="text-[12px] font-bold text-ink-2">{state.mode === "practice" ? "Practice mode" : "Money mode"}</p>
        </div>
      </div>
    </aside>
  );
}

/** Child app shell: bottom nav on phones, side rail from 768px. */
export function AppShell({ children, hideMobileNav }: { children: ReactNode; hideMobileNav?: boolean }) {
  return (
    <div className="flex min-h-dvh">
      <DesktopNavigation />
      <div className="min-w-0 flex-1">
        <main id="main" className={cn("mx-auto w-full max-w-[1120px] px-5 pt-5 md:px-8 md:pt-8 lg:px-10", hideMobileNav ? "pb-10" : "pb-nav")}>
          <OfflineState />
          {children}
        </main>
      </div>
      {hideMobileNav ? null : <MobileBottomNavigation />}
    </div>
  );
}
