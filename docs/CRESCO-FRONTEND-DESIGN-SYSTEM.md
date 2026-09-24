# Cresco — Frontend Design System

Status: **Implemented in `apps/web`**. This is the frontend source of truth (the Hackathon OS `DESIGN.md` for the consumer app).
Visual reference: the approved 10-screen mockup board. Product spec: `CRESCO-FRONTEND-DESIGN-SPEC.md`. Backend truth: `docs/TRUTH-BOUNDARY.md`.

Cresco is the consumer brand. KEYS is the bounded-autonomy protocol and backend underneath it; that naming is unchanged.

---

## 1. Product context and surface modes

| Surface | Mode | Optimizes for |
|---|---|---|
| Welcome (`/`) | Persuade | One idea, one action: *Start Learning* |
| Onboarding, lessons | Read / Experience | Comprehension, delight, one decision per screen |
| Home, Explore, Portfolio, Invest | Operate | Scanability, clear state, obvious next action |
| Parent area (`/parent`) | Operate (calm) | Trust, limits, decisions, not surveillance |

**Visual thesis:** a bright, warm storybook-fintech: cream paper background, royal-blue actions, green growth, warm reward colors, soft white cards, and friendly dimensional illustration where learning happens. Money data stays clean and legible.

**Product principle rendered in UI:** *Learn in context. Act freely inside bounds. Ask for more freedom only at the boundary.*

