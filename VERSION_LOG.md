# CloudPos — VERSION LOG
# Append-only changelog. Newest entries first.
# Format: V[Major].[Minor].[Patch].[Fix]-[Label]
# Ref: Semantic-Versioning-System-Design.md

---

## V1.3.0.0-Production
**Timestamp:** 2026-04-01T23:50:00Z
**Triggered By:** launch hardening
**Phase:** 7 — UX polish + launch hardening
**Files Changed:**
  - src/pages/Checkout.tsx (MODIFIED)
  - src/pages/Receipt.tsx (MODIFIED)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Removed two misleading operator-facing paths during the launch-hardening sweep: card payments no longer present as a live checkout option when the Helcim UI is not wired, and receipt email is now shown as unavailable instead of firing a stub action.
**Detailed Changes:**
  - checkout: card tender is disabled behind an explicit readiness flag, carries a clear “Soon” state, and shows a warning message telling staff to use cash or another payment app for live sales.
  - receipt: the email receipt button is now an honest disabled action with explanatory tooltip text instead of a fake success-path stub.
  - hardening sweep: re-ran the full build, typecheck, lint, and tests after the operator-flow cleanup.
**Pre-State:** Checkout still let users choose card even though that path always failed with a “UI integration pending” error, and the receipt page still exposed a stubbed email action.
**Post-State:** Cashiers no longer hit avoidable dead ends in the live payment flow, and the receipt screen no longer suggests a capability that is not actually shipped.
**Verification:** `npm run build` passed, `npx tsc --noEmit` passed, `npm run lint` passed, `npm test` passed (38/38).
**Next Target:** V1.4.0.0 — Phase 8 (production integration QA + deployment hardening)

---

## V1.2.0.0-Production
**Timestamp:** 2026-04-01T23:10:00Z
**Triggered By:** feature addition
**Phase:** 6 — Financial hardening
**Files Changed:**
  - src/lib/calculations.ts (MODIFIED)
  - src/lib/calculations.test.ts (MODIFIED)
  - src/pages/Checkout.tsx (MODIFIED)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Hardened monetary calculations around banker’s rounding and aligned checkout cash input formatting with the same finance helpers used by the ledger and tests.
**Detailed Changes:**
  - calculations: replaced half-up rounding with banker’s rounding, retained the `round2` API as the shared 2-decimal entry point, and added `calcSum`, `mergeAndSum`, and `average` helpers adapted from the PWA reference bundle.
  - finance tests: expanded calculations coverage from 26 to 31 assertions, including explicit bank-rounding edge cases (`0.005`, `0.015`, `0.025`, `0.035`) and aggregation helper tests.
  - checkout: removed the remaining `.toFixed(2)` shortcuts for exact cash and placeholder values so cashier-facing money strings now use the hardened calculation path.
  - verification sweep: caught and cleared a transient Dashboard JSX build break during the sweep, then re-ran the full validation baseline.
**Pre-State:** The repo still used half-up rounding in `round2`, two checkout cash-entry strings bypassed the shared money helpers, and the calculation utilities did not yet include the aggregation helpers referenced by the broader roadmap.
**Post-State:** Finance math is consistent across checkout, cart math, services, and tests. The production build, typecheck, lint, and test baseline is green on top of the hardening pass.
**Verification:** `npm run build` passed, `npx tsc --noEmit` passed, `npm run lint` passed, `npm test` passed (38/38).
**Next Target:** V1.3.0.0 — Phase 7 (UX polish + launch hardening)

---

## V1.1.0.0-Production
**Timestamp:** 2026-04-01T22:43:00Z
**Triggered By:** feature addition
**Phase:** 5 — Receipt & printing
**Files Changed:**
  - src/components/Receipt.tsx (NEW)
  - src/lib/receiptFormatter.ts (NEW)
  - src/pages/Receipt.tsx (MODIFIED — full replacement)
  - src/index.css (MODIFIED — print media rules)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Replaced the placeholder payment success screen with a reusable receipt component and print-focused receipt route. Receipt output now includes business header, order metadata, line items with modifiers, totals, payments, tendered/change, and thermal-style print CSS.
