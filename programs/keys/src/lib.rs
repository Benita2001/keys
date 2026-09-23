use anchor_lang::{
    prelude::*,
    solana_program::{
        instruction::{AccountMeta, Instruction},
        program::invoke,
        sysvar,
    },
};
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};
use pyth_lazer_protocol::{
    message::SolanaMessage,
    payload::{PayloadData, PayloadPropertyValue},
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

pub const MICRO_USD_SCALE: i32 = 6;
pub const PYTH_LAZER_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    12, 74, 159, 176, 3, 249, 12, 128, 32, 17, 101, 150, 154, 165, 132, 195,
    182, 126, 234, 138, 69, 43, 85, 3, 6, 14, 175, 224, 214, 116, 116, 91,
]);
pub const PYTH_LAZER_STORAGE_ID: Pubkey = Pubkey::new_from_array([
    42, 109, 225, 199, 127, 174, 116, 113, 78, 156, 43, 125, 245, 28, 89, 122,
    141, 218, 138, 70, 61, 251, 135, 64, 90, 171, 220, 10, 61, 0, 238, 25,
]);
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
        require!(
            max_action_notional == 0
                || max_period_notional == 0
                || max_period_notional >= max_action_notional,
            KeysError::InvalidMarketPolicy
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
        require!(
            mandate.max_action_notional == 0 && mandate.max_period_notional == 0,
            KeysError::MarketEvidenceRequired
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
            rule.spent_this_period_notional = 0;
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

    pub fn execute_within_mandate_with_pyth(
        ctx: Context<ExecuteWithinMandateWithPyth>,
        pyth_message: Vec<u8>,
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
        require!(
            mandate.max_action_notional > 0 && mandate.max_period_notional > 0,
            KeysError::InvalidMarketPolicy
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
            rule.spent_this_period_notional = 0;
        }

        let market = verify_pyth_market_evidence(
            &ctx.accounts.beneficiary.to_account_info(),
            &ctx.accounts.pyth_program,
            &ctx.accounts.pyth_storage,
            &ctx.accounts.pyth_treasury,
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.instructions_sysvar,
            &pyth_message,
            rule.pyth_feed_id,
            mandate.max_market_age_seconds,
            mandate.max_confidence_bps,
        )?;

        if rule.max_unit_price_micro_usd > 0 {
            require!(
                market.unit_price_micro_usd <= rule.max_unit_price_micro_usd,
                KeysError::MarketConditionInvalidated
            );
        }

        let requested_notional = notional_micro_usd(
            amount,
            ctx.accounts.mint.decimals,
            market.price_mantissa,
            market.exponent,
        )?;

        require!(
            requested_notional <= mandate.max_action_notional,
            KeysError::PythNotionalExceeded
        );

        let next_spent_amount = rule
            .spent_this_period
            .checked_add(amount)
            .ok_or(KeysError::Overflow)?;
        require!(
            next_spent_amount <= rule.max_period_amount,
            KeysError::PeriodAmountExceeded
        );

        let next_spent_notional = rule
            .spent_this_period_notional
            .checked_add(requested_notional)
            .ok_or(KeysError::Overflow)?;
        require!(
            next_spent_notional <= mandate.max_period_notional,
            KeysError::PythPeriodNotionalExceeded
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

        rule.spent_this_period = next_spent_amount;
        rule.spent_this_period_notional = next_spent_notional;

        msg!(
            "PYTH_VERIFIED feed={} price_mantissa={} exponent={} confidence_bps={} age_seconds={} requested_notional_micro_usd={}",
            rule.pyth_feed_id,
            market.price_mantissa,
            market.exponent,
            market.confidence_bps,
            market.age_seconds,
            requested_notional
        );

        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
struct VerifiedMarketObservation {
    price_mantissa: i64,
    exponent: i16,
    confidence_bps: u32,
    age_seconds: u64,
    unit_price_micro_usd: u64,
}

fn verify_pyth_market_evidence<'info>(
    payer: &AccountInfo<'info>,
    pyth_program: &AccountInfo<'info>,
    pyth_storage: &AccountInfo<'info>,
    pyth_treasury: &AccountInfo<'info>,
    system_program_account: &AccountInfo<'info>,
    instructions_sysvar: &AccountInfo<'info>,
    pyth_message: &[u8],
    expected_feed_id: u32,
    max_age_seconds: u32,
    max_confidence_bps: u32,
) -> Result<VerifiedMarketObservation> {
    require_keys_eq!(
        *pyth_program.key,
        PYTH_LAZER_PROGRAM_ID,
        KeysError::InvalidPythProgram
    );
    require_keys_eq!(
        *pyth_storage.key,
        PYTH_LAZER_STORAGE_ID,
        KeysError::InvalidPythStorage
    );
    require_keys_eq!(
        *instructions_sysvar.key,
        sysvar::instructions::ID,
        KeysError::InvalidInstructionsSysvar
    );

    let message_len: u32 = pyth_message
        .len()
        .try_into()
        .map_err(|_| error!(KeysError::InvalidPythMessage))?;

    let mut verifier_data = Vec::with_capacity(8 + 4 + pyth_message.len() + 2 + 1);
    verifier_data.extend_from_slice(&PYTH_VERIFY_MESSAGE_DISCRIMINATOR);
    verifier_data.extend_from_slice(&message_len.to_le_bytes());
    verifier_data.extend_from_slice(pyth_message);
    verifier_data.extend_from_slice(&0u16.to_le_bytes());
    verifier_data.push(0u8);

    let verify_instruction = Instruction {
        program_id: PYTH_LAZER_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*payer.key, true),
            AccountMeta::new_readonly(*pyth_storage.key, false),
            AccountMeta::new(*pyth_treasury.key, false),
            AccountMeta::new_readonly(*system_program_account.key, false),
            AccountMeta::new_readonly(*instructions_sysvar.key, false),
        ],
        data: verifier_data,
    };

    invoke(
        &verify_instruction,
        &[
            payer.clone(),
            pyth_storage.clone(),
            pyth_treasury.clone(),
            system_program_account.clone(),
            instructions_sysvar.clone(),
            pyth_program.clone(),
        ],
    )?;

    let signed_message = SolanaMessage::deserialize_slice(pyth_message)
        .map_err(|_| error!(KeysError::InvalidPythMessage))?;
    let payload = PayloadData::deserialize_slice_le(&signed_message.payload)
        .map_err(|_| error!(KeysError::InvalidPythPayload))?;

    require!(payload.feeds.len() == 1, KeysError::InvalidPythPayload);
    let feed = &payload.feeds[0];
    require!(
        feed.feed_id.0 == expected_feed_id,
        KeysError::InvalidPythFeed
    );

    let mut price_mantissa: Option<i64> = None;
    let mut confidence_mantissa: Option<i64> = None;
    let mut exponent: Option<i16> = None;
    let mut feed_update_us: Option<u64> = None;

    for property in &feed.properties {
        match property {
            PayloadPropertyValue::Price(Some(price)) => {
                price_mantissa = Some(price.mantissa_i64());
            }
            PayloadPropertyValue::Confidence(Some(confidence)) => {
                confidence_mantissa = Some(confidence.mantissa_i64());
            }
            PayloadPropertyValue::Exponent(value) => {
                exponent = Some(*value);
            }
            PayloadPropertyValue::FeedUpdateTimestamp(Some(timestamp)) => {
                feed_update_us = Some(timestamp.as_micros());
            }
            _ => {}
        }
    }

    let price_mantissa = price_mantissa.ok_or(KeysError::PythPriceMissing)?;
    let confidence_mantissa =
        confidence_mantissa.ok_or(KeysError::PythConfidenceMissing)?;
    let exponent = exponent.ok_or(KeysError::PythExponentMissing)?;
    let evidence_timestamp_us = feed_update_us.unwrap_or_else(|| payload.timestamp_us.as_micros());

    require!(price_mantissa > 0, KeysError::InvalidPythPrice);

    let clock_seconds = Clock::get()?.unix_timestamp;
    require!(clock_seconds >= 0, KeysError::InvalidPythTimestamp);
    let now_us = u64::try_from(clock_seconds)
        .map_err(|_| error!(KeysError::InvalidPythTimestamp))?
        .checked_mul(1_000_000)
        .ok_or(KeysError::Overflow)?;

    require!(
        evidence_timestamp_us <= now_us.saturating_add(5_000_000),
        KeysError::PythEvidenceFromFuture
    );
    let age_us = now_us.saturating_sub(evidence_timestamp_us);
    let max_age_us = u64::from(max_age_seconds)
        .checked_mul(1_000_000)
        .ok_or(KeysError::Overflow)?;
    require!(age_us <= max_age_us, KeysError::PythEvidenceStale);

    let confidence_bps = confidence_bps_ceil(price_mantissa, confidence_mantissa)?;
    require!(
        confidence_bps <= max_confidence_bps,
        KeysError::PythConfidenceTooWide
    );

    let unit_price_micro_usd =
        price_to_micro_usd(price_mantissa, exponent)?;

    Ok(VerifiedMarketObservation {
        price_mantissa,
        exponent,
        confidence_bps,
        age_seconds: age_us / 1_000_000,
        unit_price_micro_usd,
    })
}

fn pow10_i128(exp: u32) -> Result<i128> {
    let mut value = 1i128;
    for _ in 0..exp {
        value = value.checked_mul(10).ok_or(KeysError::Overflow)?;
    }
    Ok(value)
}

fn scaled_positive_value(value: i128, decimal_shift: i32) -> Result<u64> {
    require!(value > 0, KeysError::InvalidPythPrice);

    let scaled = if decimal_shift >= 0 {
        value
            .checked_mul(pow10_i128(decimal_shift as u32)?)
            .ok_or(KeysError::Overflow)?
    } else {
        let divisor = pow10_i128((-decimal_shift) as u32)?;
        value
            .checked_add(divisor - 1)
            .ok_or(KeysError::Overflow)?
            .checked_div(divisor)
            .ok_or(KeysError::Overflow)?
    };

    u64::try_from(scaled).map_err(|_| error!(KeysError::Overflow))
}

fn price_to_micro_usd(price_mantissa: i64, exponent: i16) -> Result<u64> {
    scaled_positive_value(
        i128::from(price_mantissa),
        i32::from(exponent) + MICRO_USD_SCALE,
    )
}

fn notional_micro_usd(
    amount_base_units: u64,
    mint_decimals: u8,
    price_mantissa: i64,
    exponent: i16,
) -> Result<u64> {
    let raw = i128::from(amount_base_units)
        .checked_mul(i128::from(price_mantissa))
        .ok_or(KeysError::Overflow)?;
    scaled_positive_value(
        raw,
        i32::from(exponent) + MICRO_USD_SCALE - i32::from(mint_decimals),
    )
}

fn confidence_bps_ceil(price_mantissa: i64, confidence_mantissa: i64) -> Result<u32> {
    let price_abs = u128::from(price_mantissa.unsigned_abs());
    let confidence_abs = u128::from(confidence_mantissa.unsigned_abs());
    require!(price_abs > 0, KeysError::InvalidPythPrice);

    let numerator = confidence_abs
        .checked_mul(10_000)
        .ok_or(KeysError::Overflow)?;
    let rounded = numerator
        .checked_add(price_abs - 1)
        .ok_or(KeysError::Overflow)?
        .checked_div(price_abs)
        .ok_or(KeysError::Overflow)?;
    u32::try_from(rounded).map_err(|_| error!(KeysError::Overflow))
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
    /// CHECK: Address is checked before CPI.
    pub pyth_program: AccountInfo<'info>,
    /// CHECK: Address is checked before CPI; Pyth validates the account contents.
    pub pyth_storage: AccountInfo<'info>,
    /// CHECK: Pyth's verifier validates this account against storage.has_one(treasury).
    #[account(mut)]
    pub pyth_treasury: AccountInfo<'info>,
    /// CHECK: Address is checked against the instructions sysvar before CPI.
    pub instructions_sysvar: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
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
    pub spent_this_period_notional: u64,
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
    #[msg("This mandate requires verified market evidence for capital execution.")]
    MarketEvidenceRequired,
    #[msg("The supplied Pyth verifier program is invalid.")]
    InvalidPythProgram,
    #[msg("The supplied Pyth storage account is invalid.")]
    InvalidPythStorage,
    #[msg("The supplied instructions sysvar is invalid.")]
    InvalidInstructionsSysvar,
    #[msg("The signed Pyth message is invalid.")]
    InvalidPythMessage,
    #[msg("The signed Pyth payload is invalid.")]
    InvalidPythPayload,
    #[msg("The signed Pyth payload does not contain the mandate's feed.")]
    InvalidPythFeed,
    #[msg("Pyth price is missing from the signed payload.")]
    PythPriceMissing,
    #[msg("Pyth confidence is missing from the signed payload.")]
    PythConfidenceMissing,
    #[msg("Pyth exponent is missing from the signed payload.")]
    PythExponentMissing,
    #[msg("Pyth price must be positive for this bounded-capital path.")]
    InvalidPythPrice,
    #[msg("Pyth evidence timestamp is invalid.")]
    InvalidPythTimestamp,
    #[msg("Pyth evidence timestamp is too far in the future.")]
    PythEvidenceFromFuture,
    #[msg("Pyth evidence is older than the mandate permits.")]
    PythEvidenceStale,
    #[msg("Pyth confidence is wider than the mandate permits.")]
    PythConfidenceTooWide,
    #[msg("The verified Pyth notional exceeds the mandate's per-action limit.")]
    PythNotionalExceeded,
    #[msg("The verified Pyth notional exceeds the mandate's period limit.")]
    PythPeriodNotionalExceeded,
    #[msg("The verified market condition no longer holds.")]
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

    #[test]
    fn scales_pyth_price_and_notional_to_micro_usd() {
        assert_eq!(price_to_micro_usd(37_969_600, -5).unwrap(), 379_696_000);
        assert_eq!(
            notional_micro_usd(2, 0, 37_969_600, -5).unwrap(),
            759_392_000
        );
    }

    #[test]
    fn confidence_bps_rounds_up_fail_closed() {
        assert_eq!(confidence_bps_ceil(37_969_600, 1_900).unwrap(), 1);
    }
}
