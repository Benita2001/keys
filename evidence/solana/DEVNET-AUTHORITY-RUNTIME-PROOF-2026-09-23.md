# KEYS — Solana Devnet Authority Runtime Proof

Date: 2026-09-23  
Status: **PASS — DEVNET**

Canonical workflow run:

https://github.com/Faadil1/keys/actions/runs/35904484604

Workflow:

`solana-devnet-authority-proof #17`

## Deployment proof

The workflow consumed the funded devnet-only payer through the GitHub Actions secret boundary.

Observed:

- wallet source: `repository_secret`
- payer public address: `FuKsZH234Zcy11rXPHWwiPwyuhLjth7brBVsd5BD5Nzk`
- balance before deployment: `5000000000 lamports` (5 devnet SOL)
- SBF/Anchor build: `PASS`
- deployed program id: `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- deployment signature: `fEZYkktLV38swATo1pgacZroWqHqw7WTs365MZX4H1QEdUZmuoYUDNaHGS441HWmgm3D1WzM2eZZPgoSwzf5Eey`
- Explorer: https://explorer.solana.com/address/ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk?cluster=devnet
- terminal marker: `DEVNET_PROOF=PASS`

The secret value itself was not printed or committed.

## Devnet runtime proof sequence

The deployed program then executed the same authority semantics against Solana devnet.

Transactions:

- beneficiary funding: `4hQ9FBUBGA44E9d1hAAkMLw7MHsp6umT9Qtx4HWb2RRMcAG642QhL8iwB7TaeLfNikEJwz6z1TtWUMkDtzRm91hy`
- initialize Charter: `66CWwRC9xRUo7LrA6CQ7kZpt8nFnBSfbAdZ1nSqLP1ne3qKdrSEVXke9R6pE9hbTBqNKS7qkSWDhjyHfkL7H2K6x`
- initialize Mandate: `29CZkfm9PWwCjKCsEqyUZqGkWHLjKZwAi3NHum5zq6iBZM55JLpFkARMFi2xgtKctEGTc9F8kF3sjqU9ENFxuNqj`
- commit Proposal: `39k9qrcprksN2j5c4SjsvexS6BuxbBu84FM3HP9BPaqhdaWYiJiQiFGPqU7nXLrUvHB32GwjaUzCUACn6Vy9QS9T`
- record ReviewReceipt: `52mgju6ZcUdeWTmWArAzsrSvyWji8LNYjezFYvkWA5CwvWSRLPyjP9JKuWd5czBhBk8BXsGUC7ZeS9EM8AUEwVho`
- guardian authority transition: `5ChNYsGhxbEXwoorncnLTF3nndEVx7a3aZZywCr6GEo3cX66iXgE28EsdVnfu54CCBFExb92jQPCKW8iUa5YPZDv`

Accounts observed:

- Charter: `7XLoxiBAH6xyALUj3Lshwwr1Asv1XF8TQBREu8V4HJTM`
- Mandate: `5bHLPMMwHooutU4BDNquwA7DgfjwFNR2GsbrE7H2EJ59`
- Proposal: `FPxqgTfi2PZF6vqSL8D4Ne397XtbDmDoN2GcN8qTJ8YC`
- ReviewReceipt: `BdT1eFV1AvPAnNZZMMStekqAvzpH4jVCVoHf53umnmTL`

Authority assertions:

- unauthorized transition → `REFUSE / ConstraintHasOne`
- guardian `PROPOSE -> BOUNDED` → `ALLOW / version=2 / nonce=1`
- stale review replay → `REFUSE / ConstraintSeeds`
- authority provider program id → `ABjE6V5q9VbD3CAHDXxvztY5kXQmDXHRcEP1kZ4KSSfk`
- runtime result → `4 passing`

## What this proves

KEYS now has executable authority-state evidence on Solana devnet, not only a local validator proof.

The proof demonstrates that review evidence does not itself create authority: an unauthorized signer cannot widen the mandate, an authorized guardian can perform the explicit forward transition, state version/nonce advance, and old review material cannot be replayed.

## Truth boundary

This proves a Solana **devnet** deployment and devnet authority runtime only.

It does not prove:

- mainnet deployment;
- brokerage or custody integration;
- real securities execution;
- legal authority for a minor to trade securities;
- live Pyth evidence;
- automatic competence or maturity assessment.
