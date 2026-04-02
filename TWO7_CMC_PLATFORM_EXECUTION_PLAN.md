# Two7 / CMC Platform Execution Plan

Updated: April 1, 2026

## Source Of Truth

- Product execution home base: `cobalt-pos-2026-03-04`
- Current implementation status: `PROGRESS.md` in this repo root
- Marketing site source: `cmc-website`
- AI website generation source: `ai-web-builder`
- CRM/email source: `CobaltFullPlatform`
- Reference-only inputs: `cloudpos-demo`, `Two7POSV4`, uploaded ZIP planning pack

`PROGRESS.md` in this repo is newer than the uploaded ZIP copy and remains authoritative for POS progress.

## Additional Archives Reviewed

- `TWO7DESIGN ARTIFACTS.zip`
- `TWO7DESIGN ARTIFACTS FROM OTHER BUILD.zip`
- `TWO7DESIGN MARKETING DFW ARTIFACTS.zip`
- `pos build refferences and project files.zip`
- `pos build most recent 4-1-26.zip`

Key result:

- the `pos build most recent 4-1-26.zip` files are byte-for-byte matches for the current POS repo files already present here
- the new, material inputs are the Two7 design archives

## Recommendation

Do not start by creating a new monorepo and trying to hard-merge every repo at once.

The active spine should remain `cobalt-pos-2026-03-04` because it already has:

- the live Supabase service layer
- active versioning and progress tracking
- working auth and onboarding
- the real POS routes and payment flow
- current integration work already completed through `V0.6.3.0`

The rest of the platform should be integrated into this spine in bounded slices.

## End-State Product Flow

1. Visitor lands on `cutmerchantcosts.com`.
2. CTA routes them into either lead capture or direct account creation.
3. Merchant authenticates with Supabase.
4. POS onboarding provisions org, default location, tax, tip settings, and owner profile.
5. Merchant lands in the POS dashboard.
6. Merchant opens a new `Website` area inside the app.
7. AI generates a website using merchant business data, brand inputs, and catalog data from POS.
8. Published website syncs products, contact info, hours, and lead capture back into the platform.
9. Customers, orders, and leads feed CRM and email campaigns.
10. Merchant operates POS, website, and outbound marketing from one account.

## Repo Decisions

| Repo | Decision | Reason |
| --- | --- | --- |
| `cobalt-pos-2026-03-04` | Keep as product spine | Active repo with real services, auth, payments, and current progress |
| `cmc-website` | Keep as separate marketing frontend | Already strong as the public acquisition surface |
| `ai-web-builder` | Extract features, do not merge raw | Valuable generation routes and data model, but root app is drifted |
| `CobaltFullPlatform` | Extract modules only | Good CRM/email logic, but too broad for a direct merge |
| `cloudpos-demo` | Reference only | Mock-data front end, not the live product base |
| `Two7POSV4` | Reference only | Useful patterns, but not the launch stack and checkout is already represented elsewhere |
| `Two7 archive artifacts` | Reference and selectively restore | Strong source for marketing IA, conversion copy, signup flow ideas, local SEO pages, and website-builder positioning |

## Current Reality

### 1. POS Is Already Mid-Build

`cobalt-pos-2026-03-04` is not a starting point. It is already in active execution:

- `V0.6.3.0-Production`
- Phase `0A`, `0B`, `0C`, and `0D-1` completed
- next task is `Phase 0D-2`
- onboarding, auth context, services, and route shell already exist

### 2. Marketing Site Is Real, Not Placeholder

`cmc-website` already has strong public routes, including:

- `/get-started`
- `/pos`
- `/website-builder`
- `/ai-tools`

It already points at the same Supabase project, which is useful for shared signup flow.

### 3. AI Builder Has Reusable Value But Needs Extraction

`ai-web-builder` contains useful inputs:

- `app/api/ai/generate/route.ts`
- `app/api/projects/route.ts`
- a project/page/deployment data model in `prisma/schema.prisma`

But it should not be dropped in as-is:

- root configuration has drift
- `package.json` is malformed
- stack assumptions differ from the POS repo

### 4. CRM/Email Should Be Reduced Before Integration

`CobaltFullPlatform` includes useful modules:

- `lib/services/campaign-service.ts`
- `lib/email-infrastructure/service.ts`
- `lib/leads/lead-scoring-service.ts`

It also carries extra scope that should stay out of the launch path:

- Clerk auth
- voice/SMS
- DocuSign
- broad multi-surface dashboards

### 5. Two7 Archives Are Strategically Useful

The Two7 archives do not change the recommendation to keep `cobalt-pos-2026-03-04` as the product spine, but they do materially sharpen the marketing and website-builder strategy.

Important findings:

