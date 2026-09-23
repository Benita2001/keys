use anchor_lang::prelude::*;

declare_id!("ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk");

pub const STAGE_LEARN: u8 = 0;
pub const STAGE_PRACTICE: u8 = 1;
pub const STAGE_PROPOSE: u8 = 2;
pub const STAGE_BOUNDED: u8 = 3;
pub const STAGE_INDEPENDENT: u8 = 4;

#[program]
pub mod keys {
    use super::*;

    pub fn initialize_charter(
        ctx: Context<InitializeCharter>,
        jurisdiction_hash: [u8; 32],
        max_proposal_notional: u64,
        max_bounded_notional: u64,
    ) -> Result<()> {
        require!(max_proposal_notional > 0, KeysError::InvalidCap);
        require!(max_bounded_notional > 0, KeysError::InvalidCap);

        let charter = &mut ctx.accounts.charter;
        charter.guardian = ctx.accounts.guardian.key();
        charter.beneficiary = ctx.accounts.beneficiary.key();
        charter.jurisdiction_hash = jurisdiction_hash;
        charter.max_proposal_notional = max_proposal_notional;
        charter.max_bounded_notional = max_bounded_notional;
        charter.version = 1;
        charter.bump = ctx.bumps.charter;
        Ok(())
    }

    pub fn initialize_mandate(ctx: Context<InitializeMandate>) -> Result<()> {
        let mandate = &mut ctx.accounts.mandate;
        mandate.charter = ctx.accounts.charter.key();
        mandate.stage = STAGE_PROPOSE;
        mandate.version = 1;
        mandate.nonce = 0;
        mandate.last_evidence_hash = [0u8; 32];
        mandate.bump = ctx.bumps.mandate;
        Ok(())
    }

    pub fn commit_proposal(
        ctx: Context<CommitProposal>,
        commitment_hash: [u8; 32],
        asset_hash: [u8; 32],
        amount: u64,
        created_at: i64,
    ) -> Result<()> {
        require!(amount > 0, KeysError::InvalidAmount);

        let charter = &ctx.accounts.charter;
        let mandate = &ctx.accounts.mandate;
        require!(mandate.stage >= STAGE_PROPOSE, KeysError::ProposalNotAllowedAtStage);
        require!(amount <= charter.max_proposal_notional, KeysError::ProposalCapExceeded);

        let proposal = &mut ctx.accounts.proposal;
        proposal.mandate = mandate.key();
        proposal.beneficiary = ctx.accounts.beneficiary.key();
        proposal.commitment_hash = commitment_hash;
        proposal.asset_hash = asset_hash;
        proposal.amount = amount;
        proposal.created_at = created_at;
        proposal.mandate_nonce = mandate.nonce;
        Ok(())
    }

    pub fn record_review(
        ctx: Context<RecordReview>,
        evidence_hash: [u8; 32],
        eligible_for_review: bool,
    ) -> Result<()> {
        let receipt = &mut ctx.accounts.review_receipt;
        receipt.mandate = ctx.accounts.mandate.key();
        receipt.guardian = ctx.accounts.guardian.key();
        receipt.evidence_hash = evidence_hash;
        receipt.eligible_for_review = eligible_for_review;
        receipt.mandate_nonce = ctx.accounts.mandate.nonce;
        receipt.created_at = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.review_receipt;
        Ok(())
    }

    pub fn transition_mandate(
        ctx: Context<TransitionMandate>,
        to_stage: u8,
        expected_nonce: u64,
    ) -> Result<()> {
        let mandate = &mut ctx.accounts.mandate;
        let receipt = &ctx.accounts.review_receipt;

        require!(receipt.eligible_for_review, KeysError::ReviewNotEligible);
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require_eq!(receipt.mandate_nonce, expected_nonce, KeysError::StaleReviewReceipt);
        require!(
            to_stage > mandate.stage && to_stage <= STAGE_INDEPENDENT,
            KeysError::InvalidTransition
        );

        mandate.stage = to_stage;
        mandate.version = mandate.version.checked_add(1).ok_or(KeysError::Overflow)?;
        mandate.nonce = mandate.nonce.checked_add(1).ok_or(KeysError::Overflow)?;
        mandate.last_evidence_hash = receipt.evidence_hash;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCharter<'info> {
    #[account(
        init,
        payer = guardian,
        space = Charter::SPACE,
        seeds = [b"charter", beneficiary.key().as_ref()],
        bump
    )]
    pub charter: Account<'info, Charter>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub beneficiary: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeMandate<'info> {
    #[account(
        seeds = [b"charter", charter.beneficiary.as_ref()],
        bump = charter.bump,
        has_one = guardian
    )]
    pub charter: Account<'info, Charter>,
    #[account(
        init,
        payer = guardian,
        space = Mandate::SPACE,
        seeds = [b"mandate", charter.key().as_ref()],
        bump
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitProposal<'info> {
    #[account(
        seeds = [b"charter", charter.beneficiary.as_ref()],
        bump = charter.bump,
        has_one = beneficiary
    )]
    pub charter: Account<'info, Charter>,
    #[account(
        seeds = [b"mandate", charter.key().as_ref()],
        bump = mandate.bump,
        has_one = charter
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(init, payer = beneficiary, space = ProposalCommitment::SPACE)]
    pub proposal: Account<'info, ProposalCommitment>,
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordReview<'info> {
    #[account(
        seeds = [b"charter", charter.beneficiary.as_ref()],
        bump = charter.bump,
        has_one = guardian
    )]
    pub charter: Account<'info, Charter>,
    #[account(
        seeds = [b"mandate", charter.key().as_ref()],
        bump = mandate.bump,
        has_one = charter
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(
        init,
        payer = guardian,
        space = ReviewReceipt::SPACE,
        seeds = [b"review", mandate.key().as_ref(), &mandate.nonce.to_le_bytes()],
        bump
    )]
    pub review_receipt: Account<'info, ReviewReceipt>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransitionMandate<'info> {
    #[account(
        seeds = [b"charter", charter.beneficiary.as_ref()],
        bump = charter.bump,
        has_one = guardian
    )]
    pub charter: Account<'info, Charter>,
    #[account(
        mut,
        seeds = [b"mandate", charter.key().as_ref()],
        bump = mandate.bump,
        has_one = charter
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(
        seeds = [b"review", mandate.key().as_ref(), &mandate.nonce.to_le_bytes()],
        bump = review_receipt.bump,
        constraint = review_receipt.mandate == mandate.key() @ KeysError::ReviewMandateMismatch,
        constraint = review_receipt.guardian == guardian.key() @ KeysError::Unauthorized
    )]
    pub review_receipt: Account<'info, ReviewReceipt>,
    pub guardian: Signer<'info>,
}

