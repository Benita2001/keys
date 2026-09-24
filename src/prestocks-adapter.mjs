export const PRESTOCKS_API_URL = 'https://prestocks.com/api/prestocks';

export const PreStocksEligibilityStatus = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  INELIGIBLE: 'INELIGIBLE',
  UNKNOWN: 'UNKNOWN'
});

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function premiumDiscountPct(tokenPrice, markPrice) {
  if (
    !Number.isFinite(tokenPrice) ||
    !Number.isFinite(markPrice) ||
    markPrice === 0
  ) {
    return null;
  }

  return ((tokenPrice - markPrice) / markPrice) * 100;
}

export function normalizePreStock(row, {
  receivedAt = new Date().toISOString(),
  eligibility = { status: PreStocksEligibilityStatus.UNKNOWN }
} = {}) {
  if (!row?.symbol || !row?.contract_address) {
    throw new Error('PreStocks row requires symbol and contract_address');
  }

  const markPrice = finiteOrNull(row.markPrice);
  const tokenPrice = finiteOrNull(row.tokenPrice);
  const status = eligibility?.status ?? PreStocksEligibilityStatus.UNKNOWN;
  const executionEligible = status === PreStocksEligibilityStatus.ELIGIBLE;

  return {
    source: 'PRESTOCKS',
    sourceUrl: PRESTOCKS_API_URL,
    network: 'solana-mainnet',
    symbol: String(row.symbol).toUpperCase(),
    name: row.name ?? null,
    contractAddress: row.contract_address,
    productUrl: row.external_url ?? null,
    representation: {
      kind: 'PRE_IPO_ECONOMIC_EXPOSURE',
      directEquityOwnership: false,
      votingRights: false,
      dividendRights: false,
      informationRights: false
    },
    market: {
      status: tokenPrice != null ? 'AVAILABLE' : 'UNAVAILABLE',
      markPrice,
      markValuation: finiteOrNull(row.markValuation),
      tokenPrice,
      impliedValuation: finiteOrNull(row.impliedValuation),
      premiumDiscountPct: premiumDiscountPct(tokenPrice, markPrice),
      supply: finiteOrNull(row.supply),
      receivedAt
    },
    eligibility: {
      status,
      executionEligible,
      reasonCode: executionEligible ? null : 'ELIGIBILITY_NOT_VERIFIED'
    },
    keysPolicy: {
      practiceAvailable: true,
      executionEligible,
      authorityEffect: 'NONE',
      rule:
        'PreStocks representation data may inform Practice and asset understanding; it never creates KEYS authority.'
    }
  };
}

export async function fetchPreStocksCatalog({
  fetchImpl = globalThis.fetch,
  eligibilityResolver = null,
  now = () => new Date().toISOString()
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation is required');
  }

  const response = await fetchImpl(PRESTOCKS_API_URL, {
    headers: {
      accept: 'application/json'
    }
  });

  if (!response?.ok) {
    throw new Error(`PRESTOCKS_HTTP_${response?.status ?? 'UNKNOWN'}`);
  }

  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new Error('PRESTOCKS_INVALID_RESPONSE');
  }

  const receivedAt = now();

  return Promise.all(
    body.map(async (row) => {
      const eligibility =
        typeof eligibilityResolver === 'function'
          ? await eligibilityResolver(row)
          : { status: PreStocksEligibilityStatus.UNKNOWN };

      return normalizePreStock(row, { receivedAt, eligibility });
    })
  );
}

export async function fetchPreStockBySymbol(symbol, options = {}) {
  const normalized = String(symbol ?? '').trim().toUpperCase();
  if (!normalized) {
    throw new Error('symbol is required');
  }

  const catalog = await fetchPreStocksCatalog(options);
  return catalog.find((item) => item.symbol === normalized) ?? null;
}

export function preStocksIntegrationSummary() {
  return {
    sponsor: 'PRESTOCKS',
    status: 'LIVE_PUBLIC_API_INTEGRATED',
    sourceUrl: PRESTOCKS_API_URL,
    productRoute: '/api/v0.2/integrations/prestocks',
    authorityEffect: 'NONE',
    executionDefault: 'FAIL_CLOSED_UNTIL_ELIGIBILITY_VERIFIED',
    truthBoundary: {
      realMinorSecuritiesExecution: false,
      directEquityOwnershipClaim: false,
      eligibilityInferredFromWallet: false
    }
  };
}
