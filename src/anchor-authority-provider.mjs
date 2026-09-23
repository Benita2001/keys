import * as anchor from '@coral-xyz/anchor';
import { Stage } from './model.mjs';

const STAGE_TO_CODE = Object.freeze({
  [Stage.LEARN]: 0,
  [Stage.PRACTICE]: 1,
  [Stage.PROPOSE]: 2,
  [Stage.BOUNDED]: 3,
  [Stage.INDEPENDENT]: 4
});

const CODE_TO_STAGE = Object.freeze({
  0: Stage.LEARN,
  1: Stage.PRACTICE,
  2: Stage.PROPOSE,
  3: Stage.BOUNDED,
  4: Stage.INDEPENDENT
});

function publicKey(value) {
  return value instanceof anchor.web3.PublicKey
    ? value
    : new anchor.web3.PublicKey(value);
}

function numberValue(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export function createAnchorAuthorityTransitionProvider({
  program,
  provider
}) {
  if (!program) throw new Error('program is required');
  if (!provider?.wallet?.publicKey) throw new Error('provider wallet is required');

  return {
    async commitTransition({
      charterAddress,
      mandateAddress,
      reviewReceiptAddress,
      toStage,
      expectedNonce
    }) {
      const stageCode = STAGE_TO_CODE[toStage];

      if (stageCode == null) {
        return {
          ok: false,
          reasonCode: 'UNKNOWN_STAGE'
        };
      }

      if (expectedNonce == null) {
        return {
          ok: false,
          reasonCode: 'EXPECTED_NONCE_REQUIRED'
        };
      }

      const charter = publicKey(charterAddress);
      const mandate = publicKey(mandateAddress);
      const reviewReceipt = publicKey(reviewReceiptAddress);

      try {
        const signature = await program.methods
          .transitionMandate(stageCode, new anchor.BN(expectedNonce))
          .accountsStrict({
            charter,
            mandate,
            reviewReceipt,
            guardian: provider.wallet.publicKey
          })
          .rpc();

        const state = await program.account.mandate.fetch(mandate);
        const version = numberValue(state.version);
        const nonce = numberValue(state.nonce);
        const stage = CODE_TO_STAGE[numberValue(state.stage)] ?? null;

        return {
          ok: true,
          mandate: {
            stage,
            version,
            nonce
          },
          proof: {
            signature,
            programId: program.programId.toBase58(),
            mandateAddress: mandate.toBase58(),
            version,
            nonce
          }
        };
      } catch (error) {
        const reasonCode =
          error?.error?.errorCode?.code ??
          error?.error?.errorMessage ??
          'AUTHORITY_TRANSITION_REFUSED';

        return {
          ok: false,
          reasonCode: String(reasonCode)
        };
      }
    }
  };
}