**Detailed Changes:**
  - Receipt component: reusable receipt view with organization details, line items, modifiers, totals, payment labels, and footer text.
  - receiptFormatter: central helpers for receipt date formatting, organization address rendering, payment labels, tendered/change totals, and money formatting.
  - Receipt page: upgraded to a proper post-payment experience with print, email-stub, and new-sale actions alongside the printable receipt card.
  - Print CSS: added `@media print` rules for `.receipt` and `.no-print`, targeting 80mm thermal-style output with print-safe layout.
**Pre-State:** Receipt route was a simple success panel with inline totals and a raw `window.print()` button. No reusable receipt component or print-specific formatting existed.
**Post-State:** Receipt generation is now a reusable UI surface and a cleaner basis for later email/receipt-template work. The print route is ready for browser-based thermal receipt output.
**Verification:** `npm run build` passed, `npx tsc --noEmit` passed, `npm run lint` passed, `npm test` passed (33/33).
**Next Target:** V1.2.0.0 — Phase 6 (Financial hardening)

---

## V1.0.0.0-Production
**Timestamp:** 2026-04-01T22:38:00Z
**Triggered By:** feature addition
**Phase:** 4 — Modifier groups
**Files Changed:**
  - src/components/pos/ModifierModal.tsx (NEW)
  - src/pages/POS.tsx (MODIFIED — modifier selection flow)
  - src/components/pos/index.ts (MODIFIED)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Added full modifier-group selection to the POS register using the existing catalog/item modifier schema and cart modifier types. Items with linked modifier groups now require selection before they are added to cart, and price adjustments flow into cart totals and checkout automatically.
**Detailed Changes:**
  - ModifierModal: shadcn Dialog-based selector for `choose_one` and `choose_many` groups, required validation, min/max enforcement, quantity control, and live total preview.
  - POS: product click path now loads full item modifier data and opens the modal when groups exist; base items without modifiers still add immediately.
  - Cart pricing: selected modifier price adjustments reuse the existing `CartItemModifier` and `useCart` total pipeline, so checkout/order persistence picks them up without extra special-case logic.
**Pre-State:** Modifier groups existed in types and catalog services, but the POS register ignored them and always added the base item directly.
**Post-State:** Modifier-bearing items now behave like a real restaurant POS. Selected modifiers display in the cart and persist through the existing order line modifier insert flow.
**Verification:** `npm run build` passed, `npx tsc --noEmit` passed, `npm run lint` passed, `npm test` passed (33/33).
**Next Target:** V1.1.0.0 — Phase 5 (Receipt & printing)

---

## V0.9.0.0-Production
**Timestamp:** 2026-04-01T21:42:00Z
**Triggered By:** feature addition
**Phase:** 3 — Data tables + charts + reporting core
**Files Changed:**
  - src/components/DataTable.tsx (NEW)
  - src/pages/Customers.tsx (MODIFIED — DataTable conversion)
  - src/pages/History.tsx (MODIFIED — DataTable conversion)
  - src/pages/Inventory.tsx (MODIFIED — DataTable conversion)
  - src/pages/Reports.tsx (MODIFIED — chart-backed reporting)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Added the first reusable operational table layer and upgraded the reporting surface from stat cards only to real charts. Customers, History, and Inventory now use a shared sortable/paginated table component, and Reports now visualizes live payment, order-type, and hourly-volume data.
**Detailed Changes:**
  - DataTable: reusable client-side table with sortable columns, pagination, loading skeletons, empty states, and optional row navigation.
  - Customers: removed the legacy full-screen header pattern, moved into AppShell-native layout, added searchable customer table with visits, spend, and status columns.
  - History: replaced expandable card list with a searchable/sortable completed-order table and route navigation to full order detail.
  - Inventory: replaced inventory card grid with a filterable/sortable table showing stock, threshold, price, and stock level badges.
  - Reports: added Recharts-based payment breakdown pie, order-type revenue bar chart, and hourly volume combo chart using existing `ReportingService` and `OrderService` data.
