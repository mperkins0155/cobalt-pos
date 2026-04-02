# Production QA Checklist

Use this checklist for live verification against real Supabase data and processor credentials.

## Preconditions

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` point at the intended live project.
- GitHub Pages or preview deploy is built with the correct `VITE_BASE_PATH`.
- A valid organization, location, owner, manager, and cashier account exist.
- Tip settings, tax settings, menu items, categories, customers, and tables are seeded for the test org.
- If card testing is being attempted, `VITE_ENABLE_CARD_PAYMENTS=true` and the Helcim browser flow is actually wired in the deployed build.
- If receipt email testing is being attempted, `VITE_ENABLE_EMAIL_RECEIPTS=true` and a real delivery path exists.

## Cashier flow

1. Sign in as cashier.
2. Open Dashboard, POS, Orders, Tickets, Customers, and Receipt routes from AppShell.
3. Create a cash sale with:
   - multiple items
   - at least one modifier-bearing item
   - taxable and non-taxable items
   - optional discount if enabled for cashier role
4. Verify checkout:
   - suggested tip
   - custom tip
   - no-tip path
   - exact cash
   - over-tendered cash with change due
   - "other" payment provider with reference
5. Verify receipt:
   - totals match checkout
   - modifiers render
   - tendered/change render for cash
   - print works
6. Save a tab/ticket and confirm it appears in the correct open-order surfaces.

## Manager flow

1. Sign in as manager.
2. Verify manager-only routes render:
   - Staff
   - Closeout
   - Order detail actions
3. Void an eligible open/pending order.
4. Refund a paid order and confirm:
   - refund record exists
   - order status updates
   - refunded amount updates
   - refund payment tender matches original tender
5. Close a shift and validate:
   - expected cash
   - counted cash
   - over/short calculation
   - payment breakdown

## Owner flow

1. Sign in as owner.
2. Verify access to all route groups and settings surfaces.
3. Confirm organization/location defaults load correctly after refresh.
4. Validate reports:
   - stat cards
   - payment breakdown chart
   - order type chart
   - hourly volume chart
   - customer/history/inventory tables

## Kitchen / operations

1. Create or save open orders and confirm KDS ticket visibility.
2. Confirm auto-refresh updates without manual reload.
3. Confirm sound settings persist locally and test tones work.
4. Confirm bump/complete actions update the ticket list correctly.

## Table / reservation flow

1. Change reservation status from pending to seated and verify table status changes.
2. Open table detail for:
   - available table
   - occupied table
3. Confirm occupied table messaging is honest if order linking is unavailable.
4. Confirm there is no broken checkout deep-link from table detail.

## Deployment / environment checks

1. Run local validation:
   - `npm run build`
   - `npm run build:pages` with `VITE_BASE_PATH=/cobalt-pos/`
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm test`
2. Confirm GitHub Pages workflow variables are present.
3. Confirm deployed asset URLs include the Pages base path.
4. Confirm feature flags match reality:
   - card disabled if Helcim UI is not ready
   - email receipt disabled if delivery is not ready

## Known remaining blockers

- True live card checkout still requires the in-browser Helcim flow to be wired end-to-end.
- Email receipt delivery still requires a real sending path.
- Table-to-order linkage is still not fully wired, so occupied-table order lookup remains partial.
- Final RLS tightening still needs a production-specific review before broad rollout.
