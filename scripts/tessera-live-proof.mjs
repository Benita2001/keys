import {
  TESSERA_API_URL,
  fetchTesseraCatalog,
  tesseraIntegrationSummary
} from '../src/tessera-adapter.mjs';

const catalog = await fetchTesseraCatalog();
const summary = tesseraIntegrationSummary();

if (catalog.length < 3) {
  throw new Error('TESSERA_LIVE_PROOF_EXPECTED_THREE_ASSETS');
}

const required = new Map([
  ['T-OPENAI', 'oPAiAikWTaFj9RYoRFD35ccfwhnMcB3ThgBZRHSkjTZ'],
  ['T-KALSHI', 'TKLSidmLVt3cqGaaodG8tyRzoANfQwoh67AccjmubeZ'],
  ['T-SPACEX', 'TSPXcLV76s6V2zDiZQ18kBfcbnjaE2ZzNT3ga2Pd99v']
]);

for (const [id, mint] of required) {
  const asset = catalog.find((item) => String(item.id).toUpperCase() === id);
  if (!asset) throw new Error(`TESSERA_LIVE_PROOF_MISSING_${id}`);
  if (asset.contractAddress !== mint) {
    throw new Error(`TESSERA_LIVE_PROOF_MINT_MISMATCH_${id}`);
  }
  if (asset.representation.kind !== 'LOAN_PARTICIPATION_RIGHT') {
    throw new Error(`TESSERA_LIVE_PROOF_REPRESENTATION_MISMATCH_${id}`);
  }
  if (asset.representation.directEquityOwnership !== false) {
    throw new Error(`TESSERA_LIVE_PROOF_EQUITY_CLAIM_LEAK_${id}`);
  }
  if (asset.eligibility.executionEligible !== false) {
    throw new Error(`TESSERA_LIVE_PROOF_FAIL_CLOSED_BROKEN_${id}`);
  }
  if (asset.keysPolicy.authorityEffect !== 'NONE') {
    throw new Error(`TESSERA_LIVE_PROOF_AUTHORITY_LEAK_${id}`);
  }
}

const openai = catalog.find((item) => item.id === 'T-OpenAI');
const proof = {
  proof: 'TESSERA_LIVE_INTEGRATION',
  status: 'PASS',
  source: TESSERA_API_URL,
  observedAt: new Date().toISOString(),
  assetCount: catalog.length,
  sample: {
    id: openai.id,
    code: openai.code,
    underlyingCompany: openai.underlyingCompany,
    mint: openai.contractAddress,
    markPrice: openai.market.markPrice,
    holders: openai.market.holders,
    tokenStandard: openai.tokenStandard
  },
  keysBoundary: {
    representationKind: openai.representation.kind,
    directEquityOwnership: openai.representation.directEquityOwnership,
    practiceAvailable: openai.keysPolicy.practiceAvailable,
    executionEligible: openai.eligibility.executionEligible,
    authorityEffect: openai.keysPolicy.authorityEffect,
    realMinorSecuritiesExecution:
      summary.truthBoundary.realMinorSecuritiesExecution
  }
};

console.log(JSON.stringify(proof, null, 2));
console.log('TESSERA_LIVE_PROOF=PASS');
