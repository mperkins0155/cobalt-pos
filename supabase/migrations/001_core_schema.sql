-- ============================================================
-- COBALT POS — Core Schema Migration
-- Covers: EPICs A, B, C, D, E, F, G, H, I, J, K, L, M
-- Target: Supabase (Postgres 15+)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- EPIC A: Tenancy, Auth, Roles, Audit
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  business_type VARCHAR(50), -- retail, restaurant, service
  phone VARCHAR(20),
  email VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  timezone VARCHAR(50) DEFAULT 'America/Chicago',
  currency VARCHAR(3) DEFAULT 'USD',
  logo_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner','manager','cashier','accountant')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  pin_code VARCHAR(6),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner','manager','cashier','accountant')),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  token VARCHAR(255) UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES profiles(id),
  action_type VARCHAR(50) NOT NULL, -- refund, void, inventory_adjust, role_change, setting_change, login, etc.
  entity_type VARCHAR(50), -- order, payment, item, profile, etc.
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(org_id, action_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(org_id, created_at DESC);

-- ============================================================
-- EPIC I: Locations (needed early — many tables FK to this)
-- ============================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  phone VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_location_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

CREATE TABLE device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  user_id UUID REFERENCES profiles(id),
  device_name VARCHAR(255),
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EPIC D: Taxes & Discounts
-- ============================================================

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  name VARCHAR(100) NOT NULL, -- e.g. "TX Sales Tax", "City Tax"
  rate NUMERIC(7,4) NOT NULL, -- e.g. 8.2500 for 8.25%
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  value NUMERIC(10,2) NOT NULL, -- percent value or fixed dollar amount
  code VARCHAR(50), -- promo code (nullable for manual discounts)
  is_active BOOLEAN DEFAULT TRUE,
  min_order_amount NUMERIC(10,2),
  max_discount_amount NUMERIC(10,2), -- cap for percentage discounts
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER, -- max total uses
  usage_count INTEGER DEFAULT 0,
  requires_role VARCHAR(20), -- NULL = any role, 'manager' = manager+ only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discounts_code ON discounts(org_id, code) WHERE code IS NOT NULL;

-- ============================================================
-- EPIC B: Catalog — Categories, Items, Variants, Modifiers
-- ============================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- hex color for POS grid
  icon VARCHAR(50), -- emoji or icon name
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  default_taxable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(20) NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service')),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  base_price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2),
  taxable BOOLEAN DEFAULT TRUE,
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL, -- override specific tax rate
  image_url TEXT,
  sold_by VARCHAR(10) DEFAULT 'each' CHECK (sold_by IN ('each','weight')),
  unit_label VARCHAR(20), -- e.g. "lb", "oz", "kg"
  track_inventory BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  price_override NUMERIC(10,2), -- NULL = use item base_price + adjustment
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  selection_type VARCHAR(20) NOT NULL DEFAULT 'choose_one' CHECK (selection_type IN ('choose_one','choose_many')),
  is_required BOOLEAN DEFAULT FALSE,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE item_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, modifier_group_id)
);

CREATE TABLE catalog_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  file_url TEXT,
  row_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Catalog indexes
