use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
    pubkey,
    sysvar,
};
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};
use pyth_lazer_protocol::{
    message::SolanaMessage,
    payload::{PayloadData, PayloadPropertyValue},
    ChannelId,
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

pub const PYTH_LAZER_PROGRAM_ID: Pubkey =
    pubkey!("pytd2yyk641x7ak7mkaasSJVXh6YYZnC7wTmtgAyxPt");
pub const PYTH_LAZER_STORAGE_ID: Pubkey =
    pubkey!("3rdJbqfnagQ4yx9HXJViD4zc4xpiSqmFsKpPuSCQVyQL");
pub const PYTH_LAZER_FIXED_RATE_1000_CHANNEL_ID: u8 = 4;

// Anchor discriminator for Pyth Lazer's global:verify_message instruction.
// Source: the official Pyth Lazer Solana IDL.
pub const PYTH_VERIFY_MESSAGE_DISCRIMINATOR: [u8; 8] =
    [180, 193, 120, 55, 189, 135, 203, 83];

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
        require!(
            mandate.stage >= STAGE_PROPOSE,
            KeysError::ProposalNotAllowedAtStage
        );
        require!(
            amount <= charter.max_proposal_notional,
            KeysError::ProposalCapExceeded
        );

        let proposal = &mut ctx.accounts.proposal;
        proposal.mandate = mandate.key();
        proposal.beneficiary = ctx.accounts.beneficiary.key();
        proposal.commitment_hash = commitment_hash;
        proposal.asset_hash = asset_hash;
        proposal.amount = amount;
        // Canonical time comes from Solana, not caller input.
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
        require_eq!(
            receipt.mandate_nonce,
            expected_nonce,
            KeysError::StaleReviewReceipt
        );
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
        require!(
            mandate.status != MANDATE_REVOKED,
            KeysError::MandateRevoked
        );
        require!(max_market_age_seconds > 0, KeysError::InvalidMarketPolicy);
        require!(
            max_confidence_bps > 0 && max_confidence_bps <= 10_000,
            KeysError::InvalidMarketPolicy
        );
        require!(
            max_period_notional == 0
                || max_action_notional == 0
                || max_period_notional >= max_action_notional,
            KeysError::InvalidCap
        );

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
        max_unit_price_micro_usd: u64,
        pyth_feed_id: u32,
    ) -> Result<()> {
        require!(action_mask != 0, KeysError::InvalidActionMask);
        require!(max_action_amount > 0, KeysError::InvalidCap);
        require!(
            max_period_amount >= max_action_amount,
            KeysError::InvalidCap
        );
        require!(period_seconds > 0, KeysError::InvalidPeriod);

        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(
            mandate.status != MANDATE_REVOKED,
            KeysError::MandateRevoked
        );

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
        rule.spent_this_period_notional = 0;
        rule.max_unit_price_micro_usd = max_unit_price_micro_usd;
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
        max_unit_price_micro_usd: u64,
        pyth_feed_id: u32,
    ) -> Result<()> {
        require!(action_mask != 0, KeysError::InvalidActionMask);
        require!(max_action_amount > 0, KeysError::InvalidCap);
        require!(
            max_period_amount >= max_action_amount,
            KeysError::InvalidCap
        );
        require!(period_seconds > 0, KeysError::InvalidPeriod);

        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(
            mandate.status != MANDATE_REVOKED,
            KeysError::MandateRevoked
        );

        let now = Clock::get()?.unix_timestamp;
        let rule = &mut ctx.accounts.asset_rule;
        rule.enabled = enabled;
        rule.action_mask = action_mask;
        rule.max_action_amount = max_action_amount;
        rule.max_period_amount = max_period_amount;
        rule.period_seconds = period_seconds;
        rule.period_started_at = now;
        rule.spent_this_period = 0;
        rule.spent_this_period_notional = 0;
        rule.max_unit_price_micro_usd = max_unit_price_micro_usd;
        rule.pyth_feed_id = pyth_feed_id;

        advance_mandate(mandate)?;
        Ok(())
    }

    pub fn set_mandate_status(
        ctx: Context<ManageMandate>,
        expected_nonce: u64,
        new_status: u8,
    ) -> Result<()> {
        require!(
            new_status <= MANDATE_REVOKED,
            KeysError::InvalidMandateStatus
        );

        let mandate = &mut ctx.accounts.mandate;
        require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
        require!(
            mandate.status != MANDATE_REVOKED,
            KeysError::MandateRevoked
        );

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
        validate_execution_common(
            &ctx.accounts.mandate,
            &ctx.accounts.asset_rule,
            amount,
            expected_nonce,
            now,
        )?;

        reset_period_if_needed(&mut ctx.accounts.asset_rule, now);

        let next_spent = ctx
            .accounts
            .asset_rule
            .spent_this_period
            .checked_add(amount)
            .ok_or(KeysError::Overflow)?;
        require!(
            next_spent <= ctx.accounts.asset_rule.max_period_amount,
            KeysError::PeriodAmountExceeded
        );

        transfer_from_vault(
            &ctx.accounts.mandate,
            &ctx.accounts.mint,
            &ctx.accounts.vault_token_account,
            &ctx.accounts.delegate_token_account,
            &ctx.accounts.token_program,
            ctx.bumps.vault_token_account,
            amount,
        )?;

        ctx.accounts.asset_rule.spent_this_period = next_spent;
        Ok(())
    }

    /// Pyth-enforced capital path.
    ///
    /// The Pyth Solana-format signed message is deliberately the first Anchor
    /// argument so its bytes start at instruction-data offset 12:
    /// 8-byte Anchor discriminator + 4-byte Vec length.
    /// The client places an Ed25519 verification instruction before this one,
    /// with offsets pointing at these exact message bytes.
    pub fn execute_within_mandate_with_pyth(
        ctx: Context<ExecuteWithinMandateWithPyth>,
        pyth_message: Vec<u8>,
        amount: u64,
        expected_nonce: u64,
    ) -> Result<()> {
        require!(amount > 0, KeysError::InvalidAmount);
        require!(!pyth_message.is_empty(), KeysError::PythMessageInvalid);

        let now = Clock::get()?.unix_timestamp;
        validate_execution_common(
            &ctx.accounts.mandate,
            &ctx.accounts.asset_rule,
            amount,
            expected_nonce,
            now,
        )?;

        require_keys_eq!(
            ctx.accounts.pyth_program.key(),
            PYTH_LAZER_PROGRAM_ID,
            KeysError::InvalidPythProgram
        );
        require_keys_eq!(
            ctx.accounts.pyth_storage.key(),
            PYTH_LAZER_STORAGE_ID,
            KeysError::InvalidPythStorage
        );
        require_keys_eq!(
            ctx.accounts.instructions_sysvar.key(),
            sysvar::instructions::ID,
            KeysError::InvalidInstructionsSysvar
        );

        verify_pyth_message_via_lazer(
            &ctx.accounts.beneficiary.to_account_info(),
            &ctx.accounts.pyth_program,
            &ctx.accounts.pyth_storage,
            &ctx.accounts.pyth_treasury,
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.instructions_sysvar,
            &pyth_message,
        )?;

        let market = parse_verified_market_evidence(
            &pyth_message,
            ctx.accounts.asset_rule.pyth_feed_id,
            now,
            ctx.accounts.mandate.max_market_age_seconds,
            ctx.accounts.mandate.max_confidence_bps,
        )?;

        require!(
            ctx.accounts.asset_rule.max_unit_price_micro_usd == 0
                || market.unit_price_micro_usd
                    <= ctx.accounts.asset_rule.max_unit_price_micro_usd,
            KeysError::MarketConditionInvalidated
        );

        reset_period_if_needed(&mut ctx.accounts.asset_rule, now);

        let next_spent_amount = ctx
            .accounts
            .asset_rule
            .spent_this_period
            .checked_add(amount)
            .ok_or(KeysError::Overflow)?;
        require!(
            next_spent_amount <= ctx.accounts.asset_rule.max_period_amount,
            KeysError::PeriodAmountExceeded
        );

        let requested_notional_micro_usd = compute_notional_micro_usd(
            amount,
            ctx.accounts.mint.decimals,
            market.unit_price_micro_usd,
        )?;

        require!(
            ctx.accounts.mandate.max_action_notional == 0
                || requested_notional_micro_usd
                    <= ctx.accounts.mandate.max_action_notional,
            KeysError::PythNotionalExceeded
        );

        let next_spent_notional = ctx
            .accounts
            .asset_rule
            .spent_this_period_notional
            .checked_add(requested_notional_micro_usd)
            .ok_or(KeysError::Overflow)?;
        require!(
            ctx.accounts.mandate.max_period_notional == 0
                || next_spent_notional <= ctx.accounts.mandate.max_period_notional,
            KeysError::PythPeriodNotionalExceeded
        );

        transfer_from_vault(
            &ctx.accounts.mandate,
            &ctx.accounts.mint,
            &ctx.accounts.vault_token_account,
            &ctx.accounts.delegate_token_account,
            &ctx.accounts.token_program,
            ctx.bumps.vault_token_account,
            amount,
        )?;

        ctx.accounts.asset_rule.spent_this_period = next_spent_amount;
        ctx.accounts.asset_rule.spent_this_period_notional = next_spent_notional;

        msg!(
            "PYTH_VERIFIED_EXECUTION feed={} unit_price_micro_usd={} notional_micro_usd={} publish_time_us={}",
            ctx.accounts.asset_rule.pyth_feed_id,
            market.unit_price_micro_usd,
            requested_notional_micro_usd,
            market.publish_time_us
        );

        Ok(())
    }
}