**Pre-State:** Phase 3 existed only as roadmap intent. Reports used stat cards plus short lists, and several operational pages still relied on bespoke card lists instead of a reusable table pattern.
**Post-State:** Phase 3 core infrastructure is present. The repo now has a shared table component and a chart-backed reporting page. Remaining Phase 3 expansion to additional pages can build on this foundation rather than starting from scratch.
**Verification:** `npm run build` passed, `npx tsc --noEmit` passed, `npm test` passed (33/33).
**Next Target:** V1.0.0.0 — Phase 4 (Modifier groups)

---

## V0.8.0.0-Production
**Timestamp:** 2026-04-01T21:30:00Z
**Triggered By:** feature addition
**Phase:** 2 — Kitchen Intelligence core
**Files Changed:**
  - src/services/soundService.ts (NEW)
  - src/components/kitchen/SoundSettings.tsx (NEW)
  - src/hooks/useKitchenOrders.ts (NEW)
  - src/pages/Tickets.tsx (MODIFIED — enhanced KDS)
  - src/services/orders.ts (MODIFIED — open tickets include line details)
  - src/App.tsx (MODIFIED — QueryClientProvider)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Added the Phase 2 kitchen intelligence core: AudioContext-based kitchen alerts, query-backed KDS refreshing, Supabase Realtime invalidation, and a significantly upgraded Kitchen Display page with sound controls and live-status indicators.
**Detailed Changes:**
  - soundService: localStorage-backed sound settings, first-gesture audio priming, generated tones for new orders, order-ready, takeaway-ready, and rush alerts.
  - SoundSettings: shadcn-based kitchen sound control surface with volume, per-event toggles, and test-tone buttons.
  - useKitchenOrders: React Query polling every 3 seconds, Supabase Realtime invalidation for orders/order_lines changes, new-order detection, rush threshold detection, last-refresh tracking.
  - Tickets: upgraded from interval-only refresh to query-driven KDS, added live/fallback connectivity indicator, manual refresh, auto-refresh toggle, sound settings popover, active/takeaway tab layout, richer ticket cards, and real line-item rendering.
  - OrderService.getOpenTickets: now fetches order lines and modifier details for actual kitchen visibility.
  - App: QueryClientProvider added so Phase 2 and later data-table/reporting work can use TanStack Query consistently.
**Pre-State:** KDS used a simple `setInterval(15000)` refresh loop and only loaded top-level open tickets. No sound service, no Realtime invalidation, and no app-level query cache existed.
**Post-State:** Kitchen operators get near-live KDS refresh with sound alerts and richer ticket context. Realtime falls back gracefully to polling. Current schema still limits true station routing and item-level kitchen statuses, so those remain future schema/UI work rather than being faked here.
**Verification:** `npm run build` passed, `npx tsc --noEmit` passed, `npm test` passed (33/33).
**Next Target:** V0.9.0.0 — Phase 3 (Data tables + charts + reporting)

---

## V0.7.0.0-Production
**Timestamp:** 2026-04-01T21:10:00Z
**Triggered By:** feature addition
**Phase:** 1 — Keyboard shortcuts + command palette
**Files Changed:**
  - src/hooks/useKeyboardShortcuts.ts (NEW)
  - src/components/KeyboardShortcutsHelp.tsx (NEW)
  - src/components/CommandPalette.tsx (NEW)
  - src/components/nav/AppShell.tsx (MODIFIED — overlays + global shortcut wiring)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Added global keyboard shortcuts and command palette to the CloudPos app shell. Shortcuts are input-aware, Escape-safe, and available across mobile, tablet, and desktop layouts. Command palette supports quick actions and best-effort search over orders, customers, and menu items.
