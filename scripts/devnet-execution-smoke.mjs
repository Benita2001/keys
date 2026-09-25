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
  asset: 'AAPL',
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


const allowanceRequestId =
  `ci-allow-once-${process.env.GITHUB_RUN_ID ?? Date.now()}`;
let allowanceGrant = null;
let allowanceError = null;

for (let attempt = 1; attempt <= 20; attempt += 1) {
  try {
    allowanceGrant = await provider.grantAllowanceOnce({
      requestId: allowanceRequestId,
      expectedNonce: state.mandate.nonce,
      maxNotional: 12,
    });
    allowanceError = null;
    break;
  } catch (error) {
    allowanceError = error;
    if (attempt === 20) break;
    console.log(
      `PROOF allow_once_wait attempt=${attempt} reason=${String(
        error?.message ?? error,
      ).slice(0, 180)}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

if (!allowanceGrant) {
  throw new Error(
    `DEVNET_ALLOW_ONCE_GRANT_FAILED:${String(
      allowanceError?.message ?? allowanceError,
    )}`,
  );
}

const tamperedResult = await provider.execute({
  asset: 'AAPL',
  type: 'BUY',
  // The guardian approved $12. Reusing the same allowance for a different
  // notional must fail in the Solana program before the allowance is consumed.
  notional: 11,
  expectedNonce: state.mandate.nonce,
  idempotencyKey:
    `ci-allow-once-tamper-${process.env.GITHUB_RUN_ID ?? Date.now()}`,
  allowOnceRequestId: allowanceRequestId,
});

if (
  tamperedResult.evaluation?.decision !== 'REFUSE' ||
  tamperedResult.evaluation?.reasonCode !== 'AllowanceActionMismatch'
) {
  throw new Error(
    `DEVNET_ALLOW_ONCE_TAMPER_NOT_REFUSED:${JSON.stringify(tamperedResult)}`,
  );
}

const onceResult = await provider.execute({
  asset: 'AAPL',
  type: 'BUY',
  // Bootstrap fixes the standing action boundary at $10.
  // $12 therefore proves that the explicit one-time receipt, not the standing
  // Mandate, is authorizing this exact approved action.
  notional: 12,
  expectedNonce: state.mandate.nonce,
  idempotencyKey:
    `ci-allow-once-use-${process.env.GITHUB_RUN_ID ?? Date.now()}`,
  allowOnceRequestId: allowanceRequestId,
});

if (
  onceResult.evaluation?.decision !== 'ALLOW' ||
  onceResult.executionProof?.status !== 'CONFIRMED' ||
  onceResult.executionProof?.oneTimeAllowance?.consumed !== true ||
  onceResult.executionProof?.oneTimeAllowance?.requestId !== allowanceRequestId
) {
  throw new Error(
    `DEVNET_ALLOW_ONCE_EXECUTION_FAILED:${JSON.stringify(onceResult)}`,
  );
}

const reuseResult = await provider.execute({
  asset: 'AAPL',
  type: 'BUY',
  notional: 12,
  expectedNonce: state.mandate.nonce,
  idempotencyKey:
    `ci-allow-once-reuse-${process.env.GITHUB_RUN_ID ?? Date.now()}`,
  allowOnceRequestId: allowanceRequestId,
});

if (
  reuseResult.evaluation?.decision !== 'REFUSE' ||
  reuseResult.evaluation?.reasonCode !== 'AllowanceAlreadyUsed'
) {
  throw new Error(
    `DEVNET_ALLOW_ONCE_REUSE_NOT_REFUSED:${JSON.stringify(reuseResult)}`,
  );
}

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      proof: 'ALLOW_ONCE_ONCHAIN_SINGLE_USE',
      grantSignature: allowanceGrant.signature,
      allowanceReceipt: allowanceGrant.allowanceReceipt,
      requestHash: allowanceGrant.requestHash,
      executionSignature: onceResult.executionProof.signature,
      consumed: onceResult.executionProof.oneTimeAllowance.consumed,
      tamperDecision: tamperedResult.evaluation.decision,
      tamperReasonCode: tamperedResult.evaluation.reasonCode,
      reuseDecision: reuseResult.evaluation.decision,
      reuseReasonCode: reuseResult.evaluation.reasonCode,
      mandateNonce: state.mandate.nonce,
      standingActionNotionalUsd:
        Number(state.mandate.maxActionNotionalMicroUsd) / 1_000_000,
      oneTimeNotionalUsd: 12,
    },
    null,
    2,
  ),
);
console.log('DEVNET_ALLOW_ONCE_EXACT_ACTION_PROOF=PASS');
console.log('DEVNET_ALLOW_ONCE_PROOF=PASS');
