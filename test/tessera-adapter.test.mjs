import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TESSERA_API_URL,
  TesseraEligibilityStatus,
  fetchTesseraAsset,
  fetchTesseraCatalog,
  normalizeTesseraToken,
  tesseraIntegrationSummary
} from '../src/tessera-adapter.mjs';

const sample = {
  id: 'T-OpenAI',
  name: 'T-OpenAI',
  symbol: 'T-OpenAI',
  code: 'tOpenAI',
  sector: 'Artificial Intelligence',
  mint: 'oPAiAikWTaFj9RYoRFD35ccfwhnMcB3ThgBZRHSkjTZ',
  markPrice: 812.79,
  holders: 8762,
  markValuation: 950000000000
};

test('Tessera adapter normalizes a T-Token as a loan participation right without creating authority', () => {
  const out = normalizeTesseraToken(sample, {
    receivedAt: '2026-09-25T07:00:00.000Z'
  });

  assert.equal(out.source, 'TESSERA');
  assert.equal(out.contractAddress, sample.mint);
  assert.equal(out.tokenStandard, 'TOKEN_2022');
  assert.equal(out.underlyingCompany, 'OpenAI');
  assert.equal(out.representation.kind, 'LOAN_PARTICIPATION_RIGHT');
  assert.equal(out.representation.directEquityOwnership, false);
  assert.equal(out.eligibility.status, TesseraEligibilityStatus.UNKNOWN);
  assert.equal(out.eligibility.executionEligible, false);
  assert.equal(out.keysPolicy.practiceAvailable, true);
  assert.equal(out.keysPolicy.authorityEffect, 'NONE');
});

test('Tessera catalog uses the public token-details API and stays fail-closed by default', async () => {
  let requestedUrl = null;
  const catalog = await fetchTesseraCatalog({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [sample] };
    },
    now: () => '2026-09-25T07:00:00.000Z'
  });

  assert.equal(requestedUrl, TESSERA_API_URL);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 'T-OpenAI');
  assert.equal(catalog[0].eligibility.executionEligible, false);
});

test('Tessera lookup resolves id, code or underlying company', async () => {
  const options = {
    fetchImpl: async () => ({ ok: true, json: async () => [sample] })
  };
  assert.equal((await fetchTesseraAsset('tOpenAI', options)).id, 'T-OpenAI');
  assert.equal((await fetchTesseraAsset('openai', options)).id, 'T-OpenAI');
  assert.equal((await fetchTesseraAsset('t-openai', options)).id, 'T-OpenAI');
});

test('Tessera remains authority-neutral even when an explicit eligibility resolver says eligible', async () => {
  const catalog = await fetchTesseraCatalog({
    fetchImpl: async () => ({ ok: true, json: async () => [sample] }),
    eligibilityResolver: async () => ({
      status: TesseraEligibilityStatus.ELIGIBLE
    })
  });

  assert.equal(catalog[0].eligibility.executionEligible, true);
  assert.equal(catalog[0].keysPolicy.authorityEffect, 'NONE');
});

test('Tessera integration summary preserves representation and minor-execution truth boundaries', () => {
  const summary = tesseraIntegrationSummary();
  assert.equal(summary.status, 'LIVE_PUBLIC_API_INTEGRATED');
  assert.equal(summary.authorityEffect, 'NONE');
  assert.equal(summary.truthBoundary.loanParticipationRightNotDirectEquity, true);
  assert.equal(summary.truthBoundary.realMinorSecuritiesExecution, false);
  assert.equal(summary.truthBoundary.eligibilityInferredFromWallet, false);
});
