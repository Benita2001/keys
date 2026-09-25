import { BookOpen, KeyRound, ShieldCheck, Sprout } from "lucide-react";
import { WelcomeScene } from "@/components/illustrations/people";
import { Wordmark } from "@/components/shell";
import { ActionButton } from "@/components/ui/primitives";

const PILLARS = [
  { icon: BookOpen, title: "Learn", body: "Source-backed market concepts", tone: "text-blue bg-blue-soft" },
  { icon: Sprout, title: "Practice", body: "Try decisions with virtual money", tone: "text-green-strong bg-green-soft" },
  { icon: KeyRound, title: "Act", body: "Inside your family-set Key", tone: "text-lavender bg-lavender-soft" },
  { icon: ShieldCheck, title: "Ask", body: "Only when you reach the boundary", tone: "text-orange-text bg-[#fff0e6]" },
];

function PoweredByKeys() {
  return (
    <span className="inline-flex rounded-full border border-line-soft bg-surface px-2.5 py-1 text-[11.5px] font-extrabold text-ink-2">
      Powered by KEYS
    </span>
  );
}

export default function WelcomePage() {
  return (
    <main id="main" className="min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-[1180px] items-center gap-10 px-5 py-8 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <section className="hidden lg:block" aria-labelledby="board-title">
          <div className="flex items-center gap-3">
            <Wordmark size="lg" />
            <PoweredByKeys />
          </div>
          <p className="mt-1 pl-[52px] text-[15px] font-bold text-ink-2">Small steps. Real choices. Clear boundaries.</p>
          <h2 id="board-title" className="mt-10 text-[56px] font-black leading-[1.02] tracking-[-0.025em] text-navy-strong">
            Learn investing. <span className="text-green">Act independently inside clear limits.</span>
          </h2>
          <p className="mt-5 max-w-[50ch] text-[18px] font-semibold leading-relaxed text-ink-2">
            Cresco combines source-backed learning, Practice and bounded autonomy. Your family Key defines what you can do on your own. Inside it: act. At the boundary: ask.
          </p>
          <ul className="mt-9 grid max-w-[600px] grid-cols-4 gap-4">
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

        <section
          aria-labelledby="welcome-title"
          className="mx-auto flex w-full max-w-[440px] flex-col items-center text-center lg:rounded-[32px] lg:border lg:border-line-soft lg:bg-surface lg:p-8 lg:shadow-card"
        >
          <Wordmark size="md" className="mt-2" />
          <div className="mt-2"><PoweredByKeys /></div>
          <h1 id="welcome-title" className="mt-6 text-[34px] font-black leading-[1.08] tracking-[-0.02em] text-navy-strong">
            Your choices.
            <br />
            <span className="text-blue">Clear limits.</span>
          </h1>
          <p className="mt-3 max-w-[34ch] text-[15px] font-semibold leading-relaxed text-ink-2">
            Learn with real market concepts, practice safely, and see bounded autonomy in action: act inside your Key, ask only at the boundary.
          </p>
          <WelcomeScene className="mt-4 w-full max-w-[380px]" title="A young person sitting with a growing plant in front of a small city" />
          <div className="mt-5 w-full space-y-3">
            <ActionButton href="/start" arrow>Start with your Key</ActionButton>
            <ActionButton href="/parent/sign-in" variant="secondary">I&apos;m a Parent</ActionButton>
          </div>
        </section>
      </div>
    </main>
  );
}
