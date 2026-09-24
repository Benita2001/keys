/**
 * Cresco frontend domain types.
 *
 * Names that map to the KEYS v0.2 draft contract
 * (docs/FRONTEND-BACKEND-CONTRACT-V0.2-DRAFT.md) keep the backend vocabulary:
 * currentMandate, assetRule, actionEvaluation, learningContext,
 * boundaryRequest, executionProof.
 */

export type Mode = "practice" | "money";

export type DataStatus = "mock" | "live" | "stale";

export type AssetCategory = "Technology" | "Consumer" | "Retail" | "Funds";

export type MarketAsset = {
  id: string;
  companyName: string;
  /** Consumer ticker, e.g. AAPL. Primary identity in the UI. */
  ticker: string;
  /** Tokenized mapping, e.g. AAPLx. Secondary metadata only. */
  tokenizedTicker: string;
  category: AssetCategory;
  /** One-line, kid-friendly business description. */
  shortDescription: string;
  /** Plain-language "What does this company do?" paragraph. */
  about: string;
  thingsToKnow: ThingToKnow[];
  price: number;
  dayChangePercent: number;
  brand: { background: string; foreground: string; mark: string };
  network: "solana";
  provider: "xstocks" | "demo";
  priceSource: "pyth" | "mock";
  dataStatus: DataStatus;
  practiceEnabled: boolean;
  moneyModeStatus: "demo" | "eligible" | "unavailable" | "unknown";
  /** ISO time of the price observation when live. */
  asOf?: string;
};

export type ThingToKnow = {
  icon: "devices" | "globe" | "heart" | "swords" | "film" | "cart" | "chip" | "burger" | "car" | "cloud" | "users" | "basket" | "bolt";
  text: string;
  tone: "blue" | "green" | "orange" | "lavender" | "aqua" | "pink";
};

export type Period = "1D" | "1W" | "1M" | "1Y" | "All";

export type PricePoint = { t: number; v: number };

export type Holding = {
  ticker: string;
  shares: number;
  /** Total cost basis in USD. */
  costBasis: number;
};

export type HoldingView = Holding & {
  asset: MarketAsset;
  value: number;
  change: number;
  changePercent: number;
  weight: number;
};

export type PortfolioView = {
  mode: Mode;
  holdings: HoldingView[];
  totalValue: number;
  totalCost: number;
  totalChange: number;
  totalChangePercent: number;
  cash: number;
  dataStatus: DataStatus;
};

/* ------------------------------------------------------------------ */
/* Authority (maps to KEYS v0.2 draft)                                */
/* ------------------------------------------------------------------ */

export type MandateStatus = "ACTIVE" | "PAUSED" | "REVOKED";

/** currentMandate — the guardian-authored permission envelope. */
export type CurrentMandate = {
  status: MandateStatus;
  version: number;
  nonce: number;
  familyStage: "LEARN" | "PRACTICE" | "PROPOSE" | "BOUNDED" | "INDEPENDENT";
  /** Per-action notional limit, USD. */
  maxActionNotional: number;
  /** Per-period notional limit, USD. */
  maxPeriodNotional: number;
  periodLabel: string;
  spentThisPeriod: number;
  /** Tickers inside the Mandate. */
  allowedAssets: string[];
  allowedActions: ActionType[];
  expiresAt?: string;
  updatedAt: string;
};

export type ActionType = "BUY" | "SELL";

/** assetRule — per-asset view of the Mandate, as the backend evaluates it. */
export type AssetRule = {
  asset: string;
  enabled: boolean;
  allowedActions: ActionType[];
  maxActionNotional: number;
  maxPeriodNotional: number;
  spentThisPeriod: number;
  requiresMarketEvidence: boolean;
  maxMarketAgeSeconds?: number;
  maxConfidenceBps?: number;
  firstUse?: boolean;
};

export type Decision = "ALLOW" | "ESCALATE" | "REFUSE";

export type ReasonCode =
  | "WITHIN_MANDATE"
  | "MANDATE_NOT_ACTIVE"
  | "MANDATE_REVOKED"
  | "MANDATE_EXPIRED"
  | "STALE_NONCE"
  | "ASSET_OUTSIDE_MANDATE"
  | "ACTION_OUTSIDE_MANDATE"
  | "MARKET_EVIDENCE_UNAVAILABLE"
  | "MARKET_EVIDENCE_STALE"
  | "MARKET_CONFIDENCE_TOO_WIDE"
  | "MARKET_CONDITION_INVALIDATED"
  | "INVALID_AMOUNT"
  | "MANDATE_LIMIT_EXCEEDED"
  | "PERIOD_LIMIT_EXCEEDED"
  /** Frontend-side balance check; not part of the backend policy facade. */
  | "INSUFFICIENT_BALANCE"
  | "ASSET_UNAVAILABLE"
  /** Backend unreachable: fail closed, never ALLOW. */
  | "DECISION_UNAVAILABLE"
  /** Execute call outcome is not known yet (timeout / dropped connection). */
  | "EXECUTION_UNCONFIRMED";

export type MarketEvidence = {
  source: "PYTH_PRO" | "MOCK";
  status: "FRESH" | "STALE" | "UNAVAILABLE";
  price?: number;
  ageSeconds?: number;
  confidenceBps?: number;
};