fn validate_execution_common(
    mandate: &Mandate,
    rule: &AssetRule,
    amount: u64,
    expected_nonce: u64,
    now: i64,
) -> Result<()> {
    require_eq!(mandate.nonce, expected_nonce, KeysError::StaleNonce);
    require_eq!(
        mandate.status,
        MANDATE_ACTIVE,
        KeysError::MandateNotActive
    );
    require!(
        mandate.stage >= STAGE_BOUNDED,
        KeysError::ExecutionNotAllowedAtStage
    );
    require!(
        mandate.expires_at == 0 || now <= mandate.expires_at,
        KeysError::MandateExpired
    );
    require!(rule.enabled, KeysError::AssetRuleDisabled);
    require!(
        rule.action_mask & ACTION_TRANSFER != 0,
        KeysError::ActionNotAllowed
    );
    require!(
        amount <= rule.max_action_amount,
        KeysError::ActionAmountExceeded
    );
    Ok(())
}

fn reset_period_if_needed(rule: &mut AssetRule, now: i64) {
    if now >= rule.period_started_at.saturating_add(rule.period_seconds) {
        rule.period_started_at = now;
        rule.spent_this_period = 0;
        rule.spent_this_period_notional = 0;
    }
}

fn transfer_from_vault<'info>(
    mandate: &Account<'info, Mandate>,
    mint: &InterfaceAccount<'info, Mint>,
    vault_token_account: &InterfaceAccount<'info, TokenAccount>,
    delegate_token_account: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    vault_bump: u8,
    amount: u64,
) -> Result<()> {
    let mandate_key = mandate.key();
    let mint_key = mint.key();
    let bump_seed = [vault_bump];
    let vault_seeds: &[&[u8]] = &[
        b"vault",
        mandate_key.as_ref(),
        mint_key.as_ref(),
        &bump_seed,
    ];
    let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

    let cpi_accounts = TransferChecked {
        mint: mint.to_account_info(),
        from: vault_token_account.to_account_info(),
        to: delegate_token_account.to_account_info(),
        authority: vault_token_account.to_account_info(),
    };
    let cpi_ctx =
        CpiContext::new(token_program.to_account_info(), cpi_accounts)
            .with_signer(signer_seeds);

    token_interface::transfer_checked(cpi_ctx, amount, mint.decimals)
}

