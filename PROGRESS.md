# CloudPos Implementation Progress Log
# Last updated: April 4, 2026 — V0.8.0.0 committed, ready for deploy

## CURRENT VERSION: V0.8.0.0-Production
## CURRENT STATE
- Phases 0–9, 11 COMPLETE — all V1 code done, committed to main
- Phase 12 IN PROGRESS — commit done, push + Vercel deploy pending
- 7 AUDITS COMPLETE — 27 bugs found/fixed (T13 AuthCallback setTimeout added this session)
- **IMPORTANT: The Supabase project `dbreddlkzpymsqmkkjub` is the CMC prototype project**
  — cobalt-pos schema was never deployed to its own Supabase project
  — cobalt-pos needs a NEW Supabase project before going live
- Blocking Issues: none (code complete) | DB migration needs fresh Supabase project
- NEXT: Push to GitHub → Create new Supabase project → Apply migrations → Vercel deploy

## REPO
- **URL:** github.com/mperkins0155/cobalt-pos (renamed from cobalt-pos-2026-03-04)
- **Default branch:** main
- **Build:** 0 errors, 0 warnings
- **Tests:** 41/41 pass
- **TypeScript:** 0 errors

## CODEX MERGE CLEANUP (V0.7.0.1, April 4, 2026)
Codex pushed Phases 1-6 via branch `codex/readme-status-updates`. Merged into main.
**11 issues found and fixed:**
1. ✅ 7 non-CloudPos files deleted (projects.ts, sharedAuthBridge, appEnv, TWO7 plan, QA checklist, ProjectSourceHealthPanel, projectLocalSignals)
2. ✅ POS Dashboard restored (Codex replaced it with a project management dashboard)
3. ✅ supabase.ts restored (removed appEnv dependency)
4. ✅ main.tsx restored (removed sharedAuthBridge)
5. ✅ Checkout.tsx — removed appEnv, fixed card path creating orphaned orders (now rejects before createOrder)
6. ✅ Receipt.tsx — already fixed by Codex (local emailReceiptsEnabled constant)
7. ✅ CommandPalette — shouldFilter={false}, stale result guard via searchId ref, order search widened to 50, customer_name in cmdk value
8. ✅ useKeyboardShortcuts — added e.shiftKey to no-modifier guard (Shift+N no longer fires)
9. ✅ AppShell — added meta+k shortcut for Mac, platform-aware help overlay (⌘+K on Mac, Ctrl+K elsewhere)
10. ✅ Checkout tip input — replaced non-functional maxLength on type="number" with max="9999.99" + onChange guard
11. ✅ Checkout — added round2 import from calculations

**What Codex contributed (kept, ~2,370 lines):**
- Phase 2: soundService.ts (201), useKitchenOrders.ts (119), SoundSettings.tsx (167), Tickets.tsx rewrite (326→430)
- Phase 3 partial: DataTable.tsx (173), 3 chart components (136 total)
- Phase 4: ModifierModal.tsx (260)
- Phase 5: Receipt.tsx (155), receiptFormatter.ts (59)
- Phase 6: bankersRound, calcSum, mergeAndSum, average + 8 new tests
- Page enhancements: Customers, History, Inventory, POS cosmetic, refunds.test.ts

## PHASE 0 PROGRESS (Foundation Merge) — ALL COMPLETE

### 0A. Theme System ✅ (V0.6.0.1)
- 89 CSS custom properties (light + dark), Inter font, 11 color groups, tint variants

### 0B. Component Replacement ✅ (V0.6.1.0)
- 11 files, 657 lines. 8 POS components + toastHelpers.ts

### 0C. Responsive Navigation ✅ (V0.6.2.0)
- 8 files, ~540 lines. Sidebar/TopNav/BottomNav/AppShell + navConfig.ts

### 0D. Pages Extraction ✅ (V0.6.3.0 + V0.6.4.0)
- 12 pages + 2 modals (2,804 lines). POS + Checkout restyled.

