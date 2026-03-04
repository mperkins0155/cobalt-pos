-- ============================================================
-- COBALT POS — Missing Modules (Reservations, Purchasing, Expenses)
-- Idempotent migration
-- ============================================================

-- ============================================================
-- Enums
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    CREATE TYPE reservation_status AS ENUM ('pending','confirmed','seated','completed','cancelled','no_show');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_source') THEN
    CREATE TYPE reservation_source AS ENUM ('phone','walk_in','online','app','other');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dining_table_status') THEN
    CREATE TYPE dining_table_status AS ENUM ('available','reserved','occupied','cleaning','inactive');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
    CREATE TYPE purchase_order_status AS ENUM ('draft','submitted','approved','partially_received','received','cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
    CREATE TYPE quotation_status AS ENUM ('draft','sent','accepted','rejected','expired','converted');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
    CREATE TYPE expense_status AS ENUM ('draft','submitted','approved','paid','rejected','void');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_payment_method') THEN
    CREATE TYPE expense_payment_method AS ENUM ('cash','card','bank_transfer','check','other');
  END IF;
END $$;

-- ============================================================
-- Dining floors, tables, reservations
-- ============================================================

CREATE TABLE IF NOT EXISTS dining_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, name)
);

CREATE TABLE IF NOT EXISTS dining_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES dining_floors(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2 CHECK (capacity > 0),
  min_capacity INTEGER,
  status dining_table_status NOT NULL DEFAULT 'available',
  shape VARCHAR(20),
  position_x NUMERIC(10,2),
  position_y NUMERIC(10,2),
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, name)
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES dining_floors(id) ON DELETE SET NULL,
  table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  reservation_number VARCHAR(30) NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  source reservation_source NOT NULL DEFAULT 'walk_in',
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  guest_name VARCHAR(255),
  guest_phone VARCHAR(20),
  guest_email VARCHAR(255),
  reserved_for TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 90 CHECK (duration_minutes > 0),
  arrived_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  special_requests TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, reservation_number)
);

-- ============================================================
-- Suppliers, quotations, purchase orders
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  website TEXT,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  payment_terms VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  quotation_number VARCHAR(30) NOT NULL,
  status quotation_status NOT NULL DEFAULT 'draft',
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  currency VARCHAR(3) DEFAULT 'USD',
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, quotation_number)
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  po_number VARCHAR(30) NOT NULL,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  currency VARCHAR(3) DEFAULT 'USD',
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  closed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, po_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity_ordered NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity_ordered > 0),
  quantity_received NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  receipt_number VARCHAR(30) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID REFERENCES profiles(id),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, receipt_number)
);

-- ============================================================
-- Expense categories and expenses
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  expense_number VARCHAR(30) NOT NULL,
  status expense_status NOT NULL DEFAULT 'draft',
  payment_method expense_payment_method DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reimbursable BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  attachment_url TEXT,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, expense_number)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dining_floors_org_location ON dining_floors(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_org_location ON dining_tables(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_floor ON dining_tables(floor_id) WHERE floor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dining_tables_status ON dining_tables(org_id, location_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_org_location ON reservations(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_status_time ON reservations(org_id, status, reserved_for DESC);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_loc ON suppliers(org_id, location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_org_status ON quotations(org_id, status, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status ON purchase_orders(org_id, status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(org_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_receipts_org_po ON purchase_order_receipts(org_id, purchase_order_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_status_date ON expenses(org_id, status, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org_location ON expenses(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(org_id, supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(org_id, category_id) WHERE category_id IS NOT NULL;

-- ============================================================
-- Updated_at triggers (idempotent)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  trg TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'dining_floors','dining_tables','reservations',
    'suppliers','quotations','purchase_orders',
    'expense_categories','expenses'
  ])
  LOOP
    trg := tbl || '_upd';
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE t.tgname = trg
        AND c.relname = tbl
        AND n.nspname = 'public'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        trg, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE dining_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  pol TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'dining_floors','dining_tables','reservations','suppliers',
    'quotations','purchase_orders','purchase_order_receipts',
    'expense_categories','expenses'
  ])
  LOOP
    pol := tbl || '_org_select';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = pol) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (org_id = get_user_org_id(auth.uid()))', pol, tbl);
    END IF;

    pol := tbl || '_org_insert';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = pol) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (org_id = get_user_org_id(auth.uid()))', pol, tbl);
    END IF;

    pol := tbl || '_org_update';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = pol) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (org_id = get_user_org_id(auth.uid())) WITH CHECK (org_id = get_user_org_id(auth.uid()))', pol, tbl);
    END IF;

    pol := tbl || '_org_delete';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = pol) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (org_id = get_user_org_id(auth.uid()))', pol, tbl);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotation_items' AND policyname = 'quotation_items_org_select') THEN
    CREATE POLICY quotation_items_org_select ON quotation_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM quotations q
          WHERE q.id = quotation_items.quotation_id
            AND q.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotation_items' AND policyname = 'quotation_items_org_insert') THEN
    CREATE POLICY quotation_items_org_insert ON quotation_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM quotations q
          WHERE q.id = quotation_items.quotation_id
            AND q.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotation_items' AND policyname = 'quotation_items_org_update') THEN
    CREATE POLICY quotation_items_org_update ON quotation_items
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM quotations q
          WHERE q.id = quotation_items.quotation_id
            AND q.org_id = get_user_org_id(auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM quotations q
          WHERE q.id = quotation_items.quotation_id
            AND q.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotation_items' AND policyname = 'quotation_items_org_delete') THEN
    CREATE POLICY quotation_items_org_delete ON quotation_items
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM quotations q
          WHERE q.id = quotation_items.quotation_id
            AND q.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_org_select') THEN
    CREATE POLICY purchase_order_items_org_select ON purchase_order_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM purchase_orders po
          WHERE po.id = purchase_order_items.purchase_order_id
            AND po.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_org_insert') THEN
    CREATE POLICY purchase_order_items_org_insert ON purchase_order_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM purchase_orders po
          WHERE po.id = purchase_order_items.purchase_order_id
            AND po.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_org_update') THEN
    CREATE POLICY purchase_order_items_org_update ON purchase_order_items
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM purchase_orders po
          WHERE po.id = purchase_order_items.purchase_order_id
            AND po.org_id = get_user_org_id(auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM purchase_orders po
          WHERE po.id = purchase_order_items.purchase_order_id
            AND po.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_order_items' AND policyname = 'purchase_order_items_org_delete') THEN
    CREATE POLICY purchase_order_items_org_delete ON purchase_order_items
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM purchase_orders po
          WHERE po.id = purchase_order_items.purchase_order_id
            AND po.org_id = get_user_org_id(auth.uid())
        )
      );
  END IF;
END $$;

