import { CheckCircle2, KeyRound, ShieldCheck, Sprout } from "lucide-react";
import { WelcomeScene } from "@/components/illustrations/people";
import { Wordmark } from "@/components/shell";
import { ActionButton } from "@/components/ui/primitives";

const PILLARS = [
  { icon: KeyRound, title: "Inside", body: "Act without parent approval", tone: "text-blue bg-blue-soft" },
  { icon: ShieldCheck, title: "Boundary", body: "A clear edge with a plain reason", tone: "text-orange-text bg-[#fff0e6]" },
  { icon: CheckCircle2, title: "Once", body: "One request. One use. Key unchanged.", tone: "text-green-strong bg-green-soft" },
  { icon: Sprout, title: "Grow", body: "Only a guardian creates the next Key", tone: "text-lavender bg-lavender-soft" },
];

export default function WelcomePage() {
  return (
    <main id="main" className="min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-[1180px] items-center gap-10 px-5 py-8 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <section className="hidden lg:block" aria-labelledby="board-title">
          <Wordmark size="lg" />
          <p className="mt-1 pl-[52px] text-[15px] font-bold text-ink-2">Your Key. Your decisions. Clear boundaries.</p>
          <h2 id="board-title" className="mt-10 text-[56px] font-black leading-[1.02] tracking-[-0.025em] text-navy-strong">
            Act on your own. <span className="text-green">Ask only at the boundary.</span>
          </h2>
          <p className="mt-5 max-w-[52ch] text-[18px] font-semibold leading-relaxed text-ink-2">
            Your Key is standing room to make your own decisions. Inside it, no parent approval is needed. At the edge, ask. A one-time yes lets one boundary crossing happen without changing your standing Key.
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
          <h1 id="welcome-title" className="mt-6 text-[34px] font-black leading-[1.08] tracking-[-0.02em] text-navy-strong">
            Your Key.
            <br />
            <span className="text-blue">Your decisions.</span>
          </h1>
          <p className="mt-3 max-w-[35ch] text-[15px] font-semibold leading-relaxed text-ink-2">
            Inside your Key, act on your own. At the boundary, ask. A one-time yes does not rewrite your standing limits.
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
