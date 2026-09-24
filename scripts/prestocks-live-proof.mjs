import {
  PRESTOCKS_API_URL,
  fetchPreStocksCatalog,
  preStocksIntegrationSummary
} from '../src/prestocks-adapter.mjs';

const catalog = await fetchPreStocksCatalog();
const summary = preStocksIntegrationSummary();

if (catalog.length === 0) {
  throw new Error('PRESTOCKS_LIVE_PROOF_EMPTY_CATALOG');
}

for (const asset of catalog) {
  if (!asset.contractAddress) {
    throw new Error(`PRESTOCKS_LIVE_PROOF_MISSING_MINT_${asset.symbol}`);
  }

  if (asset.keysPolicy.authorityEffect !== 'NONE') {
    throw new Error(`PRESTOCKS_LIVE_PROOF_AUTHORITY_LEAK_${asset.symbol}`);
  }

  if (asset.eligibility.executionEligible !== false) {
    throw new Error(`PRESTOCKS_LIVE_PROOF_FAIL_CLOSED_BROKEN_${asset.symbol}`);
  }
}

const openai = catalog.find((asset) => asset.symbol === 'OPENAI');
if (!openai) {
  throw new Error('PRESTOCKS_LIVE_PROOF_OPENAI_MISSING');
}

const proof = {
  proof: 'PRESTOCKS_LIVE_INTEGRATION',
  status: 'PASS',
  source: PRESTOCKS_API_URL,
  observedAt: new Date().toISOString(),
  assetCount: catalog.length,
  sample: {
    symbol: openai.symbol,
    contractAddress: openai.contractAddress,
    markPrice: openai.market.markPrice,
    tokenPrice: openai.market.tokenPrice,
    premiumDiscountPct: openai.market.premiumDiscountPct
  },
  keysBoundary: {
    practiceAvailable: openai.keysPolicy.practiceAvailable,
    executionEligible: openai.eligibility.executionEligible,
    authorityEffect: openai.keysPolicy.authorityEffect,
    realMinorSecuritiesExecution:
      summary.truthBoundary.realMinorSecuritiesExecution
  }
};

console.log(JSON.stringify(proof, null, 2));
console.log('PRESTOCKS_LIVE_PROOF=PASS');
