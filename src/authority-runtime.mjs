import { FRONTEND_CONTRACT_VERSION } from './frontend-api.mjs';

function safeProofSummary(proof = {}) {
  return {
    signature: proof.signature ?? null,
    programId: proof.programId ?? null,
    mandateAddress: proof.mandateAddress ?? null,
    version: proof.version ?? null,
    nonce: proof.nonce ?? null
  };
}

export async function commitMandateTransitionForFrontend({
  request,
  authorityTransitionProvider
}) {
  const transition = {
    fromStage: request?.fromStage ?? request?.mandate?.stage ?? null,
    toStage: request?.toStage ?? null
  };

  if (
    !authorityTransitionProvider ||
    typeof authorityTransitionProvider.commitTransition !== 'function'
  ) {
    return {
      contractVersion: FRONTEND_CONTRACT_VERSION,
      type: 'MANDATE_TRANSITION_COMMIT',
      ok: false,
      authorityCommitted: false,
      reasonCode: 'AUTHORITY_RUNTIME_UNAVAILABLE',
      transition,
      proof: safeProofSummary()
    };
  }

  try {
    const result = await authorityTransitionProvider.commitTransition(request);

    if (!result?.ok) {
      return {
        contractVersion: FRONTEND_CONTRACT_VERSION,
        type: 'MANDATE_TRANSITION_COMMIT',
        ok: false,
        authorityCommitted: false,
        reasonCode: result?.reasonCode ?? 'AUTHORITY_TRANSITION_REFUSED',
        transition,
        proof: safeProofSummary(result?.proof)
      };
    }

    return {
      contractVersion: FRONTEND_CONTRACT_VERSION,
      type: 'MANDATE_TRANSITION_COMMIT',
      ok: true,
      authorityCommitted: true,
      reasonCode: null,
      transition,
      mandate: result.mandate ?? null,
      proof: safeProofSummary(result.proof)
    };
  } catch {
    return {
      contractVersion: FRONTEND_CONTRACT_VERSION,
      type: 'MANDATE_TRANSITION_COMMIT',
      ok: false,
      authorityCommitted: false,
      reasonCode: 'AUTHORITY_RUNTIME_ERROR',
      transition,
      proof: safeProofSummary()
    };
  }
}
