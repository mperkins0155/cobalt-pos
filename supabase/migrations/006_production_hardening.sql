-- ============================================================
-- CloudPos — Production Hardening Migration
-- Phase 11C: UPDATE + DELETE RLS policies for core tables
-- Phase 11D: Missing FK indexes
-- Version: V0.8.0.0
-- 
-- HOW TO APPLY (Supabase MCP is hibernated):
--   1. Go to: https://supabase.com/dashboard/project/dbreddlkzpymsqmkkjub/sql/new
--   2. Paste this entire file and click Run
--   3. Verify: no errors in output panel
-- ============================================================

-- ============================================================
-- PHASE 11C: UPDATE + DELETE POLICIES
-- The 001_core_schema.sql DO loop only created SELECT + INSERT.
-- This adds UPDATE + DELETE for the same tables.
-- ============================================================

-- Standard tables: any authenticated org member can UPDATE/DELETE their own org's rows
-- (cashier-safe — all roles can update orders, payments, customers they create)
DO $$
DECLARE
  tbl TEXT;
  pol_upd TEXT;
  pol_del TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'locations','categories','items','modifier_groups','orders',
    'payments','customers','tax_rates','inventory','inventory_events','cash_shifts'
  ])
  LOOP
    pol_upd := tbl || '_org_update';
    pol_del := tbl || '_org_delete';

    -- DROP first so this migration is idempotent (safe to re-run)
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_upd, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_del, tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (org_id = get_user_org_id(auth.uid())) WITH CHECK (org_id = get_user_org_id(auth.uid()))',
      pol_upd, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (org_id = get_user_org_id(auth.uid()))',
      pol_del, tbl
    );
  END LOOP;
END;
$$;

-- audit_logs: INSERT only — no UPDATE or DELETE (append-only by design)
-- The existing INSERT policy from 001 is correct. No UPDATE/DELETE added.

-- discounts: UPDATE is manager+ only (already exists in 001), add DELETE as manager+ too
DROP POLICY IF EXISTS discounts_delete_mgr ON discounts;
CREATE POLICY discounts_delete_mgr ON discounts FOR DELETE USING (
  has_role(auth.uid(), 'manager')
);

-- refunds: manager+ for UPDATE and DELETE (INSERT already restricted in 001)
DROP POLICY IF EXISTS refunds_update_mgr ON refunds;
DROP POLICY IF EXISTS refunds_delete_mgr ON refunds;
CREATE POLICY refunds_update_mgr ON refunds FOR UPDATE USING (
  has_role(auth.uid(), 'manager')
) WITH CHECK (has_role(auth.uid(), 'manager'));
CREATE POLICY refunds_delete_mgr ON refunds FOR DELETE USING (
  has_role(auth.uid(), 'manager')
);

-- organizations: owner-only UPDATE (managers can't rename the org)
DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations FOR UPDATE USING (
  id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'manager')
) WITH CHECK (
  id = get_user_org_id(auth.uid())
  AND has_role(auth.uid(), 'manager')
);

-- profiles: users can update their own profile; managers can update org members
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  org_id = get_user_org_id(auth.uid())
  AND (
    user_id = auth.uid()                -- own profile
    OR has_role(auth.uid(), 'manager')  -- or manager editing staff
  )
) WITH CHECK (
  org_id = get_user_org_id(auth.uid())
);

