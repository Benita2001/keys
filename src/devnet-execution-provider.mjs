import { createHash } from 'node:crypto';

import * as anchor from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint
} from '@solana/spl-token';
import { createEd25519Instruction } from '@pythnetwork/pyth-lazer-solana-sdk';

import {
  PYTH_PRO_EQUITY_FEEDS,
  fetchPythProSolanaPayload
} from './pyth-adapter.mjs';

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_INSTRUCTIONS_PUBKEY
} = anchor.web3;

export const DEVNET_KEYS_PROGRAM_ID = new PublicKey(
  'ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk'
);

export const PYTH_LAZER_PROGRAM_ID = new PublicKey(
  'pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt'
);

export const PYTH_LAZER_STORAGE_ID = new PublicKey(
  '3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL'
);

const ASSET_RULE_ACCOUNT_SIZE = 135;
const DEMO_ASSET = 'AAPL';
const DEMO_FEED_ID = 922;

const executionPromises = new Map();
const executionResults = new Map();

function u64(buffer, offset) {
  return Number(buffer.readBigUInt64LE(offset));
}

function i64(buffer, offset) {
  return Number(buffer.readBigInt64LE(offset));
}

function discriminator(name) {
  return createHash('sha256')
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8);
}

function allowanceRequestHash(requestId) {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('ALLOW_ONCE_REQUEST_ID_REQUIRED');
  }
  return createHash('sha256')
    .update(`keys:allow-once:${requestId}`)
    .digest();
}

function encodeU64(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

function encodeI64(value) {
  const out = Buffer.alloc(8);
  out.writeBigInt64LE(BigInt(value));
  return out;
}

function encodeU32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32LE(Number(value));
  return out;
}

function parseKeypair(json) {
  const values = JSON.parse(json);
  if (!Array.isArray(values) || values.length !== 64) {
    throw new Error('DEVNET_KEYPAIR_JSON must be a 64-byte Solana keypair array');
  }
  return Keypair.fromSecretKey(Uint8Array.from(values));
}

function parseMandateAccount(data) {
  if (!Buffer.isBuffer(data) || data.length < 123) {
    throw new Error('DEVNET_DEMO_MANDATE_INVALID');
  }

  return {
    charter: new PublicKey(data.subarray(8, 40)),
    stage: data.readUInt8(40),
    status: data.readUInt8(41),
    version: u64(data, 42),
    nonce: u64(data, 50),
    maxActionNotionalMicroUsd: u64(data, 58),
    maxPeriodNotionalMicroUsd: u64(data, 66),
    expiresAt: i64(data, 74),
    maxMarketAgeSeconds: data.readUInt32LE(82),
    maxConfidenceBps: data.readUInt32LE(86)
  };
}

function parseAllowanceReceiptAccount(data) {
  if (!Buffer.isBuffer(data) || data.length < 202) {
    throw new Error('DEVNET_ALLOWANCE_RECEIPT_INVALID');
  }

  return {
    mandate: new PublicKey(data.subarray(8, 40)),
    guardian: new PublicKey(data.subarray(40, 72)),
    beneficiary: new PublicKey(data.subarray(72, 104)),
    mint: new PublicKey(data.subarray(104, 136)),
    requestHash: Buffer.from(data.subarray(136, 168)),
    maxNotionalMicroUsd: u64(data, 168),
    mandateNonce: u64(data, 176),
    expiresAt: i64(data, 184),
    used: data.readUInt8(192) !== 0,
    usedAt: i64(data, 193),
    bump: data.readUInt8(201)
  };
}

function parseAssetRuleAccount(pubkey, data) {
  if (!Buffer.isBuffer(data) || data.length < ASSET_RULE_ACCOUNT_SIZE) {
    throw new Error('DEVNET_DEMO_ASSET_RULE_INVALID');
  }

  return {
    address: pubkey,
    mandate: new PublicKey(data.subarray(8, 40)),
    mint: new PublicKey(data.subarray(40, 72)),
    actionMask: data.readUInt8(72),
    enabled: data.readUInt8(73) !== 0,
    maxActionAmount: u64(data, 74),
    maxPeriodAmount: u64(data, 82),
    periodSeconds: i64(data, 90),
    periodStartedAt: i64(data, 98),
    spentThisPeriod: u64(data, 106),
    spentThisPeriodNotionalMicroUsd: u64(data, 114),
    maxUnitPriceMicroUsd: u64(data, 122),
    pythFeedId: data.readUInt32LE(130)
  };
}

