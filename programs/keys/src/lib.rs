use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk");

pub const STAGE_LEARN: u8 = 0;
pub const STAGE_PRACTICE: u8 = 1;
pub const STAGE_PROPOSE: u8 = 2;
pub const STAGE_BOUNDED: u8 = 3;
pub const STAGE_INDEPENDENT: u8 = 4;

pub const MANDATE_ACTIVE: u8 = 0;
pub const MANDATE_PAUSED: u8 = 1;
pub const MANDATE_REVOKED: u8 = 2;

pub const ACTION_TRANSFER: u8 = 1 << 0;

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
        mandate.status = MANDATE_ACTIVE;
        mandate.version = 1;
        mandate.nonce = 0;
        mandate.max_action_notional = 0;
        mandate.max_period_notional = 0;
        mandate.expires_at = 0;
        mandate.max_market_age_seconds = 30;
        mandate.max_confidence_bps = 100;
        mandate.last_evidence_hash = [0u8; 32];
        mandate.bump = ctx.bumps.mandate;
        Ok(())
    }

    pub fn commit_proposal(
        ctx: Context<CommitProposal>,
        commitment_hash: [u8; 32],
        asset_hash: [u8; 32],
        amount: u64,
        _created_at: i64,
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
        proposal.created_at = Clock::get()?.unix_timestamp;
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
        advance_mandate(mandate)?;
        mandate.last_evidence_hash = receipt.evidence_hash;
        Ok(())
    }

    pub fn configure_mandate_policy(
        ctx: Context<ManageMandate>,
        expected_nonce: u64,
        max_action_notional: u64,
        max_period_notional: u64,
        expires_at: i64,
        max_market_age_seconds: u32,
        max_confidence_bps: u32,
    ) -> Result<()> {
        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(mandate.status != MANDATE_REVOKED, KeysError::MandateRevoked);
        require!(max_market_age_seconds > 0, KeysError::InvalidMarketPolicy);
        require!(max_confidence_bps > 0, KeysError::InvalidMarketPolicy);

        let now = Clock::get()?.unix_timestamp;
        require!(expires_at == 0 || expires_at > now, KeysError::InvalidExpiry);

        mandate.max_action_notional = max_action_notional;
        mandate.max_period_notional = max_period_notional;
        mandate.expires_at = expires_at;
        mandate.max_market_age_seconds = max_market_age_seconds;
        mandate.max_confidence_bps = max_confidence_bps;
        advance_mandate(mandate)?;
        Ok(())
    }

    pub fn initialize_asset_rule(
        ctx: Context<InitializeAssetRule>,
        expected_nonce: u64,
        action_mask: u8,
        max_action_amount: u64,
        max_period_amount: u64,
        period_seconds: i64,
        pyth_feed_id: u32,
    ) -> Result<()> {
        require!(action_mask != 0, KeysError::InvalidActionMask);
        require!(max_action_amount > 0, KeysError::InvalidCap);
        require!(max_period_amount >= max_action_amount, KeysError::InvalidCap);
        require!(period_seconds > 0, KeysError::InvalidPeriod);

        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(mandate.status != MANDATE_REVOKED, KeysError::MandateRevoked);

        let now = Clock::get()?.unix_timestamp;
        let rule = &mut ctx.accounts.asset_rule;
        rule.mandate = mandate.key();
        rule.mint = ctx.accounts.mint.key();
        rule.action_mask = action_mask;
        rule.enabled = true;
        rule.max_action_amount = max_action_amount;
        rule.max_period_amount = max_period_amount;
        rule.period_seconds = period_seconds;
        rule.period_started_at = now;
        rule.spent_this_period = 0;
        rule.pyth_feed_id = pyth_feed_id;
        rule.bump = ctx.bumps.asset_rule;

        advance_mandate(mandate)?;
        Ok(())
    }

    pub fn update_asset_rule(
        ctx: Context<UpdateAssetRule>,
        expected_nonce: u64,
        enabled: bool,
        action_mask: u8,
        max_action_amount: u64,
        max_period_amount: u64,
        period_seconds: i64,
        pyth_feed_id: u32,
    ) -> Result<()> {
        require!(action_mask != 0, KeysError::InvalidActionMask);
        require!(max_action_amount > 0, KeysError::InvalidCap);
        require!(max_period_amount >= max_action_amount, KeysError::InvalidCap);
        require!(period_seconds > 0, KeysError::InvalidPeriod);

        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(mandate.status != MANDATE_REVOKED, KeysError::MandateRevoked);

        let now = Clock::get()?.unix_timestamp;
        let rule = &mut ctx.accounts.asset_rule;
        rule.enabled = enabled;
        rule.action_mask = action_mask;
        rule.max_action_amount = max_action_amount;
        rule.max_period_amount = max_period_amount;
        rule.period_seconds = period_seconds;
        rule.period_started_at = now;
        rule.spent_this_period = 0;
        rule.pyth_feed_id = pyth_feed_id;

        advance_mandate(mandate)?;
        Ok(())
    }

    pub fn set_mandate_status(
        ctx: Context<ManageMandate>,
        expected_nonce: u64,
        new_status: u8,
    ) -> Result<()> {
        require!(new_status <= MANDATE_REVOKED, KeysError::InvalidMandateStatus);

        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(mandate.status != MANDATE_REVOKED, KeysError::MandateRevoked);

        mandate.status = new_status;
        advance_mandate(mandate)?;
        Ok(())
    }

    pub fn execute_within_mandate(
        ctx: Context<ExecuteWithinMandate>,
        amount: u64,
        expected_nonce: u64,
    ) -> Result<()> {
        require!(amount > 0, KeysError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require_eq!(mandate.status, MANDATE_ACTIVE, KeysError::MandateNotActive);
        require!(
            mandate.stage >= STAGE_BOUNDED,
            KeysError::ExecutionNotAllowedAtStage
        );
        require!(
            mandate.expires_at == 0 || now <= mandate.expires_at,
            KeysError::MandateExpired
        );

        let rule = &mut ctx.accounts.asset_rule;
        require!(rule.enabled, KeysError::AssetRuleDisabled);
        require!(
            rule.action_mask & ACTION_TRANSFER != 0,
            KeysError::ActionNotAllowed
        );
        require!(
            amount <= rule.max_action_amount,
            KeysError::ActionAmountExceeded
        );

        if now >= rule.period_started_at.saturating_add(rule.period_seconds) {
            rule.period_started_at = now;
            rule.spent_this_period = 0;
        }

        let next_spent = rule
            .spent_this_period
            .checked_add(amount)
            .ok_or(KeysError::Overflow)?;
        require!(
            next_spent <= rule.max_period_amount,
            KeysError::PeriodAmountExceeded
        );

        let mandate_key = mandate.key();
        let mint_key = ctx.accounts.mint.key();
        let bump_seed = [ctx.bumps.vault_token_account];
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            mandate_key.as_ref(),
            mint_key.as_ref(),
            &bump_seed,
        ];
        let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.delegate_token_account.to_account_info(),
            authority: ctx.accounts.vault_token_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
        )
        .with_signer(signer_seeds);

        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        rule.spent_this_period = next_spent;
        Ok(())
    }
}

