import { BookOpen, Gamepad2, Sprout, Trophy } from "lucide-react";
import { WelcomeScene } from "@/components/illustrations/people";
import { Wordmark } from "@/components/shell";
import { ActionButton } from "@/components/ui/primitives";

const PILLARS = [
  { icon: BookOpen, title: "Learn", body: "Real-world money skills", tone: "text-blue bg-blue-soft" },
  { icon: Gamepad2, title: "Play", body: "Complete challenges", tone: "text-lavender bg-lavender-soft" },
  { icon: Sprout, title: "Invest", body: "Build a practice portfolio", tone: "text-green-strong bg-green-soft" },
  { icon: Trophy, title: "Grow", body: "Earn rewards and new levels", tone: "text-orange bg-[#fff0e6]" },
];

export default function WelcomePage() {
  return (
    <main id="main" className="min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-[1180px] items-center gap-10 px-5 py-8 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Desktop story column */}
        <section className="hidden lg:block" aria-labelledby="board-title">
          <Wordmark size="lg" />
          <p className="mt-1 pl-[52px] text-[15px] font-bold text-ink-2">Small steps. Bigger tomorrows.</p>
          <h2 id="board-title" className="mt-10 text-[56px] font-black leading-[1.02] tracking-[-0.025em] text-navy-strong">
            Money skills today. <span className="text-green">A brighter tomorrow.</span>
          </h2>
          <p className="mt-5 max-w-[46ch] text-[18px] font-semibold leading-relaxed text-ink-2">
            A fun and safe way for 10–15 year olds to learn about money, companies and investing through real-world
            lessons, challenges and a practice portfolio.
          </p>
          <ul className="mt-9 grid max-w-[560px] grid-cols-4 gap-4">
            {PILLARS.map(({ icon: Icon, title, body, tone }) => (
              <li key={title}>
                <span className={`grid size-12 place-items-center rounded-[16px] ${tone}`}>
                  <Icon aria-hidden className="size-6" strokeWidth={2.4} />
                </span>
                <p className="mt-2.5 text-[16px] font-extrabold text-navy-strong">{title}</p>
                <p className="text-[13px] font-semibold leading-snug text-ink-2">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Phone-first welcome (Screen 1) */}
        <section
          aria-labelledby="welcome-title"
          className="mx-auto flex w-full max-w-[440px] flex-col items-center text-center lg:rounded-[32px] lg:border lg:border-line-soft lg:bg-surface lg:p-8 lg:shadow-card"
        >
          <Wordmark size="md" className="mt-2" />
          <h1 id="welcome-title" className="mt-7 text-[34px] font-black leading-[1.08] tracking-[-0.02em] text-navy-strong">
            Money can <span className="text-green">grow.</span>
            <br />
            Let&apos;s <span className="text-blue">learn how.</span>
          </h1>
          <p className="mt-3 max-w-[32ch] text-[15px] font-semibold leading-relaxed text-ink-2">
            Learn about companies, build your first portfolio, and become a smarter investor.
          </p>
          <WelcomeScene
            className="mt-4 w-full max-w-[380px]"
            title="A young person sitting with a growing plant in front of a small city"
          />
          <div className="mt-5 w-full space-y-3">
            <ActionButton href="/start" arrow>
              Start Learning
            </ActionButton>
            <ActionButton href="/parent/sign-in" variant="secondary">
              I&apos;m a Parent
            </ActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}
