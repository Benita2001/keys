import { useId } from "react";
import type { GoalId } from "@/domain/types";

type SvgProps = { className?: string; title?: string };

function a11y(title?: string) {
  return title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
}

/* ------------------------------------------------------------------ */
/* Brand mark                                                           */
/* ------------------------------------------------------------------ */

/** Cresco symbol: three rising bars with a sprout — growth + ownership. */
export function CrescoMark({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} {...a11y(title)}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a7bff" />
          <stop offset="1" stopColor="#0f57e8" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4fd98a" />
          <stop offset="1" stopColor="#139459" />
        </linearGradient>
      </defs>
      <rect x="3" y="24" width="9" height="13" rx="2.5" fill={`url(#${id}b)`} />
      <rect x="15.5" y="17" width="9" height="20" rx="2.5" fill={`url(#${id}b)`} />
      <rect x="28" y="12" width="9" height="25" rx="2.5" fill={`url(#${id}b)`} />
      <path d="M32.5 12V7" stroke="#139459" strokeWidth="2" strokeLinecap="round" />
      <path d="M32.5 8c-4.5.5-7.5-2-7.5-6 4.5 0 7.5 2.2 7.5 6z" fill={`url(#${id}l)`} />
      <path d="M32.6 7.5c3.6-.3 5.6-2.8 5.4-5.8-3.6.2-5.8 2.6-5.4 5.8z" fill="#21b66f" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Growth objects                                                       */
/* ------------------------------------------------------------------ */

export function PlantPot({ className, title }: SvgProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 96 96" className={className} {...a11y(title)}>
      <defs>
        <linearGradient id={`${id}pot`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f39a63" />
          <stop offset="1" stopColor="#d4683a" />
        </linearGradient>
        <linearGradient id={`${id}leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7be49f" />
          <stop offset="1" stopColor="#18a35c" />
        </linearGradient>
      </defs>
      <path d="M26 62h44l-6 30H32z" fill={`url(#${id}pot)`} />
      <rect x="22" y="56" width="52" height="11" rx="4" fill="#f7a877" />
      <ellipse cx="48" cy="57" rx="22" ry="3" fill="#8a4a2b" opacity=".45" />
      <path d="M48 57c0-16 0-26 1-36" stroke="#16924f" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M48 42C30 42 22 30 22 18c16 0 26 10 26 24z" fill={`url(#${id}leaf)`} />
      <path d="M49 34c16-2 26-16 24-30-14 2-26 12-24 30z" fill={`url(#${id}leaf)`} />
      <path d="M48 42c-9-5-15-12-17-20" stroke="#e9fff1" strokeWidth="1.4" fill="none" opacity=".7" />
      <path d="M49 34c8-6 14-14 17-24" stroke="#e9fff1" strokeWidth="1.4" fill="none" opacity=".7" />
    </svg>
  );
}

export function Sprout({ className, title }: SvgProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...a11y(title)}>
      <path d="M16 29V15" stroke="#139459" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 18C8 18 4 12 4 6c8 0 12 5 12 12z" fill="#21b66f" />
      <path d="M16 15c7 0 11-6 11-12-7 0-11 5-11 12z" fill="#4fd98a" />
    </svg>
  );
}

export function Target({ className, title }: SvgProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...a11y(title)}>
      <ellipse cx="30" cy="58" rx="18" ry="3.5" fill="#102b63" opacity=".1" />
      <circle cx="30" cy="32" r="24" fill="#ff5a4f" />
      <circle cx="30" cy="32" r="18" fill="#fff" />
      <circle cx="30" cy="32" r="12" fill="#ff5a4f" />
      <circle cx="30" cy="32" r="6" fill="#fff" />
      <circle cx="30" cy="32" r="2.5" fill="#ff5a4f" />
      <path d="M31 31L52 10" stroke="#102b63" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 6l2 6 6 2-5 5-6-2-2-6z" fill="#1769f6" />
    </svg>
  );
}

