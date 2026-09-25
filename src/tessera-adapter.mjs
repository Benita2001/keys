export const TESSERA_API_URL =
  'https://rest-api.tessera.pe/v1/public/token-details';

export const TesseraEligibilityStatus = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  INELIGIBLE: 'INELIGIBLE',
  UNKNOWN: 'UNKNOWN'
});

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedLookup(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function underlyingCompany(row) {
  const id = String(row?.id ?? row?.name ?? '').replace(/^T-/i, '').trim();
  return id || null;
}

export function normalizeTesseraToken(row, {
  receivedAt = new Date().toISOString(),
  eligibility = { status: TesseraEligibilityStatus.UNKNOWN }
} = {}) {
  if (!row?.mint || !(row?.id || row?.code || row?.symbol)) {
    throw new Error('Tessera row requires a token identity and mint');
  }

  const status = eligibility?.status ?? TesseraEligibilityStatus.UNKNOWN;
  const executionEligible = status === TesseraEligibilityStatus.ELIGIBLE;
  const company = underlyingCompany(row);

  return {
    source: 'TESSERA',
    sourceUrl: TESSERA_API_URL,
    docsUrl: 'https://docs.tessera.pe/overview/how-do-tessera-token-work',
    termsUrl: 'https://terms.tessera.pe',
    network: 'solana-mainnet',
    id: row.id ?? null,
    code: row.code ?? null,
    symbol: row.symbol ?? row.id ?? row.code,
    name: row.name ?? row.id ?? null,
    sector: row.sector ?? null,
    underlyingCompany: company,
    contractAddress: row.mint,
    tokenStandard: 'TOKEN_2022',
    representation: {
      kind: 'LOAN_PARTICIPATION_RIGHT',
      economicExposure: true,
      directEquityOwnership: false,
      shareholderStatus: false,
      votingRights: false,
      dividendRights: false,
      capTableRights: false,
      redemptionOnDemand: false,
      jurisdictionRestrictionsApply: true
    },
    market: {
      status: finiteOrNull(row.markPrice) != null ? 'AVAILABLE' : 'UNAVAILABLE',
      markPrice: finiteOrNull(row.markPrice),
      markValuation: finiteOrNull(row.markValuation),
      holders: finiteOrNull(row.holders),
      receivedAt
    },
    eligibility: {
      status,
      executionEligible,
      reasonCode: executionEligible
        ? null
        : 'JURISDICTION_AND_USER_ELIGIBILITY_NOT_VERIFIED'
    },
    keysPolicy: {
      practiceAvailable: true,
      representationLearningAvailable: true,
      executionEligible,
      moneyModeDefault: 'INELIGIBLE',
      authorityEffect: 'NONE',
      rule:
        'Tessera representation data may support Learn/Practice and representation understanding; it never creates KEYS authority or Money eligibility.'
    }
  };
}

export async function fetchTesseraCatalog({
  fetchImpl = globalThis.fetch,
  eligibilityResolver = null,
  now = () => new Date().toISOString()
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation is required');
  }

  const response = await fetchImpl(TESSERA_API_URL, {
    headers: { accept: 'application/json' }
  });

  if (!response?.ok) {
    throw new Error(`TESSERA_HTTP_${response?.status ?? 'UNKNOWN'}`);
  }

  const body = await response.json();
  if (!Array.isArray(body)) {
    throw new Error('TESSERA_INVALID_RESPONSE');
  }

  const receivedAt = now();
  return Promise.all(
    body.map(async (row) => {
      const eligibility =
        typeof eligibilityResolver === 'function'
          ? await eligibilityResolver(row)
          : { status: TesseraEligibilityStatus.UNKNOWN };
      return normalizeTesseraToken(row, { receivedAt, eligibility });
    })
  );
}

export async function fetchTesseraAsset(query, options = {}) {
  const lookup = normalizedLookup(query);
  if (!lookup) throw new Error('Tessera asset query is required');

  const catalog = await fetchTesseraCatalog(options);
  return (
    catalog.find((item) =>
      [item.id, item.code, item.symbol, item.underlyingCompany]
        .map(normalizedLookup)
        .includes(lookup)
    ) ?? null
  );
}

export function tesseraIntegrationSummary() {
  return {
    sponsor: 'TESSERA',
    status: 'LIVE_PUBLIC_API_INTEGRATED',
    sourceUrl: TESSERA_API_URL,
    productRoute: '/api/v0.2/integrations/tessera',
    authorityEffect: 'NONE',
    executionDefault: 'FAIL_CLOSED_UNTIL_ELIGIBILITY_AND_RUNTIME_VERIFIED',
    representationRole: 'LEARN_PRACTICE_PRIVATE_MARKET_STRUCTURE',
    truthBoundary: {
      loanParticipationRightNotDirectEquity: true,
      realMinorSecuritiesExecution: false,
      directEquityOwnershipClaim: false,
      eligibilityInferredFromWallet: false,
      jurisdictionRestrictionsApply: true
    }
  };
}
