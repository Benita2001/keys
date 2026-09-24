"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/shell";

/** Company detail uses its own bottom CTAs instead of the tab bar (mockup screen 7). */
function hidesTabBar(pathname: string) {
  return /^\/explore\/[^/]+$/.test(pathname);
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <AppShell hideMobileNav={hidesTabBar(pathname)}>{children}</AppShell>;
}