function evaluation({
  decision,
  reasonCode,
  mandate,
  requestedNotionalMicroUsd = null,
  boundaryRequestAvailable = false
}) {
  return {
    contractVersion: '0.2',
    decision,
    reasonCode,
    requestedNotionalMicroUsd,
    standingLimitMicroUsd: mandate?.maxActionNotionalMicroUsd ?? null,
    boundaryRequestAvailable,
    guardianApprovalRequired: false,
    mandateVersion: mandate?.version ?? null,
    mandateNonce: mandate?.nonce ?? null
  };
}

async function confirmSignatureOverRpc({
  rpc,
  signature,
  lastValidBlockHeight,
  timeoutMs = 25_000,
  pollMs = 1_000
}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const statuses = await rpc.getSignatureStatuses([signature]);
    const status = statuses?.value?.[0] ?? null;

    if (status?.err) {
      throw new Error(
        `SOLANA_CONFIRMATION_FAILED:${JSON.stringify(status.err)}`
      );
    }

    if (
      status &&
      ['confirmed', 'finalized'].includes(status.confirmationStatus)
    ) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  const blockHeight = await rpc.getBlockHeight('confirmed');
  if (
    Number.isFinite(lastValidBlockHeight) &&
    blockHeight > lastValidBlockHeight
  ) {
    throw new Error('SOLANA_BLOCKHASH_EXPIRED');
  }

  throw new Error('SOLANA_CONFIRMATION_TIMEOUT');
}

function reasonFromError(error) {
  const candidates = [
    'StaleNonce',
    'MandateNotActive',
    'MandateExpired',
    'AssetRuleDisabled',
    'ActionNotAllowed',
    'ActionAmountExceeded',
    'PeriodAmountExceeded',
    'PythNotionalExceeded',
    'PythPeriodNotionalExceeded',
    'MarketConditionInvalidated',
    'PythMessageInvalid',
    'PythFeedMismatch',
    'PythEvidenceStale',
    'PythConfidenceTooWide',
    'AllowanceAlreadyUsed',
    'StaleAllowance',
    'AllowanceExpired',
    'AllowanceRequestMismatch',
    'AllowanceMandateMismatch',
    'AllowanceBeneficiaryMismatch',
    'AllowanceMintMismatch',
    'AllowanceNotionalExceeded'
  ];

  const text = [
    error?.message,
    error?.stack,
    ...(Array.isArray(error?.logs) ? error.logs : [])
  ]
    .filter(Boolean)
    .join('\n');

  return candidates.find((candidate) => text.includes(candidate)) ??
    'SOLANA_EXECUTION_REFUSED';
}

