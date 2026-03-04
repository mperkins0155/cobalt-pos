import { supabase } from '@/lib/supabase';
import type { Order, OrderLine, OrderLineModifier } from '@/types/database';
import type { CartState, PaymentEntry } from '@/types/cart';
import { v4 as uuid } from 'uuid';

export const OrderService = {
  /** Create a new order from cart state */
  async createOrder(
    orgId: string,
    locationId: string | undefined,
    cashierId: string,
    cart: CartState,
    status: 'open' | 'pending' | 'paid' = 'pending'
  ): Promise<Order> {
    // Generate order number server-side via RPC
    const { data: orderNumber } = await supabase.rpc('generate_order_number', { org: orgId });

    const orderId = uuid();
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        org_id: orgId,
        location_id: locationId,
        order_number: orderNumber || `${Date.now()}`,
        order_type: cart.order_type,
        status,
        cashier_id: cashierId,
        customer_id: cart.customer_id,
        customer_name: cart.customer_name,
        subtotal_amount: cart.totals.subtotal,
        discount_amount: cart.totals.discount_amount,
        tax_amount: cart.totals.tax_amount,
        tip_amount: cart.totals.tip_amount,
        total_amount: cart.totals.total,
        balance_due: cart.totals.balance_due,
        discount_id: cart.discount?.discount_id,
        notes: cart.notes,
        client_order_uuid: uuid(),
      })
      .select()
      .single();

    if (error) throw error;

    // Insert order lines
    const lines = cart.items.map((item, idx) => ({
      id: uuid(),
      order_id: orderId,
      item_id: item.item_id,
      variant_id: item.variant_id,
      item_name: item.item_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      unit_price: item.unit_price + item.modifiers_total,
      subtotal: item.line_total,
      is_custom_amount: item.is_custom_amount,
      is_taxable: item.is_taxable,
      notes: item.notes,
      sort_order: idx,
    }));

    const { error: linesError } = await supabase.from('order_lines').insert(lines);
    if (linesError) throw linesError;

    // Insert line modifiers
    const allModifiers = cart.items.flatMap((item, idx) =>
      item.modifiers.map(mod => ({
        id: uuid(),
        order_line_id: lines[idx].id,
        modifier_option_id: mod.option_id,
        modifier_name: mod.modifier_group_name,
        option_name: mod.option_name,
        price_adjustment: mod.price_adjustment,
      }))
    );

    if (allModifiers.length > 0) {
      const { error: modError } = await supabase.from('order_line_modifiers').insert(allModifiers);
      if (modError) throw modError;
    }

    return order as Order;
  },

  /** Save cart as open ticket (tab) */
  async saveAsTicket(
    orgId: string,
    locationId: string | undefined,
    cashierId: string,
    cart: CartState
  ): Promise<Order> {
    return this.createOrder(orgId, locationId, cashierId, cart, 'open');
  },

  /** Load open tickets for location */
  async getOpenTickets(orgId: string, locationId?: string): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*, order_lines(count)')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (locationId) query = query.eq('location_id', locationId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Order[];
  },

  /** Load a full order with lines and payments */
  async getOrderWithDetails(orderId: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        lines:order_lines(*, modifiers:order_line_modifiers(*)),
        payments(*),
        customer:customers(*),
        cashier:profiles!orders_cashier_id_fkey(*),
        refunds(*, lines:refund_lines(*), reason_code:reason_codes(*))
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data as Order;
  },

  /** Update order status */
  async updateStatus(orderId: string, status: Order['status'], updates?: Partial<Order>): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        ...updates,
        ...(status === 'paid' ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId);

    if (error) throw error;
  },

  /** Void an order (must be open or pending) */
  async voidOrder(orderId: string, actorId: string, orgId: string, reason?: string): Promise<void> {
    // Update order
    await this.updateStatus(orderId, 'voided');

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      actor_user_id: actorId,
      action_type: 'void',
      entity_type: 'order',
      entity_id: orderId,
      metadata: { reason },
    });
  },

  /** List orders with filters */
  async listOrders(params: {
    orgId: string;
    locationId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
    cashierId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; count: number }> {
    let query = supabase
      .from('orders')
      .select('*, customer:customers(first_name, last_name), cashier:profiles!orders_cashier_id_fkey(first_name, last_name)', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('created_at', { ascending: false });

    if (params.locationId) query = query.eq('location_id', params.locationId);
    if (params.status) query = query.eq('status', params.status);
    if (params.dateFrom) query = query.gte('created_at', params.dateFrom);
    if (params.dateTo) query = query.lte('created_at', params.dateTo);
    if (params.customerId) query = query.eq('customer_id', params.customerId);
    if (params.cashierId) query = query.eq('cashier_id', params.cashierId);
    if (params.limit) query = query.limit(params.limit);
    if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { orders: (data || []) as Order[], count: count || 0 };
  },
};
