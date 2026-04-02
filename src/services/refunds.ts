import { supabase } from '@/lib/supabase';
import type { Refund, RefundLine, RefundType, Order, Payment, TenderType } from '@/types/database';
import { v4 as uuid } from 'uuid';
import { round2 } from '@/lib/calculations';

export function resolveRefundTenderType(payments: Pick<Payment, 'payment_kind' | 'tender_type' | 'created_at'>[]): TenderType {
  const salePayments = payments
    .filter((payment) => payment.payment_kind === 'sale')
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  return salePayments[0]?.tender_type || 'other';
}

export const RefundService = {
  /** Full refund of an order */
  async refundFull(params: {
    orgId: string;
    orderId: string;
    createdBy: string;
    reasonCodeId?: string;
    reasonText?: string;
    restoreInventory?: boolean;
  }): Promise<Refund> {
    // Get order with lines
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, lines:order_lines(*), payments(*)')
      .eq('id', params.orderId)
      .single();

    if (orderErr || !order) throw new Error('Order not found');
    if (order.status !== 'paid') throw new Error('Can only refund paid orders');

    const refundAmount = round2(order.total_amount - order.refunded_amount);
    if (refundAmount <= 0) throw new Error('Order already fully refunded');

    const refundId = uuid();

    // Create refund
    const { data: refund, error: refErr } = await supabase
      .from('refunds')
      .insert({
        id: refundId,
        org_id: params.orgId,
        order_id: params.orderId,
        created_by: params.createdBy,
        reason_code_id: params.reasonCodeId,
        reason_text: params.reasonText,
        total_refund_amount: refundAmount,
        refund_type: 'full' as RefundType,
        status: 'completed',
      })
      .select()
      .single();

    if (refErr) throw refErr;

    // Create refund lines for all order lines
    const refundLines = (order.lines || []).map((line: any) => ({
      id: uuid(),
      refund_id: refundId,
      order_line_id: line.id,
      quantity: line.quantity,
      amount: round2(line.subtotal),
      restore_inventory: params.restoreInventory ?? true,
    }));

    if (refundLines.length > 0) {
      await supabase.from('refund_lines').insert(refundLines);
    }

    // Update order
    await supabase.from('orders').update({
      status: 'refunded',
      refunded_amount: round2(order.refunded_amount + refundAmount),
    }).eq('id', params.orderId);

    // Record refund payment
    await supabase.from('payments').insert({
      id: uuid(),
      org_id: params.orgId,
        order_id: params.orderId,
        payment_kind: 'refund',
        tender_type: resolveRefundTenderType(order.payments || []),
        amount: -refundAmount,
        status: 'completed',
        processed_at: new Date().toISOString(),
      idempotency_key: uuid(),
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: params.orgId,
      actor_user_id: params.createdBy,
      action_type: 'refund',
      entity_type: 'order',
      entity_id: params.orderId,
      metadata: { refund_id: refundId, amount: refundAmount, type: 'full' },
    });

    return refund as Refund;
  },

  /** Partial / line-item refund */
  async refundPartial(params: {
    orgId: string;
    orderId: string;
    createdBy: string;
    reasonCodeId?: string;
    reasonText?: string;
    lines: Array<{
      order_line_id: string;
      quantity: number;
      amount: number;
      restore_inventory?: boolean;
    }>;
  }): Promise<Refund> {
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('id', params.orderId)
      .single();

    if (orderErr || !order) throw new Error('Order not found');
    if (!['paid', 'partially_refunded'].includes(order.status)) {
      throw new Error('Can only refund paid orders');
    }

    const refundAmount = round2(params.lines.reduce((s, l) => s + l.amount, 0));
    const maxRefundable = round2(order.total_amount - order.refunded_amount);
    if (refundAmount > maxRefundable) throw new Error('Refund exceeds remaining amount');

    const refundId = uuid();
    const isFullyRefunded = round2(order.refunded_amount + refundAmount) >= order.total_amount - 0.01;

    // Create refund
    const { data: refund, error: refErr } = await supabase
      .from('refunds')
      .insert({
        id: refundId,
        org_id: params.orgId,
        order_id: params.orderId,
        created_by: params.createdBy,
        reason_code_id: params.reasonCodeId,
        reason_text: params.reasonText,
        total_refund_amount: refundAmount,
        refund_type: (params.lines.length === 1 ? 'line_item' : 'partial') as RefundType,
        status: 'completed',
      })
      .select()
      .single();

    if (refErr) throw refErr;

    // Create refund lines
    const refundLines = params.lines.map(l => ({
      id: uuid(),
      refund_id: refundId,
      order_line_id: l.order_line_id,
      quantity: l.quantity,
      amount: round2(l.amount),
      restore_inventory: l.restore_inventory ?? true,
    }));

    await supabase.from('refund_lines').insert(refundLines);

    // Update order
    await supabase.from('orders').update({
      status: isFullyRefunded ? 'refunded' : 'partially_refunded',
      refunded_amount: round2(order.refunded_amount + refundAmount),
    }).eq('id', params.orderId);

    // Record refund payment
    await supabase.from('payments').insert({
      id: uuid(),
      org_id: params.orgId,
      order_id: params.orderId,
      payment_kind: 'refund',
      tender_type: resolveRefundTenderType(order.payments || []),
      amount: -refundAmount,
      status: 'completed',
      processed_at: new Date().toISOString(),
      idempotency_key: uuid(),
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: params.orgId,
      actor_user_id: params.createdBy,
      action_type: 'refund',
      entity_type: 'order',
      entity_id: params.orderId,
      metadata: { refund_id: refundId, amount: refundAmount, type: 'partial', line_count: params.lines.length },
    });

    return refund as Refund;
  },

  /** Get refunds for an order */
  async getOrderRefunds(orderId: string): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select('*, lines:refund_lines(*), reason_code:reason_codes(*), created_by_profile:profiles!refunds_created_by_fkey(*)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Refund[];
  },

  /** Get reason codes */
  async getReasonCodes(orgId: string, type?: string): Promise<any[]> {
    let query = supabase
      .from('reason_codes')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order');

    if (type) query = query.eq('reason_type', type);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};
