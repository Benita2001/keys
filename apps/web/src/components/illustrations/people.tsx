import { useId } from "react";

type SvgProps = { className?: string; title?: string };

function a11y(title?: string) {
  return title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
}

/** Alex — the demo child avatar. Head-and-shoulders bust. */
export function KidBust({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} {...a11y(title)}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbe9ff" />
          <stop offset="1" stopColor="#bcd5ff" />
        </linearGradient>
        <linearGradient id={`${id}hood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b7bf6" />
          <stop offset="1" stopColor="#1f5fd8" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        <rect width="64" height="64" fill={`url(#${id}bg)`} />
        {/* hoodie */}
        <path d="M10 64c1-12 9-19 22-19s21 7 22 19z" fill={`url(#${id}hood)`} />
        <path d="M25 46c2 4 12 4 14 0" stroke="#174fb8" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M28 49v8M36 49v8" stroke="#e8f0ff" strokeWidth="1.6" strokeLinecap="round" />
        {/* neck */}
        <rect x="27.5" y="38" width="9" height="8" rx="3" fill="#e0a57c" />
        {/* face */}
        <ellipse cx="32" cy="28" rx="12.5" ry="13.5" fill="#f3c39c" />
        <ellipse cx="19.8" cy="29.5" rx="2.4" ry="3.2" fill="#eab28a" />
        <ellipse cx="44.2" cy="29.5" rx="2.4" ry="3.2" fill="#eab28a" />
        {/* hair */}
        <path
          d="M19 27c-2-10 5-17 13-17 4 0 7 1 9 3 4 1 6 5 5 11-1-3-3-5-5-6-2 3-7 4-12 3-3-1-5 1-7 3-1 1-2 2-3 3z"
          fill="#5b3421"
        />
        <path d="M24 13c3-3 9-4 13-2-4 0-8 1-11 4z" fill="#7a4a30" />
        {/* eyes */}
        <ellipse cx="27" cy="29" rx="1.6" ry="2" fill="#2b2238" />
        <ellipse cx="37" cy="29" rx="1.6" ry="2" fill="#2b2238" />
        <circle cx="27.5" cy="28.3" r="0.5" fill="#fff" />
        <circle cx="37.5" cy="28.3" r="0.5" fill="#fff" />
        <path d="M24.5 25.2c1.3-.9 3.3-1 4.6-.3M34.9 24.9c1.3-.7 3.3-.6 4.6.3" stroke="#5b3421" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {/* cheeks + smile */}
        <circle cx="24.5" cy="33" r="2" fill="#f59f8b" opacity=".45" />
        <circle cx="39.5" cy="33" r="2" fill="#f59f8b" opacity=".45" />
        <path d="M28.2 34.2c2 2.3 5.6 2.3 7.6 0" stroke="#9b4a3a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Parent avatar for the guardian surfaces. Calmer palette. */
export function ParentBust({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} {...a11y(title)}>
      <defs>
        <clipPath id={`${id}clip`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        <rect width="64" height="64" fill="#e8f8ef" />
        <path d="M8 64c1-13 10-19 24-19s23 6 24 19z" fill="#102b63" />
        <path d="M26 45l6 7 6-7" fill="#fff" />
        <rect x="27.5" y="37" width="9" height="9" rx="3" fill="#c98e67" />
        <ellipse cx="32" cy="27" rx="12" ry="13.5" fill="#dca07a" />
        <path d="M19.5 26c-1-9 5-15 12.5-15S45.5 17 44.5 26c-2-5-6-8-12.5-8s-10.5 3-12.5 8z" fill="#2e2a2a" />
        <ellipse cx="27" cy="28" rx="1.5" ry="1.8" fill="#2b2238" />
        <ellipse cx="37" cy="28" rx="1.5" ry="1.8" fill="#2b2238" />
        <path d="M28.5 33.5c1.8 1.7 5.2 1.7 7 0" stroke="#7d3c2e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Welcome hero: a young person with a growing plant in front of a small city. */
export function WelcomeScene({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 360 300" className={className} {...a11y(title)}>
      <defs>
        <radialGradient id={`${id}sky`} cx=".5" cy=".55" r=".6">
          <stop offset="0" stopColor="#fff3dc" />
          <stop offset=".6" stopColor="#eaf2ff" />
          <stop offset="1" stopColor="#fff9f1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}hill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fdc9f" />
          <stop offset="1" stopColor="#4fbf73" />
        </linearGradient>
        <linearGradient id={`${id}bldA`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe0ff" />
          <stop offset="1" stopColor="#b3cdfa" />
        </linearGradient>
        <linearGradient id={`${id}bldB`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3dcff" />
          <stop offset="1" stopColor="#cbbffa" />
        </linearGradient>
        <linearGradient id={`${id}hood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f82fb" />
          <stop offset="1" stopColor="#1d5bd6" />
        </linearGradient>
        <linearGradient id={`${id}pot`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f08a55" />
          <stop offset="1" stopColor="#d4683a" />
        </linearGradient>
        <linearGradient id={`${id}leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fd98c" />
          <stop offset="1" stopColor="#1fa862" />
        </linearGradient>
      </defs>

      <clipPath id={`${id}frame`}>
        <rect width="360" height="300" rx="28" />
      </clipPath>
      <g clipPath={`url(#${id}frame)`}>
      <ellipse cx="180" cy="170" rx="185" ry="150" fill={`url(#${id}sky)`} />

      {/* city */}
      <g>
        <rect x="36" y="88" width="34" height="112" rx="4" fill={`url(#${id}bldA)`} />
        <rect x="74" y="60" width="40" height="140" rx="4" fill={`url(#${id}bldB)`} />
        <rect x="118" y="100" width="30" height="100" rx="4" fill={`url(#${id}bldA)`} />
        <rect x="222" y="70" width="38" height="130" rx="4" fill={`url(#${id}bldA)`} />
        <rect x="264" y="104" width="30" height="96" rx="4" fill={`url(#${id}bldB)`} />
        <rect x="298" y="82" width="32" height="118" rx="4" fill={`url(#${id}bldA)`} />
        <path d="M84 60l10-14 10 14z" fill="#b9a9f5" />
        <g fill="#ffffff" opacity=".75">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <g key={r}>
              <rect x="82" y={72 + r * 20} width="8" height="9" rx="1.5" />
              <rect x="98" y={72 + r * 20} width="8" height="9" rx="1.5" />
              <rect x="230" y={82 + r * 18} width="8" height="8" rx="1.5" />
              <rect x="244" y={82 + r * 18} width="8" height="8" rx="1.5" />
            </g>
          ))}
          {[0, 1, 2, 3].map((r) => (
            <g key={`s${r}`}>
              <rect x="44" y={100 + r * 22} width="7" height="8" rx="1.5" />
              <rect x="56" y={100 + r * 22} width="7" height="8" rx="1.5" />
              <rect x="306" y={94 + r * 22} width="7" height="8" rx="1.5" />
              <rect x="317" y={94 + r * 22} width="7" height="8" rx="1.5" />
            </g>
          ))}
        </g>
      </g>

      {/* trees */}
      <g>
        <circle cx="22" cy="190" r="20" fill="#67cf8a" />
        <circle cx="42" cy="182" r="16" fill="#86dea2" />
        <circle cx="332" cy="186" r="22" fill="#67cf8a" />
        <circle cx="312" cy="194" r="14" fill="#86dea2" />
      </g>

      {/* hill */}
      <path d="M-10 232c60-40 140-46 190-40s120 18 190 44v70H-10z" fill={`url(#${id}hill)`} />
      <path d="M-10 260c90-30 190-28 380 6v40H-10z" fill="#3eb368" opacity=".5" />

      {/* growth words + arrow */}
      <path d="M170 104C222 92 286 62 334 20" stroke="#1769f6" strokeWidth="2.5" strokeDasharray="5 6" fill="none" strokeLinecap="round" />
      <path d="M340 14l-12 2 6 9z" fill="#1769f6" />
      <g fontFamily="inherit" fontWeight="900" fontSize="13" letterSpacing=".5">
        <text x="176" y="88" transform="rotate(-12 176 88)" fill="#1769f6">LEARN</text>
        <text x="228" y="70" transform="rotate(-18 228 70)" fill="#21b66f">SAVE</text>
        <text x="266" y="50" transform="rotate(-24 266 50)" fill="#ff8a3d">INVEST</text>
        <text x="296" y="16" transform="rotate(-30 296 16)" fill="#8b75f7">GROW</text>
      </g>

      {/* plant */}
      <g>
        <path d="M258 250h40l-5 30h-30z" fill={`url(#${id}pot)`} />
        <rect x="254" y="244" width="48" height="10" rx="4" fill="#f59b69" />
        <path d="M278 244c0-18 0-28 1-40" stroke="#1f9f5b" strokeWidth="4" strokeLinecap="round" />
        <path d="M279 222c-22-2-30-16-30-28 16 0 30 10 30 28z" fill={`url(#${id}leaf)`} />
        <path d="M279 212c20-4 28-20 26-34-16 2-28 14-26 34z" fill={`url(#${id}leaf)`} />
        <path d="M279 206c-6-10-4-22 4-30 6 8 4 22-4 30z" fill="#8ee6ab" />
      </g>

      {/* kid, sitting */}
      <g>
        {/* legs */}
        <path d="M128 248c14-10 40-12 62-4l22 24c-10 6-22 4-28-2l-12-10c-14 4-32 4-44-8z" fill="#27407a" />
        <path d="M120 246c10 10 30 12 50 6l4 26c-20 6-44 2-58-12z" fill="#2f4d8f" />
        <path d="M208 262c8-2 18 0 22 8 2 5-2 8-8 8h-20c-4 0-4-10 6-16z" fill="#fff" />
        <path d="M204 276h26" stroke="#dce6f2" strokeWidth="3" />
        <path d="M168 270c8-2 16 2 18 8 1 4-2 6-7 6h-18c-4 0-3-12 7-14z" fill="#fff" />
        {/* torso */}
        <path d="M118 176c6-14 20-20 34-20s26 8 30 22l6 58c-20 12-54 14-76 2z" fill={`url(#${id}hood)`} />
        <path d="M138 160c4 8 22 8 26 0" stroke="#174fb8" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M146 166v14M156 166v14" stroke="#eaf2ff" strokeWidth="2.4" strokeLinecap="round" />
        {/* arms */}
        <path d="M124 186c-10 18-8 36 6 44l26-6-4-12-16 2c0-10 2-18 0-26z" fill="#2d6ff0" />
        <path d="M180 186c8 18 8 34-4 42l-22-6 4-12 12 2c-2-10-2-18 0-24z" fill="#2d6ff0" />
        {/* phone */}
        <rect x="146" y="206" width="22" height="30" rx="4" fill="#102b63" transform="rotate(-12 157 221)" />
        <rect x="149" y="209" width="16" height="22" rx="2" fill="#7fd4ff" transform="rotate(-12 157 221)" />
        <path d="M151 226l4-5 3 3 5-7" stroke="#21b66f" strokeWidth="2" fill="none" transform="rotate(-12 157 221)" />
        <circle cx="148" cy="226" r="6" fill="#f3c39c" />
        <circle cx="166" cy="224" r="6" fill="#f3c39c" />
        {/* head */}
        <rect x="144" y="140" width="14" height="14" rx="5" fill="#e0a57c" />
        <ellipse cx="151" cy="124" rx="23" ry="24" fill="#f3c39c" />
        <ellipse cx="128.5" cy="127" rx="4" ry="5.5" fill="#eab28a" />
        <ellipse cx="173.5" cy="127" rx="4" ry="5.5" fill="#eab28a" />
        <path
          d="M127 122c-4-18 8-30 24-30 8 0 14 2 18 6 8 3 11 10 9 21-2-6-6-9-10-11-4 6-14 7-22 5-6-1-10 2-13 5z"
          fill="#5b3421"
        />
        <path d="M137 97c6-5 16-7 24-3-8 0-15 2-20 6z" fill="#7a4a30" />
        <ellipse cx="142" cy="126" rx="2.8" ry="3.4" fill="#2b2238" />
        <ellipse cx="160" cy="126" rx="2.8" ry="3.4" fill="#2b2238" />
        <circle cx="143" cy="124.8" r=".9" fill="#fff" />
        <circle cx="161" cy="124.8" r=".9" fill="#fff" />
        <circle cx="137" cy="134" r="3.5" fill="#f59f8b" opacity=".45" />
        <circle cx="165" cy="134" r="3.5" fill="#f59f8b" opacity=".45" />
        <path d="M144 135c4 4 10 4 14 0" stroke="#9b4a3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* backpack strap */}
        <path d="M126 170c-6 12-8 30-4 46" stroke="#ff8a3d" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>

      {/* small coins */}
      <g>
        <circle cx="92" cy="258" r="9" fill="#ffbc32" />
        <circle cx="92" cy="258" r="6" fill="#ffd36b" />
        <circle cx="106" cy="266" r="7" fill="#ffbc32" />
        <circle cx="106" cy="266" r="4.5" fill="#ffd36b" />
      </g>
      </g>
    </svg>
  );
}

/** A curious kid used beside "What does this company do?". */
export function ThinkingKid({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" className={className} {...a11y(title)}>
      <defs>
        <linearGradient id={`${id}hood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f82fb" />
          <stop offset="1" stopColor="#1d5bd6" />
        </linearGradient>
      </defs>
      <circle cx="96" cy="22" r="14" fill="#fff" stroke="#dce6f2" strokeWidth="2" />
      <text x="96" y="28" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1769f6">?</text>
      <circle cx="80" cy="40" r="4" fill="#fff" stroke="#dce6f2" strokeWidth="2" />
      <path d="M22 120c2-22 16-34 36-34s34 12 36 34z" fill={`url(#${id}hood)`} />
      <rect x="51" y="74" width="14" height="14" rx="5" fill="#e0a57c" />
      <ellipse cx="58" cy="56" rx="21" ry="22" fill="#f3c39c" />
      <path d="M37 54c-3-16 7-27 22-27 8 0 13 2 16 6 7 3 9 9 7 18-2-5-5-8-9-10-4 5-12 6-19 5-6-1-9 2-12 5z" fill="#5b3421" />
      <ellipse cx="50" cy="58" rx="2.5" ry="3" fill="#2b2238" />
      <ellipse cx="66" cy="58" rx="2.5" ry="3" fill="#2b2238" />
      <path d="M52 67c3 2 8 2 11 0" stroke="#9b4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M78 120c4-10 8-18 6-30-4-4-10-2-12 2l-2 28z" fill="#2d6ff0" />
      <circle cx="76" cy="86" r="6" fill="#f3c39c" />
    </svg>
  );
}