/** actionEvaluation — ALLOW / ESCALATE / REFUSE with a reason. */
export type ActionEvaluation = {
  decision: Decision;
  reasonCode: ReasonCode;
  requestedNotional?: number;
  standingLimit?: number;
  remainingPeriodNotional?: number;
  boundaryRequestAvailable?: boolean;
  guardianApprovalRequired?: boolean;
  mandateVersion?: number;
  mandateNonce?: number;
  /** Where the decision came from. "local-preview" is never authority. */
  source: "keys-backend" | "keys-runtime" | "local-preview";
};

/** learningContext — short contextual explanation. Never a score. */
export type LearningContext = {
  kind: "BOUNDARY" | "MARKET_CHANGE" | "FIRST_USE" | "CONTEXT";
  title: string;
  body: string;
  practiceAvailable: boolean;
};

export type GuardianDecision = "ALLOW_ONCE" | "WIDEN_MANDATE" | "REFUSE";

export type BoundaryRequestStatus =
  | "PENDING_HUMAN_DECISION"
  | "ALLOWED_ONCE"
  | "ALLOWED_ONCE_USED"
  | "WIDENED"
  | "REFUSED";

/** boundaryRequest — a short request for more room, decided by a human. */
export type BoundaryRequest = {
  id: string;
  status: BoundaryRequestStatus;
  mandateVersion: number;
  mandateNonce: number;
  asset: string;
  actionType: ActionType;
  requestedNotional: number;
  standingLimit: number;
  reasonCode: ReasonCode;
  /** Child's short reason. Private: never written on-chain. */
  reason: string;
  createdAt: string;
  decidedAt?: string;
  guardianNote?: string;
};

export type ProofStatus =
  | "DEMO_NOT_EXECUTED"
  | "PRACTICE_LOCAL"
  /** Submitted to the runtime, not yet confirmed. Re-check with the same idempotency key. */
  | "RUNTIME_PENDING"
  | "RUNTIME_CONFIRMED";

/** executionProof — what actually happened. */
export type ExecutionProof = {
  status: ProofStatus;
  network?: "solana-devnet";
  signature?: string;
  programId?: string;
  mandateVersion?: number;
  mandateNonce?: number;
  executedAt: string;
  /**
   * True when a test server produced this proof (no Solana transaction exists).
   * The UI never links a simulated signature to an explorer.
   */
  simulated?: boolean;
  idempotencyKey?: string;
};

/**
 * EXECUTED — confirmed by the runtime (or demo/practice, per proof status).
 * REFUSED  — the Mandate or evidence said no; nothing happened.
 * PENDING  — submitted, not confirmed yet.
 * UNKNOWN  — the request may or may not have executed (timeout, dropped
 *            connection, malformed response). Never shown as success or
 *            failure; the user re-checks with the same idempotency key.
 */
export type ExecutionOutcome = "EXECUTED" | "REFUSED" | "PENDING" | "UNKNOWN";

export type ExecutionResult = {
  ok: boolean;
  outcome: ExecutionOutcome;
  evaluation: ActionEvaluation;
  proof?: ExecutionProof;
  ticker: string;
  amount: number;
  shares?: number;
  idempotencyKey?: string;
};

/* ------------------------------------------------------------------ */
/* Learning                                                            */
/* ------------------------------------------------------------------ */

export type IllustrationKey =
  | "piggy"
  | "storefront"
  | "pizza"
  | "chart"
  | "scale"
  | "basket"
  | "shares";

export type LessonStep =
  | {
      kind: "concept";
      title: string;
      body: string;
      illustration: IllustrationKey;
      caption?: string;
    }
  | {
      kind: "quiz";
      title: string;
      illustration: IllustrationKey;
      prompt: string;
      question: string;
      options: { id: string; label: string }[];
      correctId: string;
      correctExplanation: string;
      retryHint: string;
    };

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  minutes: number;
  xp: number;
  steps: LessonStep[];
};

export type ModuleIcon = "coins" | "building" | "pie" | "trend" | "scale" | "layers";

export type LearningModule = {
  id: string;
  title: string;
  subtitle: string;
  xp: number;
  icon: ModuleIcon;
  tone: "green" | "blue" | "lavender" | "orange" | "aqua" | "pink";
  lessonIds: string[];
};

export type ModuleState = "complete" | "current" | "locked";

/* ------------------------------------------------------------------ */
/* Profile / progress                                                  */
/* ------------------------------------------------------------------ */

export type GoalId = "bike" | "gaming" | "college" | "trip" | "first-1000";

export type Goal = {
  id: GoalId;
  label: string;
  target: number;
  tone: "blue" | "pink" | "yellow" | "aqua" | "rose";
};

export type AchievementId =
  | "first-investor"
  | "streak-5"
  | "company-detective"
  | "diversification-pro"
  | "money-master"
  | "ten-lessons";

export type Achievement = {
  id: AchievementId;
  title: string;
  caption: string;
  earned: boolean;
};

export type Challenge = {
  id: string;
  title: string;
  caption: string;
  progress: number;
  target: number;
  xp: number;
};

export type Session = {
  role: "child" | "parent";
  displayName: string;
  /** Always "demo" until an auth provider is integrated. */
  kind: "demo";
};
