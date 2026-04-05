# CloudPos V0.8.0.0 — Launch Runbook
## Everything needed to go from code-complete to live production

---

## SITUATION

The code is complete and committed locally. Three manual steps remain:
1. Push the commit to GitHub
2. Create a Supabase project for cobalt-pos and run migrations
3. Deploy to Vercel with env vars

The Supabase project `dbreddlkzpymsqmkkjub` is the **CMC prototype project** —
do not run cobalt-pos migrations there. cobalt-pos needs its own project.

---

## STEP 1 — Push to GitHub

```bash
cd cobalt-pos
git push origin main
```

Expected: `24ea344 V0.8.0.0 — Phase 9 + 11 + 12 audit` appears on GitHub.

---

## STEP 2 — Create Supabase Project for cobalt-pos

1. Go to https://supabase.com/dashboard
2. Click **New project**
3. Settings:
   - Name: `cobalt-pos`
   - Region: **US East (N. Virginia)** — matches current preference
   - Password: generate a strong one, save it
4. Wait for project to provision (~2 min)
5. From the project dashboard, copy:
   - **Project URL**: `https://XXXX.supabase.co`
   - **anon public key**: from Settings → API

### Apply migrations (in order)

Go to **SQL Editor** and run each file in order:

```
supabase/migrations/001_core_schema.sql      ← ~802 lines, core tables + RLS
supabase/migrations/002_seed_data.sql        ← seed org, categories, items, tables
supabase/migrations/003_missing_modules.sql  ← dining_tables, reservations, etc.
supabase/migrations/005_quotation_workflow.sql
supabase/migrations/006_production_hardening.sql  ← UPDATE/DELETE RLS + 24 FK indexes
```

After running all five, verify:
```sql
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```
Should show 30+ policies across all tables.

```sql
SELECT count(*) FROM pg_stat_user_indexes WHERE schemaname = 'public';
```
Should be 50+ indexes.

---

## STEP 3 — Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select `mperkins0155/cobalt-pos`
4. Framework preset: **Vite** (auto-detected)
5. Root directory: `/` (no monorepo)
6. Build command: `npm run build` (auto-detected)
7. Output directory: `dist` (auto-detected)

### Environment Variables (add before first deploy)

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://XXXX.supabase.co` (from Step 2) |
| `VITE_SUPABASE_ANON_KEY` | anon public key (from Step 2) |
| `VITE_APP_NAME` | `Cobalt POS` |
| `VITE_APP_URL` | `https://cobalt-pos.vercel.app` (your Vercel URL) |
| `VITE_ENABLE_CARD_PAYMENTS` | `false` (until Helcim is wired) |
| `VITE_ENABLE_EMAIL_RECEIPTS` | `false` |

8. Click **Deploy**
9. Wait ~60–90 seconds for build to complete

---

## STEP 4 — Post-Deploy Verification

Once the Vercel URL is live, verify these manually:

### Auth
- [ ] `/login` loads — shows employee PIN screen
- [ ] Can sign in with test credentials
- [ ] Owner lands on `/dashboard`, cashier lands on `/pos`

### Core POS flow
- [ ] POS loads menu items from Supabase (not hardcoded)
- [ ] Add item to cart → see subtotal, tax, total
- [ ] Cash payment → creates order → navigates to receipt
- [ ] Receipt renders with order details

### Other pages
- [ ] `/orders` — lists orders from DB
- [ ] `/table-floor` — shows seeded tables (A1–E4)
- [ ] `/reservations` — loads, "New reservation" modal opens
- [ ] `/reports` — date range picker works, charts render
- [ ] `/pos/tickets` — KDS page loads (may be empty)

### Role access
- [ ] Log in as cashier → no access to /reports, /staff, /inventory
- [ ] Log in as manager → full nav visible

### Dark mode
- [ ] Toggle dark mode from Settings → all pages switch correctly

---

## STEP 5 — Tighten Supabase Auth (post-deploy)

Once the app is live and tested:

1. In Supabase → Authentication → URL Configuration:
   - Add your Vercel URL to **Redirect URLs**: `https://cobalt-pos.vercel.app/**`
   - Set **Site URL**: `https://cobalt-pos.vercel.app`

2. In Supabase → Authentication → Providers:
   - Enable Email provider
   - Disable phone/SMS (not needed)

3. In Supabase → Database → Security:
   - Confirm RLS is enabled on all tables (green checkmarks)

---

## OPTIONAL — Custom Domain

In Vercel → Your Project → Settings → Domains:
- Add `app.cloudpos.io` or similar
- Update `VITE_APP_URL` env var to match
- Update Supabase Redirect URLs to match

---

## KNOWN GAPS (V2 scope, not blocking V1)

- Card payments (Helcim) — disabled at UI level, toggle `VITE_ENABLE_CARD_PAYMENTS=true` when wired
- Multi-tax UI — banker's rounding done, per-item tax rate display on receipt not wired
- PWA / offline mode — service worker not implemented
- SMS/email reservation confirmations — stub only

---

## IF SOMETHING BREAKS

1. Check Vercel build logs for TS/bundle errors
2. Check browser console for runtime errors — ErrorBoundary will catch and display them
3. Check Supabase Dashboard → Logs → API for 4xx/5xx errors
4. Common issue: env vars not set → `supabase.ts` will throw "Supabase credentials not configured"
5. Common issue: RLS blocks queries → check policy count query above; if <30, re-run migration 006

---

## VERSION SUMMARY

| Version | What shipped |
|---|---|
| V0.6.x | Theme, components, navigation, all pages extracted |
| V0.7.x | Keyboard shortcuts, KDS sound, DataTable, modifier groups, receipt, role-based routes, error toasts |
| V0.8.0.0 | Reservations, error boundaries, audit trail, RLS hardening, 24-technique audit pass |
| V1.0.0 | ← this deploy |