#[account]
pub struct Charter {
    pub guardian: Pubkey,
    pub beneficiary: Pubkey,
    pub jurisdiction_hash: [u8; 32],
    pub max_proposal_notional: u64,
    pub max_bounded_notional: u64,
    pub version: u64,
    pub bump: u8,
}
impl Charter {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Mandate {
    pub charter: Pubkey,
    pub stage: u8,
    pub version: u64,
    pub nonce: u64,
    pub last_evidence_hash: [u8; 32],
    pub bump: u8,
}
impl Mandate {
    pub const SPACE: usize = 8 + 32 + 1 + 8 + 8 + 32 + 1;
}

#[account]
pub struct ProposalCommitment {
    pub mandate: Pubkey,
    pub beneficiary: Pubkey,
    pub commitment_hash: [u8; 32],
    pub asset_hash: [u8; 32],
    pub amount: u64,
    pub created_at: i64,
    pub mandate_nonce: u64,
}
impl ProposalCommitment {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8;
}

#[account]
pub struct ReviewReceipt {
    pub mandate: Pubkey,
    pub guardian: Pubkey,
    pub evidence_hash: [u8; 32],
    pub eligible_for_review: bool,
    pub mandate_nonce: u64,
    pub created_at: i64,
    pub bump: u8,
}
impl ReviewReceipt {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 1;
}

#[error_code]
pub enum KeysError {
    #[msg("Invalid authority cap.")]
    InvalidCap,
    #[msg("Proposal amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Proposal is not allowed at the current mandate stage.")]
    ProposalNotAllowedAtStage,
    #[msg("Proposal exceeds the current mandate cap.")]
    ProposalCapExceeded,
    #[msg("Review evidence is not eligible for mandate review.")]
    ReviewNotEligible,
    #[msg("Mandate nonce does not match the expected nonce.")]
    StaleNonce,
    #[msg("Review receipt belongs to an older mandate nonce.")]
    StaleReviewReceipt,
    #[msg("Review receipt does not belong to this mandate.")]
    ReviewMandateMismatch,
    #[msg("The requested authority transition is invalid.")]
    InvalidTransition,
    #[msg("The signer is not authorized for this transition.")]
    Unauthorized,
    #[msg("Arithmetic overflow.")]
    Overflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn transition_is_valid(
        current_stage: u8,
        to_stage: u8,
        current_nonce: u64,
        expected_nonce: u64,
        review_nonce: u64,
        eligible: bool,
    ) -> bool {
        eligible
            && current_nonce == expected_nonce
            && review_nonce == expected_nonce
            && to_stage > current_stage
            && to_stage <= STAGE_INDEPENDENT
    }

    #[test]
    fn refuses_replay_with_stale_nonce() {
        assert!(!transition_is_valid(STAGE_PROPOSE, STAGE_BOUNDED, 1, 0, 0, true));
    }

    #[test]
    fn refuses_transition_without_eligible_review() {
        assert!(!transition_is_valid(STAGE_PROPOSE, STAGE_BOUNDED, 0, 0, 0, false));
    }

    #[test]
    fn allows_forward_transition_with_matching_review_nonce() {
        assert!(transition_is_valid(STAGE_PROPOSE, STAGE_BOUNDED, 0, 0, 0, true));
    }

    #[test]
    fn refuses_backward_transition() {
        assert!(!transition_is_valid(STAGE_BOUNDED, STAGE_PROPOSE, 0, 0, 0, true));
    }
}
