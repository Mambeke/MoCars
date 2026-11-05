# MoCars — Start Here (handover for a new agent)

Read this file first. It is the single entry point for the project and is kept current.
Last updated: 2026-11-05.

---

## 1. What this project is

MoCars is a live automotive marketplace for **Harare, Zimbabwe**, selling **new and used cars** and **new and used auto parts**. It is a React + Vite SPA served by a Cloudflare Worker, with a Cloudflare D1 database behind it.

There are three places the work lives. Know the difference:

| Where | What it is | How current |
|---|---|---|
| `/home/user/mocars` (this workspace) | The **authoritative source**. Edit here. | Current |
| `https://mocars-marketplace.brandonmambeke.workers.dev` | The **live site** customers see | Current — deploy from here |
| `https://github.com/Mambeke/MoCars` | Code mirror only | Current at commit `1ebcb62` |

The site does **not** run from GitHub. There is no CI. GitHub is a backup; if you lose the workspace, clone from there.

---

## 2. Current state (verified 2026-11-05)

- **31 vehicles** (100 generated images)
- **61 auto parts** — **50 New (complete)** and **11 Used**
- **122 accepted part images** (two per listing)
- Worker version: `972324cf-7c0e-49e6-aa91-1f5b71725184`
- Database: D1 `mocars-db`, id `86a8cda9-124f-41b0-9dc7-ebc3118e8bd4`

### The active task

The user wants **exactly 100 parts: 50 New and 50 Used**, each with **two realistic images**. New parts are finished at 50. **39 Used parts remain**, references `MOC-GEN-PU-010` (Steering Rack) through `MOC-GEN-PU-048` (Seat Belt Retractor).

The full 100-record plan lives in `scripts/generated-part-listings.json` — it gives the id, reference, name, condition and category for every remaining listing. Work through it in order.

---

## 3. Running and deploying

### Local

```bash
cd /home/user/mocars
npm ci                 # node_modules is NOT persisted between sessions — always reinstall
npm run build          # writes dist/
npm run dev            # serves on http://localhost:4173
```

`server.mjs` serves the built `dist/`, so you must `npm run build` before `npm run dev`.

### Deploy to production

You need the Cloudflare API token from the user. It is deliberately **not stored anywhere** — ask for it, use it in memory, never write it to a file.

Two things to know:

1. Wrangler needs the account ID, or it fails on `/memberships` with code 10000. Pull it from the cache:
   ```bash
   ACCOUNT_ID="$(node -e "const x=require('./.wrangler/cache/wrangler-account.json'); process.stdout.write(x.account.id)")"
   export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
   export CLOUDFLARE_API_TOKEN='<token from user>'
   ```
2. Deploy assets and data **separately**, in this order:
   ```bash
   npx wrangler deploy
   npx wrangler d1 execute mocars-db --remote --file=review-assets/d1/<batch>.sql
   ```

**Do not revoke or delete the Cloudflare token when finished.** The user reuses it across sessions and will delete it at the end of the project.

---

## 4. Adding a new part listing (the repeatable workflow)

Each listing touches four things. Do all four.

1. **Generate two images.** Save to `review-assets/parts/<id>/front.jpg` and `rear.jpg`, each exactly 1376×768 RGB JPEG. Read `scripts/generated-part-image-standards.md` first.
2. **Review them before publishing.** This is not optional. Check both views show the *same physical part* — same geometry, materials, fitting count, colour and condition. Reject anything with impossible geometry, duplicated components, invented brands/labels/numbers, or mismatched hardware between views. Most batches need at least one regeneration.
3. **Copy accepted images** into `public/images/generated/parts/<id>/`.
4. **Add the record** to `src/data/generatedParts.js` — use the `generatedUsedParts` array. Fields: `id`, `reference`, `name`, `condition`, `category`, `price` (a bare number), `compatibleMakes`, `compatibleModels`, `searchableKeywords`, `description`.

Then generate the D1 upsert, validate, and deploy:

```bash
node review-assets/qa/validate-catalogue.mjs            # data + image checks
node review-assets/qa/batch-<batch>.mjs                 # browser checks (start npm run dev first)
npx wrangler deploy
npx wrangler d1 execute mocars-db --remote --file=review-assets/d1/<batch>.sql
```

### Description rules (non-negotiable)

Every description must:
- be a full paragraph, not a fragment;
- state what is and is not included;
- give potential multi-vehicle applications **qualified** — never claim one generic part fits every listed vehicle;
- name the specs that govern fitment (bolt pattern, thread size, connector shape, bore, generation…);
- state the price is a rough estimate;
- end with exactly: `Contact MoCars to confirm the actual part, condition, fitment and availability before ordering.`

Prices are numeric and render as `US$ 120`. Never leave a price, description or compatibility field empty, and never show "Price on request" or "On request".

---

## 5. Image generation — hard rules

- Both views are **standalone single images**. Never a grid, collage, split view or multi-panel.
- Exactly 1376×768, RGB JPEG.
- Neutral light-grey seamless studio surface, soft diffused light, natural contact shadow.
- New parts clean and unused; Used parts show restrained, credible wear — never artificial damage, heavy rust or unsafe defects.
- **No brands, OEM numbers, certification marks, labels, stickers, watermarks or pseudo-text.** This is a hard user constraint. Model generations invent these; check every output.
- Vehicle exteriors must carry **MoCars** plates; relevant interiors must be **right-hand drive** (Zimbabwe).
- Never describe generated imagery as "AI-generated" or "illustrative".
- **Never publish a partial or unreviewed gallery.**

