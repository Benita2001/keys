# KEYS — External Proof Credentials

Status: **DEVNET COMPLETE / PYTH LIVE EQUITY COMPLETE**

The backend proof is locally executable. Two remaining external proofs require credentials or funded infrastructure that cannot be manufactured safely inside the repository:

1. Solana devnet deployment requires a funded devnet payer.
2. Live Pyth evidence requires an authenticated Pyth API key.

This document defines the supported secure paths.

## 1. Solana devnet funding — COMPLETE

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

### Completed devnet proof

Canonical run:

https://github.com/Faadil1/keys/actions/runs/35904484604

Verified:

- repository-secret wallet source;
- funded payer `FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`;
- 5 devnet SOL before deployment;
- program `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk` deployed;
- deployment signature recorded;
- devnet authority tests `4 passing`;
- `DEVNET_PROOF=PASS`.

No further user action is required for basic devnet funding/deployment proof.

## 2. Pyth live evidence — COMPLETE

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

A true live proof must obtain authenticated, entitled equity evidence and log normalized non-secret output including:

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

Canonical live proof:

https://github.com/Faadil1/keys/actions/runs/35910460176

Observed:

- secret injection: **PASS**
- deterministic adapter tests: **5/5 pass**
- live entitled equity: `Equity.US.TSLA/USD`
- status: `FRESH`
- price/confidence/publish-time evidence obtained
- KEYS decision: `ESCALATE / GUARDIAN_REVIEW_REQUIRED`
- `PYTH_LIVE_PROOF=PASS fresh_market_evidence_reached_guardian_review`

AAPL remains unavailable on the current demo-trial entitlement, but the live proof is now asset-configurable and succeeds with a trial-entitled US equity.

## 3. Security rules

- Never commit either credential.
- Never use a mainnet-funded keypair for devnet CI.
- Never expose `PYTH_PRO_API_KEY` to browser JavaScript.
- Do not print private key JSON or API-key values in CI logs.
- Rotate a credential immediately if it is ever exposed.
- Public addresses, transaction signatures and non-secret Pyth evidence may be recorded as proof.
- Secret material must remain outside Git history.

## 4. Gate closure

The technical gate has now reached:

`DEVNET_AND_LIVE_EVIDENCE_PASS`

Both external proofs have produced explicit PASS markers.

Current canonical truth:

- local authority runtime: **PASS**
- devnet build: **PASS**
- devnet deployment/runtime: **PASS**
- deterministic Pyth adapter: **PASS**
- live Pyth retrieval: **PASS**
