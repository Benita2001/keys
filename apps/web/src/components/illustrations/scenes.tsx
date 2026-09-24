import { useId } from "react";
import type { IllustrationKey, MarketAsset } from "@/domain/types";

type SvgProps = { className?: string; title?: string };

function a11y(title?: string) {
  return title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
}

function Backdrop({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}bd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}bd)`} />
    </>
  );
}

function MiniKid({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-26 70c2-22 12-34 26-34s24 12 26 34z" fill="#2d6ff0" />
      <rect x="-6" y="24" width="12" height="14" rx="4" fill="#e0a57c" />
      <ellipse cx="0" cy="10" rx="19" ry="20" fill="#f3c39c" />
      <path d="M-19 8c-3-15 6-25 19-25 7 0 12 2 15 5 6 3 8 8 6 16-2-5-5-7-8-9-4 5-11 6-17 4-5-1-9 2-12 5z" fill="#5b3421" />
      <ellipse cx="-7" cy="12" rx="2.3" ry="2.8" fill="#2b2238" />
      <ellipse cx="8" cy="12" rx="2.3" ry="2.8" fill="#2b2238" />
      <path d="M-5 20c3 3 8 3 11 0" stroke="#9b4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="-12" cy="18" r="3" fill="#f59f8b" opacity=".45" />
      <circle cx="13" cy="18" r="3" fill="#f59f8b" opacity=".45" />
    </g>
  );
}

/** Tony's Pizza — the ownership metaphor from the approved lesson screen. */
export function PizzaShopScene({ className, title, caption }: SvgProps & { caption?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#dff0ff" to="#fff5e6" />
      <circle cx="40" cy="150" r="30" fill="#8fdc9f" />
      <circle cx="286" cy="148" r="28" fill="#8fdc9f" />
      {/* shop */}
      <rect x="54" y="52" width="212" height="128" rx="6" fill="#fff4e4" />
      <rect x="54" y="52" width="212" height="128" rx="6" fill="none" stroke="#f2d7b3" strokeWidth="2" />
      <rect x="76" y="22" width="168" height="34" rx="10" fill="#c7372f" />
      <text x="160" y="46" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ffe7a8" letterSpacing="1">
        TONY&apos;S PIZZA
      </text>
      <path d="M48 62h224l-10 24H58z" fill="#e24a3b" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${66 + i * 30} 62h15l-3 24h-15z`} fill="#fff" opacity=".9" />
      ))}
      <rect x="72" y="98" width="70" height="52" rx="6" fill="#bfe0ff" />
      <rect x="182" y="98" width="62" height="82" rx="6" fill="#8f5a3a" />
      <circle cx="232" cy="142" r="3" fill="#ffd36b" />
      {/* pizza */}
      <ellipse cx="160" cy="176" rx="64" ry="18" fill="#102b63" opacity=".08" />
      <circle cx="160" cy="150" r="46" fill="#f2b04b" />
      <circle cx="160" cy="150" r="39" fill="#ffd36b" />
      <circle cx="160" cy="150" r="36" fill="#f46a4e" opacity=".22" />
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <line key={i} x1="160" y1="150" x2={160 + Math.cos(a) * 39} y2={150 + Math.sin(a) * 39} stroke="#e9a13a" strokeWidth="1.4" />
        );
      })}
      {[
        [146, 136], [174, 140], [152, 164], [178, 162], [160, 150], [138, 154], [168, 126],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#d8413a" />
      ))}
      {/* the one piece */}
      <path d="M160 150L199 150A39 39 0 0 1 191.55 172.92Z" fill="#fff3c4" stroke="#1769f6" strokeWidth="2.5" strokeLinejoin="round" />
      {caption ? (
        <g>
          <rect x="198" y="164" width="44" height="24" rx="12" fill="#1769f6" />
          <text x="220" y="181" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
            {caption}
          </text>
        </g>
      ) : null}
      <MiniKid x={276} y={100} s={0.95} />
    </svg>
  );
}

function StorefrontScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#e8faf8" to="#fff9f1" />
      <rect x="30" y="70" width="60" height="110" rx="5" fill="#d7e5ff" />
      <rect x="236" y="56" width="56" height="124" rx="5" fill="#e5deff" />
      <rect x="92" y="60" width="140" height="120" rx="6" fill="#fff" />
      <path d="M86 60h152l-10 26H96z" fill="#21b66f" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${104 + i * 26} 60h13l-2 26h-13z`} fill="#fff" opacity=".85" />
      ))}
      <rect x="104" y="98" width="56" height="44" rx="5" fill="#bfe0ff" />
      <rect x="172" y="98" width="46" height="82" rx="5" fill="#1769f6" />
      <circle cx="210" cy="140" r="3" fill="#fff" />
      <rect x="112" y="40" width="100" height="22" rx="8" fill="#102b63" />
      <text x="162" y="56" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">OPEN</text>
      <MiniKid x={58} y={120} s={0.85} />
      <g>
        <circle cx="270" cy="150" r="14" fill="#ffbc32" />
        <text x="270" y="155" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">$</text>
      </g>
    </svg>
  );
}

function ChartScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#f0edff" to="#fff9f1" />
      <rect x="40" y="30" width="240" height="140" rx="16" fill="#fff" />
      <path d="M60 140L100 118L130 128L170 90L200 100L250 56" stroke="#21b66f" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 140L100 118L130 128L170 90L200 100L250 56V150H60z" fill="#21b66f" opacity=".12" />
      <circle cx="250" cy="56" r="7" fill="#21b66f" />
      <g>
        <rect x="64" y="44" width="58" height="22" rx="11" fill="#e8f8ef" />
        <text x="93" y="59" textAnchor="middle" fontSize="11" fontWeight="800" fill="#139459">Buyers ↑</text>
      </g>
      <MiniKid x={270} y={130} s={0.8} />
    </svg>
  );
}

function ScaleScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#fff5d8" to="#fff9f1" />
      <path d="M160 40v120" stroke="#102b63" strokeWidth="6" strokeLinecap="round" />
      <path d="M120 170h80" stroke="#102b63" strokeWidth="8" strokeLinecap="round" />
      <path d="M80 70L240 54" stroke="#102b63" strokeWidth="5" strokeLinecap="round" />
      <path d="M80 70l-24 50h48z" fill="none" stroke="#8b96a8" strokeWidth="2" />
      <path d="M240 54l-24 50h48z" fill="none" stroke="#8b96a8" strokeWidth="2" />
      <ellipse cx="80" cy="122" rx="30" ry="7" fill="#eb5757" />
      <text x="80" y="112" textAnchor="middle" fontSize="12" fontWeight="800" fill="#eb5757">RISK</text>
      <ellipse cx="240" cy="106" rx="30" ry="7" fill="#21b66f" />
      <text x="240" y="96" textAnchor="middle" fontSize="12" fontWeight="800" fill="#139459">REWARD</text>
      <circle cx="160" cy="40" r="8" fill="#ffbc32" />
    </svg>
  );
}

function BasketScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#e8f8ef" to="#fff9f1" />
      <circle cx="118" cy="78" r="22" fill="#1769f6" />
      <circle cx="160" cy="66" r="24" fill="#21b66f" />
      <circle cx="204" cy="80" r="22" fill="#ffbc32" />
      <circle cx="140" cy="96" r="18" fill="#8b75f7" />
      <circle cx="184" cy="98" r="18" fill="#ff7aa8" />
      <path d="M82 104h156l-16 70H98z" fill="#d4883f" />
      <path d="M82 104h156l-4 14H86z" fill="#b86e2a" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${104 + i * 22} 120v48`} stroke="#b86e2a" strokeWidth="3" />
      ))}
    </svg>
  );
}

function SharesScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#eaf2ff" to="#fff9f1" />
      {[
        [80, 70, "#1769f6"], [140, 52, "#21b66f"], [200, 70, "#ff8a3d"], [110, 124, "#8b75f7"], [170, 124, "#55cfc6"], [230, 124, "#ff7aa8"],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <rect x={x as number} y={y as number} width="46" height="40" rx="10" fill={c as string} />
          <rect x={(x as number) + 8} y={(y as number) + 10} width="30" height="6" rx="3" fill="#fff" opacity=".85" />
          <rect x={(x as number) + 8} y={(y as number) + 22} width="18" height="6" rx="3" fill="#fff" opacity=".6" />
        </g>
      ))}
      <path d="M40 176h240" stroke="#dce6f2" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PiggyScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 320 200" className={className} {...a11y(title)}>
      <Backdrop id={id} from="#ffeef4" to="#fff9f1" />
      <g transform="translate(96 44) scale(1.1)">
        <ellipse cx="58" cy="54" rx="46" ry="36" fill="#ff8fb3" />
        <ellipse cx="58" cy="48" rx="38" ry="26" fill="#ffa3c2" />
        <path d="M30 24l-4-16 18 10z" fill="#ff7aa8" />
        <ellipse cx="102" cy="56" rx="12" ry="10" fill="#ff7aa8" />
        <circle cx="98" cy="55" r="2.2" fill="#b83d69" />
        <circle cx="106" cy="55" r="2.2" fill="#b83d69" />
        <circle cx="84" cy="40" r="3.5" fill="#3a2238" />
        <rect x="30" y="84" width="12" height="16" rx="5" fill="#ff7aa8" />
        <rect x="70" y="84" width="12" height="16" rx="5" fill="#ff7aa8" />
        <rect x="46" y="16" width="22" height="5" rx="2.5" fill="#b83d69" />
      </g>
      <circle cx="170" cy="30" r="12" fill="#ffbc32" />
      <circle cx="170" cy="30" r="8" fill="#ffd36b" />
    </svg>
  );
}

export function LessonIllustration({
  kind,
  caption,
  className,
  title,
}: SvgProps & { kind: IllustrationKey; caption?: string }) {
  switch (kind) {
    case "pizza":
      return <PizzaShopScene className={className} title={title} caption={caption} />;
    case "storefront":
      return <StorefrontScene className={className} title={title} />;
    case "chart":
      return <ChartScene className={className} title={title} />;
    case "scale":
      return <ScaleScene className={className} title={title} />;
    case "basket":
      return <BasketScene className={className} title={title} />;
    case "shares":
      return <SharesScene className={className} title={title} />;
    case "piggy":
    default:
      return <PiggyScene className={className} title={title} />;
  }
}

/** Company hero: an illustrated storefront tinted with the company's identity. */
export function CompanyHero({ asset, className }: { asset: MarketAsset; className?: string }) {
  const id = useId();
  const { background, foreground, mark } = asset.brand;
  return (
    <svg viewBox="0 0 390 200" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bcd8ff" />
          <stop offset="1" stopColor="#eaf2ff" />
        </linearGradient>
      </defs>
      <rect width="390" height="200" fill={`url(#${id}sky)`} />
      <rect x="0" y="60" width="70" height="140" fill="#d7e5ff" />
      <rect x="320" y="40" width="70" height="160" fill="#d7e5ff" />
      <circle cx="40" cy="170" r="30" fill="#8fdc9f" />
      <circle cx="354" cy="172" r="28" fill="#8fdc9f" />
      <path d="M86 200V84c0-10 8-18 18-18h182c10 0 18 8 18 18v116z" fill="#f7faff" />
      <path d="M86 200V84c0-10 8-18 18-18h182c10 0 18 8 18 18v116z" fill="none" stroke="#dce6f2" strokeWidth="2" />
      <rect x="106" y="112" width="178" height="88" rx="6" fill="#cfe2ff" />
      <path d="M195 112v88M150 112v88M240 112v88" stroke="#f7faff" strokeWidth="4" />
      <rect x="165" y="76" width="60" height="30" rx="10" fill={background} stroke="#dce6f2" strokeWidth={background === "#ffffff" ? 2 : 0} />
      <text x="195" y="98" textAnchor="middle" fontSize={mark.length > 2 ? 14 : 20} fontWeight="900" fill={foreground}>
        {mark}
      </text>
      <rect y="196" width="390" height="4" fill="#b3cdfa" />
    </svg>
  );
}
