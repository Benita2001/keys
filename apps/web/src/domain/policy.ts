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
    // Pyth-derived USD notional is not yet enforced on-chain (TRUTH-BOUNDARY.md),
    // so the frontend preview does not require market evidence.
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

/** Human, non-punitive explanation for a decision. Never says "denied". */
export function explainEvaluation(
  evaluation: ActionEvaluation,
  mandate: CurrentMandate | null,
  companyName?: string,
  mode: "practice" | "money" = "money",
): { title: string; body: string } {
  const name = companyName ?? "this company";
  switch (evaluation.reasonCode) {
    case "WITHIN_MANDATE":
      return { title: "Inside your limits", body: "You can do this right now. No need to ask." };
    case "MANDATE_LIMIT_EXCEEDED":
      return {
        title: "This is outside your current limit.",
        body: `You can invest up to ${usd(evaluation.standingLimit ?? mandate?.maxActionNotional ?? 0)} in one action. You're trying to invest ${usd(evaluation.requestedNotional ?? 0)}.`,
      };
    case "PERIOD_LIMIT_EXCEEDED":
      return {
        title: "This would go past this month's limit.",
        body: `You have ${usd(evaluation.remainingPeriodNotional ?? 0)} left to invest ${mandate?.periodLabel ?? "this period"}. You're trying to invest ${usd(evaluation.requestedNotional ?? 0)}.`,
      };
    case "ASSET_OUTSIDE_MANDATE":
      return {
        title: `${name} isn't in your Money Mode list yet.`,
        body: "Your parent or guardian chooses which companies you can use real money for. You can still practice with it.",
      };
    case "ACTION_OUTSIDE_MANDATE":
      return {
        title: "This kind of action isn't in your limits.",
        body: "Your current limits cover buying only. Practice it first, or talk to your parent.",
      };
    case "MANDATE_NOT_ACTIVE":
      return {
        title: "Money Mode is paused.",
        body: "Your parent or guardian has paused Money Mode. Practice still works as usual.",
      };
    case "MANDATE_REVOKED":
      return { title: "Money Mode is turned off.", body: "Talk to your parent or guardian to set up new limits." };
    case "MANDATE_EXPIRED":
      return { title: "Your limits have expired.", body: "Ask your parent or guardian to renew them." };
    case "STALE_NONCE":
      return {
        title: "Your limits just changed.",
        body: "This action was prepared under older limits. Check the new ones and try again.",
      };
    case "MARKET_EVIDENCE_UNAVAILABLE":
    case "MARKET_EVIDENCE_STALE":
    case "MARKET_CONFIDENCE_TOO_WIDE":
      return {
        title: "Price data isn't fresh enough right now.",
        body: "Cresco only acts on up-to-date prices. Try again in a moment.",
      };
    case "MARKET_CONDITION_INVALIDATED":
      return {
        title: "The market changed.",
        body: "The price condition you set is no longer true, so this action stopped.",
      };
    case "INSUFFICIENT_BALANCE":
      if (mode === "practice") {
        return {
          title: "Not enough practice money for that.",
          body: "Choose a smaller amount. Practice money is virtual and resets only if you reset the demo.",
        };
      }
      return {
        title: "Not enough in your Money balance.",
        body: "Ask your parent or guardian to add money, or choose a smaller amount.",
      };
    case "ASSET_UNAVAILABLE":
      return {
        title: `${name} isn't available in Money Mode.`,
        body: "You can still learn about it and practice with it.",
      };
    case "DECISION_UNAVAILABLE":
      return {
        title: "We couldn't check your limits.",
        body: "Nothing happened. Cresco never acts without checking first. Try again in a moment.",
      };
    case "INVALID_AMOUNT":
    default:
      return { title: "Choose an amount", body: "Enter an amount greater than $0." };
  }
}

/** learningContext for a decision. Mirrors learningCueForAction in the backend. */
export function learningContextFor(evaluation: ActionEvaluation): LearningContext | null {
  switch (evaluation.reasonCode) {
    case "MANDATE_LIMIT_EXCEEDED":
    case "PERIOD_LIMIT_EXCEEDED":
      return {
        kind: "BOUNDARY",
        title: "Why limits exist",
        body: "Inside your limits you can act freely. Changing them is a decision your parent makes with you, not something you unlock by learning or winning.",
        practiceAvailable: true,
      };
    case "MARKET_CONDITION_INVALIDATED":
    case "MARKET_EVIDENCE_STALE":
      return {
        kind: "MARKET_CHANGE",
        title: "Markets move",
        body: "When the facts change, an old plan doesn't turn into permanent permission.",
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
