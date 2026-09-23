import {
  evaluateProposal,
  mandateReviewEligibility,
  summarizeEvidence,
  transitionMandate
} from './engine.mjs';

export const FRONTEND_CONTRACT_VERSION = '0.1';
export const MANDATE_REVIEW_LABEL = 'Eligible for Mandate Review';

function proposalSummary(proposal) {
  return {
    id: proposal?.id ?? null,
    asset: proposal?.asset ?? null,
    amount: proposal?.amount ?? null
  };
}

function mandateSummary(mandate) {
  return {
    stage: mandate?.stage ?? null
  };
}

export function evaluateProposalForFrontend({
  charter,
  mandate,
  proposal,
  market,
  eligibility,
  now
}) {
  const result = evaluateProposal({
    charter,
    mandate,
    proposal,
    market,
    eligibility,
    now
  });

  return {
    contractVersion: FRONTEND_CONTRACT_VERSION,
    type: 'PROPOSAL_EVALUATION',
    proposal: proposalSummary(proposal),
    mandate: mandateSummary(mandate),
    decision: result.decision,
    reasonCode: result.reasonCode,
    reasons: [...result.reasons]
  };
}

export function mandateReviewForFrontend({
  mandate,
  events = [],
  thresholds
}) {
  const evidence = summarizeEvidence(events);
  const review = mandateReviewEligibility({
    mandate,
    evidence,
    thresholds
  });

  return {
    contractVersion: FRONTEND_CONTRACT_VERSION,
    type: 'MANDATE_REVIEW_STATUS',
    evidence,
    reviewEligibility: {
      label: MANDATE_REVIEW_LABEL,
      eligibleForReview: review.eligibleForReview,
      currentStage: review.currentStage,
      unmet: [...review.unmet]
    }
  };
}

export function transitionMandateForFrontend({
  mandate,
  toStage,
  authorizedBy,
  at,
  evidenceSummary,
  reviewEligibility
}) {
  const fromStage = mandate?.stage ?? null;

  const result = transitionMandate({
    mandate,
    toStage,
    authorizedBy,
    at,
    evidenceSummary,
    reviewEligibility
  });

  if (!result.ok) {
    return {
      contractVersion: FRONTEND_CONTRACT_VERSION,
      type: 'MANDATE_TRANSITION',
      ok: false,
      reasonCode: result.reasonCode,
      transition: {
        fromStage,
        toStage
      },
      mandate: mandateSummary(result.mandate)
    };
  }

  return {
    contractVersion: FRONTEND_CONTRACT_VERSION,
    type: 'MANDATE_TRANSITION',
    ok: true,
    reasonCode: null,
    transition: {
      fromStage,
      toStage,
      authorizedBy,
      at
    },
    mandate: mandateSummary(result.mandate)
  };
}

export function executionEligibilityForFrontend({
  charter,
  mandate,
  proposal,
  market,
  eligibility,
  now
}) {
  const result = evaluateProposalForFrontend({
    charter,
    mandate,
    proposal,
    market,
    eligibility,
    now
  });

  return {
    ...result,
    type: 'EXECUTION_ELIGIBILITY'
  };
}