fn advance_mandate(mandate: &mut Mandate) -> Result<()> {
    mandate.version = mandate.version.checked_add(1).ok_or(KeysError::Overflow)?;
    mandate.nonce = mandate.nonce.checked_add(1).ok_or(KeysError::Overflow)?;
    Ok(())
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

#[derive(Accounts)]
pub struct ManageMandate<'info> {
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
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeAssetRule<'info> {
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
        init,
        payer = guardian,
        space = AssetRule::SPACE,
        seeds = [b"asset-rule", mandate.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub asset_rule: Account<'info, AssetRule>,
    #[account(
        init,
        payer = guardian,
        seeds = [b"vault", mandate.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_token_account,
        token::token_program = token_program
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAssetRule<'info> {
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
        mut,
        seeds = [b"asset-rule", mandate.key().as_ref(), asset_rule.mint.as_ref()],
        bump = asset_rule.bump,
        constraint = asset_rule.mandate == mandate.key() @ KeysError::AssetRuleMandateMismatch
    )]
    pub asset_rule: Account<'info, AssetRule>,
    pub guardian: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteWithinMandate<'info> {
    #[account(
        seeds = [b"charter", charter.beneficiary.as_ref()],
        bump = charter.bump,
        has_one = beneficiary
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
        mut,
        seeds = [b"asset-rule", mandate.key().as_ref(), mint.key().as_ref()],
        bump = asset_rule.bump,
        constraint = asset_rule.mandate == mandate.key() @ KeysError::AssetRuleMandateMismatch,
        constraint = asset_rule.mint == mint.key() @ KeysError::AssetRuleMintMismatch
    )]
    pub asset_rule: Account<'info, AssetRule>,
    #[account(
        mut,
        seeds = [b"vault", mandate.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_token_account,
        token::token_program = token_program
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = beneficiary,
        token::token_program = token_program
    )]
    pub delegate_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
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
    pub status: u8,
    pub version: u64,
    pub nonce: u64,
    pub max_action_notional: u64,
    pub max_period_notional: u64,
    pub expires_at: i64,
    pub max_market_age_seconds: u32,
    pub max_confidence_bps: u32,
    pub last_evidence_hash: [u8; 32],
    pub bump: u8,
}
impl Mandate {
    pub const SPACE: usize =
        8 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 4 + 4 + 32 + 1;
}