## PHASE 1 — Keyboard & Speed ✅ (V0.7.0.0)
- useKeyboardShortcuts.ts (104 lines) — input-aware, key combo parser
- KeyboardShortcutsHelp.tsx (89 lines) — Dialog with kbd badges
- CommandPalette.tsx (233 lines) — cmdk, shouldFilter={false}, debounced search, 6 quick actions

## PHASE 2 — Kitchen Intelligence ✅ (Codex)
- soundService.ts (201 lines) — AudioContext programmatic tones, per-event toggles, localStorage
- useKitchenOrders.ts (119 lines) — React Query polling + new order detection
- SoundSettings.tsx (167 lines) — volume slider, per-event toggles
- Tickets.tsx enhanced (430 lines) — station routing, urgency colors, sound integration

## PHASE 3 — DataTable + Charts + Reporting ✅ (V0.7.1.0)
### 3A. Column Definitions (6 files, ~416 lines total)
- orderColumns.tsx (73) — 6 cols, status badges with theme colors
- customerColumns.tsx (57) — 6 cols, responsive hidden on mobile
- staffColumns.tsx (65) — 5 cols, avatar + role badges
- inventoryColumns.tsx (71) — 6 cols, stock level badges (Out/Low/In Stock)
- expenseColumns.tsx (73) — 6 cols, status colors
- purchaseOrderColumns.tsx (77) — 6 cols, supplier, status
- columns/index.ts — barrel export

### 3B. Date Range Picker
- dateRanges.ts (47 lines) — 8 presets: Today, Yesterday, This/Last Week, This/Last Month, Last 7/30 Days
- DateRangePicker.tsx (48 lines) — Select-based component with formatDateRange display

### 3C. DataTable Wiring
- Staff.tsx rewritten (72 lines) — DataTable + staffColumns + search
- Expenses.tsx rewritten (174 lines) — DataTable + expenseColumns + FilterPills + create form, old blue header removed
- Purchasing.tsx rewritten (161 lines) — DataTable + purchaseOrderColumns + FilterPills + create form, old blue header removed
- Reports.tsx enhanced (~252 lines) — DateRangePicker wired, data reloads on range change

### 3D. Charts (Codex)
- PaymentBreakdownChart.tsx (43 lines) — recharts pie/donut
- OrderTypeRevenueChart.tsx (48 lines) — recharts bar
- HourlyVolumeChart.tsx (45 lines) — recharts bar

## PHASE 4 — Modifier Groups ✅ (Codex)
- ModifierModal.tsx (260 lines) — choose_one/choose_many, price adjustments, min/max validation

## PHASE 5 — Receipt ✅ (Codex)
- Receipt.tsx (155 lines) — print CSS, line items, tax breakdown
- receiptFormatter.ts (59 lines) — currency/date formatting

