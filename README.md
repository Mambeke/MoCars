# MoCars Premium Automotive Marketplace

A full responsive marketplace for new cars, used cars, new auto parts and used auto parts. The implementation follows the supplied MoCars visual references and keeps vehicle enquiries separate from auto-parts orders.

## Published project

- Live website: https://mocars-marketplace.brandonmambeke.workers.dev
- GitHub repository: https://github.com/Mambeke/MoCars
- Production runtime: Cloudflare Workers with Static Assets
- Production database: Cloudflare D1 (`mocars-db`)

## Stack

- React 18 + React Router 7
- Vite 6
- Express 5 API for local development
- Cloudflare Worker API for production
- Cloudflare D1 production persistence for listings, requests and accounts
- Cloudflare Access owner authentication for `/admin*`
- Plain responsive CSS with Montserrat and Inter bundled locally
- Playwright public and owner-admin acceptance tests

## Run locally

```bash
npm install
npm run dev
```

The default URL is `http://localhost:4173`.

Production build and local Node check:

```bash
npm run build
npm start
```

Acceptance test (requires Chromium once):

```bash
npx playwright install chromium
npm run test:acceptance
npm run test:admin
```

The local `/admin` workspace uses the development API without a login. Production protects `/admin*` with Cloudflare Access and independently verifies the authenticated owner email inside the Worker.

Apply the idempotent D1 schema, then deploy the Worker:

```bash
npm run cloudflare:db:migrate
npm run deploy:cloudflare
```

Before exposing the owner route, create a Cloudflare Access self-hosted application for the deployed hostname path `/admin*`, enable emailed one-time PIN, and use an Allow policy containing only the exact owner email configured in `wrangler.jsonc`.

## Contact configuration

Copy `.env.example` to `.env` and supply the real MoCars values:

```env
VITE_BUSINESS_PHONE=
VITE_WHATSAPP_NUMBER=
VITE_BUSINESS_EMAIL=
VITE_BUSINESS_ADDRESS=
VITE_FACEBOOK_URL=
VITE_INSTAGRAM_URL=
VITE_X_URL=
```

No business contact details were invented. With no WhatsApp recipient configured, the site opens WhatsApp with the correct pre-filled listing message but lets the customer choose the recipient. Call Us clearly reports that the telephone number is pending configuration.

## Inventory and owner admin

Published inventory is read from D1 through `GET /api/catalogue`. `src/data/inventory.js` remains the authoritative seed and resilient public fallback; the first catalogue request seeds an empty D1 listing table without changing existing public URLs.

The private owner workspace is at `/admin` and is deliberately absent from public navigation. It manages vehicle and auto-part listings separately, including drafts, previews, publishing, featured placement, archiving, image upload/reordering, enquiries and order-enquiry statuses. Current records use only supplied facts. Unknown mileage, stock, part numbers, compatibility, prices or specifications are shown as “on request” or omitted rather than invented.

Optimised uploads currently use the D1 media fallback (1.5 MB per WebP image). The API-facing media paths are designed so that uploaded files can move to the intended R2 store when an R2-capable Cloudflare token is available.

## Application API

- `GET /api/catalogue` — published vehicles, auto parts and part categories
- `POST /api/enquiries` — validated vehicle and test-drive enquiries
- `POST /api/orders` — validated parts order enquiries with server-calculated totals
- `POST /api/auth/register` — account creation with password hashing
- `POST /api/auth/login` — credential validation
- `GET /api/health` — health check
- `/admin/api/*` — Access-protected listing, media and request-management endpoints

Local Express development uses `data/*.json`. The published Worker uses the bound `mocars-db` D1 database for enquiries, orders and accounts. Production endpoints and the D1 schema were verified after deployment, and verification records were removed.

## Important behaviour

- Vehicles never enter the parts cart.
- Auto-parts checkout submits an order enquiry; it does not claim to take payment.
- WhatsApp vehicle messages include the vehicle name and listing reference.
- Filters and search remain catalogue-aware.
- Compatibility and unknown stock are surfaced honestly.
- No ratings, unsupported reviews or unrelated automotive services are included.
