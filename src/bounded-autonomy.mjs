export const V2_CONTRACT_VERSION = '0.2-draft';

export const MandateStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  REVOKED: 'REVOKED'
});

export const ActionDecision = Object.freeze({
  ALLOW: 'ALLOW',
  ESCALATE: 'ESCALATE',
  REFUSE: 'REFUSE'
});

function asMs(value) {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function marketIsUsable(market, rule = {}) {
  if (!rule.requiresMarketEvidence) {
    return { ok: true };
  }

  if (!market || market.status !== 'FRESH') {
    return {
      ok: false,
      reasonCode: 'MARKET_EVIDENCE_UNAVAILABLE',
      detail: 'Fresh market evidence is required by this asset rule.'
    };
  }

  if (
    rule.maxMarketAgeSeconds != null &&
    market.ageSeconds != null &&
    market.ageSeconds > rule.maxMarketAgeSeconds
  ) {
    return {
      ok: false,
      reasonCode: 'MARKET_EVIDENCE_STALE',
      detail: 'The market update is older than the mandate permits.'
    };
  }

  if (
    rule.maxConfidenceBps != null &&
    market.confidenceBps != null &&
    market.confidenceBps > rule.maxConfidenceBps
  ) {
    return {
      ok: false,
      reasonCode: 'MARKET_CONFIDENCE_TOO_WIDE',
      detail: 'The market confidence band is wider than the mandate permits.'
    };
  }

  if (
    rule.maxPrice != null &&
    market.price != null &&
    market.price > rule.maxPrice
  ) {
    return {
      ok: false,
      reasonCode: 'MARKET_CONDITION_INVALIDATED',
      detail: 'The user-defined maximum-price condition is no longer true.'
    };
  }

  if (
    rule.minPrice != null &&
    market.price != null &&
    market.price < rule.minPrice
  ) {
    return {
      ok: false,
      reasonCode: 'MARKET_CONDITION_INVALIDATED',
      detail: 'The user-defined minimum-price condition is no longer true.'
    };
  }

  return { ok: true };
}

export function evaluateBoundedAction({
  mandate,
  assetRule,
  action,
  market = null,
  now = new Date().toISOString()
}) {
  if (!mandate || mandate.status !== MandateStatus.ACTIVE) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode:
        mandate?.status === MandateStatus.REVOKED
          ? 'MANDATE_REVOKED'
          : 'MANDATE_NOT_ACTIVE'
    };
  }

  const nowMs = asMs(now);
  const expiryMs = asMs(mandate.expiresAt);
  if (expiryMs != null && nowMs != null && nowMs > expiryMs) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'MANDATE_EXPIRED'
    };
  }

  if (
    action?.expectedNonce != null &&
    Number(action.expectedNonce) !== Number(mandate.nonce)
  ) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'STALE_NONCE'
    };
  }

  if (!assetRule || assetRule.enabled !== true) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'ASSET_OUTSIDE_MANDATE'
    };
  }

  if (assetRule.asset !== action?.asset) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'ASSET_OUTSIDE_MANDATE'
    };
  }

  if (!assetRule.allowedActions?.includes(action?.type)) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'ACTION_OUTSIDE_MANDATE'
    };
  }

  const marketCheck = marketIsUsable(market, assetRule);
  if (!marketCheck.ok) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: marketCheck.reasonCode,
      marketEvidence: market ?? null,
      explanation: marketCheck.detail
    };
  }

  const amount = Number(action?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'INVALID_AMOUNT'
    };
  }

  const price = market?.price;
  const computedNotional =
    Number.isFinite(Number(price)) && assetRule.quoteUnit === 'USD'
      ? amount * Number(price)
      : Number(action?.notional ?? amount);

  if (
    assetRule.maxActionNotional != null &&
    computedNotional > Number(assetRule.maxActionNotional)
  ) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'MANDATE_LIMIT_EXCEEDED',
      boundaryRequestAvailable: true,
      requestedNotional: computedNotional,
      standingLimit: Number(assetRule.maxActionNotional)
    };
  }

  const spent = Number(assetRule.spentThisPeriod ?? 0);
  if (
    assetRule.maxPeriodNotional != null &&
    spent + computedNotional > Number(assetRule.maxPeriodNotional)
  ) {
    return {
      contractVersion: V2_CONTRACT_VERSION,
      decision: ActionDecision.REFUSE,
      reasonCode: 'PERIOD_LIMIT_EXCEEDED',
      boundaryRequestAvailable: true,
      requestedNotional: computedNotional,
      remainingPeriodNotional: Math.max(
        0,
        Number(assetRule.maxPeriodNotional) - spent
      )
    };
  }

  return {
    contractVersion: V2_CONTRACT_VERSION,
    decision: ActionDecision.ALLOW,
    reasonCode: 'WITHIN_MANDATE',
    guardianApprovalRequired: false,
    requestedNotional: computedNotional,
    mandateVersion: mandate.version,
    mandateNonce: mandate.nonce,
    marketEvidence: market ?? null
  };
}

export function buildBoundaryRequest({
  mandate,
  assetRule,
  action,
  reasoningCommitmentHash,
  condition = null,
  now = new Date().toISOString()
}) {
  if (!mandate || !action) {
    throw new Error('mandate and action are required');
  }

  return {
    contractVersion: V2_CONTRACT_VERSION,
    type: 'BOUNDARY_REQUEST',
    status: 'PENDING_HUMAN_DECISION',
    mandateVersion: mandate.version,
    mandateNonce: mandate.nonce,
    asset: action.asset,
    actionType: action.type,
    amount: action.amount,
    requestedNotional: action.notional ?? null,
    standingLimit: assetRule?.maxActionNotional ?? null,
    reasoningCommitmentHash: reasoningCommitmentHash ?? null,
    condition,
    createdAt: now,
    decisions: ['ALLOW_ONCE', 'WIDEN_MANDATE', 'REFUSE']
  };
}

export function learningCueForAction({ assetRule, action, market, reasonCode }) {
  if (reasonCode === 'MANDATE_LIMIT_EXCEEDED') {
    return {
      kind: 'BOUNDARY',
      title: 'Why this stopped',
      body: 'Your current key has a standing limit. Inside it you can act freely; changing it needs a human decision.'
    };
  }

  if (
    reasonCode === 'MARKET_CONDITION_INVALIDATED' ||
    reasonCode === 'MARKET_EVIDENCE_STALE'
  ) {
    return {
      kind: 'MARKET_CHANGE',
      title: 'The market changed',
      body: 'This action was tied to a market condition that is no longer valid. The old idea does not become permanent permission.'
    };
  }

  if (assetRule?.firstUse === true) {
    return {
      kind: 'FIRST_USE',
      title: `Before your first ${action?.asset ?? 'asset'} action`,
      body: 'Understand what the asset represents, how concentrated it is, and what could make your decision wrong.'
    };
  }

  if (market?.status === 'FRESH') {
    return {
      kind: 'CONTEXT',
      title: 'Market context',
      body: 'This is current market evidence, not a score and not permission to take more risk.'
    };
  }

  return null;
}
