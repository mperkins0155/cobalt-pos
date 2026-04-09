# CloudPos Implementation Progress Log
# Last updated: April 9, 2026 — Sprints 1-3 complete + full 24-technique audit

## CURRENT VERSION: V0.9.3.0-Production
## CURRENT STATE
- Supabase connected, app live at https://cobalt-pos.vercel.app
- Login: owner@cloudpos.dev / CloudPos2026!
- Sprints 1-3 complete with full 24-technique audit pass
- 6 bugs found and fixed in audit (see AUDIT LOG below)
- PROGRESS.md updated to current state

## REPO
- **URL:** github.com/mperkins0155/cobalt-pos
- **Default branch:** main
- **Build:** 0 errors, 0 warnings
- **TypeScript:** 0 errors
- **Tests:** run `npm test` (41+ tests)

## ARCHITECTURE
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase, Vercel
- **Auth:** Supabase email/password (owner@cloudpos.dev)
- **DB:** dbreddlkzpymsqmkkjub (shared with CMC — pos_ prefix tables)
- **Cart:** CartContext wraps app — shared across POS, CreateOrder, Checkout

## COMPLETED PAGES (Sprint 1-3)

### Sprint 1 ✅
- **CreateOrder.tsx** — 4-step wizard: Customer Info → Table Select → Menu+Cart → Summary
- **Orders.tsx** — 3-column card grid, progress bars, item lists, sort/filter
- **Checkout.tsx** — Split layout, numpad, Cash/Other tabs, change due

### Sprint 2 ✅
- **Dashboard.tsx** — Live clock, 4 stat cards, 3-col Kanban, right sidebar (tables + low stock)
- **History.tsx** — Master-detail split, bill detail with line items + payment method
- **TableFloor.tsx** — Floor plan grid, action bar on select, Detail modal, Change Table modal

### Sprint 3 ✅
- **Inventory.tsx** — Food card grid, filter sidebar (status/stock/category), detail modal

### Pre-Sprint (Phases 0-8) ✅
- POS.tsx — Menu grid, cart panel, barcode scanner, modifier modal
- Tickets.tsx — KDS with sound alerts, station routing, auto-refresh
- Reports.tsx — Charts, DateRangePicker
- Reservations.tsx — 4-step wizard
- Settings.tsx — Employee profile, PIN change, display (dark mode)
- All other pages: Customers, Staff, Expenses, Purchasing, etc.

## AUDIT LOG (24-Technique Pass — April 9, 2026)

### CRITICAL — FIXED
- **C1 (T1):** Cart not shared between CreateOrder/POS → Checkout. Each page created its own local useCart instance — cart was empty on Checkout. **Fix:** Created CartContext.tsx, CartProvider wraps app inside AuthProvider. All three pages use useSharedCart().
- **C2 (T21):** `attachCustomer('', name)` stored empty string as customer_id UUID FK — would fail DB constraint. **Fix:** Added `setCustomerNameOnly` to useCart exports. CreateOrder now uses that for walk-in customers.

### HIGH — FIXED
- **H1 (T24):** O(n²) inline `cart.items.filter().reduce()` in render for every menu card. With 50 items × 10 cart items = 500 ops per render. **Fix:** Memoized `cartQtyMap: Map<item_id, qty>` using useMemo.
- **H2 (T23):** Silent `catch { /* fall through */ }` swallowing modifier load errors. **Fix:** Added `console.warn` logging.
- **H3 (T14):** `changeTableOpen` state in TableFloor had no trigger — Change Table modal was unreachable. **Fix:** Added "Change Table" button in action bar for occupied tables.

### MEDIUM — NOTED (not blocking)
- **M1 (T8):** `handleAddToCart(detailItem)` where detailItem is `Item | null` — TypeScript non-null assertion needed. Accepted risk since button only renders when detailItem is non-null.
- **M2 (T13):** `load` wrapped in useCallback inside Dashboard is redundant but harmless.
- **M3 (T18):** "Pay Bills" / "Continue to Payment" / "Proceed to Payment" — verified correct per Figma spec screens 8/25/50. Not a bug.
- **M4 (T15):** CreateOrder wizard has only 8 responsive classes — mobile experience could be tighter. Deferred to Sprint 4.

### LOW — NOTED
- **L1 (T6):** Reservation date picker has no `min` date — past dates selectable. Deferred.
- **L2 (T20):** Dashboard clock drifts slightly on tab background. Acceptable for POS.

### CLEAN (no issues found)
- T4: ID cross-references correct (order_id, line_id FK chain verified)
- T5: Math correct (bankersRound, calcCartTotals verified)
- T9: Accessibility — buttons used for clickables, aria-labels present
- T10: Key props stable on all .map() calls
- T11: No hardcoded colors (all CSS variables)
- T12: Null/undefined guarded throughout
- T13: setInterval cleanup in Dashboard ✅
- T16: truncate/line-clamp on all text that could overflow
- T17: Empty states on all data lists
- T19: Sort uses [...result].sort() — no state mutation ✅
- T22: No dangerouslySetInnerHTML or eval
- Delimiters: All 7 files balanced ✅

## SUPABASE DEPLOYMENT
- Project ID: dbreddlkzpymsqmkkjub
- Tables: pos_ prefix (cobalt-pos tables alongside CMC schema)
- Seed: 1 org, 5 employees, 6 categories, 17 items, 10 dining tables, 1 tip_setting
- RLS: Permissive (dev mode — MUST tighten before production launch)
- Missing FK indexes: 8 flagged (Phase 11 pending)

## REMAINING V1 WORK

### Sprint 4 (next)
- [ ] Login — employee dropdown with avatars, 6-digit PIN numpad, blurred dashboard bg

### Phase 11 (production hardening)
- [ ] RLS policies — tighten to org_id scoped (migration 006 written, not applied)
- [ ] Add 8 missing FK indexes
- [ ] Error boundaries — already done in App.tsx

### Phase 12 (launch)
- [ ] Full launch checklist pass
- [ ] Verify Helcim payment flow end-to-end

## DECISIONS LOG
- Shared Supabase project with CMC (pos_ prefix pattern)
- CartContext pattern: single cart shared across POS/CreateOrder/Checkout via React Context
- Cashiers can access table-floor and reservations (dine-in workflows)
- Default route: cashier→/pos, manager/owner→/dashboard
- Card payments disabled at UI until Helcim wired
- Build Protocol v3: 24 audit techniques mandatory before every deployment