Generation calls are limited per turn (roughly 10). If you hit the cap mid-batch, finish integration and deployment of what is accepted and continue next turn.

---

## 6. Validation

```bash
node review-assets/qa/validate-catalogue.mjs   # 100 checks: counts, prices, descriptions, prohibited text, image integrity
```

Browser suites need Playwright and its system libraries:

```bash
npx playwright install chromium
sudo apt-get install -y libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libatspi2.0-0t64 libxdamage1 libxkbcommon0 libasound2t64
```

Then, with `npm run dev` running:

```bash
node review-assets/qa/batch-<batch>.mjs                                    # local
BASE_URL='https://mocars-marketplace.brandonmambeke.workers.dev' \
  node review-assets/qa/batch-<batch>.mjs                                  # production
```

Existing suites: `qa/acceptance.mjs`, `qa/admin-acceptance.mjs`, `qa/navigation.mjs`, plus per-batch suites in `review-assets/qa/`. Copy the most recent batch suite and edit the `expected` array for a new batch.

Gallery tests must poll until `naturalWidth > 0` rather than assuming images have loaded.

---

## 7. Git — read this before you trust it

**Git metadata in this workspace does not persist reliably between sessions.** Commit metadata, `.git/config` (so remotes and identity) and the index all revert. You will come back to a stale `HEAD` and an index missing most files. The working-tree files themselves are fine.

Do not assume `HEAD` is authoritative. Recovery options, best first:

1. **Clone from GitHub** — `git clone https://github.com/Mambeke/MoCars` — now the most reliable route since the full source was pushed at `1ebcb62`.
2. `review-assets/git/parts-through-pu003.bundle` — contains commit `40d78c4`. Older but verified.
3. Rebuild history: `git fetch <bundle> HEAD && git reset --mixed 40d78c4`, then re-stage and re-commit only the new listings.

Before committing, always check nothing forbidden is staged:

```bash
git diff --cached --name-only | grep -Eq '(^|/)(review-assets|\.auth|\.env|node_modules|dist|\.wrangler)(/|$)|github.*token|credential' && echo STOP
```

To push you need a GitHub token from the user. Use an askpass script in `/tmp` so the token never enters a URL or a workspace file. Note the repo is currently **public and named `MoCars`**; the user wants it **private and named `mocars`** but the supplied token lacked the administration scope to do it.

---

## 8. Constraints you must not break

- MoCars sells **only** new/used cars and new/used auto parts. No unrelated services or categories.
- Keep vehicle and parts workflows **separate**. Never invent contacts, payments, ratings, reviews or unsupported vehicle facts.
- Every product has a numeric price shown as `US$ ` + number. No "On request" anywhere.
- `/admin` is secured by Cloudflare Access emailed one-time PIN, restricted to `Brandonmambeke@gmail.com`. Keep the `Admin` link in the public footer.
- Booking and order forms must genuinely submit. Checkout is an order enquiry — **no payment integration**.
- Preserve SPA navigation: no full reloads, no recovery/interruption screens.
- Keep the navy/red branding, the exact two-line white hero statement, the supplied hero picture and logo, and the simplified header.
- Mobile only: hero heading above the cars, cars raised to show plates, buttons beneath the plates.
- Do not invent brands, OEM numbers, certification marks or fake labels.
- No temporary credential may be committed or intentionally persisted.
- Do not publish incomplete galleries.

---

## 9. Known traps

- **Wrangler needs `CLOUDFLARE_ACCOUNT_ID`** or every command fails with code 10000.
- **D1 remote imports reject transaction wrappers.** Plain statements only, no `BEGIN`/`COMMIT`.
- **Python `urllib` needs a browser-like User-Agent** against production or the connection is dropped.
- **Generated directories do not persist**: `node_modules/`, `dist/`, `.wrangler/`, caches. Reinstall and rebuild each session.
- **Workspace snapshots are capped** around 128 MB. Don't leave large binaries lying around.
- `npm ci` reports six high-severity audit findings — known and untriaged, not introduced by current work.
- R2 is disabled at the account level. Don't build anything that depends on it.

---

## 10. Where things live

```
src/data/inventory.js          Base catalogue + the four original listings; re-exports generated arrays
src/data/generatedParts.js     The 57 generated part records — add new listings here
src/data/generatedVehicles.js  The 31 generated vehicle records
src/pages/                     Route components (Home, Vehicles, Parts, PartDetail, VehicleDetail, Admin…)
cloudflare/worker.js           Production API (catalogue, enquiries, orders, accounts)
cloudflare/admin.js            Admin API behind Cloudflare Access
cloudflare/schema.sql          D1 schema
public/images/generated/parts/ 61 published part galleries
public/images/generated/       25 vehicle galleries (100 images)
scripts/generated-part-listings.json        The 100-part plan
scripts/generated-part-image-standards.md   Image rules
review-assets/parts/           Staging area: images under review, including rejected ones
review-assets/d1/              Per-batch D1 upsert SQL
review-assets/qa/              Validation and browser suites
PROJECT_STATUS.md / README.md  Feature and stack overview
```

Rejected images are kept deliberately under `review-assets/parts/<id>/` with a `rejected-` prefix — they document what failed review, so don't delete them and don't publish them.
