// ============================================================
// Cart & Checkout Types (Client-side state)
// ============================================================

import type { TenderType, OrderType, TipMode } from './database';

export interface CartItemModifier {
  modifier_group_id: string;
  modifier_group_name: string;
  option_id: string;
  option_name: string;
  price_adjustment: number;
}

export interface CartItem {
  id: string; // client-generated UUID for cart tracking
  item_id: string;
  item_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number; // base price (before modifiers)
  modifiers: CartItemModifier[];
  modifiers_total: number;
  line_total: number; // (unit_price + modifiers_total) * quantity
  is_taxable: boolean;
  is_custom_amount: boolean;
  notes?: string;
}

export interface CartDiscount {
  discount_id?: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  code?: string;
  computed_amount: number; // actual dollar amount off
}

export interface CartTotals {
  subtotal: number;
  discount_amount: number;
  taxable_subtotal: number;
  tax_amount: number;
  tip_amount: number;
  total: number;
  balance_due: number;
  payments_applied: number;
}

export interface CartState {
  items: CartItem[];
  order_type: OrderType;
  customer_id?: string;
  customer_name?: string;
  discount?: CartDiscount;
  tax_rate: number; // percentage, e.g. 8.25
  tip_amount: number;
  notes?: string;
  totals: CartTotals;
  saved_ticket_id?: string; // if resuming an open tab
}

// ---- Payment Flow ----

export interface PaymentEntry {
  id: string; // client UUID
  tender_type: TenderType;
  amount: number;
  tip_amount: number;
  // Cash
  cash_received?: number;
  change_given?: number;
  // Card
  helcim_checkout_token?: string;
  // Other
  external_reference?: string;
  external_provider?: string;
}

export interface CheckoutState {
  cart: CartState;
  payments: PaymentEntry[];
  tip_mode: TipMode;
  suggested_tip_percentages: number[];
  selected_tip_percentage?: number;
  custom_tip_amount?: number;
}

// ---- Saved Tickets (Open Tabs) ----

export interface SavedTicket {
  id: string; // order.id in DB
  order_number: string;
  customer_name?: string;
  order_type: OrderType;
  item_count: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

// ---- Barcode Scan Result ----

export interface BarcodeScanResult {
  found: boolean;
  item_id?: string;
  variant_id?: string;
  item_name?: string;
  variant_name?: string;
  price?: number;
  barcode: string;
}