/** Low skyline strip used above the bottom nav on Home and Learn headers. */
export function Skyline({ className, title }: SvgProps) {
  return (
    <svg viewBox="0 0 360 64" preserveAspectRatio="xMidYMax slice" className={className} {...a11y(title)}>
      <g opacity=".95">
        <rect x="8" y="26" width="28" height="38" rx="3" fill="#d7e5ff" />
        <rect x="40" y="12" width="32" height="52" rx="3" fill="#e5deff" />
        <rect x="76" y="30" width="24" height="34" rx="3" fill="#cfe9e6" />
        <circle cx="116" cy="46" r="14" fill="#9fe0b4" />
        <rect x="132" y="20" width="30" height="44" rx="3" fill="#d7e5ff" />
        <rect x="166" y="34" width="46" height="30" rx="3" fill="#fff" />
        <path d="M162 34h54l-4 9h-46z" fill="#ffbc32" />
        <rect x="216" y="8" width="30" height="56" rx="3" fill="#e5deff" />
        <rect x="250" y="28" width="26" height="36" rx="3" fill="#d7e5ff" />
        <circle cx="292" cy="44" r="16" fill="#9fe0b4" />
        <rect x="308" y="18" width="30" height="46" rx="3" fill="#cfe9e6" />
        <circle cx="348" cy="48" r="12" fill="#b6e9c6" />
      </g>
      <g fill="#fff" opacity=".8">
        <rect x="46" y="20" width="6" height="6" rx="1" />
        <rect x="58" y="20" width="6" height="6" rx="1" />
        <rect x="46" y="32" width="6" height="6" rx="1" />
        <rect x="58" y="32" width="6" height="6" rx="1" />
        <rect x="222" y="16" width="6" height="6" rx="1" />
        <rect x="234" y="16" width="6" height="6" rx="1" />
        <rect x="222" y="28" width="6" height="6" rx="1" />
        <rect x="234" y="28" width="6" height="6" rx="1" />
        <rect x="138" y="28" width="6" height="6" rx="1" />
        <rect x="150" y="28" width="6" height="6" rx="1" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Goals                                                                */
/* ------------------------------------------------------------------ */

function Bike() {
  return (
    <g>
      <circle cx="26" cy="58" r="17" fill="none" stroke="#102b63" strokeWidth="5" />
      <circle cx="94" cy="58" r="17" fill="none" stroke="#102b63" strokeWidth="5" />
      <circle cx="26" cy="58" r="3" fill="#102b63" />
      <circle cx="94" cy="58" r="3" fill="#102b63" />
      <path d="M26 58l20-30h34L94 58M46 28l14 30 20-30M60 58H26" stroke="#ff5a4f" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M40 20h14" stroke="#102b63" strokeWidth="5" strokeLinecap="round" />
      <path d="M80 28l-4-12h10" stroke="#102b63" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Gamepad() {
  return (
    <g>
      <path d="M30 22h60c14 0 22 14 24 32 2 14-10 20-18 12l-10-10H34L24 66c-8 8-20 2-18-12 2-18 10-32 24-32z" fill="#5a4bd8" />
      <path d="M30 22h60c14 0 22 14 24 32-4-12-12-20-24-20H30C18 34 10 42 6 54c2-18 10-32 24-32z" fill="#6d5ff0" />
      <path d="M32 38v16M24 46h16" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="84" cy="40" r="4.5" fill="#ffbc32" />
      <circle cx="94" cy="48" r="4.5" fill="#ff5a4f" />
      <circle cx="74" cy="48" r="4.5" fill="#21b66f" />
      <circle cx="84" cy="56" r="4.5" fill="#55cfc6" />
    </g>
  );
}

function GradCap() {
  return (
    <g>
      <path d="M36 44v16c0 8 48 8 48 0V44z" fill="#1d3f86" />
      <path d="M60 14L8 36l52 22 52-22z" fill="#1769f6" />
      <path d="M60 14l52 22-52 22z" fill="#0f57e8" />
      <path d="M96 42v18" stroke="#ffbc32" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M92 60h8l2 10h-12z" fill="#ffbc32" />
    </g>
  );
}

function Island() {
  return (
    <g>
      <ellipse cx="60" cy="68" rx="52" ry="8" fill="#55cfc6" opacity=".6" />
      <ellipse cx="54" cy="62" rx="34" ry="9" fill="#ffd27a" />
      <path d="M58 60c2-16 4-30 12-42" stroke="#a0643a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M70 18c-12-4-24 0-30 8 10-2 20-2 30-8z" fill="#21b66f" />
      <path d="M70 18c10-8 22-8 30 0-10 0-20 0-30 0z" fill="#21b66f" />
      <path d="M70 18c-4 10-12 16-22 18 4-8 12-14 22-18z" fill="#4fd98a" />
      <path d="M70 18c8 6 12 14 12 22-6-6-10-14-12-22z" fill="#4fd98a" />
      <circle cx="98" cy="20" r="8" fill="#ffbc32" />
    </g>
  );
}

function Piggy() {
  return (
    <g>
      <ellipse cx="58" cy="44" rx="36" ry="28" fill="#ff8fb3" />
      <ellipse cx="58" cy="40" rx="30" ry="20" fill="#ffa3c2" />
      <path d="M36 22l-4-12 14 8z" fill="#ff7aa8" />
      <ellipse cx="92" cy="46" rx="10" ry="8" fill="#ff7aa8" />
      <circle cx="89" cy="45" r="1.8" fill="#b83d69" />
      <circle cx="95" cy="45" r="1.8" fill="#b83d69" />
      <circle cx="78" cy="34" r="3" fill="#3a2238" />
      <rect x="36" y="66" width="10" height="12" rx="4" fill="#ff7aa8" />
      <rect x="66" y="66" width="10" height="12" rx="4" fill="#ff7aa8" />
      <rect x="48" y="16" width="18" height="4" rx="2" fill="#b83d69" />
      <circle cx="57" cy="8" r="7" fill="#ffbc32" />
      <circle cx="57" cy="8" r="4.5" fill="#ffd36b" />
    </g>
  );
}

const GOAL_ART: Record<GoalId, () => React.JSX.Element> = {
  bike: Bike,
  gaming: Gamepad,
  college: GradCap,
  trip: Island,
  "first-1000": Piggy,
};

export function GoalArt({ goal, className, title }: SvgProps & { goal: GoalId }) {
  const Art = GOAL_ART[goal];
  return (
    <svg viewBox="0 0 120 84" className={className} {...a11y(title)}>
      <Art />
    </svg>
  );
}
