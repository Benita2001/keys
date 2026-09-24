"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { AchievementBadge } from "@/components/learning";
import { Avatar, Card, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { formatNumber } from "@/domain/format";
import { useLevel } from "@/hooks/data";
import { ACHIEVEMENTS, CHALLENGES } from "@/mocks/family";
import { moduleById } from "@/mocks/learning";
import { useStore } from "@/state/store";

export default function WinsPage() {
  const { level, xp, progress, toNext } = useLevel();
  const [tab, setTab] = useState<"badges" | "challenges">("badges");
  const { state } = useStore();
  const stockLessons = moduleById("what-is-a-stock")?.lessonIds ?? [];
  // Challenge progress is derived from learning activity only: never from trades or P&L.
  const live: Record<string, number> = {
    "research-5": state.researched.length,
    "stock-module": stockLessons.filter((id) => state.completedLessons.includes(id)).length,
    reasons: 1 + state.activity.filter((a) => a.reason).length,
    "streak-10": state.streakDays,
  };
  const challenges = CHALLENGES.map((c) => ({ ...c, progress: Math.min(c.target, live[c.id] ?? c.progress) }));

  return (
    <div className="animate-rise mx-auto max-w-[720px]">
      <PageHeader title="Your Wins" back="/profile" />
      <Card className="mt-4 flex items-center gap-4 p-4">
        <Avatar size={60} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <p className="text-[19px] font-black text-navy-strong">Level {level}</p>
            <p className="text-[13px] font-extrabold text-ink-2 tabular">{formatNumber(xp)} XP</p>
          </div>
          <ProgressBar value={progress} tone="green" className="mt-2" label="Progress to next level" />
          <p className="mt-1 text-right text-[11.5px] font-bold text-ink-3">
            {formatNumber(toNext)} XP to Level {level + 1}
          </p>
        </div>
      </Card>

      <div role="tablist" aria-label="Wins" className="mt-4 grid h-10 grid-cols-2 rounded-[14px] bg-[#edf1f7] p-1">
        {(["badges", "challenges"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`rounded-[11px] text-[13.5px] font-extrabold transition-colors ${tab === t ? "bg-blue text-white" : "text-ink-2"}`}
          >
            {t === "badges" ? "Badges" : "Challenges"}
          </button>
        ))}
      </div>

      {tab === "badges" ? (
        <ul id="panel-badges" role="tabpanel" className="mt-4 grid grid-cols-3 gap-x-2 gap-y-3 md:grid-cols-6">
          {ACHIEVEMENTS.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </ul>
      ) : (
        <ul id="panel-challenges" role="tabpanel" className="mt-4 space-y-3">
          {challenges.map((c) => (
            <Card as="li" key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-extrabold text-navy-strong">{c.title}</p>
                  <p className="text-[13px] font-semibold text-ink-2">{c.caption}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-extrabold text-orange-text">
                  <Star aria-hidden className="size-3.5 fill-yellow text-yellow" />+{c.xp}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={c.progress / c.target} tone="yellow" label={`${c.title} progress`} />
                <span className="text-[12.5px] font-extrabold text-ink-2 tabular">
                  {c.progress}/{c.target}
                </span>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <p className="mt-5 text-center text-[12.5px] font-semibold text-ink-3">
        Wins celebrate learning and curiosity. They never change your Money Mode limits.
      </p>
    </div>
  );
}