fn verify_pyth_message_via_lazer<'info>(
    payer: &AccountInfo<'info>,
    pyth_program: &AccountInfo<'info>,
    pyth_storage: &AccountInfo<'info>,
    pyth_treasury: &AccountInfo<'info>,
    system_program_info: &AccountInfo<'info>,
    instructions_sysvar: &AccountInfo<'info>,
    pyth_message: &[u8],
) -> Result<()> {
    let message_len: u32 = pyth_message
        .len()
        .try_into()
        .map_err(|_| KeysError::PythMessageInvalid)?;

    let mut data =
        Vec::with_capacity(8 + 4 + pyth_message.len() + 2 + 1);
    data.extend_from_slice(&PYTH_VERIFY_MESSAGE_DISCRIMINATOR);
    data.extend_from_slice(&message_len.to_le_bytes());
    data.extend_from_slice(pyth_message);
    // The client places the Ed25519 instruction first and KEYS second.
    data.extend_from_slice(&0u16.to_le_bytes());
    data.push(0u8);

    let ix = Instruction {
        program_id: PYTH_LAZER_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*payer.key, true),
            AccountMeta::new_readonly(*pyth_storage.key, false),
            AccountMeta::new(*pyth_treasury.key, false),
            AccountMeta::new_readonly(anchor_lang::system_program::ID, false),
            AccountMeta::new_readonly(sysvar::instructions::ID, false),
        ],
        data,
    };

    invoke(
        &ix,
        &[
            payer.clone(),
            pyth_storage.clone(),
            pyth_treasury.clone(),
            system_program_info.clone(),
            instructions_sysvar.clone(),
            pyth_program.clone(),
        ],
    )
    .map_err(|err| {
        msg!("Pyth Lazer verify_message CPI failed: {:?}", err);
        error!(KeysError::PythSignatureVerificationFailed)
    })?;

    Ok(())
}

