import { useState, useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { CartItem, CartItemModifier, CartDiscount, CartState, CartTotals, PaymentEntry } from '@/types/cart';
import type { OrderType, TenderType } from '@/types/database';
import { calcCartTotals, calcLineTotal, calcTipFromPercent, calcChangeDue, round2 } from '@/lib/calculations';

interface UseCartOptions {
  defaultTaxRate?: number; // percentage
}

export function useCart(options: UseCartOptions = {}) {
  const { defaultTaxRate = 0 } = options;

  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('in_store');
  const [discount, setDiscount] = useState<CartDiscount | undefined>();
  const [taxRate, setTaxRate] = useState(defaultTaxRate);
  const [tipAmount, setTipAmount] = useState(0);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [customerName, setCustomerName] = useState<string | undefined>();
  const [notes, setNotes] = useState<string | undefined>();
  const [savedTicketId, setSavedTicketId] = useState<string | undefined>();

  // ---- Totals ----

  const paymentsApplied = useMemo(
    () => round2(payments.reduce((sum, p) => sum + p.amount, 0)),
    [payments]
  );

  const totals: CartTotals = useMemo(
    () => calcCartTotals(items, taxRate, tipAmount, discount, paymentsApplied),
    [items, taxRate, tipAmount, discount, paymentsApplied]
  );

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  // ---- Item Operations ----

  const addItem = useCallback((params: {
    item_id: string;
    item_name: string;
    variant_id?: string;
    variant_name?: string;
    unit_price: number;
    quantity?: number;
    modifiers?: CartItemModifier[];
    is_taxable?: boolean;
    is_custom_amount?: boolean;
    notes?: string;
  }) => {
    const {
      item_id, item_name, variant_id, variant_name,
      unit_price, quantity = 1, modifiers = [],
      is_taxable = true, is_custom_amount = false, notes: itemNotes,
    } = params;

    // Check if identical item exists (same item + variant + same modifiers)
    setItems(prev => {
      const modKey = modifiers.map(m => m.option_id).sort().join(',');

      const existingIdx = prev.findIndex(i =>
        i.item_id === item_id &&
        i.variant_id === variant_id &&
        i.modifiers.map(m => m.option_id).sort().join(',') === modKey &&
        !i.is_custom_amount
      );

      if (existingIdx >= 0 && !is_custom_amount) {
        // Increment quantity
        const updated = [...prev];
        const existing = { ...updated[existingIdx] };
        existing.quantity += quantity;
        existing.line_total = calcLineTotal(existing);
        updated[existingIdx] = existing;
        return updated;
      }

      // Add new line
      const modifiers_total = round2(modifiers.reduce((s, m) => s + m.price_adjustment, 0));
      const newItem: CartItem = {
        id: uuid(),
        item_id, item_name, variant_id, variant_name,
        quantity, unit_price, modifiers, modifiers_total,
        line_total: round2((unit_price + modifiers_total) * quantity),
        is_taxable, is_custom_amount,
        notes: itemNotes,
      };
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(i => i.id !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.id !== cartItemId) return i;
      const updated = { ...i, quantity };
      updated.line_total = calcLineTotal(updated);
      return updated;
    }));
  }, [removeItem]);

  const updateItemNotes = useCallback((cartItemId: string, notes: string) => {
    setItems(prev => prev.map(i =>
      i.id === cartItemId ? { ...i, notes: notes || undefined } : i
    ));
  }, []);

  // ---- Discount ----

  const applyDiscount = useCallback((d: CartDiscount) => {
    setDiscount(d);
  }, []);

  const removeDiscount = useCallback(() => {
    setDiscount(undefined);
  }, []);

  // ---- Tip ----

  const setTipByPercent = useCallback((percent: number) => {
    const sub = calcCartTotals(items, taxRate, 0, discount, 0).subtotal;
    setTipAmount(calcTipFromPercent(sub, percent));
  }, [items, taxRate, discount]);

  const setTipByAmount = useCallback((amount: number) => {
    setTipAmount(round2(Math.max(0, amount)));
  }, []);

  // ---- Payments (Split Tender) ----

  const addPayment = useCallback((params: {
    tender_type: TenderType;
    amount: number;
    tip_amount?: number;
    cash_received?: number;
    external_reference?: string;
    external_provider?: string;
  }) => {
    const payment: PaymentEntry = {
      id: uuid(),
      tender_type: params.tender_type,
      amount: round2(params.amount),
      tip_amount: round2(params.tip_amount || 0),
      cash_received: params.cash_received ? round2(params.cash_received) : undefined,
      change_given: params.cash_received
        ? calcChangeDue(params.amount, params.cash_received)
        : undefined,
      external_reference: params.external_reference,
      external_provider: params.external_provider,
    };
    setPayments(prev => [...prev, payment]);
    return payment;
  }, []);

  const removePayment = useCallback((paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  }, []);

  const clearPayments = useCallback(() => {
    setPayments([]);
  }, []);

  // ---- Customer ----

  const attachCustomer = useCallback((id: string, name: string) => {
    setCustomerId(id);
    setCustomerName(name);
  }, []);

  const detachCustomer = useCallback(() => {
    setCustomerId(undefined);
    setCustomerName(undefined);
  }, []);

  // ---- Cart State ----

  const getCartState = useCallback((): CartState => ({
    items,
    order_type: orderType,
    customer_id: customerId,
    customer_name: customerName,
    discount,
    tax_rate: taxRate,
    tip_amount: tipAmount,
    notes,
    totals,
    saved_ticket_id: savedTicketId,
  }), [items, orderType, customerId, customerName, discount, taxRate, tipAmount, notes, totals, savedTicketId]);

  const loadCartState = useCallback((state: CartState) => {
    setItems(state.items);
    setOrderType(state.order_type);
    setCustomerId(state.customer_id);
    setCustomerName(state.customer_name);
    setDiscount(state.discount);
    setTaxRate(state.tax_rate);
    setTipAmount(state.tip_amount);
    setNotes(state.notes);
    setSavedTicketId(state.saved_ticket_id);
    setPayments([]);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(undefined);
    setTipAmount(0);
    setPayments([]);
    setCustomerId(undefined);
    setCustomerName(undefined);
    setNotes(undefined);
    setSavedTicketId(undefined);
    setOrderType('in_store');
  }, []);

  const isEmpty = items.length === 0;
  const isFullyPaid = totals.balance_due <= 0.01 && items.length > 0;

  return {
    // State
    items, itemCount, orderType, discount, taxRate, tipAmount,
    payments, paymentsApplied, customerId, customerName, notes,
    savedTicketId, totals, isEmpty, isFullyPaid,

    // Item ops
    addItem, removeItem, updateQuantity, updateItemNotes,

    // Discount
    applyDiscount, removeDiscount,

    // Tax
    setTaxRate,

    // Tip
    setTipAmount: setTipByAmount, setTipByPercent,

    // Payments
    addPayment, removePayment, clearPayments,

    // Customer
    attachCustomer, detachCustomer,

    // Order type
    setOrderType,

    // Notes
    setNotes,

    // Ticket
    setSavedTicketId,

    // State management
    getCartState, loadCartState, clearCart,
  };
}
