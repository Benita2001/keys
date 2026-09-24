import { useId } from "react";
import type { AchievementId } from "@/domain/types";

function Medal({ id, from, to, children }: { id: string; from: string; to: string; children: React.ReactNode }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <ellipse cx="40" cy="74" rx="20" ry="3.5" fill="#102b63" opacity=".08" />
      {children}
    </>
  );
}

export function BadgeArt({ badge, earned = true, className }: { badge: AchievementId; earned?: boolean; className?: string }) {
  const id = useId();
  const art = (() => {
    switch (badge) {
      case "first-investor":
        return (
          <Medal id={id} from="#ffcf4a" to="#ff9a2e">
            <path d="M40 4l30 12v22c0 18-14 30-30 36C24 68 10 56 10 38V16z" fill={`url(#${id}m)`} />
            <path d="M40 10l24 10v18c0 14-11 24-24 29-13-5-24-15-24-29V20z" fill="#ffd66b" />
            <path d="M40 22l5 10 11 1.5-8 7.5 2 11-10-5.5-10 5.5 2-11-8-7.5L35 32z" fill="#fff" />
          </Medal>
        );
      case "streak-5":
        return (
          <Medal id={id} from="#ff9a3d" to="#ea4b3a">
            <path d="M40 4l30 12v22c0 18-14 30-30 36C24 68 10 56 10 38V16z" fill="#ffe3cf" />
            <path d="M40 16c10 10 18 18 18 30a18 18 0 01-36 0c0-8 4-12 8-16 0 6 2 9 5 10-1-10 1-18 5-24z" fill={`url(#${id}m)`} />
            <path d="M40 38c5 5 8 8 8 13a8 8 0 01-16 0c0-4 3-8 8-13z" fill="#ffd36b" />
          </Medal>
        );
      case "company-detective":
        return (
          <Medal id={id} from="#ffcf4a" to="#f5a524">
            <circle cx="36" cy="34" r="22" fill={`url(#${id}m)`} />
            <circle cx="36" cy="34" r="15" fill="#dff1ff" />
            <path d="M28 38l5-7 5 4 7-9" stroke="#1769f6" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M52 50l14 14" stroke="#8b5a2b" strokeWidth="8" strokeLinecap="round" />
          </Medal>
        );
      case "diversification-pro":
        return (
          <Medal id={id} from="#1769f6" to="#0f57e8">
            <circle cx="40" cy="38" r="28" fill="#ffffff" />
            <path d="M40 38V10a28 28 0 0126.6 19.3z" fill="#1769f6" />
            <path d="M40 38l26.6-8.7A28 28 0 0156.5 60.6z" fill="#21b66f" />
            <path d="M40 38l16.5 22.6A28 28 0 0115 50.5z" fill="#ffbc32" />
            <path d="M40 38L15 50.5A28 28 0 0140 10z" fill="#ff7aa8" />
            <circle cx="40" cy="38" r="9" fill="#fff" />
          </Medal>
        );
      case "money-master":
        return (
          <Medal id={id} from="#ffcf4a" to="#f08c1e">
            <path d="M40 4l30 12v22c0 18-14 30-30 36C24 68 10 56 10 38V16z" fill={`url(#${id}m)`} />
            <path d="M22 30l8 8 10-14 10 14 8-8-4 22H26z" fill="#fff4cf" />
            <circle cx="40" cy="44" r="4" fill="#ff5a4f" />
          </Medal>
        );
      case "ten-lessons":
      default:
        return (
          <Medal id={id} from="#ff6b8a" to="#e2445f">
            <path d="M12 16c10-4 20-4 28 2v50c-8-6-18-6-28-2z" fill={`url(#${id}m)`} />
            <path d="M68 16c-10-4-20-4-28 2v50c8-6 18-6 28-2z" fill="#ff8ba3" />
            <path d="M18 26c6-2 12-2 16 1M18 34c6-2 12-2 16 1M46 27c4-3 10-3 16-1M46 35c4-3 10-3 16-1" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".85" />
            <circle cx="60" cy="56" r="11" fill="#1769f6" />
            <text x="60" y="60.5" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">10</text>
          </Medal>
        );
    }
  })();
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden style={earned ? undefined : { filter: "grayscale(1)", opacity: 0.45 }}>
      {art}
    </svg>
  );
}
