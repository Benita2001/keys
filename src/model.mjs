export const Stage = Object.freeze({
  LEARN: 'LEARN',
  PRACTICE: 'PRACTICE',
  PROPOSE: 'PROPOSE',
  BOUNDED: 'BOUNDED',
  INDEPENDENT: 'INDEPENDENT'
});

export const Decision = Object.freeze({
  ALLOW: 'ALLOW',
  ESCALATE: 'ESCALATE',
  REFUSE: 'REFUSE'
});

export function makeCharter({
  familyId,
  beneficiaryId,
  guardianId,
  jurisdiction,
  assetUniverse = [],
  maxProposalNotional = 50,
  maxBoundedNotional = 25,
  expiresAt = null
}) {
  if (!familyId || !beneficiaryId || !guardianId) {
    throw new Error('familyId, beneficiaryId and guardianId are required');
  }
  return {
    version: 1,
    familyId,
    beneficiaryId,
    guardianId,
    jurisdiction,
    assetUniverse: [...assetUniverse],
    maxProposalNotional,
    maxBoundedNotional,
    expiresAt
  };
}

export function makeMandate({ stage = Stage.PRACTICE, effectiveAt, reviewedAt = null }) {
  return {
    stage,
    effectiveAt,
    reviewedAt,
    transitionHistory: []
  };
}

export function makeProposal({
  id,
  asset,
  amount,
  rationale,
  counterargument,
  horizonDays,
  invalidation,
  createdAt,
  mode = 'PRACTICE'
}) {
  if (!id || !asset || !createdAt) throw new Error('proposal id, asset and createdAt are required');
  if (!(amount > 0)) throw new Error('proposal amount must be > 0');
  return {
    id,
    asset,
    amount,
    rationale: rationale?.trim() ?? '',
    counterargument: counterargument?.trim() ?? '',
    horizonDays,
    invalidation: invalidation?.trim() ?? '',
    createdAt,
    mode
  };
}