#[derive(Debug, Clone, Copy)]
struct VerifiedMarketEvidence {
    unit_price_micro_usd: u64,
    publish_time_us: u64,
}

fn parse_verified_market_evidence(
    pyth_message: &[u8],
    expected_feed_id: u32,
    now_unix_seconds: i64,
    max_market_age_seconds: u32,
    max_confidence_bps: u32,
) -> Result<VerifiedMarketEvidence> {
    let message = SolanaMessage::deserialize_slice(pyth_message)
        .map_err(|_| error!(KeysError::PythMessageInvalid))?;
    let data = PayloadData::deserialize_slice_le(&message.payload)
        .map_err(|_| error!(KeysError::PythPayloadInvalid))?;

    require!(
        data.channel_id == ChannelId(PYTH_LAZER_FIXED_RATE_1000_CHANNEL_ID),
        KeysError::PythChannelMismatch
    );
    require!(data.feeds.len() == 1, KeysError::PythPayloadInvalid);

    let feed = &data.feeds[0];
    require_eq!(
        feed.feed_id.0,
        expected_feed_id,
        KeysError::PythFeedMismatch
    );

    let mut price_mantissa: Option<i64> = None;
    let mut exponent: Option<i16> = None;
    let mut confidence_mantissa: Option<i64> = None;
    let mut feed_update_time_us: Option<u64> = None;

    for property in &feed.properties {
        match property {
            PayloadPropertyValue::Price(Some(price)) => {
                price_mantissa = Some(price.mantissa_i64());
            }
            PayloadPropertyValue::Exponent(value) => {
                exponent = Some(*value);
            }
            PayloadPropertyValue::Confidence(Some(confidence)) => {
                confidence_mantissa = Some(confidence.mantissa_i64());
            }
            PayloadPropertyValue::FeedUpdateTimestamp(Some(timestamp)) => {
                feed_update_time_us = Some(timestamp.as_micros());
            }
            _ => {}
        }
    }

    let price_mantissa =
        price_mantissa.ok_or(KeysError::PythPriceMissing)?;
    let exponent = exponent.ok_or(KeysError::PythExponentMissing)?;
    let confidence_mantissa =
        confidence_mantissa.ok_or(KeysError::PythConfidenceMissing)?;
    let publish_time_us =
        feed_update_time_us.unwrap_or_else(|| data.timestamp_us.as_micros());

    require!(price_mantissa > 0, KeysError::PythPriceInvalid);
    require!(confidence_mantissa >= 0, KeysError::PythConfidenceInvalid);

    let now_us: u64 = now_unix_seconds
        .try_into()
        .ok()
        .and_then(|seconds: u64| seconds.checked_mul(1_000_000))
        .ok_or(KeysError::Overflow)?;
    // Allow a small clock skew but reject materially future-dated evidence.
    require!(
        publish_time_us <= now_us.saturating_add(5_000_000),
        KeysError::PythTimestampInvalid
    );
    let age_seconds = now_us.saturating_sub(publish_time_us) / 1_000_000;
    require!(
        age_seconds <= u64::from(max_market_age_seconds),
        KeysError::PythMarketEvidenceStale
    );

    let confidence_bps = (u128::from(confidence_mantissa as u64))
        .checked_mul(10_000)
        .ok_or(KeysError::Overflow)?
        .checked_div(u128::from(price_mantissa as u64))
        .ok_or(KeysError::PythConfidenceInvalid)?;
    require!(
        confidence_bps <= u128::from(max_confidence_bps),
        KeysError::PythConfidenceTooWide
    );

    let unit_price_micro_usd =
        price_to_micro_usd(price_mantissa, exponent)?;

    Ok(VerifiedMarketEvidence {
        unit_price_micro_usd,
        publish_time_us,
    })
}

