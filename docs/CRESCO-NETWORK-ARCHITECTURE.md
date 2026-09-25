# Cresco — Network Architecture

Updated: 2026-09-25 · Branch `feat/cresco-devnet-practice-mainnet-money`

```text
Practice = Solana Devnet  / no real value
Money    = Solana Mainnet / real economic value
```

> Practice safely on Solana Devnet. Graduate to parent-supervised real investing on Solana Mainnet.

There is **no Money → Devnet fallback**, ever. Network is chosen in code from the mode (`apps/web/src/domain/network.ts`), never inferred from UI text.

## Deployment status

| | Practice | Money |
|---|---|---|
| Network | Solana Devnet | Solana Mainnet |
| State | **LIVE** (AAPL lane) | **Setup required** (truthfully gated) |
| KEYS program | `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk` | not deployed |
| Capital | DEMO_TOKEN (demo SPL) practice capital | real USDC (not connected) |
| Real value | no | yes |
| Receipts | real Devnet signatures | none yet |
| Frontend adapter | `practiceDevnetExecution` | `moneyMainnetExecution` (returns `SETUP_REQUIRED`, never calls a network) |

Deployment state is **State A**: Practice LIVE on Devnet, Money "Mainnet setup in progress".

## Execution model

```ts
type CrescoMode = "practice" | "money";
type ExecutionNetwork = "solana-devnet" | "solana-mainnet";
PRACTICE_DEVNET            → { network: "solana-devnet",  realValue: false, programId: ABjE…, status: "live" }
moneyMainnetEnvironment()  → { network: "solana-mainnet", realValue: true,  programId: null,  status: "setup-required" }
```

Practice has two lanes, and every position carries its lane:

- **Devnet lane** (`practiceLane: "devnet"`): KEYS evaluate → Devnet execute → Solana confirmation → backend-synced Practice portfolio + receipt "Practice action confirmed on Solana Devnet". Key-enforced (ALLOW / REFUSE / ask / ALLOW_ONCE / WIDEN / pause). Today: AAPL.
- **Sandbox lane** (`practiceLane: "sandbox"`): assets without a Devnet lane (other companies, PreStocks, Tessera). Local, labeled "Sandbox · not on-chain".

Money requires, and checks, all of: Mainnet KEYS program deployed, verified guardian identity and eligibility, a verified tokenized-stock route, a connected Mainnet execution provider, real funding (`MONEY_REQUIREMENTS`). `moneyMainnetLive()` is false until every one is proven; configuration flags cannot turn it on.

## Wallet roles

- **Embedded wallet (Privy, env-gated):** sign-in identity with a Solana address usable on either cluster. It is **not** bound to KEYS authority yet and grants nothing.
- **Practice signer:** `SERVER_HELD_DEVNET_DEMO` (server-side Devnet keypair). Demo only.
- **Money authority (future):** the guardian/family account is the financial authority; the child acts through a delegated KEYS Mainnet Mandate. Before any public Mainnet execution the wallet identity must be cryptographically bound to the backend identity (browser role flags, query params and unverified addresses are never trusted).

## Asset providers and truth boundaries

| Asset model | Reference market | Practice representation | Mainnet product |
|---|---|---|---|
| Apple | `Equity.US.AAPL/USD` (Pyth feed 922) | DEMO_TOKEN on Devnet, `realValue: false` | **AAPLx** (Apple xStock), verified; eligibility **verification required** |
| Other 9 companies | Pyth where available, else Sample | sandbox | not verified: `unavailable` |
| PreStocks / Tessera | provider prices | sandbox | none: Learn / Practice only |

AAPLx facts (source: official xStocks/Backed public API `https://api.backed.fi/api/v2/public/assets`, cross-checked on Solana Mainnet 2026-09-25):

- mint `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp`, **Token-2022**, 8 decimals;
- extensions: permanent delegate (issuer), pausable (not paused), scaled UI amount (corporate-action multiplier ≈ 1.0027), transfer-hook authority set but no hook program, default account state `initialized`;
- settlement stablecoins listed: USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (6 decimals), USDG;
- xStocks are **not for US persons** or other prohibited jurisdictions (xStocks legal documentation). A minor is never treated as the verified securities customer; the guardian account is.

Pyth is market evidence, never authority: it can validate, stop stale execution or restrict; it can never widen a Key or grant Money eligibility.

## Reliability fixes (backend, this branch)

| Issue | Fix | Tests |
|---|---|---|
| Devnet RPC 429s | `src/solana-rpc.mjs`: rotation across `SOLANA_DEVNET_RPC_URL` (dedicated, server-only) → `SOLANA_DEVNET_RPC_FALLBACK_URLS` → public; bounded exponential backoff with jitter; asset-rule address and mint decimals cached so `getProgramAccounts` runs once per isolate | `practice-devnet-reliability.test.mjs` |
| RPC outage shown as refusal | transient errors → `503 SOLANA_RPC_UNAVAILABLE` (retryable); UI: "Solana is taking longer than expected. Check again." | ✓ |
| Orphaned reservations | signature recorded **before** send (`/reservation/sending`); pre-send failure → `/release`; sent-but-unobserved → `PENDING` + reconcile by signature (CONFIRMED → finalize, FAILED → finalize refused, EXPIRED → release + retry same intent); unsent holds swept after 3 min | ✓ |
| Stuck `*_PENDING_CHAIN` | reconcile from chain (nonce moved → complete widen; allowance grant is idempotent), automatic on state reads (throttled) + `POST /api/v0.2/boundary-requests/{id}/reconcile` (guardian) + re-deciding WIDEN reconciles | ✓ |
| Ledger vs chain spend | chain asset rule is authoritative; `/family/state` returns `practice.period {startedAt, seconds, resetsAt, onChainSpent, ledgerSpent, held, maxPeriod, remaining}` and reconciles the ledger to it | ✓ |

These fixes need a Worker deploy (on merge to `main`) and a dedicated Devnet RPC secret (`SOLANA_DEVNET_RPC_URL`) set by the backend owner.

## Mainnet deployment gate (not executed)

Nothing is deployed or spent on Mainnet without explicit owner approval. The exact remaining step:

1. Build reproducibly: `anchor build --verifiable` (Anchor 0.32.1, Solana 2.3.0) and record the `.so` SHA-256.
2. Decide the Mainnet program keypair / address and update `declare_id!` + `[programs.mainnet]` in `Anchor.toml`.
3. Document the deployer wallet and **upgrade authority** (recommend a multisig).
4. Cost (measured from the Devnet deployment, 474,581-byte program data): **≈ 2.41 SOL** permanent rent + ≈ the same again temporarily for the deploy buffer (refunded) + fees. Budget ~5 SOL available.
5. Command, after approval only: `solana program deploy target/deploy/keys.so --url mainnet-beta --program-id <keypair> --upgrade-authority <authority>`.
6. Then: Mainnet Mandate/asset rule for AAPLx with USDC settlement, Mainnet execution adapter (route USDC → AAPLx), guardian verification, real USDC deposit, and one approved smallest-amount smoke transaction.

## Tests guarding the separation

`apps/web/src/domain/network.test.ts`, `src/state/store.test.ts`, `src/services/services.test.ts`:

- a Devnet signature is never accepted under Money, nor a Mainnet one under Practice (`NETWORK_MISMATCH`, never success);
- Money never resolves to the Devnet adapter and never calls a network;
- Practice records never populate Money balances/holdings; cached Mainnet Money is never restored from the browser;
- no asset is Money-eligible today; a live Pyth price never grants Money;
- explorer links carry the proof's own cluster.
