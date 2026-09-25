const rawCatalogResponse = await fetch('https://pyth.dourolabs.app/v1/symbols?asset_type=equity');
const rawCatalogBody = await rawCatalogResponse.json();
console.log('PYTH_RAW_CATALOG_SHAPE=' + JSON.stringify({
  ok: rawCatalogResponse.ok,
  status: rawCatalogResponse.status,
  isArray: Array.isArray(rawCatalogBody),
  keys: rawCatalogBody && typeof rawCatalogBody === 'object' ? Object.keys(rawCatalogBody).slice(0,20) : [],
  sample: Array.isArray(rawCatalogBody)
    ? rawCatalogBody.slice(0,2)
    : rawCatalogBody && typeof rawCatalogBody === 'object'
      ? Object.fromEntries(Object.entries(rawCatalogBody).slice(0,2))
      : rawCatalogBody
}));

import { discoverPythProMarkets } from '../src/pyth-adapter.mjs';

const apiKey = process.env.PYTH_PRO_API_KEY;
if (!apiKey) {
  throw new Error('PYTH_PRO_API_KEY is required for discovery proof');
}

const discovery = await discoverPythProMarkets({
  apiKey,
  perClass: 3
});

const accessible = discovery.classes
  .flatMap((group) => group.feeds)
  .filter((feed) => feed.entitlementStatus === 'ACCESSIBLE');

const classesWithAccess = discovery.classes.filter(
  (group) => group.accessibleFeedCount > 0
);

console.log('PYTH_DISCOVERY_DIAGNOSTIC=' + JSON.stringify(
  discovery.classes.map((group) => ({
    id: group.id,
    catalogFeedCount: group.catalogFeedCount,
    feeds: group.feeds.map((feed) => ({
      symbol: feed.symbol,
      feedId: feed.feedId,
      entitlementStatus: feed.entitlementStatus,
      reasonCode: feed.reasonCode
    }))
  }))
));

const aapl = accessible.find(
  (feed) => feed.symbol === 'Equity.US.AAPL/USD'
);

if (!aapl || aapl.productMode !== 'PRIMARY_MONEY_PROOF') {
  throw new Error('PYTH_MARKET_DISCOVERY_AAPL_PRIMARY_PROOF_MISSING');
}

const proof = {
  proof: 'PYTH_MULTI_MARKET_DISCOVERY',
  status: 'PASS',
  observedAt: new Date().toISOString(),
  primaryMoneyAsset: discovery.primaryMoneyAsset,
  accessibleClassCount: classesWithAccess.length,
  accessibleFeedCount: accessible.length,
  classes: discovery.classes.map((group) => ({
    id: group.id,
    label: group.label,
    catalogFeedCount: group.catalogFeedCount,
    accessibleFeedCount: group.accessibleFeedCount,
    accessible: group.feeds
      .filter((feed) => feed.entitlementStatus === 'ACCESSIBLE')
      .map((feed) => ({
        symbol: feed.symbol,
        feedId: feed.feedId,
        priceStatus: feed.priceStatus,
        productMode: feed.productMode
      }))
  })),
  truthBoundary: discovery.truthBoundary
};

console.log(JSON.stringify(proof, null, 2));
console.log('PYTH_MULTI_MARKET_DISCOVERY=PASS');