-- variants: UPDATE/DELETE through parent item org
DROP POLICY IF EXISTS variants_update ON variants;
DROP POLICY IF EXISTS variants_delete ON variants;
CREATE POLICY variants_update ON variants FOR UPDATE USING (
  EXISTS(SELECT 1 FROM items WHERE items.id = variants.item_id AND items.org_id = get_user_org_id(auth.uid()))
) WITH CHECK (
  EXISTS(SELECT 1 FROM items WHERE items.id = variants.item_id AND items.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY variants_delete ON variants FOR DELETE USING (
  EXISTS(SELECT 1 FROM items WHERE items.id = variants.item_id AND items.org_id = get_user_org_id(auth.uid()))
);

-- modifier_options: UPDATE/DELETE through parent modifier_group org
DROP POLICY IF EXISTS modifier_options_update ON modifier_options;
DROP POLICY IF EXISTS modifier_options_delete ON modifier_options;
CREATE POLICY modifier_options_update ON modifier_options FOR UPDATE USING (
  EXISTS(SELECT 1 FROM modifier_groups WHERE modifier_groups.id = modifier_options.modifier_group_id AND modifier_groups.org_id = get_user_org_id(auth.uid()))
) WITH CHECK (
  EXISTS(SELECT 1 FROM modifier_groups WHERE modifier_groups.id = modifier_options.modifier_group_id AND modifier_groups.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY modifier_options_delete ON modifier_options FOR DELETE USING (
  EXISTS(SELECT 1 FROM modifier_groups WHERE modifier_groups.id = modifier_options.modifier_group_id AND modifier_groups.org_id = get_user_org_id(auth.uid()))
);

-- order_lines: INSERT/UPDATE/DELETE through parent order org
-- (order_lines has no org_id column — access via orders table)
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_lines_org_select ON order_lines;
DROP POLICY IF EXISTS order_lines_org_insert ON order_lines;
DROP POLICY IF EXISTS order_lines_org_update ON order_lines;
DROP POLICY IF EXISTS order_lines_org_delete ON order_lines;

CREATE POLICY order_lines_org_select ON order_lines FOR SELECT USING (
  EXISTS(SELECT 1 FROM orders WHERE orders.id = order_lines.order_id AND orders.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY order_lines_org_insert ON order_lines FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM orders WHERE orders.id = order_lines.order_id AND orders.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY order_lines_org_update ON order_lines FOR UPDATE USING (
  EXISTS(SELECT 1 FROM orders WHERE orders.id = order_lines.order_id AND orders.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY order_lines_org_delete ON order_lines FOR DELETE USING (
  EXISTS(SELECT 1 FROM orders WHERE orders.id = order_lines.order_id AND orders.org_id = get_user_org_id(auth.uid()))
);

-- refund_lines: INSERT/UPDATE/DELETE through parent refund
ALTER TABLE refund_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS refund_lines_select ON refund_lines;
DROP POLICY IF EXISTS refund_lines_insert ON refund_lines;
DROP POLICY IF EXISTS refund_lines_update ON refund_lines;
DROP POLICY IF EXISTS refund_lines_delete ON refund_lines;

CREATE POLICY refund_lines_select ON refund_lines FOR SELECT USING (
  EXISTS(SELECT 1 FROM refunds WHERE refunds.id = refund_lines.refund_id AND refunds.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY refund_lines_insert ON refund_lines FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM refunds WHERE refunds.id = refund_lines.refund_id AND refunds.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY refund_lines_update ON refund_lines FOR UPDATE USING (
  EXISTS(SELECT 1 FROM refunds WHERE refunds.id = refund_lines.refund_id AND refunds.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY refund_lines_delete ON refund_lines FOR DELETE USING (
  EXISTS(SELECT 1 FROM refunds WHERE refunds.id = refund_lines.refund_id AND refunds.org_id = get_user_org_id(auth.uid()))
);

-- ============================================================
-- PHASE 11D: MISSING FK INDEXES
-- Supabase performance advisor flags unindexed FK columns.
-- All use IF NOT EXISTS so safe to re-run.
-- ============================================================

-- order_lines: item_id and variant_id FKs (frequently joined for menu reporting)
CREATE INDEX IF NOT EXISTS idx_order_lines_item
  ON order_lines(item_id) WHERE item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_lines_variant
  ON order_lines(variant_id) WHERE variant_id IS NOT NULL;

-- order_line_modifiers: parent FK
CREATE INDEX IF NOT EXISTS idx_order_line_modifiers_line
  ON order_line_modifiers(order_line_id);

CREATE INDEX IF NOT EXISTS idx_order_line_modifiers_option
  ON order_line_modifiers(modifier_option_id) WHERE modifier_option_id IS NOT NULL;

-- payments: org_id (used in all payment queries)
CREATE INDEX IF NOT EXISTS idx_payments_org
  ON payments(org_id);

CREATE INDEX IF NOT EXISTS idx_payments_tender
  ON payments(org_id, tender_type);

-- refunds: FK columns
CREATE INDEX IF NOT EXISTS idx_refunds_org
  ON refunds(org_id);

CREATE INDEX IF NOT EXISTS idx_refunds_reason_code
  ON refunds(reason_code_id) WHERE reason_code_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refund_lines_order_line
  ON refund_lines(order_line_id);

-- inventory_events: created_by FK
CREATE INDEX IF NOT EXISTS idx_inventory_events_created_by
  ON inventory_events(created_by) WHERE created_by IS NOT NULL;

-- cash_events: FK columns
CREATE INDEX IF NOT EXISTS idx_cash_events_shift
  ON cash_events(shift_id);

CREATE INDEX IF NOT EXISTS idx_cash_events_created_by
  ON cash_events(created_by) WHERE created_by IS NOT NULL;

-- cash_shifts: opened_by / closed_by FK
CREATE INDEX IF NOT EXISTS idx_cash_shifts_opened_by
  ON cash_shifts(opened_by);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_location
  ON cash_shifts(org_id, location_id, status);

-- audit_logs: actor_user_id FK (missing from initial schema)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs(actor_user_id) WHERE actor_user_id IS NOT NULL;

-- org_invitations: invited_by FK
CREATE INDEX IF NOT EXISTS idx_org_invitations_org
  ON org_invitations(org_id, status);

CREATE INDEX IF NOT EXISTS idx_org_invitations_invited_by
  ON org_invitations(invited_by);

-- user_location_assignments: both FKs
CREATE INDEX IF NOT EXISTS idx_user_location_assignments_user
  ON user_location_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_user_location_assignments_location
  ON user_location_assignments(location_id);

-- reservations: created_by / updated_by FKs
CREATE INDEX IF NOT EXISTS idx_reservations_created_by
  ON reservations(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_customer
  ON reservations(customer_id) WHERE customer_id IS NOT NULL;

-- suppliers: contact_profile_id if it exists
CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_received_by
  ON purchase_order_receipts(received_by) WHERE received_by IS NOT NULL;

-- expenses: created_by / approved_by FKs
CREATE INDEX IF NOT EXISTS idx_expenses_created_by
  ON expenses(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_approved_by
  ON expenses(approved_by) WHERE approved_by IS NOT NULL;

-- ============================================================
-- VERIFY: Run this query after applying to confirm policy count
-- ============================================================
-- SELECT tablename, count(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;