fn price_to_micro_usd(mantissa: i64, exponent: i16) -> Result<u64> {
    require!(mantissa > 0, KeysError::PythPriceInvalid);

    let mut value = i128::from(mantissa);
    let scale_power = i32::from(exponent) + 6;

    if scale_power >= 0 {
        let factor = checked_pow10_i128(scale_power as u32)?;
        value = value.checked_mul(factor).ok_or(KeysError::Overflow)?;
    } else {
        let divisor = checked_pow10_i128((-scale_power) as u32)?;
        value = value.checked_div(divisor).ok_or(KeysError::Overflow)?;
    }

    value
        .try_into()
        .map_err(|_| error!(KeysError::Overflow))
}

fn compute_notional_micro_usd(
    amount_base_units: u64,
    mint_decimals: u8,
    unit_price_micro_usd: u64,
) -> Result<u64> {
    let denominator =
        checked_pow10_i128(u32::from(mint_decimals))?;
    let numerator = i128::from(amount_base_units)
        .checked_mul(i128::from(unit_price_micro_usd))
        .ok_or(KeysError::Overflow)?;
    let result = numerator
        .checked_div(denominator)
        .ok_or(KeysError::Overflow)?;

    result
        .try_into()
        .map_err(|_| error!(KeysError::Overflow))
}

fn checked_pow10_i128(power: u32) -> Result<i128> {
    require!(power <= 18, KeysError::PythExponentUnsupported);
    10_i128
        .checked_pow(power)
        .ok_or_else(|| error!(KeysError::Overflow))
}

