/**
 * Local preview of the KEYS bounded-autonomy policy.
 *
 * This mirrors `evaluateBoundedAction` in the repository's
 * `src/bounded-autonomy.mjs` so the UI can explain limits instantly while the
 * user types an amount. A parity test (src/domain/policy.test.ts) runs the same
 * cases through the backend module.
 *
 * A local preview is NEVER authority: the decision that gates a Money action
 * comes from MoneyExecutionService (backend when configured). Learning, XP, P&L
 * and quiz results are deliberately not inputs to this function.
 */
import type {
  ActionEvaluation,
  ActionType,
  AssetRule,
  CurrentMandate,
  LearningContext,
  MarketEvidence,
  ReasonCode,
} from "./types";

export type EvaluateInput = {
  mandate: CurrentMandate | null;
  assetRule: AssetRule | null;
  action: { asset: string; type: ActionType; notional: number; expectedNonce?: number };
  market?: MarketEvidence | null;
  now?: string;
};

function refuse(reasonCode: ReasonCode, extra: Partial<ActionEvaluation> = {}): ActionEvaluation {
  return { decision: "REFUSE", reasonCode, source: "local-preview", ...extra };
}

export function evaluateBoundedAction({
  mandate,
  assetRule,
  action,
  market = null,
  now = new Date().toISOString(),
}: EvaluateInput): ActionEvaluation {
  if (!mandate || mandate.status !== "ACTIVE") {
    return refuse(mandate?.status === "REVOKED" ? "MANDATE_REVOKED" : "MANDATE_NOT_ACTIVE");
  }

  if (mandate.expiresAt && Date.parse(now) > Date.parse(mandate.expiresAt)) {
    return refuse("MANDATE_EXPIRED");
  }

  if (action.expectedNonce != null && action.expectedNonce !== mandate.nonce) {
    return refuse("STALE_NONCE");
  }

  if (!assetRule || !assetRule.enabled || assetRule.asset !== action.asset) {
    return refuse("ASSET_OUTSIDE_MANDATE");
  }

  if (!assetRule.allowedActions.includes(action.type)) {
    return refuse("ACTION_OUTSIDE_MANDATE");
  }

  if (assetRule.requiresMarketEvidence) {
    if (!market || market.status !== "FRESH") return refuse("MARKET_EVIDENCE_UNAVAILABLE");
    if (
      assetRule.maxMarketAgeSeconds != null &&
      market.ageSeconds != null &&
      market.ageSeconds > assetRule.maxMarketAgeSeconds
    ) {
      return refuse("MARKET_EVIDENCE_STALE");
    }
    if (
      assetRule.maxConfidenceBps != null &&
      market.confidenceBps != null &&
      market.confidenceBps > assetRule.maxConfidenceBps
    ) {
      return refuse("MARKET_CONFIDENCE_TOO_WIDE");
    }
  }

  const notional = Number(action.notional);
  if (!Number.isFinite(notional) || notional <= 0) {
    return refuse("INVALID_AMOUNT");
  }

  if (notional > assetRule.maxActionNotional) {
    return refuse("MANDATE_LIMIT_EXCEEDED", {
      boundaryRequestAvailable: true,
      requestedNotional: notional,
      standingLimit: assetRule.maxActionNotional,
    });
  }

  if (assetRule.spentThisPeriod + notional > assetRule.maxPeriodNotional) {
    return refuse("PERIOD_LIMIT_EXCEEDED", {
      boundaryRequestAvailable: true,
      requestedNotional: notional,
      remainingPeriodNotional: Math.max(0, assetRule.maxPeriodNotional - assetRule.spentThisPeriod),
    });
  }

  return {
    decision: "ALLOW",
    reasonCode: "WITHIN_MANDATE",
    guardianApprovalRequired: false,
    requestedNotional: notional,
    mandateVersion: mandate.version,
    mandateNonce: mandate.nonce,
    source: "local-preview",
  };
}

