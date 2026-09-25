# Cresco Visual Lab

A completely separate visual exploration environment for KEYS / Cresco.

This is **not** the Stocklana submission URL and must not replace Benita's `https://cresco-lac.vercel.app` unless the team explicitly decides to port selected ideas later.

## Purpose

Explore a visual language that feels:
- young without feeling babyish;
- playful without feeling unserious;
- family-oriented without feeling like parental surveillance;
- financial without looking like a crypto terminal or adult bank app.

Three directions ship in one lab:
- **Key Garden** — warm, personal, autonomy-first;
- **Market Playground** — broad market discovery with Pyth;
- **Family Room** — shared family trust / boundary story.

## Interactive sandbox + safety boundary

The lab is now interactive, but its writable state is **isolated browser sandbox state** stored under `localStorage` key `cresco.visualLab.sandbox.v2`.

It supports:
- virtual Practice buys across live Pyth markets;
- AAPL sandbox Money moves inside/outside a family Key;
- refusal when a move exceeds the current Key;
- boundary requests;
- guardian `Allow once`, `Widen Key`, and `Not now`;
- single-use allowance consumption;
- persistent sandbox state and reset.

Cloudflare Pages Functions still proxy **only read-only** KEYS routes:
- `/api/markets` → `GET /api/v0.2/market/discovery`
- `/api/tessera` → `GET /api/v0.2/integrations/tessera`
- `/api/prestocks` → `GET /api/v0.2/integrations/prestocks`

No sandbox interaction calls the canonical `actions/execute`, mandate transition, funding or boundary-request endpoints. Therefore it cannot consume the submission Family budget, mutate Benita's Mandate or send a Solana transaction.

The tradeoff is intentional: sandbox state persists per browser, not cross-device.

## Cloudflare deployment — recommended

Create a **new Cloudflare Pages project** from the same GitHub repo.

Settings:
- Repository: `Faadil1/keys`
- Production branch: `main`
- Root directory: `apps/visual-lab`
- Build command: leave empty
- Build output directory: `public`
- Project name suggestion: `cresco-visual-lab`

Cloudflare will detect the sibling `functions/` directory and deploy the read-only proxy functions with the static site.

The resulting `*.pages.dev` URL is the visual lab only. Benita's `cresco-lac.vercel.app` remains the submission URL.

## CLI alternative

From `apps/visual-lab`:

```bash
npm run dev
npm run deploy
```

The first production deploy may ask you to authenticate / create the Pages project.

## Porting rule

Do not copy an entire lab direction into Cresco automatically.

Use:
`Visual Lab → TRACE review → choose strongest mechanisms → port bounded deltas into Benita's Cresco`.
