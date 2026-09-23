import test from 'node:test';
import assert from 'node:assert/strict';
import anchor from '@coral-xyz/anchor';

import { Stage } from '../src/model.mjs';
import { createAnchorAuthorityTransitionProvider } from '../src/anchor-authority-provider.mjs';

test('Anchor authority provider maps BOUNDED transition and returns nonce/version proof', async () => {
  const provider = {
    wallet: {
      publicKey: anchor.web3.Keypair.generate().publicKey
    }
  };

  const programId = anchor.web3.Keypair.generate().publicKey;
  const charter = anchor.web3.Keypair.generate().publicKey;
  const mandate = anchor.web3.Keypair.generate().publicKey;
  const reviewReceipt = anchor.web3.Keypair.generate().publicKey;

  const captured = {};

  const program = {
    programId,
    methods: {
      transitionMandate(stageCode, expectedNonce) {
        captured.stageCode = stageCode;
        captured.expectedNonce = expectedNonce.toNumber();

        return {
          accountsStrict(accounts) {
            captured.accounts = accounts;

            return {
              async rpc() {
                return 'anchor-signature';
              }
            };
          }
        };
      }
    },
    account: {
      mandate: {
        async fetch(address) {
          captured.fetchAddress = address;
          return {
            stage: 3,
            version: new anchor.BN(2),
            nonce: new anchor.BN(1)
          };
        }
      }
    }
  };

  const authorityProvider = createAnchorAuthorityTransitionProvider({
    program,
    provider
  });

  const result = await authorityProvider.commitTransition({
    charterAddress: charter.toBase58(),
    mandateAddress: mandate.toBase58(),
    reviewReceiptAddress: reviewReceipt.toBase58(),
    toStage: Stage.BOUNDED,
    expectedNonce: 0
  });

  assert.equal(result.ok, true);
  assert.equal(captured.stageCode, 3);
  assert.equal(captured.expectedNonce, 0);
  assert.equal(captured.accounts.guardian.toBase58(), provider.wallet.publicKey.toBase58());
  assert.equal(captured.accounts.charter.toBase58(), charter.toBase58());
  assert.equal(captured.accounts.mandate.toBase58(), mandate.toBase58());
  assert.equal(captured.accounts.reviewReceipt.toBase58(), reviewReceipt.toBase58());

  assert.equal(result.mandate.stage, Stage.BOUNDED);
  assert.equal(result.mandate.version, 2);
  assert.equal(result.mandate.nonce, 1);
  assert.equal(result.proof.signature, 'anchor-signature');
  assert.equal(result.proof.programId, programId.toBase58());
  assert.equal(result.proof.mandateAddress, mandate.toBase58());
});

test('Anchor authority provider refuses unknown stage before RPC', async () => {
  let called = false;

  const provider = {
    wallet: {
      publicKey: anchor.web3.Keypair.generate().publicKey
    }
  };

  const program = {
    programId: anchor.web3.Keypair.generate().publicKey,
    methods: {
      transitionMandate() {
        called = true;
        throw new Error('must not be called');
      }
    },
    account: {
      mandate: {
        async fetch() {
          throw new Error('must not be called');
        }
      }
    }
  };

  const authorityProvider = createAnchorAuthorityTransitionProvider({
    program,
    provider
  });

  const result = await authorityProvider.commitTransition({
    charterAddress: anchor.web3.Keypair.generate().publicKey.toBase58(),
    mandateAddress: anchor.web3.Keypair.generate().publicKey.toBase58(),
    reviewReceiptAddress: anchor.web3.Keypair.generate().publicKey.toBase58(),
    toStage: 'NOT_A_STAGE',
    expectedNonce: 0
  });

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'UNKNOWN_STAGE');
  assert.equal(called, false);
});

test('Anchor authority provider requires expected nonce before RPC', async () => {
  let called = false;

  const provider = {
    wallet: {
      publicKey: anchor.web3.Keypair.generate().publicKey
    }
  };

  const program = {
    programId: anchor.web3.Keypair.generate().publicKey,
    methods: {
      transitionMandate() {
        called = true;
        throw new Error('must not be called');
      }
    },
    account: {
      mandate: {
        async fetch() {
          throw new Error('must not be called');
        }
      }
    }
  };

  const authorityProvider = createAnchorAuthorityTransitionProvider({
    program,
    provider
  });

  const result = await authorityProvider.commitTransition({
    charterAddress: anchor.web3.Keypair.generate().publicKey.toBase58(),
    mandateAddress: anchor.web3.Keypair.generate().publicKey.toBase58(),
    reviewReceiptAddress: anchor.web3.Keypair.generate().publicKey.toBase58(),
    toStage: Stage.BOUNDED,
    expectedNonce: null
  });

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, 'EXPECTED_NONCE_REQUIRED');
  assert.equal(called, false);
});
