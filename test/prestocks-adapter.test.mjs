import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PRESTOCKS_API_URL,
  PreStocksEligibilityStatus,
  fetchPreStockBySymbol,
  fetchPreStocksCatalog,
  normalizePreStock,
  preStocksIntegrationSummary
} from '../src/prestocks-adapter.mjs';

const sample = {
  name: 'OpenAI PreStocks',
  symbol: 'OPENAI',
  description: 'demo',
  external_url: 'https://www.prestocks.com/openai',
  contract_address: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
  markPrice: 1000,
  markValuation: 1200000000000,
  tokenPrice: 1250,
  impliedValuation: 1500000000000,
  supply: 2800
};

test('PreStocks adapter normalizes live representation data without creating authority', () => {
  const out = normalizePreStock(sample, {
    receivedAt: '2026-09-24T07:00:00.000Z'
  });

  assert.equal(out.source, 'PRESTOCKS');
  assert.equal(out.contractAddress, sample.contract_address);
  assert.equal(out.representation.directEquityOwnership, false);
  assert.equal(out.market.premiumDiscountPct, 25);
  assert.equal(out.eligibility.status, PreStocksEligibilityStatus.UNKNOWN);
  assert.equal(out.eligibility.executionEligible, false);
  assert.equal(out.keysPolicy.practiceAvailable, true);
  assert.equal(out.keysPolicy.authorityEffect, 'NONE');
});

test('PreStocks catalog uses the official public API and stays fail-closed by default', async () => {
  let requestedUrl = null;

  const catalog = await fetchPreStocksCatalog({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => [sample]
      };
    },
    now: () => '2026-09-24T07:00:00.000Z'
  });

  assert.equal(requestedUrl, PRESTOCKS_API_URL);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].symbol, 'OPENAI');
  assert.equal(catalog[0].eligibility.executionEligible, false);
});

test('PreStocks symbol lookup returns a normalized live asset', async () => {
  const item = await fetchPreStockBySymbol('openai', {
    fetchImpl: async () => ({
      ok: true,
      json: async () => [sample]
    })
  });

  assert.equal(item.symbol, 'OPENAI');
  assert.equal(item.productUrl, 'https://www.prestocks.com/openai');
});

test('PreStocks may become execution-eligible only through an explicit eligibility resolver', async () => {
  const catalog = await fetchPreStocksCatalog({
    fetchImpl: async () => ({
      ok: true,
      json: async () => [sample]
    }),
    eligibilityResolver: async () => ({
      status: PreStocksEligibilityStatus.ELIGIBLE
    })
  });

  assert.equal(catalog[0].eligibility.executionEligible, true);
  assert.equal(catalog[0].keysPolicy.authorityEffect, 'NONE');
});

test('PreStocks integration summary preserves the KEYS truth boundary', () => {
  const summary = preStocksIntegrationSummary();

  assert.equal(summary.status, 'LIVE_PUBLIC_API_INTEGRATED');
  assert.equal(summary.authorityEffect, 'NONE');
  assert.equal(summary.truthBoundary.realMinorSecuritiesExecution, false);
  assert.equal(summary.truthBoundary.eligibilityInferredFromWallet, false);
});