**Detailed Changes:**
  - useKeyboardShortcuts: central hook for combo parsing, input suppression, enabled flags, and generated help descriptions.
  - KeyboardShortcutsHelp: shadcn Dialog with formatted key badges and active shortcut list.
  - CommandPalette: shadcn CommandDialog with quick navigation plus lightweight search using existing OrderService, CustomerService, and CatalogService APIs.
  - AppShell: refactored from early-return layout branches to a shared overlay pattern so command/help dialogs render regardless of breakpoint.
  - Active shortcuts: Ctrl/Cmd+K, /, ?, N, Escape.
**Pre-State:** Phase 1 files did not exist in this working copy. AppShell had no global keyboard layer and no overlay rendering path.
**Post-State:** Operators can invoke global navigation/search actions without leaving the keyboard. Phase 1 roadmap items are now present in the repo.
**Next Target:** V0.8.0.0 — Phase 2 (Kitchen Intelligence)

---

## V0.6.4.0-Production
**Timestamp:** 2026-04-01T20:30:00Z
**Triggered By:** feature addition
**Phase:** 0D-2 — POS + Checkout revenue path restyle
**Files Changed:**
  - src/pages/POS.tsx (MODIFIED — CloudPos register layout)
  - src/pages/Checkout.tsx (MODIFIED — CloudPos checkout layout)
  - PROGRESS.md (MODIFIED)
  - VERSION_LOG.md (MODIFIED)
**Summary:** Completed the Phase 0 page extraction work by restyling the POS register and checkout screens to match the CloudPos/AppShell system while preserving the current service wiring.
**Detailed Changes:**
  - POS: removed legacy standalone header, added SearchBar + FilterPills, desktop cart rail, mobile cart sheet/FAB, CloudPos empty/loading states, and AppShell-compatible spacing.
  - Checkout: removed legacy standalone header, added back/save-tab actions, card-based tip/payment flow, semantic change-due/error states, and preserved order/payment service flow.
  - Payment honesty preserved: card payments still initialize the Helcim flow and then throw the existing “UI integration pending” error instead of pretending the flow is complete.
**Pre-State:** POS.tsx and Checkout.tsx remained the last major screens using older cobalt-pos framing and visual treatment.
**Post-State:** Phase 0 is fully complete. The full revenue path now matches the CloudPos system used elsewhere in the app.
**Next Target:** V0.7.0.0 — Phase 1 (Keyboard shortcuts + command palette)

---

## V0.6.3.0-Production
**Timestamp:** 2026-04-01T17:30:00Z
**Triggered By:** feature addition
**Phase:** 0D-1 — Pages Extraction (batch 1 of 2)
**Files Changed:**
  - src/pages/Dashboard.tsx (NEW — 316 lines)
  - src/pages/Orders.tsx (ENHANCED — 203 lines, was 109)
  - src/pages/History.tsx (NEW — 159 lines)
  - src/pages/Staff.tsx (NEW — 162 lines)
  - src/pages/TableFloor.tsx (ENHANCED — 213 lines, was 231)
  - src/pages/Tickets.tsx (ENHANCED — 202 lines, was 54)
  - src/pages/Reports.tsx (ENHANCED — 166 lines, was 110)
  - src/pages/Inventory.tsx (ENHANCED — 163 lines, was 15 stub)
  - src/pages/Settings.tsx (ENHANCED — 81 lines, was 50)
  - src/pages/Login.tsx (ENHANCED — 114 lines, was 44)
  - src/pages/CustomerDetail.tsx (ENHANCED — 221 lines, was 16 stub)
  - src/pages/Closeout.tsx (ENHANCED — 199 lines, was 90)
  - src/modals/TableDetail.tsx (NEW — 156 lines)
  - src/modals/ChangeTable.tsx (NEW — 153 lines)
  - src/App.tsx (MODIFIED — Dashboard/History/Staff routes + /dashboard default)
  - src/components/nav/AppShell.tsx (MODIFIED — /history + /staff page titles)