## PHASE 6 — Financial Hardening 🟡 PARTIAL
- ✅ bankersRound + calcSum + mergeAndSum + average added to calculations.ts
- ✅ 8 new tests (banker's rounding edge cases, utility functions)
- ❌ Multi-tax UI not wired (per-item tax rates on receipt/reports)

## PHASE 11 — Production Hardening ✅ (V0.8.0.0)

### 11A. Error Boundaries ✅
- ErrorBoundary.tsx (110 lines) — class component, full-page + inline modes, "Try again" resets state, "Go to Dashboard" hard-nav escape
- App.tsx — outer ErrorBoundary wraps all routes; per-route boundaries on all 20 pages (Dashboard, POS, Kitchen, Orders, Reservations, etc.). A crash in any one section leaves the rest functional.

### 11B. Audit Trail ✅
- useAuditLog.ts (42 lines) — reads orgId/userId from AuthContext, calls AuditService.log(), swallows failures silently
- Checkout.tsx — `order.paid` logged after finalizeOrderPayments; `order.saved_as_ticket` logged after saveAsTicket
- Reservations.tsx — `reservation.created` logged in handleCreated; `reservation.status_changed` logged in updateStatus with from/to status + guest metadata

### 11C. RLS Policies ✅ (SQL migration written — apply manually)
- supabase/migrations/006_production_hardening.sql
- Adds UPDATE + DELETE policies for all 14 core tables (locations, categories, items, orders, payments, customers, etc.)
- Adds role-restricted policies: discounts/refunds DELETE → manager+; org UPDATE → manager+; profiles UPDATE → own or manager
- Adds order_lines and refund_lines RLS (missing from 001 — no org_id column, policies go through parent table)
- Variants + modifier_options UPDATE/DELETE through parent org
- All DROP IF EXISTS guards → idempotent (safe to re-run)
- **⚠️ MUST APPLY BEFORE PRODUCTION**: Supabase MCP hibernated; paste into https://supabase.com/dashboard/project/dbreddlkzpymsqmkkjub/sql/new

### 11D. FK Indexes ✅ (SQL migration written — apply with 11C)
- 24 new indexes on FK columns: order_lines.item_id/variant_id, order_line_modifiers, payments.org_id/tender_type, refunds.org_id/reason_code_id, refund_lines.order_line_id, inventory_events.created_by, cash_events.shift_id/created_by, cash_shifts.opened_by/location, audit_logs.actor_user_id, org_invitations, user_location_assignments, reservations.created_by/customer_id, expenses.created_by/approved_by
- All use CREATE INDEX IF NOT EXISTS → idempotent

## PHASE 9 — Reservations ✅ (V0.7.3.0)
- NewReservationModal.tsx (269 lines) — shadcn Dialog: guest name, phone, email, party size stepper, datetime-local, table selector (available only), duration, special requests
- Reservations.tsx rewritten (400 lines) — FilterPills (Upcoming/Today/All/Done with live counts), styled ReservationCard, past-due time highlighting, full status machine (pending→confirmed→seated→completed/no_show/cancelled), Skeleton + EmptyState, auto-switches to Upcoming filter after create
- navConfig.ts — Reservations nav item added (CalendarDays icon, desktopOnly)
- TableFloor.tsx enhanced — fetches upcoming reservations in parallel; reserved tables show time badge (e.g. "7:00 PM") in primary color

## PHASE 7 — Role-Based Experience ✅ (V0.7.2.0)
- defaultRouteForRole() — cashier→/pos, manager/owner→/dashboard
- RoleRedirect component for / and catch-all routes
- Table-floor + Reservations moved out of ManagerRoute (cashiers need for dine-in)
- Role label shown in Sidebar user card (replaces "On Shift")
- Nav items already filter by role via navConfig.ts (Phase 0C)

## PHASE 8 — Loading, Empty, & Error States ✅ (V0.7.2.0)
- Toast error notifications added to 8 pages:
  - Dashboard, Orders, History, Customers, Inventory, CustomerDetail, Closeout (+ Expenses, Purchasing already had them)
- All DataTable-using pages have built-in Skeleton + EmptyState
- All pages with Skeleton: Dashboard, Orders, POS, Reports, TableFloor, Tickets, Closeout, CustomerDetail, Receipt
- All pages with EmptyState: Dashboard, Orders, POS, TableFloor, Tickets, Closeout, CustomerDetail + all DataTable pages

## V1 vs V2 SCOPE

### V1 — Ship This
- ✅ POS register, order management, payment (Helcim partial — cash/other working, card pending)
- ✅ KDS with sound alerts + auto-refresh
- ✅ Table management (floor plan, status, change table)
- ✅ Reports with DateRangePicker + charts
- ✅ Closeout/Z-report
- ✅ Customer profiles
- ✅ Inventory with stock levels
- ✅ Staff with DataTable
- ✅ Keyboard shortcuts + command palette
- ✅ Modifier groups
- ✅ Receipt printing
- ✅ Dark mode + responsive nav (3 breakpoints)
- ✅ Role-based layouts + route protection
- ✅ Error toast notifications on all pages
- ❌ Multi-tax UI wiring (Phase 6 partial)
- ✅ Reservations flow (Phase 9)
- ✅ RLS tightening + FK indexes + error boundaries + audit trail (Phase 11)
- ❌ Vercel deploy + launch checklist (Phase 12)

### V2 — After Launch
- PWA/offline mode
- Reservations (expanded — SMS/email)
- i18n, online ordering, multi-location, advanced analytics

## SUPABASE DEPLOYMENT
- Project ID: dbreddlkzpymsqmkkjub
- URL: https://dbreddlkzpymsqmkkjub.supabase.co
- Region: us-east-1
- Tables: 10, RLS: enabled (permissive for dev — MUST tighten before prod)
- Indexes: 10 performance indexes
- Seed: 1 org, 5 employees, 6 customers, 6 categories, 12 menu items, 20 tables

## BUILD HISTORY
- Stages 1-2: Dashboard, Orders, Wizard, Payment, Tables (1265 lines)
- Phases 1-8: Foundation through Dark Mode (2460 lines)
- Audits 1-6: 26 bugs found/fixed
- Supabase: Schema + seed deployed
- March 26: Competitive analysis, integration roadmap, gap analysis
- March 28: Phase 0A (theme) + 0B (components)
- March 30: Phase 0C (navigation)
- April 1: Phase 0D (pages) + Phase 1 (keyboard/command)
- April 2: Codex Phases 2-6 merged
- **April 4: Codex merge cleanup (V0.7.0.1) — 11 issues fixed, 7 files deleted, Dashboard restored**
- **April 4: Phase 3 completion (V0.7.1.0) — 6 column defs, DateRangePicker, DataTable wired into 3 pages**
- **April 4: Phase 7 + 8 (V0.7.2.0) — Role-based routes + toast error notifications on all pages**
- **April 4: Phase 9 (V0.7.3.0) — Reservations: NewReservationModal, full page rewrite, TableFloor badges**
- **April 4: Phase 11 (V0.8.0.0) — ErrorBoundary, useAuditLog, Checkout/Reservations audit events**
- **April 4: Phase 12 audit — 24-technique pass, AuthCallback T13 fix, build verified, committed to main**
- **April 4: DISCOVERY — dbreddlkzpymsqmkkjub is the CMC project. cobalt-pos needs its own Supabase project.**

## NEXT STEPS (Priority Order)
1. ✅ Phase 0: Foundation merge — DONE
2. ✅ Phase 1: Keyboard shortcuts + command palette — DONE
3. ✅ Phase 2: Kitchen intelligence — DONE (Codex)
4. ✅ Phase 3: DataTable + charts + reporting — DONE
5. ✅ Phase 4: Modifier groups — DONE (Codex)
6. ✅ Phase 5: Receipt + printing — DONE (Codex)
7. 🟡 Phase 6: Financial hardening — banker's rounding done, multi-tax UI pending
8. ✅ Phase 7: Role-based experience — DONE
9. ✅ Phase 8: Loading/empty/error states — DONE
10. ✅ Phase 9: Reservations — DONE
11. ✅ Phase 11: Production hardening — DONE
12. **Phase 12: Deploy to Vercel + launch checklist** ← NEXT

## DECISIONS LOG
- Reused CutMerchantCosts Supabase project (free tier 2-project limit)
- Permissive RLS for dev — replace before production
- Build Protocol v3: 24 audit techniques, requirements interview, context thresholds
- Phase 0 merge direction: prototype UI → INTO cobalt-pos architecture
- shadcn replaces prototype custom components where equivalent exists
- Font: Inter with premium config (ss01/cv01, tabular-nums, antialiased)
- AppShell wraps all protected routes — Login/Onboarding outside shell
- Nav items from navConfig.ts single source — role-based filtering, mobile 5-item cap
- Codex contributed Phases 2-6 but injected non-CloudPos code — cleaned up April 4
- Repo renamed: cobalt-pos-2026-03-04 → cobalt-pos
- Card payments disabled at UI level until Helcim integration is wired (no orphaned orders)
- Cashiers can access table-floor and reservations (moved out of ManagerRoute)
- Default route: cashier→/pos, manager/owner→/dashboard
