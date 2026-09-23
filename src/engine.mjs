import { Decision, Stage } from './model.mjs';

const STAGE_ORDER = Object.freeze({
  [Stage.LEARN]: 0,
  [Stage.PRACTICE]: 1,
  [Stage.PROPOSE]: 2,
  [Stage.BOUNDED]: 3,
  [Stage.INDEPENDENT]: 4
});

function nowMs(ts) {
  return typeof ts === 'number' ? ts : Date.parse(ts);
}

export function evaluateProposal({ charter, mandate, proposal, market, eligibility, now }) {
  const reasons = [];
  const currentMs = nowMs(now);

  if (charter.expiresAt && currentMs > nowMs(charter.expiresAt)) {
    return { decision: Decision.REFUSE, reasonCode: 'CHARTER_EXPIRED', reasons: ['The family charter has expired.'] };
  }

  if (!charter.assetUniverse.includes(proposal.asset)) {
    return { decision: Decision.REFUSE, reasonCode: 'ASSET_OUTSIDE_MANDATE', reasons: ['The asset is outside the current family mandate.'] };
  }

  if (!market || market.status !== 'FRESH') {
    return { decision: Decision.REFUSE, reasonCode: 'MARKET_EVIDENCE_UNAVAILABLE', reasons: ['Fresh market evidence is required before a proposal can be evaluated.'] };
  }

  if (market.confidenceBps != null && market.maxConfidenceBps != null && market.confidenceBps > market.maxConfidenceBps) {
    return { decision: Decision.REFUSE, reasonCode: 'MARKET_CONFIDENCE_TOO_WIDE', reasons: ['The current market confidence band is too wide.'] };
  }

  if (!proposal.rationale || !proposal.counterargument || !proposal.invalidation) {
    return {
      decision: Decision.ESCALATE,
      reasonCode: 'DECISION_CONTEXT_INCOMPLETE',
      reasons: ['A rationale, counterargument and invalidation condition are required before review.']
    };
  }

  if (mandate.stage === Stage.LEARN || mandate.stage === Stage.PRACTICE) {
    return {
      decision: Decision.ESCALATE,
      reasonCode: 'PRACTICE_ONLY',
      reasons: ['This stage can create and review proposals but cannot authorize financial execution.']
    };
  }

  if (mandate.stage === Stage.PROPOSE) {
    if (proposal.amount > charter.maxProposalNotional) {
      return {
        decision: Decision.REFUSE,
        reasonCode: 'PROPOSAL_CAP_EXCEEDED',
        reasons: [`Proposal exceeds the current cap of ${charter.maxProposalNotional}.`]
      };
    }
    return {
      decision: Decision.ESCALATE,
      reasonCode: 'GUARDIAN_REVIEW_REQUIRED',
      reasons: ['The proposal is inside the mandate but requires explicit guardian review.']
    };
  }

  if (mandate.stage === Stage.BOUNDED) {
    if (proposal.amount > charter.maxBoundedNotional) {
      return {
        decision: Decision.REFUSE,
        reasonCode: 'BOUNDED_CAP_EXCEEDED',
        reasons: [`Action exceeds the bounded authority cap of ${charter.maxBoundedNotional}.`]
      };
    }

    if (!eligibility || eligibility.status !== 'ELIGIBLE') {
      return {
        decision: Decision.REFUSE,
        reasonCode: eligibility?.status === 'INELIGIBLE' ? 'INELIGIBLE' : 'ELIGIBILITY_UNKNOWN',
        reasons: ['Real execution requires explicit current eligibility evidence.']
      };
    }

    return {
      decision: Decision.ALLOW,
      reasonCode: 'WITHIN_BOUNDED_MANDATE',
      reasons: ['Action is inside the signed bounded mandate and current eligibility is confirmed.']
    };
  }

  if (mandate.stage === Stage.INDEPENDENT) {
    if (!eligibility || eligibility.status !== 'ELIGIBLE') {
      return {
        decision: Decision.REFUSE,
        reasonCode: eligibility?.status === 'INELIGIBLE' ? 'INELIGIBLE' : 'ELIGIBILITY_UNKNOWN',
        reasons: ['Execution requires explicit current eligibility evidence.']
      };
    }
    return { decision: Decision.ALLOW, reasonCode: 'INDEPENDENT_ELIGIBLE', reasons: ['Independent authority and current eligibility are confirmed.'] };
  }

  return { decision: Decision.REFUSE, reasonCode: 'UNKNOWN_STAGE', reasons: ['Unknown mandate stage.'] };
}

export function summarizeEvidence(events = []) {
  const summary = {
    proposalCount: 0,
    reviewCount: 0,
    scopeViolationCount: 0,
    thesisRevisionCount: 0,
    marketEventReviewCount: 0,
    refusedCount: 0
  };

  for (const event of events) {
    if (event.type === 'PROPOSAL') summary.proposalCount++;
    if (event.type === 'REVIEW_COMPLETED') summary.reviewCount++;
    if (event.type === 'SCOPE_VIOLATION') summary.scopeViolationCount++;
    if (event.type === 'THESIS_REVISED') summary.thesisRevisionCount++;
    if (event.type === 'MARKET_EVENT_REVIEW') summary.marketEventReviewCount++;
    if (event.type === 'REFUSED') summary.refusedCount++;
  }

  return summary;
}

export function mandateReviewEligibility({ mandate, evidence, thresholds }) {
  const unmet = [];
  if (evidence.reviewCount < thresholds.minReviews) unmet.push('MIN_REVIEWS');
  if (evidence.proposalCount < thresholds.minProposals) unmet.push('MIN_PROPOSALS');
  if (evidence.marketEventReviewCount < thresholds.minMarketEventReviews) unmet.push('MIN_MARKET_EVENT_REVIEWS');
  if (evidence.scopeViolationCount > thresholds.maxScopeViolations) unmet.push('SCOPE_VIOLATIONS');

  return {
    eligibleForReview: unmet.length === 0,
    currentStage: mandate.stage,
    unmet
  };
}

export function transitionMandate({ mandate, toStage, authorizedBy, at, evidenceSummary, reviewEligibility }) {
  if (!reviewEligibility?.eligibleForReview) {
    return { ok: false, reasonCode: 'REVIEW_THRESHOLD_NOT_MET', mandate };
  }
  if (!authorizedBy) {
    return { ok: false, reasonCode: 'AUTHORIZED_TRANSITION_REQUIRED', mandate };
  }

  const fromOrder = STAGE_ORDER[mandate?.stage];
  const toOrder = STAGE_ORDER[toStage];

  if (
    fromOrder == null ||
    toOrder == null ||
    toOrder <= fromOrder ||
    toOrder > STAGE_ORDER[Stage.INDEPENDENT]
  ) {
    return { ok: false, reasonCode: 'INVALID_TRANSITION', mandate };
  }

  const next = {
    ...mandate,
    stage: toStage,
    effectiveAt: at,
    reviewedAt: at,
    transitionHistory: [
      ...mandate.transitionHistory,
      {
        from: mandate.stage,
        to: toStage,
        at,
        authorizedBy,
        evidenceSummary
      }
    ]
  };
  return { ok: true, mandate: next };
}