**Summary:** 12 pages enhanced/created + 2 modals, all with CloudPos design system (theme tokens, semantic colors, Inter typography). All pages wired to Supabase services. Old cobalt-pos blue headers removed — AppShell handles navigation. 2,804 total lines across 16 files. Build: 0 errors, 0 warnings, 33/33 tests pass.
**Detailed Changes:**
  - Dashboard: Stat cards (earnings, in-progress, served), 3-column kanban on desktop, FilterPills+flat list on mobile, mobile FAB, skeleton loading. Wired to OrderService + ReportingService.
  - Orders: SearchBar, FilterPills with status counts (useMemo), OrderRow with status badges using theme colors.
  - History: Completed orders with type filter (Dine In/Take Away). Expandable rows show line items, subtotal/tax/tip/total.
  - Staff: Profile cards from Supabase profiles table. Role badges, initials avatars, contact info.
  - TableFloor: Floor tabs via FilterPills, status legend with dot indicators, chair dots visual, status rotation on tap.
  - Tickets (KDS): Urgency colors (green <10m, amber <20m, red 20m+), auto-refresh every 15s, bump order button.
  - Reports: 8 StatCards, payment breakdown, low stock alerts, upcoming reservations. Z-Report button.
  - Inventory: Stock level classification (Empty/Low/Medium/High based on threshold). Search + level filter.
  - Settings: 2-column grid, icon tiles with primary-tint backgrounds + chevrons.
  - Login: CloudPos branding (blue "C" logo), accessible form (htmlFor/id), Google OAuth divider, Loader2 spinner.
  - CustomerDetail: Profile header with initials avatar, contact card, activity stats (visits, total spent, avg), order history.
  - Closeout: 3 states (no shift → close shift form → report). Over/short coloring (success/destructive). Payment breakdown.
  - TableDetail modal: shadcn Dialog. Shows table info, order items, subtotals. Add Items + Pay actions.
  - ChangeTable modal: Visual current→new with arrow. Available tables grid. Confirm flow with status update.
**Pre-State:** Pages used old cobalt-pos styling (blue bg-primary headers, ArrowLeft back buttons, min-h-screen). Several were stubs (Inventory: 15 lines, CustomerDetail: 16 lines). No Dashboard page existed. No modals directory.
**Post-State:** All 12 pages render within AppShell (no standalone headers). Consistent CloudPos design: theme colors, SearchBar/FilterPills/StatCard/EmptyState components, Skeleton loading, mobile-responsive with pb-20 bottom padding. Two modals in new src/modals/ directory.
**Next Target:** V0.6.4.0 — Phase 0D-2 (POS.tsx + Checkout.tsx CloudPos styling enhancement)

---

## V0.6.2.0-Production
**Timestamp:** 2026-03-30T20:00:00Z
**Triggered By:** feature addition
**Phase:** 0C — Responsive Navigation
**Files Changed:**
  - src/hooks/useBreakpoint.ts (NEW — 27 lines)
  - src/components/nav/navConfig.ts (NEW — 70 lines)
  - src/components/nav/Sidebar.tsx (NEW — 95 lines)
  - src/components/nav/TopNav.tsx (NEW — 86 lines)
  - src/components/nav/BottomNav.tsx (NEW — 53 lines)
  - src/components/nav/AppShell.tsx (NEW — 162 lines)
  - src/components/nav/index.ts (NEW — 12 lines)
  - src/App.tsx (MODIFIED — wrapped protected routes with AppShell layout)