**Aesthetic risk (deliberate):** hand-built SVG illustration scenes (kid + plant + city, Tony's Pizza, goal objects, medals) instead of stock art or gradient blobs. They're original, in-repo, theme-consistent and zero-network.

**Anti-references:** dark trading terminals, crypto exchanges, glassmorphism, neon, purple AI-SaaS gradients, LMS course grids, casino/slot motion.

---

## 2. Tokens

Defined once in `apps/web/src/app/globals.css` as CSS variables and exposed to Tailwind v4 via `@theme inline`.

### Color

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--cresco-bg` | `#fff9f1` | `bg-bg` | App background (warm) |
| `--cresco-surface` | `#ffffff` | `bg-surface` | Cards |
| `--cresco-surface-soft` | `#f7faff` | `bg-surface-soft` | Insets, locked rows |
| `--cresco-blue` | `#1769f6` | `blue` | Primary actions, active nav, selected mode, links |
| `--cresco-blue-strong` | `#0f57e8` | `blue-strong` | Hover/pressed |
| `--cresco-blue-soft` | `#eaf2ff` | `blue-soft` | Ghost buttons, info banners |
| `--cresco-navy` / `-strong` | `#102b63` / `#08235b` | `navy`, `navy-strong` | Text, Money-mode surfaces |
| `--cresco-text-secondary` | `#5d6a80` | `ink-2` | Secondary text (5.2:1 on cream) |
| `--cresco-text-muted` | `#637084` | `ink-3` | Captions, metadata (4.8:1 on cream) |
| `--cresco-green` / `-strong` / `-soft` | `#21b66f` / `#0c7a47` / `#e8f8ef` | `green*` | Gains, completion, healthy diversification, Practice hero |
| `--cresco-yellow` / `--cresco-orange` / `-soft` | `#ffbc32` / `#ff8a3d` / `#fff5d8` | `yellow`, `orange`, `yellow-soft` | XP, streaks, missions, rewards, demo labels |
| `--cresco-lavender` / `-soft` | `#8b75f7` / `#f0edff` | `lavender*` | Learning categories |
| `--cresco-aqua` / `-soft` | `#55cfc6` / `#e8faf8` | `aqua*` | Learning categories |
| `--cresco-pink` / `-soft` | `#ff7aa8` / `#ffeef4` | `pink*` | Goal cards, "Things to know" |
| `--cresco-loss` / `-soft` | `#eb5757` / `#fff0f0` | `loss*` | Loss fills, real errors only |
| `--cresco-orange-text` | `#a64d0b` | `orange-text` | XP / reward **text** (4.6:1+ on yellow-soft) |
| `--cresco-loss-text` | `#c8373a` | `loss-text` | Loss **text** (5.2:1 on white) |
| `--cresco-warning` | `#d98a13` | `warning` | Stale / delayed |
| `--cresco-border` / `-soft` | `#dce6f2` / `#ebf0f6` | `line`, `line-soft` | Borders |

Semantic rules:
- Green means growth/completion, never just "money". Money Mode surfaces use **navy**, not green.
- Red appears only for actual losses and real errors. Boundary refusals use **warm orange**, not red, because they aren't failures.
- Status is never color-only: gains/losses carry ▲/▼ or ↗/↘ icons, signs, and screen-reader text (`PriceChange`).

### Type

One family: **Nunito Sans** (via `next/font/google`, `display: swap`, variable weights).
Why: rounded terminals read friendly without being childish, heavy weights hold large display sizes, and numerals render well with `tabular-nums` (`.tabular`).

| Role | Size / weight / leading |
|---|---|
| Display (welcome) | 34px / 900 / 1.08 (desktop board headline 56px / 900) |
| Page title | 28px / 800–900 / 1.15 |
| Section title | 18px / 800 |
| Card title | 15–17px / 800 |
| Body | 14–15px / 600 / 1.45–1.6 |
| Caption | 11.5–13px / 600–700 |
| Label / chip | 12.5–13.5px / 700–800 |
| Primary money value | 30–34px / 800–900, tabular |
| Secondary money value | 16–22px / 800, tabular |

No text below 11px. Text colors were measured (hackathon-quality pass): `ink-2`, `ink-3`, `green-strong`, `orange-text`, `loss-text` and white-on-hero all meet WCAG AA 4.5:1 on the surfaces they are used on. Brand **fills** keep the spec values; darker **text** variants exist where the fill color is too light for text. The spec allowed slight token adjustment for contrast (§7). The Practice hero green is deeper than the mockup (`#10864f → #0b6e40`) so its white text passes AA.

### Spacing and geometry

8px base, 4px micro. Page gutter 20px mobile, 32px tablet, 40px desktop. Section gap 20–24px. Card gap 12px.

| Radius | Use |
|---|---|
| 10–11px | Chips, small controls |
| 14–15px | Buttons, inputs |
| 18–20px | Standard cards |
| 22–24px | Hero / feature cards |
| 28px | Sheets, modals |

Borders: `1px line-soft` by default; 2px only for selected states (goal cards, quiz options, decision options).
Shadows: `shadow-card` (sheets, overlapping identity card), `shadow-soft` (hover), `shadow-button` (primary CTA). Most cards have no shadow.

---

## 3. Components

All in `apps/web/src/components/`. Components consume hooks/services, never mock modules for prices.

| Spec name | Implementation |
|---|---|
| AppShell, MobileBottomNavigation, DesktopNavigation | `shell.tsx` |
| PageHeader, ActionButton, SecondaryButton, BackButton, Chip, PeriodSelector, SearchInput, ProgressBar, Toggle, Avatar, XPBadge, StreakBadge, IconCircle, Card, SectionHeader | `ui/primitives.tsx` |
| Skeleton, EmptyState, ErrorState, OfflineState, Toast, DataStatusTag, DemoMoneyTag | `ui/feedback.tsx` |
| BottomSheet, Modal | `ui/overlay.tsx` (focus trap, Esc, scroll lock, portal) |
| ModeSwitch, MoneyIntroSheet, PracticeHeroCard, MoneyHeroCard, MoneyBalanceCard, MandateSummaryCard, LimitRow, BoundaryMessage, BoundaryRequestSheet, RequestStatusCard, MoneyModeUnavailable | `mode.tsx` |
| CompanyLogo, PriceChange, MiniSparkline, PriceChart, AllocationChart, WeeklyBars, CompanyCard, HoldingRow, InsightBanner | `finance.tsx` |
| MissionCard, LessonCard, ModuleRow, LessonProgress, QuizOption, AchievementBadge, GoalCard | `learning.tsx` |
| Illustrations | `illustrations/{people,objects,scenes,badges}.tsx` |

**Company identity:** `CompanyLogo` renders a brand-colored lettermark tile (e.g. Netflix "N" red on black, McDonald's "M" gold on red). It does not reproduce trademarked logos.

**Cards** are used only for real objects (a company, a holding list, a limit set, a request). Section structure otherwise uses whitespace and headers.

---

## 4. Practice / Money mode semantics

One `ModeSwitch` (sliding segmented control) drives global `state.mode`. The same screens render mode-specific content; nothing is duplicated.

| | Practice | Money |
|---|---|---|
| Hero | Green "Practice Portfolio" card | Navy "Money Portfolio" card + current limit line |
| Label | "Virtual money · sample prices" | `Demo money` tag everywhere a balance appears |
| Company CTA | **Add to Practice Portfolio** | Evaluated: **Invest $5** / **Practice this instead** / **Not available in Money Mode** / paused state |
| Invest | Virtual cash, instant | Mandate decision → ALLOW immediately, or boundary |

Bounded-autonomy UX rules (from `docs/CONCEPT-LOCK.md`):
1. **Inside the Mandate → act now.** No approval screen. The success screen literally says "allowed with no parent approval needed".
2. **Outside → explain + options.** `BoundaryMessage`: *This is outside your current limit.* + amounts, then **Ask for more room** (only when `boundaryRequestAvailable`), **Adjust amount**, **Practice instead**.
3. **Ask** is one short line (≤140 chars), private, never on-chain.
4. **Guardian decides:** Allow once / Widen limits (before→after diff + explicit confirm, new version) / Not this time (optional note).
5. **Learning, XP, badges, P&L never change limits.** Stated in Learn, Wins, My limits, lesson completion. Enforced by tests.
6. **Never silently fall back from Money to Practice.** Unavailable states explain why (parent not linked, paused, asset unavailable, backend unreachable).

First Money selection opens `MoneyIntroSheet` (activation explainer + demo disclosure).

---

## 5. Screen map

| # | Mockup screen | Route |
|---|---|---|
| 1 | Welcome / Onboarding | `/` |
| – | Child entry (demo sign-in) | `/start` |
| 2 | Personalization (step 2 of 4) | `/onboarding/about` → `/goal` → `/interests` → `/ready` |
| 3 | Home Dashboard | `/home` |
| 4 | Learn | `/learn` |
| 5 | Interactive Lesson | `/lesson/[id]` |
| 6 | Explore | `/explore` |
| 7 | Company Detail | `/explore/[ticker]` |
| 8 | Portfolio | `/portfolio` |
| 9 | Achievements ("Your Wins") | `/profile/wins` |
| 10 | Parent Dashboard | `/parent` |
| – | Invest flow (practice + money + boundary + request) | `/invest/[ticker]?mode=&amount=` |
| – | Profile, My limits, parent link, How Cresco works + demo controls | `/profile`, `/profile/limits`, `/profile/parent`, `/profile/about` |
| – | Parent sign-in, limits, guardian decision, add money, settings | `/parent/sign-in`, `/parent/limits`, `/parent/requests/[id]`, `/parent/add-money`, `/parent/settings` |

Bottom nav order is fixed: Home · Learn · Explore · Portfolio · Profile. Wins lives under Profile.

---

## 6. Responsive behavior

| Width | Shell | Composition |
|---|---|---|
| < 768px | Fixed bottom tab bar (72px + safe area) | Closest fidelity to the mockup; single column |
| 768–1023px | 92px icon+label side rail | Single column, wider cards, 2-col company grid |
| ≥ 1024px | 248px rail with wordmark + profile chip | Home: main + 340px companion column (goal, wins, limits). Company detail: chart/identity left, about/CTA sticky right. Portfolio: summary left, holdings right. Parent: 3-column grid. Welcome: board headline + pillars left, welcome card right |

Full-screen flows (lesson, invest, onboarding) are centered at ≤560px and hide the tab bar. Company Detail hides the tab bar on phones (mockup screen 7) and keeps its CTAs inline.

No horizontal overflow at 375px (checked in browser). Grids use explicit `grid-cols-1` so wide content can't widen the implicit track.

---

## 7. Motion

| Motion | Duration | Where |
|---|---|---|
| Controls (mode slide, chips, toggles) | 150–220ms | `ModeSwitch`, `Toggle`, `Chip` |
| Page/card entrance (`animate-rise`) | 320ms | Every screen root |
| Sheet rise (`animate-sheet`) | 340ms | `BottomSheet` |
| Celebration (`animate-bloom`) | 560ms | Correct answer, lesson complete, goal select, success plant |
| Progress fill | 500ms | XP, module, lesson progress |

No confetti, pulsing CTAs or flashing P&L. `prefers-reduced-motion` reduces all animation/transition to ~0.

---

## 8. Copy

Concise, respectful, non-patronizing. Prefer: *This is outside your current limit.* / *Practice instead* / *View transaction details* / *Not this time*. Avoid: *denied*, *failed*, *testnet*, *signature*, *little investor*.
Blockchain vocabulary appears only in secondary metadata ("AAPLx on Solana") and in *How Cresco works → Technical details*.

---

## 9. Accessibility

- Semantic landmarks, skip link, one `h1` per screen.
- Radiogroups for mode, goals, quiz options, decision options; tabs for Wins; `role="switch"` toggles; `role="progressbar"` with values.
- Visible focus ring (`:focus-visible`, 3px blue); sheets trap focus, close on Esc and restore focus.
- 44px+ touch targets on nav, back buttons and CTAs.
- Charts have `aria-label` summaries (start, end, direction, %); donut lists every slice.
- Informative illustrations have labels; decorative ones are `aria-hidden`.
- Gains/losses use icon + sign + text, not color alone.
- Reduced motion respected.

---

## 10. Trust and truth labels

| Claim | Visible evidence |
|---|---|
| Prices | `DataStatusTag`: **Sample prices** (mock), **Live · Pyth** only when the KEYS backend returns FRESH evidence (TSLA only today) |
| Money balance | **Demo money** tag on every Money balance |
| Money action | Success says demo; *View transaction details* shows `On-chain: Not sent. No transaction exists for this action.` and whether the decision came from the KEYS backend (draft) or the local preview |
| Funding | "Demo mode: no bank or card is connected, and no payment is taken." |
| Sign-in | "Demo sign-in: Cresco doesn't create an account…" |
| Learning vs authority | Stated on Learn, Wins, My limits, lesson completion |

Content stress: long names truncate in lists but wrap in headers; amounts use tabular numerals; empty portfolio, zero results, market-data failure, slow network and paused Money Mode all have designed states (toggle them in **Profile → How Cresco works → Demo controls**).