/** Project the family Mandate onto the backend's per-asset rule shape. */
export function assetRuleFor(mandate: CurrentMandate, ticker: string): AssetRule | null {
  if (!mandate.allowedAssets.includes(ticker)) return null;
  return {
    asset: ticker,
    enabled: true,
    allowedActions: mandate.allowedActions,
    maxActionNotional: mandate.maxActionNotional,
    maxPeriodNotional: mandate.maxPeriodNotional,
    spentThisPeriod: mandate.spentThisPeriod,
    // The local preview never acts as market-data authority. The real TSLA
    // devnet proof lane enforces signed Pyth evidence on-chain; this projected
    // rule remains market-neutral so typing in Cresco stays instant.
    requiresMarketEvidence: false,
  };
}

export function remainingThisPeriod(mandate: CurrentMandate): number {
  return Math.max(0, mandate.maxPeriodNotional - mandate.spentThisPeriod);
}

/** Largest amount that would currently be ALLOWed. */
export function maxAllowedNow(mandate: CurrentMandate, balance: number): number {
  if (mandate.status !== "ACTIVE") return 0;
  return Math.max(0, Math.min(mandate.maxActionNotional, remainingThisPeriod(mandate), balance));
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 ? 2 : 0 });

/**
 * Backend/program reason codes → the canonical codes the UI explains.
 * On-chain program errors arrive as Anchor error names.
 */
const REASON_ALIASES: Record<string, ReasonCode | "ALLOWANCE_USED" | "ALLOWANCE_INVALID" | "EXECUTION_REFUSED" | "PRACTICE_ONLY" | "DEMO_CAPACITY"> = {
  ActionAmountExceeded: "MANDATE_LIMIT_EXCEEDED",
  SOLANA_RPC_UNAVAILABLE: "DECISION_UNAVAILABLE",
  PythNotionalExceeded: "MANDATE_LIMIT_EXCEEDED",
  PYTH_NOTIONAL_EXCEEDED: "MANDATE_LIMIT_EXCEEDED",
  PeriodAmountExceeded: "PERIOD_LIMIT_EXCEEDED",
  PythPeriodNotionalExceeded: "PERIOD_LIMIT_EXCEEDED",
  PYTH_PERIOD_NOTIONAL_EXCEEDED: "PERIOD_LIMIT_EXCEEDED",
  MandateNotActive: "MANDATE_NOT_ACTIVE",
  MandateExpired: "MANDATE_EXPIRED",
  AssetRuleDisabled: "ASSET_OUTSIDE_MANDATE",
  ASSET_OUTSIDE_RUNTIME: "ASSET_UNAVAILABLE",
  ActionNotAllowed: "ACTION_OUTSIDE_MANDATE",
  MarketConditionInvalidated: "MARKET_CONDITION_INVALIDATED",
  PythEvidenceStale: "MARKET_EVIDENCE_STALE",
  PYTH_MARKET_EVIDENCE_STALE: "MARKET_EVIDENCE_STALE",
  PythConfidenceTooWide: "MARKET_CONFIDENCE_TOO_WIDE",
  PYTH_CONFIDENCE_TOO_WIDE: "MARKET_CONFIDENCE_TOO_WIDE",
  PythMessageInvalid: "MARKET_EVIDENCE_UNAVAILABLE",
  PythFeedMismatch: "MARKET_EVIDENCE_UNAVAILABLE",
  PYTH_SIGNATURE_VERIFICATION_FAILED: "MARKET_EVIDENCE_UNAVAILABLE",
  PYTH_FEED_MISMATCH: "MARKET_EVIDENCE_UNAVAILABLE",
  PYTH_MARKET_EVIDENCE_UNAVAILABLE: "MARKET_EVIDENCE_UNAVAILABLE",
  PYTH_PRICE_UNAVAILABLE: "MARKET_EVIDENCE_UNAVAILABLE",
  PYTH_FETCH_UNAVAILABLE: "MARKET_EVIDENCE_UNAVAILABLE",
  AllowanceAlreadyUsed: "ALLOWANCE_USED",
  StaleAllowance: "ALLOWANCE_INVALID",
  AllowanceExpired: "ALLOWANCE_INVALID",
  AllowanceRequestMismatch: "ALLOWANCE_INVALID",
  AllowanceMandateMismatch: "ALLOWANCE_INVALID",
  AllowanceBeneficiaryMismatch: "ALLOWANCE_INVALID",
  AllowanceMintMismatch: "ALLOWANCE_INVALID",
  AllowanceNotionalExceeded: "ALLOWANCE_INVALID",
  SOLANA_EXECUTION_REFUSED: "EXECUTION_REFUSED",
  AUTHORITY_RUNTIME_ERROR: "EXECUTION_REFUSED",
  AUTHORITY_RUNTIME_UNAVAILABLE: "DECISION_UNAVAILABLE",
  PRACTICE_ONLY: "PRACTICE_ONLY",
  NO_AVAILABLE_DEMO_CAPACITY: "DEMO_CAPACITY",
};

