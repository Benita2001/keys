# KEYS — External Proof Credentials

Status: **ACTIONABLE / NO SECRET MATERIAL STORED IN REPOSITORY**

The backend proof is locally executable. Two remaining external proofs require credentials or funded infrastructure that cannot be manufactured safely inside the repository:

1. Solana devnet deployment requires a funded devnet payer.
2. Live Pyth evidence requires an authenticated Pyth API key.

This document defines the supported secure paths.

## 1. Solana devnet funding

Workflow:

`.github/workflows/solana-devnet-authority-proof.yml`

Expected repository secret:

`DEVNET_KEYPAIR_JSON`

The workflow accepts the standard Solana keypair JSON array through this secret, writes it only to the CI runner's temporary filesystem, restricts file permissions, and never commits or prints the private key.

### Recommended setup

Generate or reuse a **devnet-only** wallet. Do not use a mainnet wallet or a wallet holding real assets.

Example local commands:

```bash
solana-keygen new --outfile keys-devnet.json
solana address -k keys-devnet.json
solana config set --url https://api.devnet.solana.com
solana airdrop 5 "$(solana address -k keys-devnet.json)"
solana balance "$(solana address -k keys-devnet.json)" --url https://api.devnet.solana.com
```

If the public faucet is rate-limited, fund that public address using another legitimate Solana devnet faucet/source.

Once the wallet has enough devnet SOL, copy the complete JSON array from `keys-devnet.json` into the GitHub Actions repository secret:

`DEVNET_KEYPAIR_JSON`

Then manually run:

`solana-devnet-authority-proof`

### Expected successful proof

A true devnet PASS must show:

- `PROOF devnet_wallet_source=repository_secret`
- a non-zero funded balance sufficient for deployment;
- `PROOF devnet_build=PASS`;
- a devnet program id;
- a successful `solana program deploy`;
- an Explorer URL for that program on devnet;
- the Anchor authority proof executed against devnet;
- `DEVNET_PROOF=PASS`.

Until those lines exist, KEYS must not claim a devnet deployment.

### Current verified state

The build itself is already proven on CI.

Canonical build-before-funding run:

https://github.com/Faadil1/keys/actions/runs/35890663439

Observed:

- `PROOF devnet_build=PASS`
- generated program id: `8XmhNVJqCFRwvpeTF4vNFsGgcoFs64goK2mjSVP9XKUm`
- payer balance: `0 lamports`
- faucet attempts: rate-limited
- `DEVNET_PROOF=BLOCKED_FUNDING`

That program id is **not** claimed as deployed.

## 2. Pyth live evidence

Workflow:

`.github/workflows/pyth-live-proof.yml`

Expected repository secret:

`PYTH_PRO_API_KEY`

The key belongs in the server/CI secret boundary. It must never be embedded in frontend code, committed fixtures, screenshots, logs or public documentation.

### Recommended setup

Acquire a valid Pyth API key through the official Pyth developer path, then store only the raw credential value in the GitHub Actions repository secret:

`PYTH_PRO_API_KEY`

Then manually run:

`pyth-live-proof`

### Expected successful proof

A true live proof must obtain authenticated AAPL evidence and log normalized non-secret output including:

- symbol/feed id;
- price;
- confidence;
- confidence bps;
- publish time;
- received time;
- evidence age;
- market session when available;
- publisher count when available.

For fresh acceptable evidence, the KEYS engine must still resolve Maya's PROPOSE-stage scenario to:

`ESCALATE / GUARDIAN_REVIEW_REQUIRED`

This proves that Pyth is load-bearing market evidence without becoming an authority oracle.

### Current verified state

Canonical live-attempt run:

https://github.com/Faadil1/keys/actions/runs/35896035083

Observed:

- 5 deterministic adapter tests passed;
- AAPL feed attempted;
- status `UNAVAILABLE`;
- reason `PYTH_API_KEY_REQUIRED`;
- no price/confidence/publish time obtained;
- `PYTH_LIVE_PROOF=BLOCKED reason=PYTH_API_KEY_REQUIRED`.

## 3. Security rules

- Never commit either credential.
- Never use a mainnet-funded keypair for devnet CI.
- Never expose `PYTH_PRO_API_KEY` to browser JavaScript.
- Do not print private key JSON or API-key values in CI logs.
- Rotate a credential immediately if it is ever exposed.
- Public addresses, transaction signatures and non-secret Pyth evidence may be recorded as proof.
- Secret material must remain outside Git history.

## 4. Gate closure

The technical gate can truthfully advance from:

`LOCAL_RUNTIME_PASS`

toward:

`DEVNET_AND_LIVE_EVIDENCE_PASS`

only after both external proofs produce their explicit PASS markers.

Until then, the canonical truth remains:

- local authority runtime: **PASS**
- devnet build: **PASS**
- devnet deployment: **BLOCKED_FUNDING**
- deterministic Pyth adapter: **PASS**
- live Pyth retrieval: **BLOCKED_API_KEY**
