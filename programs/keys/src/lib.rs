//! KEYS Solana program design stub.
//!
//! This file is deliberately not presented as deployed or compiled proof yet.
//! The v0.1 executable reference implementation lives in `src/`.
//!
//! Intended state:
//! - Charter: signers, jurisdiction hash, stage rules
//! - Mandate: current stage, caps, expiry, nonce
//! - ProposalCommitment: hash, asset id, amount, created_at
//! - ReviewReceipt: evidence hash, review outcome, transition eligibility
//!
//! Critical invariant:
//! Evidence may make a mandate eligible for review, but a real-authority
//! transition still requires an explicit authorized signer.

pub const KEYS_PROGRAM_DESIGN_VERSION: &str = "0.1.0";
