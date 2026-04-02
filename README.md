# Cobalt POS

CloudPos-style restaurant POS built with React, TypeScript, Vite, Supabase, and Helcim edge-function integration points.

## Current status

- `PROGRESS.md` is the source of truth for implementation status.
- The repo is currently at `V1.3.0.0-Production`.
- Foundation, navigation, POS/checkout restyle, command palette, KDS intelligence, reporting tables/charts, modifier groups, receipts, and finance hardening are implemented.
- Card checkout UI is still intentionally disabled by default until the Helcim browser flow is fully wired.
- Email receipt delivery is also disabled by default; print receipts are live.

## What is working

- Auth, tenancy, onboarding, role guards, and AppShell navigation
- POS register, cart math, checkout, saved tickets, orders, refunds, receipts, and closeout
- Catalog, modifiers, inventory, customers, reservations, suppliers, quotations, purchasing, and expenses
- Kitchen display with React Query refresh, Supabase invalidation, and sound controls
- Reports with reusable tables and lazy-loaded charts
- Deterministic financial calculations with banker’s rounding and test coverage

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Required env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Useful app env vars:

- `VITE_APP_NAME`
- `VITE_APP_URL`
- `VITE_BASE_PATH`
- `VITE_ENABLE_CARD_PAYMENTS`
- `VITE_ENABLE_EMAIL_RECEIPTS`

## Validation

```bash
npm run build
npx tsc --noEmit
npm run lint
npm test
```

## GitHub Pages deployment

The repo includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

It expects:

- branch: `main`
- Pages base path: `/cobalt-pos/`
- `VITE_SUPABASE_ANON_KEY` configured as a GitHub Actions repository variable

Equivalent local Pages build in PowerShell:

```powershell
$env:VITE_BASE_PATH='/cobalt-pos/'
$env:VITE_ENABLE_CARD_PAYMENTS='false'
$env:VITE_ENABLE_EMAIL_RECEIPTS='false'
npm run build:pages
```

## Remaining work before true production launch

1. Wire the in-browser Helcim card payment UI and enable `VITE_ENABLE_CARD_PAYMENTS`.
2. Add real email receipt delivery and enable `VITE_ENABLE_EMAIL_RECEIPTS`.
3. Run end-to-end QA with live Supabase and processor credentials across cashier, manager, and owner roles.
4. Tighten permissive dev-oriented RLS policies before broad rollout.

For live handoff and role-based verification, use `PRODUCTION_QA_CHECKLIST.md`.
