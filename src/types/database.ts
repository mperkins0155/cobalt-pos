// ============================================================
// Cobalt POS — Core Database Types
// Auto-aligned with supabase/migrations/001_core_schema.sql
// ============================================================

// ---- Enums ----

export type AppRole = 'owner' | 'manager' | 'cashier' | 'accountant';
export type OrderStatus = 'open' | 'pending' | 'paid' | 'voided' | 'refunded' | 'partially_refunded' | 'failed';
export type OrderType = 'in_store' | 'dine_in' | 'takeout' | 'delivery';
export type TenderType = 'card' | 'cash' | 'other';
export type PaymentKind = 'sale' | 'refund';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'voided';
export type DiscountType = 'percentage' | 'fixed';
export type ReasonType = 'refund' | 'void' | 'discount' | 'inventory_adjustment' | 'other';
export type InventoryEventType = 'sale' | 'refund' | 'adjustment' | 'receive' | 'transfer' | 'count' | 'waste';
export type CashEventType = 'paid_in' | 'paid_out' | 'cash_sale' | 'cash_refund';
export type RefundType = 'full' | 'partial' | 'line_item';
export type TipMode = 'off' | 'suggested' | 'custom';
export type SoldBy = 'each' | 'weight';
export type ItemType = 'product' | 'service';
export type OrgStatus = 'active' | 'suspended' | 'cancelled';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ShiftStatus = 'open' | 'closed';
export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
export type TableStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'inactive';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'cancelled';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected' | 'void';

// ---- Core Entities ----

