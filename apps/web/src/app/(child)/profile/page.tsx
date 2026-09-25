"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Info, LogOut, ShieldCheck, Target, Trophy, UserRound, Users } from "lucide-react";
import { Avatar, Card, IconCircle, PageHeader } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { GOALS } from "@/mocks/family";
import { useStore } from "@/state/store";
import { clearBackendSessionToken } from "@/services/keys-backend";

export default function ProfilePage() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const goal = GOALS.find((g) => g.id === state.profile.goalId);

  const rows = [
    { href: "/profile/wins", icon: <Trophy className="size-5" />, tone: "yellow" as const, title: "Your Wins", sub: "Badges and challenges" },
    {
      href: "/profile/limits",
      icon: <ShieldCheck className="size-5" />,
      tone: "green" as const,
      title: "My Key",
      sub: state.mandate.status === "ACTIVE" ? `Key v${state.mandate.version} · up to ${formatAmount(state.mandate.maxActionNotional)} per action` : "Paused",
    },
    { href: "/onboarding/goal", icon: <Target className="size-5" />, tone: "pink" as const, title: "Saving goal", sub: goal?.label ?? "Choose a goal" },
    {
      href: "/profile/parent",
      icon: <Users className="size-5" />,
      tone: "blue" as const,
      title: "Parent or guardian",
      sub: state.profile.parentLinked ? `${state.profile.parentName} is connected` : "Not connected yet",
    },
    { href: "/profile/about", icon: <Info className="size-5" />, tone: "lavender" as const, title: "How Cresco works", sub: "Prices, demo money and technical details" },
    { href: "/parent/sign-in", icon: <UserRound className="size-5" />, tone: "navy" as const, title: "Parent view", sub: "For parents and guardians" },
  ];

  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="Profile" />
      <Card className="mt-4 flex items-center gap-4 p-4">
        <Avatar size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-black text-navy-strong">{state.profile.childName}</p>
          <p className="text-[13px] font-extrabold text-blue">Learning progress is separate from your Key.</p>
          <p className="mt-1 text-[11.5px] font-bold text-ink-3">
            Lessons, streaks and results can inform decisions. They never widen authority automatically.
          </p>
        </div>
      </Card>

      <ul className="mt-4 overflow-hidden rounded-[20px] border border-line-soft bg-surface">
        {rows.map((r, i) => (
          <li key={r.href} className={i ? "border-t border-line-soft" : undefined}>
            <Link href={r.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-soft">
              <IconCircle tone={r.tone} size={40}>
                {r.icon}
              </IconCircle>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold text-navy-strong">{r.title}</span>
                <span className="block truncate text-[12.5px] font-semibold text-ink-2">{r.sub}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          clearBackendSessionToken();
          dispatch({ type: "signOut" });
          router.push("/");
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] py-3 text-[14px] font-extrabold text-ink-2 hover:text-navy"
      >
        <LogOut aria-hidden className="size-4" /> Sign out
      </button>
    </div>
  );
}