- canonical upstream artifact: `two7-platform-v7-merged-signup-flow.jsx`
- cleaner landing scaffold: `two7-landing.zip`
- alternate Next.js scaffold: `two7-nextjs-project.tar.gz`
- DFW campaign variant: `marketing Landing page - DFY Web Design Service V7.html`

What they add:

- a mature public-site narrative for website creation, not just POS
- a multi-step signup and onboarding intent model
- a SaaS-plus-White-Glove positioning option
- city-page SEO scaffolding such as `/web-design-[city]`
- analytics and section-tracking patterns
- local service schema and conversion-oriented landing structure

What they do not change:

- they are not a better app spine than the current POS repo
- they should not replace Supabase Auth with custom in-memory verification flows
- the giant single-file v7 JSX should not be shipped directly

## Non-Negotiable Architecture Rules

### Rule 1: One Auth System

Launch path should use Supabase Auth only.

Do not keep Clerk in the primary user journey.

### Rule 2: One Tenant Model

The `organizations` model in `cobalt-pos` should remain the tenancy spine for:

- merchants
- locations
- POS data
- website projects
- CRM contacts
- campaigns

### Rule 3: One Shared Database

Use the shared Postgres database behind Supabase as the canonical platform database.

Preferred approach:

- add new SQL migrations in the POS/Supabase stack
- model website and CRM tables there
- avoid giving Prisma exclusive ownership of the data model

Prisma can still be used later against the same database if needed, but Supabase-first migrations keep the platform coherent.

### Rule 4: Extract Features, Not Whole Apps

Do not copy entire repos into the POS repo. Pull in bounded modules:

- generation route and orchestration logic
- website/project schema concepts
- campaign sending logic
- contact and scoring utilities

### Rule 5: Treat Two7 As Product Strategy, Not Just Design Debris

Use the Two7 archives for:

- landing-page information architecture
- conversion copy
- signup and onboarding question design
- local SEO page patterns
- optional White Glove upsell framing

Do not use them as the live runtime base unless a clean subset is intentionally rebuilt in the current codebase.

## Execution Order

## Phase 1: Finish The POS Revenue Path

This stays the critical path because the POS app is the operational core.

- [ ] Complete `Phase 0D-2` in `cobalt-pos-2026-03-04`
- [ ] Restyle `src/pages/POS.tsx` with CloudPos patterns
- [ ] Restyle `src/pages/Checkout.tsx` with CloudPos patterns
- [ ] Verify sign up -> onboarding -> order -> checkout -> payment -> receipt
- [ ] Tighten permissive RLS before public rollout

Deliverable:

- a visually consistent, fully usable POS core

## Phase 2: Connect Marketing To App Entry

This turns the public site into a real acquisition surface instead of a brochure.

- [ ] Keep `/get-started` lead capture for sales-assisted flow
- [ ] Add direct account-creation CTA for self-serve flow
- [ ] Reuse the strongest Two7 SaaS positioning where appropriate: self-serve first, White Glove optional
- [ ] Route successful signup to POS onboarding
- [ ] Add cross-links from `/website-builder` and `/pos` into the live app
- [ ] Remove config drift in `cmc-website` docs and env usage
- [ ] Remove hardcoded fallback secrets from the public marketing app
- [ ] Reuse the best Two7 conversion assets as secondary funnel pages, not homepage replacements

Recommended marketing split:

- `cmc-website` remains the main brand and merchant acquisition site
- Two7-derived pages become focused acquisition surfaces for website creation offers
- the DFW landing can become a geo-targeted or campaign-specific page instead of the primary site

Deliverable:

- one public website that can create merchants, not just collect leads

## Phase 3: Expand Onboarding Into Platform Provisioning

Current onboarding already provisions the basics. Expand it so it can feed website generation too.

- [ ] Extend onboarding to capture business profile, category, hours, address, logo, social links, and brand tone
- [ ] Store those inputs on the org/profile records
- [ ] Add a completion state that unlocks both POS and Website modules
- [ ] Seed website defaults from onboarding data

Seed data should be reusable by:

- POS
- website generation
- CRM segmentation
- email templates
- White Glove qualification or routing

Deliverable:

- one onboarding flow that provisions the whole merchant workspace

## Phase 4: Add Website Generation Inside The POS

This is where `ai-web-builder` becomes a platform feature instead of a separate product.

- [ ] Add a new `Website` nav item in the POS app
- [ ] Create website tables in Supabase for projects, pages, assets, prompts, and deployments
- [ ] Extract the generation route and orchestrator logic from `ai-web-builder`
- [ ] Convert generation inputs to use org data from POS onboarding
- [ ] Sync POS catalog and merchant metadata into website generation context
- [ ] Build a first-pass review UI inside POS: prompt, generate, preview, publish
- [ ] Store generated site metadata and revisions in the shared database