fn advance_mandate(mandate: &mut Mandate) -> Result<()> {
    mandate.version = mandate
        .version
        .checked_add(1)
        .ok_or(KeysError::Overflow)?;
    mandate.nonce = mandate
        .nonce
        .checked_add(1)
        .ok_or(KeysError::Overflow)?;
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

#[derive(Accounts)]
pub struct ExecuteWithinMandateWithPyth<'info> {
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

    /// CHECK: address is validated in the instruction.
    pub pyth_program: AccountInfo<'info>,
    /// CHECK: address is validated in the instruction; Pyth validates its data.
    pub pyth_storage: AccountInfo<'info>,
    /// CHECK: Pyth storage has_one treasury is enforced by Pyth during CPI.
    #[account(mut)]
    pub pyth_treasury: AccountInfo<'info>,
    /// CHECK: address is validated against the instructions sysvar id.
    pub instructions_sysvar: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
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
    // USD notional values are denominated in micro-USD (1e-6 USD).
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
    pub spent_this_period_notional: u64,
    // Optional user/guardian precommitted price ceiling, micro-USD per whole token.
    // Zero disables the ceiling.
    pub max_unit_price_micro_usd: u64,
    pub pyth_feed_id: u32,
    pub bump: u8,
}
impl AssetRule {
    pub const SPACE: usize =
        8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 1;
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
    #[msg("Unexpected Pyth Lazer program id.")]
    InvalidPythProgram,
    #[msg("Unexpected Pyth Lazer storage account.")]
    InvalidPythStorage,
    #[msg("Unexpected instructions sysvar account.")]
    InvalidInstructionsSysvar,
    #[msg("Pyth signed message is invalid.")]
    PythMessageInvalid,
    #[msg("Pyth signed payload is invalid.")]
    PythPayloadInvalid,
    #[msg("Pyth Lazer signature verification failed.")]
    PythSignatureVerificationFailed,
    #[msg("Pyth Lazer channel does not match the mandate integration channel.")]
    PythChannelMismatch,
    #[msg("Pyth feed does not match the asset rule.")]
    PythFeedMismatch,
    #[msg("Pyth price is missing.")]
    PythPriceMissing,
    #[msg("Pyth price is invalid.")]
    PythPriceInvalid,
    #[msg("Pyth exponent is missing.")]
    PythExponentMissing,
    #[msg("Pyth exponent cannot be represented safely by this program.")]
    PythExponentUnsupported,
    #[msg("Pyth confidence is missing.")]
    PythConfidenceMissing,
    #[msg("Pyth confidence value is invalid.")]
    PythConfidenceInvalid,
    #[msg("Pyth confidence band exceeds the current Mandate.")]
    PythConfidenceTooWide,
    #[msg("Pyth update timestamp is invalid.")]
    PythTimestampInvalid,
    #[msg("Pyth market evidence is stale.")]
    PythMarketEvidenceStale,
    #[msg("Pyth-verified USD notional exceeds the standing action boundary.")]
    PythNotionalExceeded,
    #[msg("Pyth-verified USD notional exceeds the current period boundary.")]
    PythPeriodNotionalExceeded,
    #[msg("The user's precommitted market condition is no longer true.")]
    MarketConditionInvalidated,
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

    fn amount_is_within_rule(
        amount: u64,
        max_action: u64,
        spent: u64,
        max_period: u64,
    ) -> bool {
        amount > 0
            && amount <= max_action
            && spent
                .checked_add(amount)
                .map(|next| next <= max_period)
                .unwrap_or(false)
    }

    #[test]
    fn refuses_replay_with_stale_nonce() {
        assert!(!transition_is_valid(
            STAGE_PROPOSE,
            STAGE_BOUNDED,
            1,
            0,
            0,
            true
        ));
    }

    #[test]
    fn refuses_transition_without_eligible_review() {
        assert!(!transition_is_valid(
            STAGE_PROPOSE,
            STAGE_BOUNDED,
            0,
            0,
            0,
            false
        ));
    }

    #[test]
    fn allows_forward_transition_with_matching_review_nonce() {
        assert!(transition_is_valid(
            STAGE_PROPOSE,
            STAGE_BOUNDED,
            0,
            0,
            0,
            true
        ));
    }

    #[test]
    fn refuses_backward_transition() {
        assert!(!transition_is_valid(
            STAGE_BOUNDED,
            STAGE_PROPOSE,
            0,
            0,
            0,
            true
        ));
    }

    #[test]
    fn bounded_action_math_allows_inside_and_refuses_outside() {
        assert!(amount_is_within_rule(100, 250, 0, 1000));
        assert!(!amount_is_within_rule(500, 250, 0, 1000));
        assert!(!amount_is_within_rule(200, 250, 900, 1000));
    }

    #[test]
    fn converts_prices_and_notional_to_micro_usd() {
        // 379.696 @ exponent -3 => 379,696,000 micro-USD.
        assert_eq!(price_to_micro_usd(379_696, -3).unwrap(), 379_696_000);
        assert_eq!(
            compute_notional_micro_usd(2, 0, 379_696_000).unwrap(),
            759_392_000
        );
        // One whole token represented with 6 decimals.
        assert_eq!(
            compute_notional_micro_usd(1_000_000, 6, 379_696_000).unwrap(),
            379_696_000
        );
    }
}
