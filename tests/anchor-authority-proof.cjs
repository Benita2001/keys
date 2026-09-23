const anchor = require("@coral-xyz/anchor");
const { strict: assert } = require("node:assert");
const { createHash } = require("node:crypto");

const {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = anchor.web3;

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

describe("KEYS Solana authority proof", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Keys;

  const beneficiary = Keypair.generate();
  const attacker = Keypair.generate();
  const proposal = Keypair.generate();

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
    for (const key of [beneficiary.publicKey, attacker.publicKey]) {
      const signature = await provider.connection.requestAirdrop(
        key,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature, "confirmed");
    }
  });

  it("creates Charter -> Mandate -> Proposal -> eligible ReviewReceipt", async () => {
    await program.methods
      .initializeCharter(hash32("CA-QC"), new anchor.BN(10000), new anchor.BN(5000))
      .accountsStrict({
        charter,
        guardian: provider.wallet.publicKey,
        beneficiary: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([beneficiary])
      .rpc();

    await program.methods
      .initializeMandate()
      .accountsStrict({
        charter,
        mandate,
        guardian: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
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

    await program.methods
      .recordReview(hash32("evidence:review-0"), true)
      .accountsStrict({
        charter,
        mandate,
        reviewReceipt: reviewReceipt0,
        guardian: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const mandateState = await program.account.mandate.fetch(mandate);
    const receipt = await program.account.reviewReceipt.fetch(reviewReceipt0);
    assert.equal(mandateState.stage, 2);
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

  it("accepts guardian PROPOSE -> BOUNDED and advances version/nonce", async () => {
    await program.methods
      .transitionMandate(3, new anchor.BN(0))
      .accountsStrict({
        charter,
        mandate,
        reviewReceipt: reviewReceipt0,
        guardian: provider.wallet.publicKey,
      })
      .rpc();

    const mandateState = await program.account.mandate.fetch(mandate);
    assert.equal(mandateState.stage, 3);
    assert.equal(mandateState.version.toNumber(), 2);
    assert.equal(mandateState.nonce.toNumber(), 1);

    console.log("PROOF authorized_transition=ALLOW PROPOSE->BOUNDED version=2 nonce=1");
  });

  it("refuses replay of the old nonce-bound review material", async () => {
    await expectRefusal(
      "stale_review_replay",
      () =>
        program.methods
          .transitionMandate(4, new anchor.BN(0))
          .accountsStrict({
            charter,
            mandate,
            reviewReceipt: reviewReceipt0,
            guardian: provider.wallet.publicKey,
          })
          .rpc(),
      ["ConstraintSeeds", "StaleNonce", "StaleReviewReceipt", "seeds"]
    );

    const mandateState = await program.account.mandate.fetch(mandate);
    assert.equal(mandateState.stage, 3);
    assert.equal(mandateState.version.toNumber(), 2);
    assert.equal(mandateState.nonce.toNumber(), 1);
  });
});
