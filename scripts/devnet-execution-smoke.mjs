import {
  configuredDevnetExecutionProviderFromEnv
} from '../src/devnet-execution-provider.mjs';

const provider = configuredDevnetExecutionProviderFromEnv();

if (!provider) {
  throw new Error('DEVNET_EXECUTION_PROVIDER_NOT_CONFIGURED');
}

const state = await provider.getState();
const idempotencyKey = `ci-smoke-${process.env.GITHUB_RUN_ID ?? Date.now()}`;

const result = await provider.execute({
  asset: 'TSLA',
  type: 'BUY',
  notional: 1,
  expectedNonce: state.mandate.nonce,
  idempotencyKey
});

if (
  result.evaluation?.decision !== 'ALLOW' ||
  result.executionProof?.status !== 'CONFIRMED' ||
  result.executionProof?.simulated !== false
) {
  throw new Error(
    `DEVNET_EXECUTION_SMOKE_FAILED:${JSON.stringify(result)}`
  );
}

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      decision: result.evaluation.decision,
      reasonCode: result.evaluation.reasonCode,
      signature: result.executionProof.signature,
      programId: result.executionProof.programId,
      mandateAddress: result.executionProof.mandateAddress,
      mandateVersion: result.executionProof.mandateVersion,
      mandateNonce: result.executionProof.mandateNonce,
      pyth: result.executionProof.pyth,
      truthBoundary: {
        executionAsset: result.executionProof.executionAsset,
        simulated: result.executionProof.simulated
      }
    },
    null,
    2
  )
);
console.log('DEVNET_HTTP_EXECUTION_BRIDGE=PASS');
