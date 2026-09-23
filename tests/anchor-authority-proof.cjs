const anchor = require("@coral-xyz/anchor");
const spl = require("@solana/spl-token");
const { strict: assert } = require("node:assert");
const { createHash } = require("node:crypto");

const {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = anchor.web3;

const {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  mintTo,
} = spl;

function hash32(value) {
  return Array.from(createHash("sha256").update(value).digest());
}

function nonceBytes(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

async function expectRefusal(label, action, acceptedCodes = []) {
  let refused = false;
  let code = "runtime-refusal";
  try {
    await action();
  } catch (error) {
    refused = true;
    code =
      error?.error?.errorCode?.code ??
      error?.error?.errorMessage ??
      error?.message ??
      "runtime-refusal";
    if (acceptedCodes.length) {
      const printable = String(code);
      assert(
        acceptedCodes.some((candidate) => printable.includes(candidate)),
        `${label} refused, but with unexpected error: ${printable}`
      );
    }
  }
  assert.equal(refused, true, `${label} must refuse`);
  console.log(`PROOF ${label}=REFUSE code=${String(code).split("\n")[0]}`);
}

describe("KEYS Solana authority + bounded-capital proof", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Keys;

  let authorityTransitionProvider;

  const beneficiary = Keypair.generate();
  const attacker = Keypair.generate();
  const proposal = Keypair.generate();

  let mockStockMint;
  let assetRule;
  let vaultTokenAccount;
  let beneficiaryTokenAccount;

  const [charter] = PublicKey.findProgramAddressSync(
    [Buffer.from("charter"), beneficiary.publicKey.toBuffer()],
    program.programId
  );
  const [mandate] = PublicKey.findProgramAddressSync(
    [Buffer.from("mandate"), charter.toBuffer()],
    program.programId
  );
  const [reviewReceipt0] = PublicKey.findProgramAddressSync(
    [Buffer.from("review"), mandate.toBuffer(), nonceBytes(0)],
    program.programId
  );

  before(async () => {
    const { createAnchorAuthorityTransitionProvider } = await import(
      "../src/anchor-authority-provider.mjs"
    );

    authorityTransitionProvider = createAnchorAuthorityTransitionProvider({
      program,
      provider,
    });

    const signature = await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: beneficiary.publicKey,
          lamports: Math.floor(0.2 * LAMPORTS_PER_SOL),
        })
      )
    );
    console.log(`PROOF fund_beneficiary_tx=${signature}`);
    console.log("PROOF anchor_authority_provider=READY");

    const payer = provider.wallet.payer;
    assert(payer, "Anchor NodeWallet payer is required for the token runtime proof");

    mockStockMint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      0
    );

    beneficiaryTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mockStockMint,
      beneficiary.publicKey
    );

    [assetRule] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("asset-rule"),
        mandate.toBuffer(),
        mockStockMint.toBuffer(),
      ],
      program.programId
    );

    [vaultTokenAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        mandate.toBuffer(),
        mockStockMint.toBuffer(),
      ],
      program.programId
    );

    console.log(`PROOF mock_stock_mint=${mockStockMint.toBase58()}`);
    console.log(`PROOF beneficiary_token_account=${beneficiaryTokenAccount.address.toBase58()}`);
    console.log(`PROOF asset_rule=${assetRule.toBase58()}`);
    console.log(`PROOF vault_token_account=${vaultTokenAccount.toBase58()}`);
  });

  it("creates Charter -> Mandate -> Proposal -> eligible ReviewReceipt", async () => {
    const charterTx = await program.methods
      .initializeCharter(hash32("CA-QC"), new anchor.BN(10000), new anchor.BN(5000))
      .accountsStrict({
        charter,
        guardian: provider.wallet.publicKey,
        beneficiary: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([beneficiary])
      .rpc();
    console.log(`PROOF initialize_charter_tx=${charterTx}`);

    const mandateTx = await program.methods
      .initializeMandate()
      .accountsStrict({
        charter,
        mandate,
        guardian: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`PROOF initialize_mandate_tx=${mandateTx}`);

    const proposalTx = await program.methods
      .commitProposal(
        hash32("maya:aapl:25:reasoning-v1"),
        hash32("AAPL"),
        new anchor.BN(2500),
        new anchor.BN(1789992000)
      )
      .accountsStrict({
        charter,
        mandate,
        proposal: proposal.publicKey,
        beneficiary: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([beneficiary, proposal])
      .rpc();
    console.log(`PROOF commit_proposal_tx=${proposalTx}`);

    const reviewTx = await program.methods
      .recordReview(hash32("evidence:review-0"), true)
      .accountsStrict({
        charter,
        mandate,
        reviewReceipt: reviewReceipt0,
        guardian: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`PROOF record_review_tx=${reviewTx}`);

    const mandateState = await program.account.mandate.fetch(mandate);
    const receipt = await program.account.reviewReceipt.fetch(reviewReceipt0);
    assert.equal(mandateState.stage, 2);
    assert.equal(mandateState.status, 0);
    assert.equal(mandateState.version.toNumber(), 1);
    assert.equal(mandateState.nonce.toNumber(), 0);
    assert.equal(receipt.eligibleForReview, true);
    assert.equal(receipt.mandateNonce.toNumber(), 0);

    console.log(`PROOF charter=${charter.toBase58()}`);
    console.log(`PROOF mandate=${mandate.toBase58()} stage=PROPOSE version=1 nonce=0`);
    console.log(`PROOF proposal=${proposal.publicKey.toBase58()} amount=2500`);
    console.log(`PROOF review_receipt=${reviewReceipt0.toBase58()} eligible=true nonce=0`);
  });

  it("refuses an unauthorized authority transition", async () => {
    await expectRefusal(
      "unauthorized_transition",
      () =>
        program.methods
          .transitionMandate(3, new anchor.BN(0))
          .accountsStrict({
            charter,
            mandate,
            reviewReceipt: reviewReceipt0,
            guardian: attacker.publicKey,
          })
          .signers([attacker])
          .rpc(),
      ["ConstraintHasOne", "Unauthorized", "has one"]
    );

    const mandateState = await program.account.mandate.fetch(mandate);
    assert.equal(mandateState.stage, 2);
    assert.equal(mandateState.nonce.toNumber(), 0);
  });

  it("accepts guardian PROPOSE -> BOUNDED through the backend Anchor provider", async () => {
    const result = await authorityTransitionProvider.commitTransition({
      charterAddress: charter.toBase58(),
      mandateAddress: mandate.toBase58(),
      reviewReceiptAddress: reviewReceipt0.toBase58(),
      toStage: "BOUNDED",
      expectedNonce: 0,
    });

    assert.equal(result.ok, true);
    assert.equal(result.mandate.stage, "BOUNDED");
    assert.equal(result.mandate.version, 2);
    assert.equal(result.mandate.nonce, 1);

    console.log(`PROOF authorized_transition_tx=${result.proof.signature}`);
    console.log(`PROOF authority_provider_program_id=${result.proof.programId}`);
    console.log(`PROOF authority_provider_mandate=${result.proof.mandateAddress}`);
    console.log("PROOF authorized_transition=ALLOW PROPOSE->BOUNDED version=2 nonce=1 provider=anchor-authority-provider");

    const mandateState = await program.account.mandate.fetch(mandate);
    assert.equal(mandateState.stage, 3);
    assert.equal(mandateState.version.toNumber(), 2);
    assert.equal(mandateState.nonce.toNumber(), 1);
  });

  it("refuses replay of the old nonce-bound review material through the backend Anchor provider", async () => {
    const result = await authorityTransitionProvider.commitTransition({
      charterAddress: charter.toBase58(),
      mandateAddress: mandate.toBase58(),
      reviewReceiptAddress: reviewReceipt0.toBase58(),
      toStage: "INDEPENDENT",
      expectedNonce: 0,
    });

    assert.equal(result.ok, false);
    assert(
      ["ConstraintSeeds", "StaleNonce", "StaleReviewReceipt", "seeds"].some(
        (candidate) => String(result.reasonCode).includes(candidate)
      ),
      `stale replay refused with unexpected error: ${result.reasonCode}`
    );

    console.log(
      `PROOF stale_review_replay=REFUSE code=${String(result.reasonCode).split("\n")[0]} provider=anchor-authority-provider`
    );

    const mandateState = await program.account.mandate.fetch(mandate);
    assert.equal(mandateState.stage, 3);
    assert.equal(mandateState.version.toNumber(), 2);
    assert.equal(mandateState.nonce.toNumber(), 1);
  });

  it("creates a program-controlled mock-stock vault and explicit asset rule", async () => {
    const tx = await program.methods
      .initializeAssetRule(
        new anchor.BN(1),
        1,
        new anchor.BN(250),
        new anchor.BN(1000),
        new anchor.BN(3600),
        1435
      )
      .accountsStrict({
        charter,
        mandate,
        assetRule,
        vaultTokenAccount,
        mint: mockStockMint,
        guardian: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`PROOF initialize_asset_rule_tx=${tx}`);

    const payer = provider.wallet.payer;
    await mintTo(
      provider.connection,
      payer,
      mockStockMint,
      vaultTokenAccount,
      payer,
      2000
    );

    const rule = await program.account.assetRule.fetch(assetRule);
    const mandateState = await program.account.mandate.fetch(mandate);
    const vault = await getAccount(provider.connection, vaultTokenAccount);

    assert.equal(rule.enabled, true);
    assert.equal(rule.maxActionAmount.toNumber(), 250);
    assert.equal(rule.maxPeriodAmount.toNumber(), 1000);
    assert.equal(rule.pythFeedId, 1435);
    assert.equal(mandateState.version.toNumber(), 3);
    assert.equal(mandateState.nonce.toNumber(), 2);
    assert.equal(Number(vault.amount), 2000);

    console.log("PROOF bounded_vault=READY max_action_amount=250 max_period_amount=1000 nonce=2");
  });

  it("allows an in-bounds capital action without guardian approval", async () => {
    const beforeVault = await getAccount(provider.connection, vaultTokenAccount);
    const beforeDelegate = await getAccount(
      provider.connection,
      beneficiaryTokenAccount.address
    );

    const tx = await program.methods
      .executeWithinMandate(new anchor.BN(100), new anchor.BN(2))
      .accountsStrict({
        charter,
        mandate,
        assetRule,
        vaultTokenAccount,
        mint: mockStockMint,
        beneficiary: beneficiary.publicKey,
        delegateTokenAccount: beneficiaryTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([beneficiary])
      .rpc();

    const afterVault = await getAccount(provider.connection, vaultTokenAccount);
    const afterDelegate = await getAccount(
      provider.connection,
      beneficiaryTokenAccount.address
    );

    assert.equal(Number(beforeVault.amount) - Number(afterVault.amount), 100);
    assert.equal(Number(afterDelegate.amount) - Number(beforeDelegate.amount), 100);

    console.log(`PROOF in_bounds_execution_tx=${tx}`);
    console.log("PROOF in_bounds_execution=ALLOW amount=100 guardian_approval=false");
  });

  it("refuses the same delegate when the capital action exceeds the standing boundary", async () => {
    const beforeVault = await getAccount(provider.connection, vaultTokenAccount);

    await expectRefusal(
      "out_of_bounds_execution",
      () =>
        program.methods
          .executeWithinMandate(new anchor.BN(500), new anchor.BN(2))
          .accountsStrict({
            charter,
            mandate,
            assetRule,
            vaultTokenAccount,
            mint: mockStockMint,
            beneficiary: beneficiary.publicKey,
            delegateTokenAccount: beneficiaryTokenAccount.address,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([beneficiary])
          .rpc(),
      ["ActionAmountExceeded", "per-action asset boundary"]
    );

    const afterVault = await getAccount(provider.connection, vaultTokenAccount);
    assert.equal(Number(afterVault.amount), Number(beforeVault.amount));
    console.log("PROOF capital_boundary=ENFORCED_BY_PROGRAM requested=500 standing_max=250");
  });

  it("guardian widens the asset boundary through an explicit nonce-bound transition", async () => {
    const tx = await program.methods
      .updateAssetRule(
        new anchor.BN(2),
        true,
        1,
        new anchor.BN(500),
        new anchor.BN(1000),
        new anchor.BN(3600),
        1435
      )
      .accountsStrict({
        charter,
        mandate,
        assetRule,
        guardian: provider.wallet.publicKey,
      })
      .rpc();

    const rule = await program.account.assetRule.fetch(assetRule);
    const mandateState = await program.account.mandate.fetch(mandate);

    assert.equal(rule.maxActionAmount.toNumber(), 500);
    assert.equal(mandateState.version.toNumber(), 4);
    assert.equal(mandateState.nonce.toNumber(), 3);

    console.log(`PROOF widen_asset_rule_tx=${tx}`);
    console.log("PROOF human_widen=ALLOW max_action_amount=250->500 version=4 nonce=3");
  });

  it("refuses stale execution material after the guardian widens the mandate", async () => {
    await expectRefusal(
      "stale_execution_nonce",
      () =>
        program.methods
          .executeWithinMandate(new anchor.BN(100), new anchor.BN(2))
          .accountsStrict({
            charter,
            mandate,
            assetRule,
            vaultTokenAccount,
            mint: mockStockMint,
            beneficiary: beneficiary.publicKey,
            delegateTokenAccount: beneficiaryTokenAccount.address,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([beneficiary])
          .rpc(),
      ["StaleNonce", "nonce"]
    );
  });

  it("allows the previously refused amount after the explicit human widen", async () => {
    const beforeVault = await getAccount(provider.connection, vaultTokenAccount);

    const tx = await program.methods
      .executeWithinMandate(new anchor.BN(500), new anchor.BN(3))
      .accountsStrict({
        charter,
        mandate,
        assetRule,
        vaultTokenAccount,
        mint: mockStockMint,
        beneficiary: beneficiary.publicKey,
        delegateTokenAccount: beneficiaryTokenAccount.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([beneficiary])
      .rpc();

    const afterVault = await getAccount(provider.connection, vaultTokenAccount);
    assert.equal(Number(beforeVault.amount) - Number(afterVault.amount), 500);

    console.log(`PROOF widened_execution_tx=${tx}`);
    console.log("PROOF same_action_after_human_widen=ALLOW amount=500 nonce=3");
  });

  it("guardian can pause the mandate and the capital path fails closed", async () => {
    const pauseTx = await program.methods
      .setMandateStatus(new anchor.BN(3), 1)
      .accountsStrict({
        charter,
        mandate,
        guardian: provider.wallet.publicKey,
      })
      .rpc();

    console.log(`PROOF pause_mandate_tx=${pauseTx}`);

    await expectRefusal(
      "paused_mandate_execution",
      () =>
        program.methods
          .executeWithinMandate(new anchor.BN(1), new anchor.BN(4))
          .accountsStrict({
            charter,
            mandate,
            assetRule,
            vaultTokenAccount,
            mint: mockStockMint,
            beneficiary: beneficiary.publicKey,
            delegateTokenAccount: beneficiaryTokenAccount.address,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([beneficiary])
          .rpc(),
      ["MandateNotActive", "not active"]
    );

    const mandateState = await program.account.mandate.fetch(mandate);
    assert.equal(mandateState.status, 1);
    assert.equal(mandateState.version.toNumber(), 5);
    assert.equal(mandateState.nonce.toNumber(), 4);

    console.log("PROOF downward_authority=PAUSED version=5 nonce=4");
  });
});