export function canonicalReason(code: string): string {
  return REASON_ALIASES[code] ?? code;
}

/** Limit refusals that can become a boundary request. */
export function isLimitRefusal(code: string) {
  const c = canonicalReason(code);
  return c === "MANDATE_LIMIT_EXCEEDED" || c === "PERIOD_LIMIT_EXCEEDED";
}

/** Human, non-punitive explanation for a decision. Never says "denied". */
export function explainEvaluation(
  evaluation: ActionEvaluation,
  mandate: CurrentMandate | null,
  companyName?: string,
  mode: "practice" | "money" = "money",
): { title: string; body: string } {
  const name = companyName ?? "this company";
  switch (canonicalReason(evaluation.reasonCode)) {
    case "ALLOWANCE_USED":
      return {
        title: "That one-time permission was already used.",
        body: "Each “allow once” works for exactly one action. Choose an amount inside your limits or ask for more room again.",
      };
    case "ALLOWANCE_INVALID":
      return {
        title: "That one-time permission doesn't cover this.",
        body: "It only works for the exact company and amount your parent allowed, under your current limits.",
      };
    case "EXECUTION_REFUSED":
      return {
        title: "The Solana program didn't accept this action.",
        body: "Nothing was moved. Check your current limits and try again.",
      };
    case "PRACTICE_ONLY":
      return { title: `${name} is Practice-only for now.`, body: "You can learn about it and practice with virtual money." };
    case "DEMO_CAPACITY":
      return {
        title: "The Devnet practice network is busy right now.",
        body: "Nothing was moved. Try again in a moment.",
      };
    case "MAINNET_SETUP_REQUIRED":
      return {
        title: "Money Mode isn't set up yet.",
        body: "Money Mode requires parent verification and a supported Mainnet account. Practice on Solana Devnet stays open.",
      };
    case "NETWORK_MISMATCH":
      return {
        title: "Something didn't match.",
        body: "That result came from the wrong network, so Cresco ignored it. Nothing changed.",
      };
    case "WITHIN_MANDATE":
      return { title: "Inside your limits", body: "You can do this right now. No need to ask." };
    case "MANDATE_LIMIT_EXCEEDED":
      return {
        title: "This is above your current per-action limit.",
        body: `You can invest up to ${usd(evaluation.standingLimit ?? mandate?.maxActionNotional ?? 0)} in one action. You're trying to invest ${usd(evaluation.requestedNotional ?? 0)}.`,
      };
    case "PERIOD_LIMIT_EXCEEDED":
      return {
        title: "This would take you past your current period limit.",
        body:
          evaluation.remainingPeriodNotional != null
            ? `You have ${usd(evaluation.remainingPeriodNotional)} left to invest ${mandate?.periodLabel ?? "this period"}.${evaluation.requestedNotional ? ` You're trying to invest ${usd(evaluation.requestedNotional)}.` : ""}`
            : `You've used up your limit for ${mandate?.periodLabel ?? "this period"}. Ask for more room, or practice until it resets.`,
      };
    case "ASSET_OUTSIDE_MANDATE":
      return {
        title: `${name} isn't in your Key yet.`,
        body: "Your parent or guardian chooses which companies your Key covers. You can still practice it in the sandbox.",
      };
    case "ACTION_OUTSIDE_MANDATE":
      return {
        title: "This kind of action isn't in your limits.",
        body: "Your current limits cover buying only. Practice it first, or talk to your parent.",
      };
    case "MANDATE_NOT_ACTIVE":
      return {
        title: "Your Key is paused right now.",
        body: "Your parent or guardian paused it. Sandbox practice still works as usual.",
      };
    case "MANDATE_REVOKED":
      return { title: "Your Key is turned off.", body: "Talk to your parent or guardian to set up new limits." };
    case "MANDATE_EXPIRED":
      return { title: "Your limits have expired.", body: "Ask your parent or guardian to renew them." };
    case "STALE_NONCE":
      return {
        title: "Your limits changed.",
        body: "Refreshing your current Key… Check the new limits and try again.",
      };
    case "MARKET_EVIDENCE_UNAVAILABLE":
    case "MARKET_EVIDENCE_STALE":
    case "MARKET_CONFIDENCE_TOO_WIDE":
      return {
        title: "Market information changed.",
        body: "Cresco needs fresh Pyth market data to check this action again. Nothing was moved. Try again in a moment.",
      };
    case "MARKET_CONDITION_INVALIDATED":
      return {
        title: "The market changed.",
        body: "The price condition you set is no longer true, so this action stopped.",
      };
    case "INSUFFICIENT_BALANCE":
      if (mode === "practice") {
        return {
          title: "Not enough practice capital for that.",
          body: "Choose a smaller amount. Practice capital has no real financial value.",
        };
      }
      return {
        title: "Not enough in your Money balance.",
        body: "Choose a smaller amount.",
      };
    case "ASSET_UNAVAILABLE":
      return {
        title: `${name} isn't on the Devnet practice lane.`,
        body: "You can still learn about it and practice it in the sandbox.",
      };
    case "EXECUTION_UNCONFIRMED":
      return {
        title: "We're still checking on this.",
        body: "Your investment may still be going through. Check again: it will never happen twice.",
      };
    case "DECISION_UNAVAILABLE":
      return {
        title: "Solana is taking longer than expected.",
        body: "Nothing happened. Cresco never acts without checking your Key first. Check again in a moment.",
      };
    case "INVALID_AMOUNT":
    default:
      return { title: "Choose an amount", body: "Enter an amount greater than $0." };
  }
}

/** learningContext for a decision. Mirrors learningCueForAction in the backend. */
export function learningContextFor(evaluation: ActionEvaluation): LearningContext | null {
  switch (canonicalReason(evaluation.reasonCode)) {
    case "MANDATE_LIMIT_EXCEEDED":
    case "PERIOD_LIMIT_EXCEEDED":
      return {
        kind: "BOUNDARY",
        title: "Why this boundary exists",
        body: "Inside your Key you can act freely. Learning can explain the boundary, but only your parent or guardian can create a wider standing Key.",
        practiceAvailable: true,
      };
    case "MARKET_CONDITION_INVALIDATED":
    case "MARKET_EVIDENCE_STALE":
      return {
        kind: "MARKET_CHANGE",
        title: "Markets move",
        body: "Market evidence can tighten or stop a decision when facts change. It can never widen your Key or grant more authority.",
        practiceAvailable: true,
      };
    default:
      return null;
  }
}

/** A pending request made under an older Mandate nonce can no longer be decided. */
export function isRequestStale(request: { status: string; mandateNonce: number }, mandate: CurrentMandate): boolean {
  return request.status === "PENDING_HUMAN_DECISION" && request.mandateNonce !== mandate.nonce;
}