export interface Organization {
  id: string;
  name: string;
  slug: string;
  business_type?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  timezone: string;
  currency: string;
  logo_url?: string;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  org_id: string;
  role: AppRole;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  pin_code?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgInvitation {
  id: string;
  org_id: string;
  email: string;
  role: AppRole;
  invited_by: string;
  token: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_user_id?: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  // Joined
  actor?: Profile;
}

// ---- Locations ----

export interface Location {
  id: string;
  org_id: string;
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Catalog ----

export interface Category {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  default_taxable: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  item_count?: number;
}

export interface Item {
  id: string;
  org_id: string;
  category_id?: string;
  name: string;
  description?: string;
  item_type: ItemType;
  sku?: string;
  barcode?: string;
  base_price: number;
  cost?: number;
  taxable: boolean;
  tax_rate_id?: string;
  image_url?: string;
  sold_by: SoldBy;
  unit_label?: string;
  track_inventory: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  variants?: Variant[];
  modifier_groups?: ModifierGroupWithOptions[];
}

export interface Variant {
  id: string;
  item_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price_override?: number;
  price_adjustment: number;
  cost?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ModifierGroup {
  id: string;
  org_id: string;
  name: string;
  selection_type: 'choose_one' | 'choose_many';
  is_required: boolean;
  min_selections: number;
  max_selections?: number;
  sort_order: number;
  created_at: string;
}

export interface ModifierOption {
  id: string;
  modifier_group_id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ModifierGroupWithOptions extends ModifierGroup {
  options: ModifierOption[];
}

// ---- Tax & Discounts ----

export interface TaxRate {
  id: string;
  org_id: string;
  location_id?: string;
  name: string;
  rate: number; // e.g. 8.25 for 8.25%
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: string;
  org_id: string;
  name: string;
  discount_type: DiscountType;
  value: number;
  code?: string;
  is_active: boolean;
  min_order_amount?: number;
  max_discount_amount?: number;
  starts_at?: string;
  expires_at?: string;
  usage_limit?: number;
  usage_count: number;
  requires_role?: AppRole;
  created_at: string;
  updated_at: string;
}

// ---- Customers ----

export interface Customer {
  id: string;
  org_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags: string[];
  email_opt_in: boolean;
  sms_opt_in: boolean;
  total_spent: number;
  visit_count: number;
  last_visit_at?: string;
  created_at: string;
  updated_at: string;
  // Computed
  full_name?: string;
}

// ---- Reservations & Floor Plan ----

export interface Floor {
  id: string;
  org_id: string;
  location_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  tables?: DiningTable[];
}

export interface DiningTable {
  id: string;
  org_id: string;
  location_id: string;
  floor_id?: string;
  name: string;
  capacity: number;
  status: TableStatus;
  min_capacity?: number;
  shape?: string;
  position_x?: number;
  position_y?: number;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  floor?: Floor;
}

export interface Reservation {
  id: string;
  org_id: string;
  location_id?: string;
  floor_id?: string;
  table_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  reserved_for: string;
  reservation_number: string;
  status: ReservationStatus;
  source?: 'phone' | 'walk_in' | 'online' | 'app' | 'other';
  duration_minutes?: number;
  notes?: string;
  special_requests?: string;
  created_by?: string;
  updated_by?: string;
  arrived_at?: string;
  seated_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined
  table?: DiningTable;
  customer?: Customer;
}

// ---- Orders ----

export interface Order {
  id: string;
  org_id: string;
  location_id?: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  cashier_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  tip_amount: number;
  total_amount: number;
  balance_due: number;
  refunded_amount: number;
  discount_id?: string;
  tax_rate_id?: string;
  client_order_uuid?: string;
  source: 'online' | 'offline_sync';
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Joined
  lines?: OrderLine[];
  payments?: Payment[];
  customer?: Customer;
  cashier?: Profile;
  refunds?: Refund[];
}

export interface OrderLine {
  id: string;
  order_id: string;
  item_id?: string;
  variant_id?: string;
  item_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  is_custom_amount: boolean;
  is_taxable: boolean;
  notes?: string;
  sort_order: number;
  created_at: string;
  // Joined
  modifiers?: OrderLineModifier[];
}

export interface OrderLineModifier {
  id: string;
  order_line_id: string;
  modifier_option_id?: string;
  modifier_name: string;
  option_name: string;
  price_adjustment: number;
  created_at: string;
}

// ---- Payments ----

export interface Payment {
  id: string;
  org_id: string;
  order_id: string;
  payment_kind: PaymentKind;
  tender_type: TenderType;
  amount: number;
  tip_amount: number;
  cash_received?: number;
  change_given?: number;
  helcim_transaction_id?: string;
  helcim_card_token?: string;
  card_last_four?: string;
  card_brand?: string;
  external_reference?: string;
  external_provider?: string;
  status: PaymentStatus;
  error_message?: string;
  idempotency_key: string;
  processed_at?: string;
  created_at: string;
}

// ---- Refunds ----

export interface ReasonCode {
  id: string;
  org_id: string;
  reason_type: ReasonType;
  code: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Refund {
  id: string;
  org_id: string;
  order_id: string;
  created_by: string;
  reason_code_id?: string;
  reason_text?: string;
  total_refund_amount: number;
  refund_type: RefundType;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  // Joined
  reason_code?: ReasonCode;
  lines?: RefundLine[];
  created_by_profile?: Profile;
}

export interface RefundLine {
  id: string;
  refund_id: string;
  order_line_id: string;
  quantity: number;
  amount: number;
  restore_inventory: boolean;
  created_at: string;
}

// ---- Inventory ----

export interface InventoryRecord {
  id: string;
  org_id: string;
  location_id: string;
  item_id: string;
  variant_id?: string;
  quantity_on_hand: number;
  low_stock_threshold?: number;
  updated_at: string;
  // Joined
  item?: Item;
  variant?: Variant;
  location?: Location;
}

export interface InventoryEvent {
  id: string;
  org_id: string;
  location_id: string;
  item_id: string;
  variant_id?: string;
  event_type: InventoryEventType;
  delta: number;
  quantity_after?: number;
  reference_id?: string;
  reference_type?: string;
  reason_code_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// ---- Suppliers, Quotations & Purchasing ----

export interface Supplier {
  id: string;
  org_id: string;
  location_id?: string;
  name: string;
  code?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotationLine {
  id: string;
  quotation_id: string;
  item_id?: string;
  variant_id?: string;
  item_name: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
  // Joined
  item?: Item;
  variant?: Variant;
}

export interface Quotation {
  id: string;
  org_id: string;
  supplier_id?: string;
  location_id?: string;
  quotation_number: string;
  status: QuotationStatus;
  quote_date: string;
  valid_until?: string;
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  sent_to_email?: string;
  sent_at?: string;
  sent_by?: string;
  sent_provider?: string;
  sent_provider_message_id?: string;
  accepted_at?: string;
  rejected_at?: string;
  status_reason?: string;
  status_changed_at?: string;
  status_changed_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  lines?: QuotationLine[];
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  item_id?: string;
  variant_id?: string;
  item_name: string;
  sku?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
  // Joined
  item?: Item;
  variant?: Variant;
}

export interface PurchaseOrder {
  id: string;
  org_id: string;
  supplier_id?: string;
  location_id?: string;
  quotation_id?: string;
  po_number: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date?: string;
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  closed_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  lines?: PurchaseOrderLine[];
}

// ---- Expenses ----

export interface ExpenseCategory {
  id: string;
  org_id: string;
  name: string;
  code?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  org_id: string;
  location_id?: string;
  supplier_id?: string;
  category_id?: string;
  expense_number?: string;
  expense_date: string;
  due_date?: string;
  status: ExpenseStatus;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'check' | 'other';
  reimbursable: boolean;
  notes?: string;
  attachment_url?: string;
  created_by?: string;
  approved_by?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  category?: ExpenseCategory;
}

// ---- Cash Management ----

export interface CashDrawer {
  id: string;
  org_id: string;
  location_id: string;
  name: string;
  created_at: string;
}

export interface CashShift {
  id: string;
  org_id: string;
  location_id: string;
  drawer_id?: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  opening_cash: number;
  counted_cash?: number;
  expected_cash?: number;
  over_short?: number;
  status: ShiftStatus;
  notes?: string;
  created_at: string;
  // Joined
  opened_by_profile?: Profile;
  closed_by_profile?: Profile;
  events?: CashEvent[];
}

export interface CashEvent {
  id: string;
  org_id: string;
  shift_id: string;
  event_type: CashEventType;
  amount: number;
  reason?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
}

// ---- Tip Settings ----

export interface TipSettings {
  id: string;
  org_id: string;
  location_id?: string;
  mode: TipMode;
  suggested_percentages: number[];
  allow_custom: boolean;
  tip_screen: 'before_payment' | 'after_payment';
  created_at: string;
  updated_at: string;
}

// ---- Hardware ----

export interface PrinterProfile {
  id: string;
  org_id: string;
  location_id?: string;
  name: string;
  printer_type: 'browser' | 'network' | 'bluetooth';
  config: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Processor ----

export interface HelcimAccount {
  id: string;
  org_id: string;
  merchant_id?: string;
  api_token?: string;
  account_id?: string;
  connected_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}
