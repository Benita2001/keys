"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Skyline } from "@/components/illustrations/objects";
import { GoalArt } from "@/components/illustrations/objects";
import { BadgeArt } from "@/components/illustrations/badges";
import { LessonCard, MissionCard } from "@/components/learning";
import {
  MoneyHeroCard,
  ModeSwitch,
  PracticeHeroCard,
  RequestStatusCard,
} from "@/components/mode";
import { ErrorState } from "@/components/ui/feedback";
import { Avatar, Card, SectionHeader, StreakBadge, TextLink } from "@/components/ui/primitives";
import { formatAmount } from "@/domain/format";
import { remainingThisPeriod } from "@/domain/policy";
import { useAchievements, useLearningStats, useModuleStates, usePortfolio } from "@/hooks/data";
import { GOALS } from "@/mocks/family";
import { LESSONS, MISSION, MODULES, lessonById, moduleById } from "@/mocks/learning";
import { allAssetSnapshots } from "@/services";
import { useStore } from "@/state/store";

export default function HomePage() {
  const { state } = useStore();
  const stats = useLearningStats();
  const achievements = useAchievements();
  const { assets, view } = usePortfolio(state.mode);
  const modules = useModuleStates();

  const current = modules.find((m) => m.state === "current");
  const currentModule = current ? moduleById(current.id) : undefined;
  const nextLesson =
    currentModule?.lessonIds.map((id) => lessonById(id)!).find((l) => !state.completedLessons.includes(l.id)) ?? LESSONS[0];
  const upNextModule = current ? MODULES[MODULES.findIndex((m) => m.id === current.id) + 1] : undefined;
  const upNextLesson = upNextModule ? lessonById(upNextModule.lessonIds[0]) : undefined;
  const missionDone = state.completedLessons.includes(MISSION.lessonId);
  const goal = GOALS.find((g) => g.id === state.profile.goalId) ?? GOALS[0];
  const latestRequest = state.requests[0];

  // Practice = Solana Devnet (+ sandbox); Money = Solana Mainnet (setup required today).
  const hero =
    state.mode === "practice" ? (
      assets.status === "error" ? (
        <ErrorState onRetry={assets.reload} />
      ) : (
        <PracticeHeroCard view={view} mandate={state.profile.parentLinked ? state.mandate : undefined} />
      )
    ) : (
      <MoneyHeroCard parentName={state.profile.parentName} />
    );

  return (
    <div className="animate-rise">
      {/* Greeting */}
      <header className="flex items-center gap-3 lg:max-w-[calc(100%-372px)]">
        <Link href="/profile" aria-label="Your profile">
          <Avatar size={54} label={`${state.profile.childName}'s avatar`} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[23px] font-black leading-tight tracking-[-0.01em] text-navy-strong">
            Hey {state.profile.childName} <span aria-hidden>👋</span>
          </h1>
          <Link href="/learn" className="mt-1 block text-[12.5px] font-extrabold text-blue" aria-label="Learning progress. Separate from your Key.">
            Learning progress · separate from your Key
          </Link>
        </div>
        <StreakBadge days={stats.streakDays} />
      </header>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div>
          <ModeSwitch />
          <div className="mt-4">{hero}</div>

          {state.mode === "practice" && latestRequest ? (
            <div className="mt-3">
              <RequestStatusCard
                request={latestRequest}
                companyName={allAssetSnapshots().find((a) => a.ticker === latestRequest.asset)?.companyName ?? latestRequest.asset}
              />
            </div>
          ) : null}

          <div className="mt-4">
            <MissionCard
              title={MISSION.title}
              body={MISSION.body}
              xp={MISSION.xp}
              href={`/lesson/${MISSION.lessonId}`}
              done={missionDone}
            />
          </div>

          <section className="mt-6" aria-labelledby="continue-learning">
            <SectionHeader title={<span id="continue-learning">Continue Learning</span>} action={<TextLink href="/learn">See All</TextLink>} />
            <div className="flex gap-3">
              {currentModule && nextLesson ? (
                <LessonCard lesson={nextLesson} module={currentModule} href={`/lesson/${nextLesson.id}`} />
              ) : null}
              {upNextModule && upNextLesson ? (
                <LessonCard lesson={upNextLesson} module={upNextModule} href="/learn" locked />
              ) : null}
            </div>
          </section>

          <Skyline className="-mx-5 mt-6 h-16 w-[calc(100%+40px)] md:hidden" />
        </div>

        {/* Desktop companion column */}
        <aside className="mt-6 hidden space-y-4 lg:mt-0 lg:block">
          {state.mode === "practice" && state.profile.parentLinked ? (
            <Card className="p-5">
              <p className="flex items-center gap-2 text-[15px] font-extrabold text-navy-strong">
                <ShieldCheck aria-hidden className="size-5 text-green" /> My Key
              </p>
              <p className="mt-2 text-[14px] font-semibold text-ink-2">
                Key v{state.mandate.version} · up to {formatAmount(state.mandate.maxActionNotional)} per action, {formatAmount(remainingThisPeriod(state.mandate))} left{" "}
                {state.mandate.periodLabel}. Inside your Key, you act on your own.
              </p>
              <TextLink href="/profile/limits" className="mt-3 inline-block">
                See my Key
              </TextLink>
            </Card>
          ) : null}
          <Card className="p-5">
            <p className="text-[13px] font-bold text-ink-2">Saving for</p>
            <div className="mt-1 flex items-center gap-3">
              <GoalArt goal={goal.id} className="h-14 w-20" />
              <p className="text-[18px] font-extrabold text-navy-strong">{goal.label}</p>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-ink-2">Lessons and missions are picked with this goal in mind.</p>
          </Card>
          <Link href="/profile/wins" className="block rounded-[20px] border border-line-soft bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-extrabold text-navy-strong">Your Wins</p>
              <ChevronRight aria-hidden className="size-5 text-ink-3" />
            </div>
            <div className="mt-3 flex gap-2">
              {achievements.slice(0, 4).map((a) => (
                <BadgeArt key={a.id} badge={a.id} earned={a.earned} className="size-12" />
              ))}
            </div>
            <p className="mt-2 text-[13px] font-semibold text-ink-2">
              {achievements.filter((a) => a.earned).length} badges earned for learning and curiosity.
            </p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
