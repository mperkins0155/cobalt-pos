# CloudPos — VERSION LOG
# Append-only changelog. Newest entries first.
# Format: V[Major].[Minor].[Patch].[Fix]-[Label]
# Ref: Semantic-Versioning-System-Design.md

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
