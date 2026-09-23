# KEYS Backend External Blockers

Date: 2026-09-23

These are external credential/funding blockers only. They are not current failures of the KEYS local policy engine or local Solana authority runtime.

## 1. Solana devnet deployment

Current verified state:

- SBF-compatible dependency resolution: PASS
- Anchor/Solana tooling: PASS
- devnet-target program build before funding gate: PASS
- deployment: BLOCKED_FUNDING
- latest strengthened run: https://github.com/Faadil1/keys/actions/runs/35890663439

The GitHub-hosted runner received 0 lamports after both the 5 SOL and 2 SOL faucet requests were rate-limited.

### Secure unblock path

Use a persistent **devnet-only** wallet and store its keypair JSON as a GitHub Actions repository secret named:

`DEVNET_KEYPAIR_JSON`

Do not commit the keypair file or paste it into frontend code.

The workflow already supports this secret:

`.github/workflows/solana-devnet-authority-proof.yml`

When the secret exists, the workflow:

1. writes it only into the runner's temporary Solana config path;
2. checks the wallet's existing devnet balance before requesting an airdrop;
3. builds the program before the funding gate;
4. deploys only if the wallet has sufficient devnet funds;
5. runs the Anchor authority proof against devnet after successful deployment.

A successful workflow must end with:

`DEVNET_PROOF=PASS`

and emit both a program id and devnet Explorer URL.

Anything else must not be described as a deployment.

## 2. Live Pyth evidence

Current verified state:

- deterministic adapter tests: PASS
- Pyth Pro boundary: implemented
- live authenticated retrieval: BLOCKED_API_KEY
- verified run: https://github.com/Faadil1/keys/actions/runs/35883434458

Required GitHub Actions repository secret:

`PYTH_PRO_API_KEY`

The secret belongs only in server/CI boundaries.

Do not expose it through:

- browser JavaScript;
- frontend environment variables shipped to the client;
- committed configuration;
- screenshots/logs.

Once configured, rerun:

`.github/workflows/pyth-live-proof.yml`

A meaningful PASS must include a real authenticated snapshot containing price, confidence and feed update timestamp and then prove that the snapshot is load-bearing in the KEYS policy path.

For Maya at `PROPOSE`, fresh acceptable evidence must still result in:

`ESCALATE / GUARDIAN_REVIEW_REQUIRED`

because market evidence is not authority.

## 3. Real execution eligibility

There is currently no verified brokerage/custody/venue eligibility integration.

Canonical state:

`UNKNOWN`

Therefore any route implying real execution must fail closed.

Do not replace this with a frontend toggle or demo assumption.

## 4. What can continue without these blockers

The following work is not blocked:

- Benita frontend design;
- frontend against the Maya fixture;
- frontend against the local HTTP API;
- deterministic proposal/review flows;
- simulation flows, when explicitly labeled simulation;
- local Anchor authority proof;
- policy/authority integration tests;
- responsive/product experience work;
- demo narrative and packaging.

The external blockers affect only claims of live network deployment, live authenticated market evidence and real execution eligibility.