**Summary:** Complete responsive navigation system. Desktop sidebar (≥1080px), tablet top nav (640–1079px), mobile bottom tabs (<640px). All routes now wrapped in AppShell layout. Role-based nav filtering.
**Detailed Changes:**
  - useBreakpoint: Detects mobile/tablet/desktop with resize listener + cleanup. Returns typed Breakpoint union.
  - navConfig.ts: Single source of truth for all nav items. 8 primary items + settings + logout. Role-based filtering (getNavItemsForRole). Mobile filtering (getMobileNavItems — max 5, no desktopOnly items). minRole support per item.
  - Sidebar: Desktop left sidebar (230px). Logo, 8 nav items with active highlight (primary-tint), settings, logout (destructive hover), user card at bottom with initials avatar.
  - TopNav: Tablet horizontal bar (50px height). Logo, filtered nav items, settings icon, notification bell with red dot badge, user avatar with logout.
  - BottomNav: Mobile bottom tabs. 5 icons max. Active state: primary color + dot indicator. Safe-area-inset-bottom for notch phones. min-h-[48px] touch target. aria-current="page" on active item.
  - AppShell: Layout wrapper using useBreakpoint. Mobile: header + content + BottomNav. Tablet: TopNav + content. Desktop: Sidebar + header bar (with page title + bell + user pill) + content. All render Outlet for nested routes.
  - App.tsx: Added AppShell as layout route wrapping all protected pages. Login, AuthCallback, Onboarding remain outside shell (no nav needed). Preserved ProtectedRoute and ManagerRoute guards. Import path: @/components/nav.
**Pre-State:** No responsive navigation. All pages were full-screen with no persistent nav. POS page had its own inline header with navigation buttons.
**Post-State:** Every protected page renders inside AppShell. Navigation adapts to viewport. Role-based filtering active. All 22 existing routes accessible. Build: 0 errors, 33/33 tests pass.
**Audit:** 0 issues — all buttons accessible, key props present, cleanup on resize listener, no hardcoded colors, null guards on profile.
**Next Target:** V0.6.3.0 — Phase 0D (Pages Extraction — wire prototype pages to Supabase services)

---

## V0.6.1.0-Production
**Timestamp:** 2026-03-28T12:30:00Z
**Triggered By:** feature addition
**Phase:** 0B — Component Replacement
**Files Changed:**
  - src/components/ui/button.tsx (MODIFIED)
  - src/components/pos/SearchBar.tsx (NEW)
  - src/components/pos/EmptyState.tsx (NEW)
  - src/components/pos/FilterPills.tsx (NEW)
  - src/components/pos/StepperBar.tsx (NEW)
  - src/components/pos/NumPad.tsx (NEW)
  - src/components/pos/StatCard.tsx (NEW)
  - src/components/pos/OrderCard.tsx (NEW)
  - src/components/pos/index.ts (NEW)
  - src/lib/toastHelpers.ts (NEW)
  - src/index.css (MODIFIED — added scrollbar-none utility)
**Summary:** Created 8 shared POS components + toast helper library + barrel export. Enhanced Button with danger variant and 44px touch targets.
**Detailed Changes:**
  - Button: Added `danger` variant (bg-destructive-tint text-destructive). Bumped default h-10→h-11, lg h-11→h-12, icon h-10→h-11 for 44px min touch. Hover now uses primary-hover token.
  - SearchBar: Wraps shadcn Input + lucide Search. role="search", aria-label, h-11 height.
  - EmptyState: Icon + title + description + optional action slot. Uses tertiary-foreground.
  - FilterPills: Horizontal scroll chips with count badges. Active state uses primary color. min-h-[36px] touch target. scrollbar-none class.
  - StepperBar: Wizard progress indicator. Shows check icon for completed steps. Responsive — hides inactive labels on mobile.
  - NumPad: 3×4 grid with pointer events. 44px min touch targets. Keyboard listener with cleanup. Delete key via lucide icon.
  - StatCard: Wraps shadcn Card. 4 accent variants (primary/success/warning/destructive) using tint tokens.
  - OrderCard: Compact + expanded modes. Progress bar with warning/success color. Status badges. Uses formatCurrency from calculations.ts.
  - Barrel export: All 8 components + types from src/components/pos/index.ts.
  - toastHelpers.ts: 15 pre-configured toast functions for order, payment, kitchen, table, inventory, staff, refund events. Wraps sonner.
  - index.css: Added .scrollbar-none utility (webkit + firefox).