CREATE INDEX idx_items_org ON items(org_id);
CREATE INDEX idx_items_category ON items(org_id, category_id);
CREATE INDEX idx_items_barcode ON items(org_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_items_sku ON items(org_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_variants_item ON variants(item_id);
CREATE INDEX idx_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;

-- ============================================================
-- EPIC G: Customers
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  email_opt_in BOOLEAN DEFAULT FALSE,
  sms_opt_in BOOLEAN DEFAULT FALSE,
  total_spent NUMERIC(12,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_org ON customers(org_id);
CREATE INDEX idx_customers_email ON customers(org_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(org_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_name ON customers(org_id, last_name, first_name);

-- ============================================================
-- EPIC C + E: Orders, Payments, Tips
-- ============================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  order_number VARCHAR(20) NOT NULL,
  order_type VARCHAR(20) DEFAULT 'in_store' CHECK (order_type IN ('in_store','dine_in','takeout','delivery')),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','pending','paid','voided','refunded','partially_refunded','failed')),

  -- Staff
  cashier_id UUID REFERENCES profiles(id),

  -- Customer
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),

  -- Money
  subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  tip_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(10,2) DEFAULT 0,
  refunded_amount NUMERIC(10,2) DEFAULT 0,

  -- References
  discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,

  -- Offline / idempotency
  client_order_uuid UUID UNIQUE,
  source VARCHAR(20) DEFAULT 'online' CHECK (source IN ('online','offline_sync')),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255),
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1, -- decimal for weight-based
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  is_custom_amount BOOLEAN DEFAULT FALSE,
  is_taxable BOOLEAN DEFAULT TRUE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_line_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_line_id UUID NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  modifier_option_id UUID REFERENCES modifier_options(id) ON DELETE SET NULL,
  modifier_name VARCHAR(255) NOT NULL,
  option_name VARCHAR(255) NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tip settings
CREATE TABLE tip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  mode VARCHAR(20) DEFAULT 'suggested' CHECK (mode IN ('off','suggested','custom')),
  suggested_percentages INTEGER[] DEFAULT '{15,18,20,25}',
  allow_custom BOOLEAN DEFAULT TRUE,
  tip_screen VARCHAR(20) DEFAULT 'before_payment' CHECK (tip_screen IN ('before_payment','after_payment')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (multi-payment per order for split tender)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_kind VARCHAR(10) DEFAULT 'sale' CHECK (payment_kind IN ('sale','refund')),
  tender_type VARCHAR(20) NOT NULL CHECK (tender_type IN ('card','cash','other')),
  amount NUMERIC(10,2) NOT NULL,
  tip_amount NUMERIC(10,2) DEFAULT 0,

  -- Cash specific
  cash_received NUMERIC(10,2),
  change_given NUMERIC(10,2),

  -- Card specific (Helcim)
  helcim_transaction_id VARCHAR(100),
  helcim_card_token VARCHAR(255),
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),

  -- Other (QR, etc.)
  external_reference VARCHAR(255),
  external_provider VARCHAR(50), -- cashapp, zelle, venmo, paypal

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded','voided')),
  error_message TEXT,
  idempotency_key UUID DEFAULT gen_random_uuid(),

  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order indexes
CREATE INDEX idx_orders_org ON orders(org_id);
CREATE INDEX idx_orders_location ON orders(org_id, location_id);
CREATE INDEX idx_orders_status ON orders(org_id, status);
CREATE INDEX idx_orders_created ON orders(org_id, created_at DESC);
CREATE INDEX idx_orders_number ON orders(org_id, order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_orders_client_uuid ON orders(client_order_uuid) WHERE client_order_uuid IS NOT NULL;
CREATE INDEX idx_order_lines_order ON order_lines(order_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);

-- ============================================================
-- EPIC F: Refunds, Voids, Reason Codes
-- ============================================================

CREATE TABLE reason_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reason_type VARCHAR(30) NOT NULL CHECK (reason_type IN ('refund','void','discount','inventory_adjustment','other')),
  code VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  reason_code_id UUID REFERENCES reason_codes(id),
  reason_text TEXT,
  total_refund_amount NUMERIC(10,2) NOT NULL,
  refund_type VARCHAR(20) DEFAULT 'full' CHECK (refund_type IN ('full','partial','line_item')),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refund_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  order_line_id UUID NOT NULL REFERENCES order_lines(id),
  quantity NUMERIC(10,3) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  restore_inventory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EPIC H: Inventory
-- ============================================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC(12,3) DEFAULT 0,
  low_stock_threshold NUMERIC(12,3),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, item_id, variant_id)
);

CREATE TABLE inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),
  item_id UUID NOT NULL REFERENCES items(id),
  variant_id UUID REFERENCES variants(id),
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('sale','refund','adjustment','receive','transfer','count','waste')),
  delta NUMERIC(12,3) NOT NULL, -- positive = increase, negative = decrease
  quantity_after NUMERIC(12,3),
  reference_id UUID, -- order_id, refund_id, PO id, etc.
  reference_type VARCHAR(30), -- order, refund, purchase_order, adjustment
  reason_code_id UUID REFERENCES reason_codes(id),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_location_item ON inventory(location_id, item_id, variant_id);
CREATE INDEX idx_inventory_events_item ON inventory_events(org_id, item_id, created_at DESC);

-- ============================================================
-- EPIC K: Cash Drawers, Shifts, Closeout, Reports
-- ============================================================

