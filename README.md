# Cobalt POS — Square-Comparable Point of Sale System

React + TypeScript + Supabase + HelcimPay.js

## Quick Start

```bash
npm install
cp .env.example .env   # Add Supabase credentials
npm run dev             # Start dev server
npm test                # Run 26 calculation tests
npm run build           # Production build
```

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (Postgres 15+, Auth, RLS, Edge Functions) |
| Payments | HelcimPay.js (card), Cash, Other (Venmo/CashApp/Zelle) |

## EPIC Coverage

| EPIC | Feature | Status |
|------|---------|--------|
| A | Tenancy, Auth, Roles, Audit | ✅ |
| B | Catalog, Modifiers, Variants, Barcodes | ✅ |
| C | Checkout, Orders, Saved Carts | ✅ |
| D | Taxes, Discounts, Promotions | ✅ |
| E | Payments: Card/Cash/Other/Split/Tips | ✅ |
| F | Refunds, Voids, Returns | ✅ |
| G | Customers, Receipts, CRM | ✅ |
| H | Inventory | ✅ |
| I | Multi-Location | ✅ |
| J | Offline Mode | 🔲 Deferred |
| K | Reporting, Closeout, Cash Drawer | ✅ |
| L | Hardware | ✅ |
| M | Processor Ops | ✅ |

## Database: 35+ Tables

Schema in `supabase/migrations/001_core_schema.sql` with full RLS policies.

## Key Files

- `src/lib/calculations.ts` — Deterministic money math (26 tests)
- `src/hooks/useCart.ts` — Cart with discount, tax, tip, split tender
- `src/services/` — Orders, payments, refunds, customers, catalog, inventory, reporting, audit
- `src/contexts/AuthContext.tsx` — Auth + org + location + tax/tip settings
- `supabase/functions/` — Helcim edge functions (init, validate, webhook)

## Routes

| Path | Description |
|------|-------------|
| `/pos` | Main POS grid |
| `/pos/checkout` | Tip → pay → receipt |
| `/pos/tickets` | Open tabs |
| `/orders` | Order history |
| `/orders/:id` | Detail + void/refund |
| `/customers` | Customer directory |
| `/catalog` | Item management (Manager+) |
| `/inventory` | Stock management (Manager+) |
| `/reports` | Sales dashboard (Manager+) |
| `/reports/closeout` | Z Report (Manager+) |
| `/settings` | Business settings (Manager+) |