Launch constraint:

- initial publish can be simple and opinionated
- full visual editor can come later

The first version only needs:

- prompt
- generation
- preview
- publish
- regenerate

Two7 archive influence for this phase:

- use v7 information architecture and dashboard naming as reference only
- reuse the strongest messaging around "website, store, and business tools in one platform"
- prefer the structured `two7-landing` / Next.js patterns over the monolithic JSX artifact when rebuilding UI

Deliverable:

- merchants can generate and publish a website from inside their POS account

## Phase 5: Bring In CRM And Email

Take the smallest useful slice from `CobaltFullPlatform`.

- [ ] Create shared `contacts` and `campaigns` tables in Supabase
- [ ] Auto-create contacts from POS customers and completed orders
- [ ] Extract Resend-based campaign sending logic
- [ ] Add basic campaign composer and send history
- [ ] Add simple lead scoring or segmentation only if it helps launch workflows
- [ ] Keep voice, SMS, DocuSign, and advanced inbox tooling out of launch scope

The launch CRM should answer only three questions:

- who are this merchant's customers
- how do they contact them
- what did the last campaign do

Deliverable:

- usable merchant CRM and email campaigns without dragging in the full platform complexity

## Phase 6: Deployment Topology

Recommended split:

- `cutmerchantcosts.com` -> `cmc-website`
- `app.cutmerchantcosts.com` -> `cobalt-pos-2026-03-04`
- generated websites -> merchant subdomains or custom domains later
- Two7 campaign pages -> either nested under `cutmerchantcosts.com` or deployed as focused microsite paths if they prove useful

Shared services:

- Supabase for auth and core data
- Resend for transactional and campaign email
- Vercel for web deployment

- [ ] Standardize environment variable names across repos
- [ ] Define redirect URLs between marketing and app
- [ ] Add monitoring, analytics, and error tracking
- [ ] Add rate limits on auth, lead capture, and AI generation endpoints

## What To Avoid

- Do not move the whole product into a fresh monorepo before the product flow works.
- Do not merge `cloudpos-demo` into the active POS repo.
- Do not import `CobaltFullPlatform` whole-cloth.
- Do not keep both Clerk and Supabase auth in launch.
- Do not treat the current `ai-web-builder` root as production-ready.
- Do not replace `cmc-website` wholesale with the raw Two7 v7 JSX artifact.
- Do not copy the Two7 custom signup verification API as-is; use Supabase Auth for account verification and Resend for supporting email flows.

## Immediate Next Actions

1. Finish `Phase 0D-2` in `cobalt-pos-2026-03-04`.
2. Wire `cmc-website` CTAs into Supabase auth plus POS onboarding.
3. Define the shared website-generation schema in Supabase.
4. Extract the AI generation route/orchestrator into the POS app or a tightly-coupled service.
5. Add a `Website` module in the POS nav.
6. Extract only the contact and campaign slices from `CobaltFullPlatform`.
7. Mine the Two7 archive for:
   - self-serve website-builder copy
   - optional White Glove upsell copy
   - city landing page structure
   - onboarding question improvements

## Reference Files Worth Reusing

### From `cobalt-pos-2026-03-04`

- `PROGRESS.md`
- `VERSION_LOG.md`
- `src/pages/Onboarding.tsx`
- `src/contexts/AuthContext.tsx`
- `src/services/`

### From `cmc-website`

- `src/app/get-started/page.tsx`
- `src/app/website-builder/page.tsx`
- `src/lib/supabase.ts`

### From `ai-web-builder`

- `app/api/ai/generate/route.ts`
- `app/api/projects/route.ts`
- `prisma/schema.prisma`

### From `CobaltFullPlatform`

- `lib/services/campaign-service.ts`
- `lib/email-infrastructure/service.ts`
- `lib/leads/lead-scoring-service.ts`

### From Two7 archives

- `two7-platform-v7-merged-signup-flow.jsx`
- `two7-landing.zip`
- `two7-nextjs-project.tar.gz`
- `STROKE-01-Master-Blueprint.md`
- `STROKE-02-REVISED-SaaS-Copy.md`
- `STROKE-03-Technical-Architecture.md`
- `marketing Landing page - DFY Web Design Service.md`

## Bottom Line

The fastest correct path is:

- keep `cobalt-pos-2026-03-04` as the operating system
- keep `cmc-website` as the acquisition layer
- pull AI website generation into the POS as a module
- pull CRM/email into the POS as bounded features
- mine the Two7 archive for high-value marketing, onboarding, and local SEO patterns
- keep one auth system, one org model, and one shared database

That gets you to one connected platform without resetting the work that is already ahead.