**Pre-State:** cobalt-pos had 50 shadcn/ui components but zero POS-specific shared components. Button used default shadcn sizes (h-10). No toast helpers.
**Post-State:** 8 POS components ready for page extraction. Button has POS-appropriate sizing + danger variant. Toast helpers cover all POS events. All compile, 33/33 tests pass.
**Next Target:** V0.6.2.0 — Phase 0C (Responsive Navigation)

---

## V0.6.0.1-Production
**Timestamp:** 2026-03-28T12:00:00Z
**Triggered By:** feature addition
**Phase:** 0A — Theme System
**Files Changed:**
  - index.html (MODIFIED)
  - src/index.css (MODIFIED — full replacement)
  - tailwind.config.ts (MODIFIED — full replacement)
**Summary:** Mapped all CloudPos prototype design tokens (T_STATIC, T_LIGHT, T_DARK) into Tailwind CSS custom properties. Added Inter font with premium configuration.
**Detailed Changes:**
  - index.html: Added Inter font preconnect + Google Fonts stylesheet. Updated title to "CloudPos — Point of Sale".
  - src/index.css: Replaced 89 CSS custom properties. Light mode maps to T_LIGHT, dark mode maps to T_DARK. 12 core shadcn vars + 8 custom: --success, --warning, --tertiary-foreground, --primary-hover, --shadow, --shadow-lg, --chart-1 through --chart-5, plus 4 tint backgrounds. Premium typography: antialiased, tabular-nums, Inter ss01/cv01 alternate glyphs, tight heading tracking (-0.025em), loose small-text tracking (0.01em), custom scrollbar.
  - tailwind.config.ts: Inter font family as default sans. 11 color groups: core shadcn (primary, secondary, destructive, muted, accent, card, popover, border, input, ring, foreground, background) + POS semantic (success, warning, tertiary, chart 1-5). Tint variants on primary/success/warning/destructive. Primary hover state. Theme-aware shadow-pos/shadow-pos-lg via CSS vars. POS breakpoints (pos-tablet: 640px, pos-desktop: 1080px). Radius bumped to 0.75rem (lg=12px, md=10px, sm=8px).
**Pre-State:** Default shadcn slate theme. Dark navy primary. No custom colors. No font specified. Radius 0.5rem.
**Post-State:** CloudPos blue primary (#447DFC). Full light/dark token parity with prototype. Inter font with premium typographic features. All shadcn components inherit CloudPos colors. Build 0 errors, 33/33 tests pass.
**Audit:** 4 issues found and fixed in same session — missing tertiary-foreground, missing primary-hover, hardcoded shadow values, missing chart colors.
**Next Target:** V0.6.1.0 — Phase 0B (Component Replacement)

---

## V0.6.0.0-Production — Genesis Entry
**Timestamp:** 2026-03-28T11:00:00Z
**Triggered By:** milestone
**Phase:** Starting point assessment
**Summary:** Official starting version for Phase 0 merge. Based on gap analysis: prototype 100% complete, cobalt-pos services 100% complete, merge work ~60% remaining to V1.
**Assessment:**
  - CloudPos prototype: 2,537 lines, 36 components, 35 features, 6 audits, 26 bugs fixed
  - cobalt-pos production: 12,625 lines, 101 files, 14 services, 739 lines of types, 50 shadcn components
  - Supabase: 10 tables deployed with RLS + seed data
  - Gap to V1: ~5,200 new lines across ~56 files, 12 phases, 20 sessions estimated
  - Completion estimate: 60% to V1 → starting at V0.6.0.0
**Next Target:** V0.6.0.1 — Phase 0A (Theme System)
