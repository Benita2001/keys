import test from 'node:test';
import assert from 'node:assert/strict';

import { Stage } from '../src/model.mjs';
import { commitMandateTransitionForFrontend } from '../src/authority-runtime.mjs';

const request = {
  fromStage: Stage.PROPOSE,
  toStage: Stage.BOUNDED,
  expectedNonce: 0
};

test('authority runtime fails closed when no transition provider exists', async () => {
  const response = await commitMandateTransitionForFrontend({
    request,
    authorityTransitionProvider: null
  });

  assert.equal(response.ok, false);
  assert.equal(response.authorityCommitted, false);
  assert.equal(response.reasonCode, 'AUTHORITY_RUNTIME_UNAVAILABLE');
});

test('authority runtime preserves provider refusal without claiming commitment', async () => {
  const response = await commitMandateTransitionForFrontend({
    request,
    authorityTransitionProvider: {
      commitTransition: async () => ({
        ok: false,
        reasonCode: 'StaleNonce'
      })
    }
  });

  assert.equal(response.ok, false);
  assert.equal(response.authorityCommitted, false);
  assert.equal(response.reasonCode, 'StaleNonce');
});

test('authority runtime exposes only bounded proof metadata on success', async () => {
  const response = await commitMandateTransitionForFrontend({
    request,
    authorityTransitionProvider: {
      commitTransition: async () => ({
        ok: true,
        mandate: {
          stage: Stage.BOUNDED,
          version: 2,
          nonce: 1
        },
        proof: {
          signature: 'signature-1',
          programId: 'program-1',
          mandateAddress: 'mandate-1',
          version: 2,
          nonce: 1,
          secretThatMustNotCrossBoundary: 'do-not-expose'
        }
      })
    }
  });

  assert.equal(response.ok, true);
  assert.equal(response.authorityCommitted, true);
  assert.equal(response.reasonCode, null);
  assert.equal(response.proof.signature, 'signature-1');
  assert.equal(response.proof.version, 2);
  assert.equal(response.proof.nonce, 1);
  assert.equal('secretThatMustNotCrossBoundary' in response.proof, false);
});