CREATE TABLE cash_drawers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'Main Drawer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),
  drawer_id UUID REFERENCES cash_drawers(id),
  opened_by UUID NOT NULL REFERENCES profiles(id),
  closed_by UUID REFERENCES profiles(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  counted_cash NUMERIC(10,2),
  expected_cash NUMERIC(10,2),
  over_short NUMERIC(10,2),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES cash_shifts(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('paid_in','paid_out','cash_sale','cash_refund')),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  reference_id UUID, -- payment_id or refund_id
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  filters JSONB DEFAULT '{}',
  file_url TEXT,
  file_format VARCHAR(10) DEFAULT 'csv',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EPIC G (cont): Receipt Deliveries
-- ============================================================

CREATE TABLE receipt_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('email','sms','print')),
  destination VARCHAR(255), -- email or phone
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  provider_message_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EPIC L: Hardware / Printer Profiles
-- ============================================================

CREATE TABLE printer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  name VARCHAR(100) NOT NULL,
  printer_type VARCHAR(20) NOT NULL CHECK (printer_type IN ('browser','network','bluetooth')),
  config JSONB DEFAULT '{}', -- IP, port, paper width, etc.
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EPIC M: Processor & Payout Ops
-- ============================================================

CREATE TABLE helcim_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  merchant_id VARCHAR(100),
  api_token TEXT, -- encrypted at application layer
  account_id VARCHAR(100),
  connected_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE processor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  processor VARCHAR(20) DEFAULT 'helcim',
  event_type VARCHAR(50) NOT NULL, -- charge.completed, refund.completed, dispute.created, etc.
  event_id VARCHAR(100), -- processor's event ID
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EPIC J: Offline Sync Events
-- ============================================================

CREATE TABLE sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_session_id UUID REFERENCES device_sessions(id),
  event_type VARCHAR(30) NOT NULL, -- order_sync, payment_sync, inventory_sync
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','synced','failed','conflict')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Get org_id for current user
CREATE OR REPLACE FUNCTION get_user_org_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Get role for current user
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Check if user has minimum role level
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, min_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE user_id = user_uuid
    AND CASE
      WHEN min_role = 'cashier' THEN role IN ('owner','manager','cashier')
      WHEN min_role = 'manager' THEN role IN ('owner','manager')
      WHEN min_role = 'owner' THEN role = 'owner'
      ELSE FALSE
    END
  );
$$;

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number(org UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  today_count INTEGER;
  date_part VARCHAR;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE org_id = org
  AND created_at::date = CURRENT_DATE;
  RETURN date_part || '-' || LPAD(today_count::text, 4, '0');
END;
$$;

-- ============================================================
-- Row-Level Security Policies
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organization: members can read their own org
CREATE POLICY org_select ON organizations FOR SELECT USING (
  id = get_user_org_id(auth.uid())
);

-- Profiles: members see their org's profiles
CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  org_id = get_user_org_id(auth.uid())
);

-- Standard org-scoped read policy (reusable pattern)
-- Applied to: locations, categories, items, variants, orders, etc.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'locations','categories','items','modifier_groups','orders',
    'payments','customers','tax_rates','discounts','refunds','inventory',
    'inventory_events','cash_shifts','audit_logs'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_org_select ON %I FOR SELECT USING (org_id = get_user_org_id(auth.uid()))',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_org_insert ON %I FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- Variants/modifier_options: accessible through parent
CREATE POLICY variants_select ON variants FOR SELECT USING (
  EXISTS(SELECT 1 FROM items WHERE items.id = variants.item_id AND items.org_id = get_user_org_id(auth.uid()))
);
CREATE POLICY modifier_options_select ON modifier_options FOR SELECT USING (
  EXISTS(SELECT 1 FROM modifier_groups WHERE modifier_groups.id = modifier_options.modifier_group_id AND modifier_groups.org_id = get_user_org_id(auth.uid()))
);

-- Manager+ write restrictions for sensitive tables
CREATE POLICY refunds_insert_mgr ON refunds FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'manager')
);
CREATE POLICY discounts_update_mgr ON discounts FOR UPDATE USING (
  has_role(auth.uid(), 'manager')
);

-- ============================================================
-- Seed: Default reason codes
-- ============================================================
-- (These get created per-org during onboarding)

-- ============================================================
-- Updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations','profiles','locations','categories','items','variants',
    'orders','customers','tax_rates','discounts','tip_settings',
    'printer_profiles','helcim_accounts','inventory'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl || '_upd', tbl
    );
  END LOOP;
END;
$$;



