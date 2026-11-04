# MoCars Premium Automotive Marketplace

A full responsive marketplace for new cars, used cars, new auto parts and used auto parts. The implementation follows the supplied MoCars visual references and keeps vehicle enquiries separate from auto-parts orders.

## Stack

- React 18 + React Router 7
- Vite 6
- Express 5 API
- Plain responsive CSS with Montserrat and Inter bundled locally
- File-backed development persistence for enquiries, orders and accounts
- Playwright acceptance test

## Run locally

```bash
npm install
npm run dev
```

The default URL is `http://localhost:4173`.

Production check:

```bash
npm run build
npm start
```

Acceptance test (requires Chromium once):

```bash
npx playwright install chromium
npm run test:acceptance
```

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

No business contact details were invented. With no WhatsApp recipient configured, the site still opens WhatsApp with the correct pre-filled listing message, but lets the customer choose the recipient. The Call Us action clearly reports that the telephone number is pending configuration.

## Inventory data

All inventory is centralized in `src/data/inventory.js`. The current records use only information visible in the supplied design references. Unknown mileage, stock, part number, compatibility or specifications are deliberately shown as “on request” or omitted rather than invented.

The data model already supports the requested vehicle and auto-part fields and can be replaced by CMS/API records later without duplicating product data across pages.

## Submission API

- `POST /api/enquiries` — validated vehicle and test-drive enquiries
- `POST /api/orders` — validated parts order enquiries with server-calculated totals
- `POST /api/auth/register` — account creation with scrypt password hashing
- `POST /api/auth/login` — credential validation
- `GET /api/health` — health check

Development submissions are stored in `data/*.json`. Replace this adapter with the production database and notification workflow before launch.

## Important behaviour

- Vehicles never enter the parts cart.
- Auto-parts checkout submits an order enquiry; it does not claim to take payment.
- WhatsApp vehicle messages include the vehicle name and listing reference.
- Filters and search remain catalogue-aware.
- Compatibility and unknown stock are surfaced honestly.
- No ratings, unsupported reviews or unrelated automotive services are included.