#[account]
pub struct AssetRule {
    pub mandate: Pubkey,
    pub mint: Pubkey,
    pub action_mask: u8,
    pub enabled: bool,
    pub max_action_amount: u64,
    pub max_period_amount: u64,
    pub period_seconds: i64,
    pub period_started_at: i64,
    pub spent_this_period: u64,
    pub pyth_feed_id: u32,
    pub bump: u8,
}
impl AssetRule {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 4 + 1;
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
    #[msg("The market policy is invalid.")]
    InvalidMarketPolicy,
    #[msg("The mandate expiry is invalid.")]
    InvalidExpiry,
    #[msg("The mandate status is invalid.")]
    InvalidMandateStatus,
    #[msg("A revoked mandate cannot be reactivated.")]
    MandateRevoked,
    #[msg("The asset action mask is invalid.")]
    InvalidActionMask,
    #[msg("The asset-rule period is invalid.")]
    InvalidPeriod,
    #[msg("The mandate is not active.")]
    MandateNotActive,
    #[msg("The mandate has expired.")]
    MandateExpired,
    #[msg("Capital execution is not allowed at the current family stage.")]
    ExecutionNotAllowedAtStage,
    #[msg("The asset rule is disabled.")]
    AssetRuleDisabled,
    #[msg("The requested action is not permitted by the asset rule.")]
    ActionNotAllowed,
    #[msg("The requested amount exceeds the per-action asset boundary.")]
    ActionAmountExceeded,
    #[msg("The requested amount exceeds the current period boundary.")]
    PeriodAmountExceeded,
    #[msg("The asset rule does not belong to this mandate.")]
    AssetRuleMandateMismatch,
    #[msg("The asset rule does not match this mint.")]
    AssetRuleMintMismatch,
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

    fn amount_is_within_rule(amount: u64, max_action: u64, spent: u64, max_period: u64) -> bool {
        amount > 0
            && amount <= max_action
            && spent
                .checked_add(amount)
                .map(|next| next <= max_period)
                .unwrap_or(false)
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

    #[test]
    fn bounded_action_math_allows_inside_and_refuses_outside() {
        assert!(amount_is_within_rule(100, 250, 0, 1000));
        assert!(!amount_is_within_rule(500, 250, 0, 1000));
        assert!(!amount_is_within_rule(200, 250, 900, 1000));
    }
}
