import { supabase } from '@/lib/supabase';
import type { CashShift, CashEvent } from '@/types/database';
import { v4 as uuid } from 'uuid';
import { round2 } from '@/lib/calculations';

export interface SalesSummary {
  gross_sales: number;
  discounts: number;
  net_sales: number;
  tax_collected: number;
  tips: number;
  refunds: number;
  total_collected: number;
  order_count: number;
  avg_order_value: number;
  payment_breakdown: { tender_type: string; total: number; count: number }[];
}

export interface CloseoutReport extends SalesSummary {
  shift: CashShift;
  opening_cash: number;
  cash_sales: number;
  cash_refunds: number;
  paid_in: number;
  paid_out: number;
  expected_cash: number;
  counted_cash: number;
  over_short: number;
}

export const ReportingService = {
  /** Open a new cash shift */
  async openShift(params: {
    orgId: string;
    locationId: string;
    openedBy: string;
    openingCash: number;
    drawerId?: string;
  }): Promise<CashShift> {
    const { data, error } = await supabase
      .from('cash_shifts')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        opened_by: params.openedBy,
        opening_cash: round2(params.openingCash),
        drawer_id: params.drawerId,
        status: 'open',
      })
      .select()
      .single();
    if (error) throw error;
    return data as CashShift;
  },

  /** Get current open shift */
  async getCurrentShift(orgId: string, locationId: string): Promise<CashShift | null> {
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as CashShift | null;
  },

  /** Record paid in / paid out */
  async recordCashEvent(params: {
    orgId: string;
    shiftId: string;
    eventType: 'paid_in' | 'paid_out';
    amount: number;
    reason?: string;
    createdBy: string;
  }): Promise<CashEvent> {
    const { data, error } = await supabase
      .from('cash_events')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        shift_id: params.shiftId,
        event_type: params.eventType,
        amount: round2(params.amount),
        reason: params.reason,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CashEvent;
  },

  /** Close shift / Z Report */
  async closeShift(params: {
    shiftId: string;
    closedBy: string;
    countedCash: number;
  }): Promise<CloseoutReport> {
    // Get shift
    const { data: shift, error: shiftErr } = await supabase
      .from('cash_shifts').select('*').eq('id', params.shiftId).single();
    if (shiftErr || !shift) throw new Error('Shift not found');

    // Get cash events for shift
    const { data: events } = await supabase
      .from('cash_events').select('*').eq('shift_id', params.shiftId);

    const cashEvents = (events || []) as CashEvent[];
    const paidIn = cashEvents.filter(e => e.event_type === 'paid_in').reduce((s, e) => s + e.amount, 0);
    const paidOut = cashEvents.filter(e => e.event_type === 'paid_out').reduce((s, e) => s + e.amount, 0);

    // Get orders during shift period
    const salesSummary = await this.getSalesSummary(
      shift.org_id, shift.location_id, shift.opened_at, new Date().toISOString()
    );

    // Calculate expected cash
    const cashPayments = salesSummary.payment_breakdown.find(p => p.tender_type === 'cash');
    const cashSales = cashPayments?.total || 0;
    const expectedCash = round2(shift.opening_cash + cashSales + paidIn - paidOut - salesSummary.refunds);
    const overShort = round2(params.countedCash - expectedCash);

    // Close shift
    const { error: closeErr } = await supabase
      .from('cash_shifts')
      .update({
        closed_by: params.closedBy,
        closed_at: new Date().toISOString(),
        counted_cash: round2(params.countedCash),
        expected_cash: expectedCash,
        over_short: overShort,
        status: 'closed',
      })
      .eq('id', params.shiftId);

    if (closeErr) throw closeErr;

    return {
      ...salesSummary,
      shift: { ...shift, status: 'closed' } as CashShift,
      opening_cash: shift.opening_cash,
      cash_sales: cashSales,
      cash_refunds: 0,
      paid_in: paidIn,
      paid_out: paidOut,
      expected_cash: expectedCash,
      counted_cash: params.countedCash,
      over_short: overShort,
    };
  },

  /** Sales summary for a date range */
  async getSalesSummary(
    orgId: string,
    locationId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<SalesSummary> {
    let query = supabase
      .from('orders')
      .select('subtotal_amount, discount_amount, tax_amount, tip_amount, total_amount, refunded_amount, status')
      .eq('org_id', orgId)
      .in('status', ['paid', 'refunded', 'partially_refunded']);

    if (locationId) query = query.eq('location_id', locationId);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data: orders, error } = await query;
    if (error) throw error;

    const o = orders || [];
    const gross_sales = round2(o.reduce((s, r) => s + (r.subtotal_amount || 0), 0));
    const discounts = round2(o.reduce((s, r) => s + (r.discount_amount || 0), 0));
    const net_sales = round2(gross_sales - discounts);
    const tax_collected = round2(o.reduce((s, r) => s + (r.tax_amount || 0), 0));
    const tips = round2(o.reduce((s, r) => s + (r.tip_amount || 0), 0));
    const refunds = round2(o.reduce((s, r) => s + (r.refunded_amount || 0), 0));
    const total_collected = round2(o.reduce((s, r) => s + (r.total_amount || 0), 0) - refunds);
    const order_count = o.length;
    const avg_order_value = order_count > 0 ? round2(net_sales / order_count) : 0;

    // Payment breakdown
    let payQuery = supabase
      .from('payments')
      .select('tender_type, amount')
      .eq('org_id', orgId)
      .eq('payment_kind', 'sale')
      .eq('status', 'completed');

    if (dateFrom) payQuery = payQuery.gte('created_at', dateFrom);
    if (dateTo) payQuery = payQuery.lte('created_at', dateTo);

    const { data: payData } = await payQuery;
    const payMap = new Map<string, { total: number; count: number }>();
    (payData || []).forEach((p: any) => {
      const existing = payMap.get(p.tender_type) || { total: 0, count: 0 };
      existing.total = round2(existing.total + p.amount);
      existing.count++;
      payMap.set(p.tender_type, existing);
    });

    const payment_breakdown = Array.from(payMap.entries()).map(([tender_type, v]) => ({
      tender_type, ...v,
    }));

    return {
      gross_sales, discounts, net_sales, tax_collected, tips,
      refunds, total_collected, order_count, avg_order_value,
      payment_breakdown,
    };
  },
};
