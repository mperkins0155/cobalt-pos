// ============================================================
// Cobalt POS — Calculation Engine
// Deterministic: subtotal → discount → tax → tip → total
// Rounding: banker's rounding to 2 decimal places
// ============================================================

import type { CartItem, CartDiscount, CartTotals } from '@/types/cart';

/** Sum a numeric property across an array of objects */
export function calcSum<T>(items: T[], propName: keyof T): number {
  return items.reduce((sum, item) => {
    const value = item[propName];
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
}

/** Group records by a property and sum another numeric property */
export function mergeAndSum<T, K extends keyof T>(
  items: T[],
  groupKey: K,
  sumKey: keyof T
): Array<Pick<T, K> & { sum: number }> {
  const grouped = new Map<T[K], number>();

  items.forEach((item) => {
    const key = item[groupKey];
    const value = item[sumKey];
    const sum = typeof value === 'number' ? value : 0;
    grouped.set(key, (grouped.get(key) ?? 0) + sum);
  });

  return Array.from(grouped.entries()).map(([key, sum]) => ({
    [groupKey]: key,
    sum,
  })) as Array<Pick<T, K> & { sum: number }>;
}

/** Calculate the arithmetic mean of a list of numbers */
export function average(items: number[]): number {
  return items.length > 0 ? items.reduce((sum, item) => sum + item, 0) / items.length : 0;
}

/** Round using banker's rounding (round half to even) */
export function bankersRound(num: number, decimalPlaces: number = 0): number {
  const multiplier = 10 ** decimalPlaces;
  const shifted = +(decimalPlaces ? num * multiplier : num).toFixed(8);
  const integer = Math.floor(shifted);
  const fraction = shifted - integer;
  const epsilon = 1e-8;
  const rounded =
    fraction > 0.5 - epsilon && fraction < 0.5 + epsilon
      ? integer + (integer % 2)
      : Math.round(shifted);

  return decimalPlaces ? rounded / multiplier : rounded;
}

/** Round to 2 decimal places using banker's rounding */
export function round2(n: number): number {
  return bankersRound(n, 2);
}

/** Calculate line total for a single cart item */
export function calcLineTotal(item: CartItem): number {
  const unitWithMods = item.unit_price + item.modifiers_total;
  return round2(unitWithMods * item.quantity);
}

/** Calculate subtotal from all cart items */
export function calcSubtotal(items: CartItem[]): number {
  return round2(items.reduce((sum, item) => sum + item.line_total, 0));
}

/** Calculate discount amount */
export function calcDiscountAmount(subtotal: number, discount?: CartDiscount): number {
  if (!discount) return 0;
  let amount: number;
  if (discount.discount_type === 'percentage') {
    amount = round2(subtotal * (discount.value / 100));
    if (discount.computed_amount && discount.computed_amount > 0) {
      // Use pre-computed if set (for max cap enforcement)
      return discount.computed_amount;
    }
  } else {
    amount = discount.value;
  }
  // Never discount more than the subtotal
  return round2(Math.min(amount, subtotal));
}

/** Calculate taxable subtotal (only taxable items, after proportional discount) */
export function calcTaxableSubtotal(items: CartItem[], discountAmount: number, subtotal: number): number {
  if (subtotal === 0) return 0;
  const taxableItemsTotal = items
    .filter(i => i.is_taxable)
    .reduce((sum, i) => sum + i.line_total, 0);

  // Proportionally distribute discount across taxable items
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
  const taxableDiscount = round2(taxableItemsTotal * discountRatio);
  return round2(taxableItemsTotal - taxableDiscount);
}

/** Calculate tax amount */
export function calcTaxAmount(taxableSubtotal: number, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return 0;
  return round2(taxableSubtotal * (taxRatePercent / 100));
}

/** Calculate complete cart totals */
export function calcCartTotals(
  items: CartItem[],
  taxRatePercent: number,
  tipAmount: number,
  discount?: CartDiscount,
  paymentsApplied: number = 0
): CartTotals {
  const subtotal = calcSubtotal(items);
  const discount_amount = calcDiscountAmount(subtotal, discount);
  const taxable_subtotal = calcTaxableSubtotal(items, discount_amount, subtotal);
  const tax_amount = calcTaxAmount(taxable_subtotal, taxRatePercent);
  const tip = round2(Math.max(0, tipAmount));
  const total = round2(subtotal - discount_amount + tax_amount + tip);
  const balance_due = round2(Math.max(0, total - paymentsApplied));

  return {
    subtotal,
    discount_amount,
    taxable_subtotal,
    tax_amount,
    tip_amount: tip,
    total,
    balance_due,
    payments_applied: paymentsApplied,
  };
}

/** Calculate tip from percentage */
export function calcTipFromPercent(subtotal: number, percent: number): number {
  return round2(subtotal * (percent / 100));
}

/** Calculate change due for cash payment */
export function calcChangeDue(amountDue: number, cashReceived: number): number {
  return round2(Math.max(0, cashReceived - amountDue));
}

/** Calculate split-even amount for N ways */
export function calcSplitEven(total: number, ways: number): number[] {
  if (ways <= 0) return [];
  const perPerson = Math.floor(total * 100 / ways) / 100;
  const remainder = round2(total - perPerson * ways);
  const amounts = Array(ways).fill(perPerson);
  // Give remainder cent(s) to first person
  if (remainder > 0) {
    amounts[0] = round2(amounts[0] + remainder);
  }
  return amounts;
}

/** Validate that payment amounts cover order total */
export function validatePaymentsCoverTotal(payments: { amount: number }[], total: number): boolean {
  const paid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  return paid >= total - 0.01; // Allow 1 cent tolerance for rounding
}

/** Format currency */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
