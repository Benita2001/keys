const anchor = require('@coral-xyz/anchor');
const spl = require('@solana/spl-token');
const { createHash } = require('node:crypto');

const {
  PublicKey,
  SystemProgram
} = anchor.web3;

const {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo
} = spl;

const TARGET_STAGE = 3;
const TARGET_ACTION_NOTIONAL = 10_000_000;
const TARGET_PERIOD_NOTIONAL = 50_000_000;
const TARGET_MAX_ACTION_AMOUNT = 100_000;
const TARGET_MAX_PERIOD_AMOUNT = 500_000;
const TARGET_PERIOD_SECONDS = 30 * 24 * 60 * 60;
const TARGET_MAX_UNIT_PRICE = 1_000_000_000;
const TARGET_FEED_ID = 1435;
const TARGET_VAULT_BALANCE = 50_000_000;

function hash32(value) {
  return Array.from(createHash('sha256').update(value).digest());
}

function nonceBytes(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Keys;
  const wallet = provider.wallet.publicKey;
  const payer = provider.wallet.payer;

  if (!payer) throw new Error('Anchor NodeWallet payer is required');

  const [charter] = PublicKey.findProgramAddressSync(
    [Buffer.from('charter'), wallet.toBuffer()],
    program.programId
  );
  const [mandate] = PublicKey.findProgramAddressSync(
    [Buffer.from('mandate'), charter.toBuffer()],
    program.programId
  );

  let charterState = await program.account.charter.fetchNullable(charter);
  if (!charterState) {
    const tx = await program.methods
      .initializeCharter(
        hash32('CA-QC-DEMO-RUNTIME'),
        new anchor.BN(100_000_000),
        new anchor.BN(50_000_000)
      )
      .accountsStrict({
        charter,
        guardian: wallet,
        beneficiary: wallet,
        systemProgram: SystemProgram.programId
      })
      .rpc();
    console.log(`DEMO_RUNTIME initialize_charter_tx=${tx}`);
    charterState = await program.account.charter.fetch(charter);
  }

  if (
    !charterState.guardian.equals(wallet) ||
    !charterState.beneficiary.equals(wallet)
  ) {
    throw new Error('DEVNET_DEMO_CHARTER_AUTHORITY_MISMATCH');
  }

  let mandateState = await program.account.mandate.fetchNullable(mandate);
  if (!mandateState) {
    const tx = await program.methods
      .initializeMandate()
      .accountsStrict({
        charter,
        mandate,
        guardian: wallet,
        systemProgram: SystemProgram.programId
      })
      .rpc();
    console.log(`DEMO_RUNTIME initialize_mandate_tx=${tx}`);
    mandateState = await program.account.mandate.fetch(mandate);
  }

  if (mandateState.status === 1) {
    const tx = await program.methods
      .setMandateStatus(new anchor.BN(mandateState.nonce.toNumber()), 0)
      .accountsStrict({
        charter,
        mandate,
        guardian: wallet
      })
      .rpc();
    console.log(`DEMO_RUNTIME resume_mandate_tx=${tx}`);
    mandateState = await program.account.mandate.fetch(mandate);
  }

  if (mandateState.status === 2) {
    throw new Error('DEVNET_DEMO_MANDATE_REVOKED');
  }

  if (mandateState.stage < TARGET_STAGE) {
    const nonce = mandateState.nonce.toNumber();
    const [reviewReceipt] = PublicKey.findProgramAddressSync(
      [Buffer.from('review'), mandate.toBuffer(), nonceBytes(nonce)],
      program.programId
    );

    const existingReceipt =
      await program.account.reviewReceipt.fetchNullable(reviewReceipt);

    if (!existingReceipt) {
      const reviewTx = await program.methods
        .recordReview(hash32('stable-devnet-demo-runtime'), true)
        .accountsStrict({
          charter,
          mandate,
          reviewReceipt,
          guardian: wallet,
          systemProgram: SystemProgram.programId
        })
        .rpc();
      console.log(`DEMO_RUNTIME record_review_tx=${reviewTx}`);
    }

    const transitionTx = await program.methods
      .transitionMandate(TARGET_STAGE, new anchor.BN(nonce))
      .accountsStrict({
        charter,
        mandate,
        reviewReceipt,
        guardian: wallet
      })
      .rpc();
    console.log(`DEMO_RUNTIME transition_bounded_tx=${transitionTx}`);
    mandateState = await program.account.mandate.fetch(mandate);
  }

  async function rulesForMandate() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const rawRules = await provider.connection.getProgramAccounts(program.programId, {
        commitment: 'confirmed',
        filters: [
          { dataSize: 135 },
          { memcmp: { offset: 8, bytes: mandate.toBase58() } }
        ]
      });

      if (rawRules.length > 0) {
        const decoded = [];
        for (const { pubkey } of rawRules) {
          decoded.push({
            publicKey: pubkey,
            account: await program.account.assetRule.fetch(pubkey)
          });
        }
        return decoded;
      }

      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return [];
  }

  let rules = await rulesForMandate();

  let mint;
  let assetRule;
  let vaultTokenAccount;

  if (rules.length === 0) {
    mint = await createMint(
      provider.connection,
      payer,
      wallet,
      null,
      6
    );

    [assetRule] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset-rule'), mandate.toBuffer(), mint.toBuffer()],
      program.programId
    );
    [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), mandate.toBuffer(), mint.toBuffer()],
      program.programId
    );

    const initRuleTx = await program.methods
      .initializeAssetRule(
        new anchor.BN(mandateState.nonce.toNumber()),
        1,
        new anchor.BN(TARGET_MAX_ACTION_AMOUNT),
        new anchor.BN(TARGET_MAX_PERIOD_AMOUNT),
        new anchor.BN(TARGET_PERIOD_SECONDS),
        new anchor.BN(TARGET_MAX_UNIT_PRICE),
        TARGET_FEED_ID
      )
      .accountsStrict({
        charter,
        mandate,
        assetRule,
        vaultTokenAccount,
        mint,
        guardian: wallet,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    console.log(`DEMO_RUNTIME initialize_asset_rule_tx=${initRuleTx}`);
    mandateState = await program.account.mandate.fetch(mandate);

    // Reuse the exact PDA we just created instead of waiting for RPC program-account
    // indexing to catch up. Future runs discover it through rulesForMandate().
    rules = [
      {
        publicKey: assetRule,
        account: await program.account.assetRule.fetch(assetRule)
      }
    ];
  }

  const tslaRules = rules
    .filter((entry) => Number(entry.account.pythFeedId) === TARGET_FEED_ID)
    .sort((a, b) =>
      a.publicKey.toBase58().localeCompare(b.publicKey.toBase58())
    );

  if (tslaRules.length === 0) {
    throw new Error('DEVNET_DEMO_TSLA_RULE_NOT_FOUND');
  }

  if (tslaRules.length > 1) {
    console.log(
      `DEMO_RUNTIME duplicate_tsla_rules=${tslaRules.length} canonical=${tslaRules[0].publicKey.toBase58()}`
    );
  }

  const ruleEntry = tslaRules[0];
  assetRule = ruleEntry.publicKey;
  mint = ruleEntry.account.mint;
  [vaultTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), mandate.toBuffer(), mint.toBuffer()],
    program.programId
  );

  const rule = ruleEntry.account;
  const needsRuleUpdate =
    !rule.enabled ||
    Number(rule.actionMask) !== 1 ||
    rule.maxActionAmount.toNumber() !== TARGET_MAX_ACTION_AMOUNT ||
    rule.maxPeriodAmount.toNumber() !== TARGET_MAX_PERIOD_AMOUNT ||
    rule.periodSeconds.toNumber() !== TARGET_PERIOD_SECONDS ||
    rule.maxUnitPriceMicroUsd.toNumber() !== TARGET_MAX_UNIT_PRICE ||
    Number(rule.pythFeedId) !== TARGET_FEED_ID;

  if (needsRuleUpdate) {
    const tx = await program.methods
      .updateAssetRule(
        new anchor.BN(mandateState.nonce.toNumber()),
        true,
        1,
        new anchor.BN(TARGET_MAX_ACTION_AMOUNT),
        new anchor.BN(TARGET_MAX_PERIOD_AMOUNT),
        new anchor.BN(TARGET_PERIOD_SECONDS),
        new anchor.BN(TARGET_MAX_UNIT_PRICE),
        TARGET_FEED_ID
      )
      .accountsStrict({
        charter,
        mandate,
        assetRule,
        guardian: wallet
      })
      .rpc();

    console.log(`DEMO_RUNTIME update_asset_rule_tx=${tx}`);
    mandateState = await program.account.mandate.fetch(mandate);
  }

  const needsPolicyUpdate =
    mandateState.maxActionNotional.toNumber() !== TARGET_ACTION_NOTIONAL ||
    mandateState.maxPeriodNotional.toNumber() !== TARGET_PERIOD_NOTIONAL ||
    mandateState.maxMarketAgeSeconds !== 30 ||
    mandateState.maxConfidenceBps !== 100;

  if (needsPolicyUpdate) {
    const tx = await program.methods
      .configureMandatePolicy(
        new anchor.BN(mandateState.nonce.toNumber()),
        new anchor.BN(TARGET_ACTION_NOTIONAL),
        new anchor.BN(TARGET_PERIOD_NOTIONAL),
        new anchor.BN(0),
        30,
        100
      )
      .accountsStrict({
        charter,
        mandate,
        guardian: wallet
      })
      .rpc();

    console.log(`DEMO_RUNTIME configure_policy_tx=${tx}`);
    mandateState = await program.account.mandate.fetch(mandate);
  }

  const delegateTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    mint,
    wallet
  );

  let vault = await getAccount(provider.connection, vaultTokenAccount);
  if (Number(vault.amount) < TARGET_VAULT_BALANCE) {
    const topUp = TARGET_VAULT_BALANCE - Number(vault.amount);
    const signature = await mintTo(
      provider.connection,
      payer,
      mint,
      vaultTokenAccount,
      payer,
      topUp
    );
    console.log(`DEMO_RUNTIME vault_top_up_tx=${signature} amount=${topUp}`);
    vault = await getAccount(provider.connection, vaultTokenAccount);
  }

  const finalRule = await program.account.assetRule.fetch(assetRule);
  const finalMandate = await program.account.mandate.fetch(mandate);

  console.log(
    JSON.stringify(
      {
        status: 'READY',
        mode: 'SERVER_HELD_DEVNET_DEMO',
        programId: program.programId.toBase58(),
        signer: wallet.toBase58(),
        charter: charter.toBase58(),
        mandate: mandate.toBase58(),
        mandateVersion: finalMandate.version.toNumber(),
        mandateNonce: finalMandate.nonce.toNumber(),
        maxActionNotionalMicroUsd:
          finalMandate.maxActionNotional.toNumber(),
        maxPeriodNotionalMicroUsd:
          finalMandate.maxPeriodNotional.toNumber(),
        asset: 'TSLA',
        pythFeedId: Number(finalRule.pythFeedId),
        mint: mint.toBase58(),
        assetRule: assetRule.toBase58(),
        vaultTokenAccount: vaultTokenAccount.toBase58(),
        delegateTokenAccount: delegateTokenAccount.address.toBase58(),
        vaultBalanceBaseUnits: Number(vault.amount),
        truthBoundary: {
          executionAsset: 'DEMO_TOKEN',
          serverHeldDemoSigner: true,
          realMinorSecuritiesExecution: false
        }
      },
      null,
      2
    )
  );
  console.log('DEVNET_DEMO_RUNTIME=READY');
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