export function createDevnetExecutionProvider({
  rpcUrl = 'https://api.devnet.solana.com',
  signer,
  pythApiKey,
  connection = null,
  now = () => new Date().toISOString()
}) {
  if (!signer?.publicKey) throw new Error('devnet signer is required');
  if (!pythApiKey) throw new Error('Pyth API key is required');

  const rpc = connection ?? new Connection(rpcUrl, 'confirmed');

  const [charter] = PublicKey.findProgramAddressSync(
    [Buffer.from('charter'), signer.publicKey.toBuffer()],
    DEVNET_KEYS_PROGRAM_ID
  );
  const [mandateAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('mandate'), charter.toBuffer()],
    DEVNET_KEYS_PROGRAM_ID
  );

  async function loadRuntime() {
    const mandateInfo = await rpc.getAccountInfo(mandateAddress, 'confirmed');
    if (!mandateInfo) {
      throw new Error('DEVNET_DEMO_RUNTIME_NOT_BOOTSTRAPPED');
    }

    const mandate = parseMandateAccount(Buffer.from(mandateInfo.data));

    const rules = await rpc.getProgramAccounts(DEVNET_KEYS_PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [{ dataSize: ASSET_RULE_ACCOUNT_SIZE }]
    });

    const parsedRules = rules
      .map(({ pubkey, account }) =>
        parseAssetRuleAccount(pubkey, Buffer.from(account.data))
      )
      .filter(
        (rule) =>
          rule.mandate.equals(mandateAddress) &&
          rule.pythFeedId === DEMO_FEED_ID
      );

    if (parsedRules.length === 0) {
      throw new Error('DEVNET_DEMO_ASSET_RULE_NOT_FOUND');
    }

    parsedRules.sort((a, b) =>
      a.address.toBase58().localeCompare(b.address.toBase58())
    );

    const assetRule = parsedRules[0];
    const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('vault'),
        mandateAddress.toBuffer(),
        assetRule.mint.toBuffer()
      ],
      DEVNET_KEYS_PROGRAM_ID
    );

    const delegateTokenAccount = getAssociatedTokenAddressSync(
      assetRule.mint,
      signer.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    return {
      charter,
      mandateAddress,
      mandate,
      assetRule,
      vaultTokenAccount,
      delegateTokenAccount
    };
  }

  async function sendManageMandateInstruction(name, args = []) {
    const runtime = await loadRuntime();
    const data = Buffer.concat([discriminator(name), ...args]);

    const ix = new TransactionInstruction({
      programId: DEVNET_KEYS_PROGRAM_ID,
      keys: [
        { pubkey: runtime.charter, isSigner: false, isWritable: false },
        { pubkey: runtime.mandateAddress, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: false }
      ],
      data
    });

    const latest = await rpc.getLatestBlockhash('confirmed');
    const tx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: latest.blockhash
    }).add(ix);
    tx.sign(signer);

    const signature = await rpc.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });

    await confirmSignatureOverRpc({
      rpc,
      signature,
      lastValidBlockHeight: latest.lastValidBlockHeight
    });

    return { signature, state: await getState() };
  }

  async function configureMandatePolicy({
    expectedNonce,
    maxActionNotional,
    maxPeriodNotional,
    expiresAt = 0,
    maxMarketAgeSeconds = 30,
    maxConfidenceBps = 100
  }) {
    const actionMicro = Math.round(Number(maxActionNotional) * 1_000_000);
    const periodMicro = Math.round(Number(maxPeriodNotional) * 1_000_000);

    if (
      !Number.isFinite(actionMicro) ||
      !Number.isFinite(periodMicro) ||
      actionMicro <= 0 ||
      periodMicro < actionMicro
    ) {
      throw new Error('INVALID_MANDATE_LIMITS');
    }

    return sendManageMandateInstruction('configure_mandate_policy', [
      encodeU64(expectedNonce),
      encodeU64(actionMicro),
      encodeU64(periodMicro),
      encodeI64(expiresAt),
      encodeU32(maxMarketAgeSeconds),
      encodeU32(maxConfidenceBps)
    ]);
  }

  async function setMandateStatus({ expectedNonce, status }) {
    const code =
      status === 'ACTIVE'
        ? 0
        : status === 'PAUSED'
          ? 1
          : status === 'REVOKED'
            ? 2
            : null;

    if (code == null) throw new Error('INVALID_MANDATE_STATUS');

    return sendManageMandateInstruction('set_mandate_status', [
      encodeU64(expectedNonce),
      Buffer.from([code])
    ]);
  }

  async function setCurrentAssetEnabled({ expectedNonce, enabled }) {
    const runtime = await loadRuntime();
    const rule = runtime.assetRule;

    const data = Buffer.concat([
      discriminator('update_asset_rule'),
      encodeU64(expectedNonce),
      Buffer.from([enabled ? 1 : 0]),
      Buffer.from([rule.actionMask]),
      encodeU64(rule.maxActionAmount),
      encodeU64(rule.maxPeriodAmount),
      encodeI64(rule.periodSeconds),
      encodeU64(rule.maxUnitPriceMicroUsd),
      encodeU32(rule.pythFeedId)
    ]);

    const ix = new TransactionInstruction({
      programId: DEVNET_KEYS_PROGRAM_ID,
      keys: [
        { pubkey: runtime.charter, isSigner: false, isWritable: false },
        { pubkey: runtime.mandateAddress, isSigner: false, isWritable: true },
        { pubkey: rule.address, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: false }
      ],
      data
    });

    const latest = await rpc.getLatestBlockhash('confirmed');
    const tx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: latest.blockhash
    }).add(ix);
    tx.sign(signer);

    const signature = await rpc.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });

    await confirmSignatureOverRpc({
      rpc,
      signature,
      lastValidBlockHeight: latest.lastValidBlockHeight
    });

    return { signature, state: await getState() };
  }

  async function grantAllowanceOnce({
    requestId,
    expectedNonce,
    maxNotional,
    expiresAt = Math.floor(Date.now() / 1000) + 10 * 60
  }) {
    const runtime = await loadRuntime();
    const requestHash = allowanceRequestHash(requestId);
    const maxNotionalMicroUsd = Math.round(Number(maxNotional) * 1_000_000);

    if (
      !Number.isFinite(maxNotionalMicroUsd) ||
      maxNotionalMicroUsd <= 0
    ) {
      throw new Error('INVALID_ALLOW_ONCE_NOTIONAL');
    }

    const [allowanceReceipt] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('allowance'),
        runtime.mandateAddress.toBuffer(),
        runtime.assetRule.mint.toBuffer(),
        requestHash
      ],
      DEVNET_KEYS_PROGRAM_ID
    );

    const existingInfo = await rpc.getAccountInfo(allowanceReceipt, 'confirmed');
    if (existingInfo) {
      const existing = parseAllowanceReceiptAccount(Buffer.from(existingInfo.data));
      const compatible =
        existing.mandate.equals(runtime.mandateAddress) &&
        existing.guardian.equals(signer.publicKey) &&
        existing.beneficiary.equals(signer.publicKey) &&
        existing.mint.equals(runtime.assetRule.mint) &&
        existing.requestHash.equals(requestHash) &&
        existing.mandateNonce === Number(expectedNonce) &&
        existing.maxNotionalMicroUsd === maxNotionalMicroUsd;

      if (!compatible) {
        throw new Error('ALLOW_ONCE_EXISTING_RECEIPT_MISMATCH');
      }
      if (existing.used) {
        throw new Error('AllowanceAlreadyUsed');
      }
      if (existing.expiresAt > 0 && existing.expiresAt <= Math.floor(Date.now() / 1000)) {
        throw new Error('AllowanceExpired');
      }

      return {
        signature: null,
        allowanceReceipt: allowanceReceipt.toBase58(),
        requestHash: requestHash.toString('hex'),
        expectedNonce,
        maxNotionalMicroUsd,
        expiresAt: existing.expiresAt,
        reusedExistingReceipt: true
      };
    }

    const data = Buffer.concat([
      discriminator('grant_allowance_once'),
      requestHash,
      encodeU64(expectedNonce),
      encodeU64(maxNotionalMicroUsd),
      encodeI64(expiresAt)
    ]);

    const ix = new TransactionInstruction({
      programId: DEVNET_KEYS_PROGRAM_ID,
      keys: [
        { pubkey: runtime.charter, isSigner: false, isWritable: false },
        { pubkey: runtime.mandateAddress, isSigner: false, isWritable: false },
        { pubkey: runtime.assetRule.mint, isSigner: false, isWritable: false },
        { pubkey: allowanceReceipt, isSigner: false, isWritable: true },
        { pubkey: signer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data
    });

    const latest = await rpc.getLatestBlockhash('confirmed');
    const tx = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: latest.blockhash
    }).add(ix);
    tx.sign(signer);

    const signature = await rpc.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });
    await confirmSignatureOverRpc({
      rpc,
      signature,
      lastValidBlockHeight: latest.lastValidBlockHeight
    });

    return {
      signature,
      allowanceReceipt: allowanceReceipt.toBase58(),
      requestHash: requestHash.toString('hex'),
      expectedNonce,
      maxNotionalMicroUsd,
      expiresAt,
      reusedExistingReceipt: false
    };
  }

  async function getState() {
    const runtime = await loadRuntime();
    return {
      mode: 'SERVER_HELD_DEVNET_DEMO',
      network: 'solana-devnet',
      asset: DEMO_ASSET,
      programId: DEVNET_KEYS_PROGRAM_ID.toBase58(),
      charter: runtime.charter.toBase58(),
      mandateAddress: runtime.mandateAddress.toBase58(),
      mandate: {
        status:
          runtime.mandate.status === 0
            ? 'ACTIVE'
            : runtime.mandate.status === 1
              ? 'PAUSED'
              : 'REVOKED',
        stage: runtime.mandate.stage,
        version: runtime.mandate.version,
        nonce: runtime.mandate.nonce,
        maxActionNotionalMicroUsd:
          runtime.mandate.maxActionNotionalMicroUsd,
        maxPeriodNotionalMicroUsd:
          runtime.mandate.maxPeriodNotionalMicroUsd
      },
      assetRule: {
        address: runtime.assetRule.address.toBase58(),
        mint: runtime.assetRule.mint.toBase58(),
        enabled: runtime.assetRule.enabled,
        pythFeedId: runtime.assetRule.pythFeedId,
        maxActionAmountBaseUnits: runtime.assetRule.maxActionAmount,
        maxPeriodAmountBaseUnits: runtime.assetRule.maxPeriodAmount,
        spentThisPeriodBaseUnits: runtime.assetRule.spentThisPeriod,
        spentThisPeriodNotionalMicroUsd:
          runtime.assetRule.spentThisPeriodNotionalMicroUsd
      },
      truthBoundary: {
        executionAsset: 'DEMO_TOKEN',
        livePyth: true,
        serverHeldDemoSigner: true,
        realMinorSecuritiesExecution: false,
        brokerageOrCustody: false
      }
    };
  }

  async function execute({
    asset,
    type,
    notional,
    expectedNonce,
    idempotencyKey,
    allowOnceRequestId = null
  }) {
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return {
        evaluation: {
          contractVersion: '0.2',
          decision: 'REFUSE',
          reasonCode: 'IDEMPOTENCY_KEY_REQUIRED'
        },
        executionProof: null
      };
    }

    if (executionResults.has(idempotencyKey)) {
      return executionResults.get(idempotencyKey);
    }

    if (executionPromises.has(idempotencyKey)) {
      return executionPromises.get(idempotencyKey);
    }

    const promise = (async () => {
      const runtime = await loadRuntime();
      const mandate = runtime.mandate;
      const rule = runtime.assetRule;

      if (String(asset ?? '').toUpperCase() !== DEMO_ASSET) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'ASSET_OUTSIDE_RUNTIME',
            mandate
          }),
          executionProof: null
        };
      }

      if (String(type ?? '').toUpperCase() !== 'BUY') {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'ACTION_OUTSIDE_MANDATE',
            mandate
          }),
          executionProof: null
        };
      }

      if (Number(expectedNonce) !== Number(mandate.nonce)) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'STALE_NONCE',
            mandate
          }),
          executionProof: null
        };
      }

      if (mandate.status !== 0 || mandate.stage < 3 || !rule.enabled) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'MANDATE_NOT_ACTIVE',
            mandate
          }),
          executionProof: null
        };
      }

      const requestedNotionalMicroUsd = Math.round(Number(notional) * 1_000_000);
      if (
        !Number.isFinite(requestedNotionalMicroUsd) ||
        requestedNotionalMicroUsd <= 0
      ) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'INVALID_AMOUNT',
            mandate
          }),
          executionProof: null
        };
      }

      if (
        !allowOnceRequestId &&
        mandate.maxActionNotionalMicroUsd > 0 &&
        requestedNotionalMicroUsd > mandate.maxActionNotionalMicroUsd
      ) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'PYTH_NOTIONAL_EXCEEDED',
            mandate,
            requestedNotionalMicroUsd,
            boundaryRequestAvailable: true
          }),
          executionProof: null
        };
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const periodExpired =
        rule.periodSeconds > 0 &&
        nowSeconds >= rule.periodStartedAt + rule.periodSeconds;
      const effectiveSpentNotional = periodExpired
        ? 0
        : rule.spentThisPeriodNotionalMicroUsd;

      if (
        !allowOnceRequestId &&
        mandate.maxPeriodNotionalMicroUsd > 0 &&
        effectiveSpentNotional + requestedNotionalMicroUsd >
          mandate.maxPeriodNotionalMicroUsd
      ) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'PYTH_PERIOD_NOTIONAL_EXCEEDED',
            mandate,
            requestedNotionalMicroUsd,
            boundaryRequestAvailable: true
          }),
          executionProof: null
        };
      }

      const snapshot = await fetchPythProSolanaPayload({
        apiKey: pythApiKey,
        feed: PYTH_PRO_EQUITY_FEEDS.AAPL,
        maxAgeSeconds: mandate.maxMarketAgeSeconds || 30,
        maxConfidenceBps: mandate.maxConfidenceBps || 100
      });

      if (
        snapshot.status !== 'FRESH' ||
        snapshot.solanaPayload?.status !== 'AVAILABLE'
      ) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'PYTH_MARKET_EVIDENCE_UNAVAILABLE',
            mandate,
            requestedNotionalMicroUsd
          }),
          executionProof: null
        };
      }

      const encoding =
        snapshot.solanaPayload.encoding === 'base64' ? 'base64' : 'hex';
      const message = Buffer.from(snapshot.solanaPayload.data, encoding);
      const unitPriceMicroUsd = Math.round(Number(snapshot.price) * 1_000_000);

      if (!Number.isFinite(unitPriceMicroUsd) || unitPriceMicroUsd <= 0) {
        throw new Error('PYTH_UNIT_PRICE_INVALID');
      }

      if (
        rule.maxUnitPriceMicroUsd > 0 &&
        unitPriceMicroUsd > rule.maxUnitPriceMicroUsd
      ) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'MARKET_CONDITION_INVALIDATED',
            mandate,
            requestedNotionalMicroUsd
          }),
          executionProof: null
        };
      }

      const mintInfo = await getMint(rpc, rule.mint, 'confirmed', TOKEN_PROGRAM_ID);
      const scale = 10 ** mintInfo.decimals;
      const amount = Math.max(
        1,
        Math.floor((requestedNotionalMicroUsd * scale) / unitPriceMicroUsd)
      );

      if (!allowOnceRequestId && amount > rule.maxActionAmount) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'MANDATE_LIMIT_EXCEEDED',
            mandate,
            requestedNotionalMicroUsd,
            boundaryRequestAvailable: true
          }),
          executionProof: null
        };
      }

      const effectiveSpentAmount = periodExpired ? 0 : rule.spentThisPeriod;
      if (
        !allowOnceRequestId &&
        effectiveSpentAmount + amount > rule.maxPeriodAmount
      ) {
        return {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: 'PERIOD_LIMIT_EXCEEDED',
            mandate,
            requestedNotionalMicroUsd,
            boundaryRequestAvailable: true
          }),
          executionProof: null
        };
      }

      const storageInfo = await rpc.getAccountInfo(
        PYTH_LAZER_STORAGE_ID,
        'confirmed'
      );
      if (!storageInfo || storageInfo.data.length < 72) {
        throw new Error('PYTH_LAZER_STORAGE_UNAVAILABLE');
      }
      const pythTreasury = new PublicKey(storageInfo.data.subarray(40, 72));

      const ed25519Ix = createEd25519Instruction(message, 1, 12);
      const vecLength = Buffer.alloc(4);
      vecLength.writeUInt32LE(message.length);

      let allowanceReceipt = null;
      let data;
      let keys;

      if (allowOnceRequestId) {
        const requestHash = allowanceRequestHash(allowOnceRequestId);
        [allowanceReceipt] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('allowance'),
            runtime.mandateAddress.toBuffer(),
            rule.mint.toBuffer(),
            requestHash
          ],
          DEVNET_KEYS_PROGRAM_ID
        );

        data = Buffer.concat([
          discriminator('execute_once_with_pyth'),
          vecLength,
          message,
          encodeU64(amount),
          encodeU64(mandate.nonce),
          requestHash
        ]);

        keys = [
          { pubkey: runtime.charter, isSigner: false, isWritable: false },
          { pubkey: runtime.mandateAddress, isSigner: false, isWritable: true },
          { pubkey: rule.address, isSigner: false, isWritable: true },
          { pubkey: allowanceReceipt, isSigner: false, isWritable: true },
          { pubkey: runtime.vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: rule.mint, isSigner: false, isWritable: false },
          { pubkey: signer.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: runtime.delegateTokenAccount,
            isSigner: false,
            isWritable: true
          },
          { pubkey: PYTH_LAZER_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: PYTH_LAZER_STORAGE_ID, isSigner: false, isWritable: false },
          { pubkey: pythTreasury, isSigner: false, isWritable: true },
          {
            pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
            isSigner: false,
            isWritable: false
          },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ];
      } else {
        data = Buffer.concat([
          discriminator('execute_within_mandate_with_pyth'),
          vecLength,
          message,
          encodeU64(amount),
          encodeU64(mandate.nonce)
        ]);

        keys = [
          { pubkey: runtime.charter, isSigner: false, isWritable: false },
          { pubkey: runtime.mandateAddress, isSigner: false, isWritable: true },
          { pubkey: rule.address, isSigner: false, isWritable: true },
          { pubkey: runtime.vaultTokenAccount, isSigner: false, isWritable: true },
          { pubkey: rule.mint, isSigner: false, isWritable: false },
          { pubkey: signer.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: runtime.delegateTokenAccount,
            isSigner: false,
            isWritable: true
          },
          { pubkey: PYTH_LAZER_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: PYTH_LAZER_STORAGE_ID, isSigner: false, isWritable: false },
          { pubkey: pythTreasury, isSigner: false, isWritable: true },
          {
            pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
            isSigner: false,
            isWritable: false
          },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ];
      }

      const executionIx = new TransactionInstruction({
        programId: DEVNET_KEYS_PROGRAM_ID,
        keys,
        data
      });

      const latest = await rpc.getLatestBlockhash('confirmed');
      const tx = new Transaction({
        feePayer: signer.publicKey,
        recentBlockhash: latest.blockhash
      }).add(ed25519Ix, executionIx);

      tx.sign(signer);

      try {
        const signature = await rpc.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          maxRetries: 3
        });

        await confirmSignatureOverRpc({
          rpc,
          signature,
          lastValidBlockHeight: latest.lastValidBlockHeight
        });

        const after = await loadRuntime();
        const result = {
          evaluation: evaluation({
            decision: 'ALLOW',
            reasonCode: 'WITHIN_MANDATE',
            mandate: after.mandate,
            requestedNotionalMicroUsd
          }),
          executionProof: {
            status: 'CONFIRMED',
            network: 'solana-devnet',
            signature,
            programId: DEVNET_KEYS_PROGRAM_ID.toBase58(),
            mandateAddress: after.mandateAddress.toBase58(),
            mandateVersion: after.mandate.version,
            mandateNonce: after.mandate.nonce,
            executedAt: now(),
            idempotencyKey,
            simulated: false,
            asset: DEMO_ASSET,
            executionAsset: 'DEMO_TOKEN',
            oneTimeAllowance: allowOnceRequestId
              ? {
                  requestId: allowOnceRequestId,
                  receipt: allowanceReceipt?.toBase58() ?? null,
                  consumed: true
                }
              : null,
            pyth: {
              source: 'PYTH_PRO',
              feedId: DEMO_FEED_ID,
              verification: 'ONCHAIN_PYTH_LAZER',
              status: 'FRESH',
              authorityEffect: 'NONE',
              unitPriceMicroUsd,
              publishTime: snapshot.publishTime ?? null
            }
          }
        };

        executionResults.set(idempotencyKey, result);
        return result;
      } catch (error) {
        const result = {
          evaluation: evaluation({
            decision: 'REFUSE',
            reasonCode: reasonFromError(error),
            mandate,
            requestedNotionalMicroUsd
          }),
          executionProof: null
        };
        executionResults.set(idempotencyKey, result);
        return result;
      }
    })();

    executionPromises.set(idempotencyKey, promise);

    try {
      const result = await promise;
      executionResults.set(idempotencyKey, result);
      return result;
    } finally {
      executionPromises.delete(idempotencyKey);
    }
  }

  return {
    getState,
    execute,
    configureMandatePolicy,
    setMandateStatus,
    setCurrentAssetEnabled,
    grantAllowanceOnce,
    idempotencyScope: 'PROCESS_LOCAL_DEMO'
  };
}

let defaultProvider = null;

export function configuredDevnetExecutionProviderFromEnv() {
  if (defaultProvider) return defaultProvider;

  if (!process.env.DEVNET_KEYPAIR_JSON || !process.env.PYTH_PRO_API_KEY) {
    return null;
  }

  defaultProvider = createDevnetExecutionProvider({
    rpcUrl:
      process.env.SOLANA_DEVNET_RPC_URL ??
      'https://api.devnet.solana.com',
    signer: parseKeypair(process.env.DEVNET_KEYPAIR_JSON),
    pythApiKey: process.env.PYTH_PRO_API_KEY
  });

  return defaultProvider;
}
