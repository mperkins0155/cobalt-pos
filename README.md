# Cobalt POS

Square-comparable POS system built with React, TypeScript, Vite, Supabase, and HelcimPay.js. The repo already contains broad merchant workflows across checkout, catalog, customers, inventory, reporting, reservations, and closeout.

## Current Status

- Core EPICs A-I and K-M are marked complete in the repo.
- `PROGRESS.md` shows Phase 5 complete and the next major step as Phase 6 financial hardening.
- Supabase schema, services, pages, charts, and POS-specific hooks are already implemented.
- Offline mode remains explicitly deferred.

## What Is Working

- Auth, tenancy, onboarding, roles, and audit flows
- POS, checkout, tickets, orders, receipts, and refunds
- Catalog, modifiers, inventory, customers, reservations, and suppliers
- Reports, closeout, kitchen refresh, and printable receipts
- Deterministic calculations with tests in `src/lib/calculations.test.ts`

## What Needs To Be Done To Finish

1. Complete Phase 6 financial hardening from `PROGRESS.md`.
2. Run full integration QA against real Supabase and Helcim credentials, not only local/UI validation.
3. Decide whether offline mode will stay deferred or move back into scope.
4. Add production readiness checks for payments, refunds, closeout, and audit logging.
5. Finish deployment and operator acceptance testing across cashier, manager, and owner roles.

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Validation:

```bash
npm test
npm run build
```
