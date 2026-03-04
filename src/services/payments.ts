import { supabase } from '@/lib/supabase';
import type { Payment, TenderType, PaymentKind } from '@/types/database';
import type { PaymentEntry } from '@/types/cart';
import { v4 as uuid } from 'uuid';
import { round2, calcChangeDue } from '@/lib/calculations';

export const PaymentService = {
  /** Record a cash payment */
  async recordCashPayment(
    orgId: string,
    orderId: string,
    amount: number,
    cashReceived: number,
    tipAmount: number = 0
  ): Promise<Payment> {
    const changeGiven = calcChangeDue(amount, cashReceived);

    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: uuid(),
        org_id: orgId,
        order_id: orderId,
        payment_kind: 'sale' as PaymentKind,
        tender_type: 'cash' as TenderType,
        amount: round2(amount),
        tip_amount: round2(tipAmount),
        cash_received: round2(cashReceived),
        change_given: changeGiven,
        status: 'completed',
        processed_at: new Date().toISOString(),
        idempotency_key: uuid(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  },

  /** Record an "other" payment (Venmo, Cash App, Zelle, PayPal, etc.) */
  async recordOtherPayment(
    orgId: string,
    orderId: string,
    amount: number,
    provider: string,
    reference?: string,
    tipAmount: number = 0
  ): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: uuid(),
        org_id: orgId,
        order_id: orderId,
        payment_kind: 'sale' as PaymentKind,
        tender_type: 'other' as TenderType,
        amount: round2(amount),
        tip_amount: round2(tipAmount),
        external_provider: provider,
        external_reference: reference,
        status: 'completed',
        processed_at: new Date().toISOString(),
        idempotency_key: uuid(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  },

  /** Initialize Helcim card payment - get checkout token via edge function */
  async initializeCardPayment(
    orderId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<{ checkoutToken: string; secretToken: string }> {
    const { data, error } = await supabase.functions.invoke('helcim-initialize', {
      body: { order_id: orderId, amount: round2(amount), currency },
    });

    if (error) throw error;
    return data;
  },

  /** Validate Helcim card payment after HelcimPay.js callback */
  async validateCardPayment(params: {
    orgId: string;
    orderId: string;
    transactionId: string;
    responseHash: string;
    cardLastFour: string;
    cardBrand: string;
    amount: number;
    tipAmount?: number;
  }): Promise<Payment> {
    // Call edge function for server-side hash validation
    const { data: validation, error: valError } = await supabase.functions.invoke('helcim-validate', {
      body: {
        order_id: params.orderId,
        transaction_id: params.transactionId,
        response_hash: params.responseHash,
      },
    });

    if (valError || !validation?.success) {
      throw new Error(valError?.message || 'Payment validation failed');
    }

    // Record payment
    const { data, error } = await supabase
      .from('payments')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        order_id: params.orderId,
        payment_kind: 'sale' as PaymentKind,
        tender_type: 'card' as TenderType,
        amount: round2(params.amount),
        tip_amount: round2(params.tipAmount || 0),
        helcim_transaction_id: params.transactionId,
        card_last_four: params.cardLastFour,
        card_brand: params.cardBrand,
        status: 'completed',
        processed_at: new Date().toISOString(),
        idempotency_key: uuid(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  },

  /** Process all payments for an order and finalize */
  async finalizeOrderPayments(
    orgId: string,
    orderId: string,
    totalAmount: number,
    paymentsApplied: number
  ): Promise<void> {
    const balanceDue = round2(Math.max(0, totalAmount - paymentsApplied));

    const updates: Record<string, unknown> = {
      balance_due: balanceDue,
    };

    if (balanceDue <= 0.01) {
      updates.status = 'paid';
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;
  },

  /** Get payments for an order */
  async getOrderPayments(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Payment[];
  },
};
