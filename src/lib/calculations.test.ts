import { describe, it, expect } from 'vitest';
import {
  round2,
  calcLineTotal,
  calcSubtotal,
  calcDiscountAmount,
  calcTaxableSubtotal,
  calcTaxAmount,
  calcCartTotals,
  calcTipFromPercent,
  calcChangeDue,
  calcSplitEven,
  validatePaymentsCoverTotal,
  formatCurrency,
} from '@/lib/calculations';
import type { CartItem, CartDiscount } from '@/types/cart';

// Helper to make a cart item
function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  const defaults: CartItem = {
    id: 'test-1',
    item_id: 'item-1',
    item_name: 'Test Item',
    quantity: 1,
    unit_price: 10.00,
    modifiers: [],
    modifiers_total: 0,
    line_total: 10.00,
    is_taxable: true,
    is_custom_amount: false,
  };
  const item = { ...defaults, ...overrides };
  item.line_total = round2((item.unit_price + item.modifiers_total) * item.quantity);
  return item;
}

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24); // half-up
    expect(round2(1.005)).toBe(1.01); // epsilon handling
    expect(round2(0)).toBe(0);
    expect(round2(-1.234)).toBe(-1.23);
  });
});

describe('calcLineTotal', () => {
  it('calculates simple item', () => {
    const item = makeItem({ unit_price: 4.75, quantity: 2 });
    expect(calcLineTotal(item)).toBe(9.50);
  });

  it('includes modifiers', () => {
    const item = makeItem({ unit_price: 4.75, modifiers_total: 1.25, quantity: 1 });
    expect(calcLineTotal(item)).toBe(6.00);
  });

  it('handles quantity with modifiers', () => {
    const item = makeItem({ unit_price: 4.75, modifiers_total: 0.75, quantity: 3 });
    expect(calcLineTotal(item)).toBe(16.50); // (4.75 + 0.75) * 3
  });
});

describe('calcSubtotal', () => {
  it('sums all items', () => {
    const items = [
      makeItem({ unit_price: 4.75, quantity: 2 }), // 9.50
      makeItem({ id: '2', unit_price: 3.25, quantity: 1 }), // 3.25
    ];
    expect(calcSubtotal(items)).toBe(12.75);
  });

  it('returns 0 for empty cart', () => {
    expect(calcSubtotal([])).toBe(0);
  });
});

describe('calcDiscountAmount', () => {
  it('calculates percentage discount', () => {
    const discount: CartDiscount = {
      name: '10%', discount_type: 'percentage', value: 10, computed_amount: 0,
    };
    expect(calcDiscountAmount(100, discount)).toBe(10.00);
  });

  it('calculates fixed discount', () => {
    const discount: CartDiscount = {
      name: '$5 off', discount_type: 'fixed', value: 5, computed_amount: 0,
    };
    expect(calcDiscountAmount(20, discount)).toBe(5.00);
  });

  it('caps discount at subtotal', () => {
    const discount: CartDiscount = {
      name: '$50 off', discount_type: 'fixed', value: 50, computed_amount: 0,
    };
    expect(calcDiscountAmount(20, discount)).toBe(20.00);
  });

  it('returns 0 for no discount', () => {
    expect(calcDiscountAmount(100)).toBe(0);
  });
});

describe('calcTaxableSubtotal', () => {
  it('only taxes taxable items', () => {
    const items = [
      makeItem({ unit_price: 10, is_taxable: true }),
      makeItem({ id: '2', unit_price: 5, is_taxable: false }),
    ];
    expect(calcTaxableSubtotal(items, 0, 15)).toBe(10.00);
  });

  it('proportionally distributes discount', () => {
    const items = [
      makeItem({ unit_price: 80, is_taxable: true }),
      makeItem({ id: '2', unit_price: 20, is_taxable: false }),
    ];
    // $10 discount on $100 subtotal = 10% discount ratio
    // Taxable items: $80, taxable discount: $80 * 10% = $8
    // Taxable subtotal: $80 - $8 = $72
    expect(calcTaxableSubtotal(items, 10, 100)).toBe(72.00);
  });
});

describe('calcTaxAmount', () => {
  it('calculates tax correctly', () => {
    expect(calcTaxAmount(100, 8.25)).toBe(8.25);
    expect(calcTaxAmount(50, 8.25)).toBe(4.13);
    expect(calcTaxAmount(0, 8.25)).toBe(0);
    expect(calcTaxAmount(100, 0)).toBe(0);
  });
});

describe('calcCartTotals', () => {
  it('calculates complete cart with no discount/tip', () => {
    const items = [
      makeItem({ unit_price: 4.75, quantity: 2 }), // 9.50
      makeItem({ id: '2', unit_price: 3.25, quantity: 1 }), // 3.25
    ];
    const totals = calcCartTotals(items, 8.25, 0);
    expect(totals.subtotal).toBe(12.75);
    expect(totals.discount_amount).toBe(0);
    expect(totals.tax_amount).toBe(1.05); // 12.75 * 0.0825 = 1.051875 → 1.05
    expect(totals.tip_amount).toBe(0);
    expect(totals.total).toBe(13.80); // 12.75 + 1.05
    expect(totals.balance_due).toBe(13.80);
  });

  it('calculates cart with discount and tip', () => {
    const items = [makeItem({ unit_price: 20.00, quantity: 1 })];
    const discount: CartDiscount = {
      name: '10%', discount_type: 'percentage', value: 10, computed_amount: 0,
    };
    const totals = calcCartTotals(items, 8.25, 3.00, discount);
    expect(totals.subtotal).toBe(20.00);
    expect(totals.discount_amount).toBe(2.00); // 20 * 10%
    expect(totals.taxable_subtotal).toBe(18.00); // 20 - 2
    expect(totals.tax_amount).toBe(1.49); // 18 * 0.0825 = 1.485 → 1.49
    expect(totals.tip_amount).toBe(3.00);
    expect(totals.total).toBe(22.49); // 20 - 2 + 1.49 + 3
  });

  it('tracks balance due with partial payment', () => {
    const items = [makeItem({ unit_price: 10.00 })];
    const totals = calcCartTotals(items, 0, 0, undefined, 5.00);
    expect(totals.total).toBe(10.00);
    expect(totals.payments_applied).toBe(5.00);
    expect(totals.balance_due).toBe(5.00);
  });

  it('balance due never goes negative', () => {
    const items = [makeItem({ unit_price: 10.00 })];
    const totals = calcCartTotals(items, 0, 0, undefined, 15.00);
    expect(totals.balance_due).toBe(0);
  });
});

describe('calcTipFromPercent', () => {
  it('calculates tip from percentage', () => {
    expect(calcTipFromPercent(20.00, 15)).toBe(3.00);
    expect(calcTipFromPercent(20.00, 18)).toBe(3.60);
    expect(calcTipFromPercent(20.00, 20)).toBe(4.00);
    expect(calcTipFromPercent(13.50, 25)).toBe(3.38);
  });
});

describe('calcChangeDue', () => {
  it('calculates change for cash', () => {
    expect(calcChangeDue(13.80, 20.00)).toBe(6.20);
    expect(calcChangeDue(13.80, 13.80)).toBe(0);
    expect(calcChangeDue(13.80, 10.00)).toBe(0); // no negative change
  });
});

describe('calcSplitEven', () => {
  it('splits evenly', () => {
    const splits = calcSplitEven(30.00, 3);
    expect(splits).toEqual([10.00, 10.00, 10.00]);
    expect(splits.reduce((a, b) => a + b, 0)).toBe(30.00);
  });

  it('handles remainder cents', () => {
    const splits = calcSplitEven(10.00, 3);
    // 10 / 3 = 3.33... → first person gets extra cent
    expect(splits[0]).toBe(3.34);
    expect(splits[1]).toBe(3.33);
    expect(splits[2]).toBe(3.33);
    expect(round2(splits.reduce((a, b) => a + b, 0))).toBe(10.00);
  });

  it('handles edge cases', () => {
    expect(calcSplitEven(10, 0)).toEqual([]);
    expect(calcSplitEven(10, 1)).toEqual([10.00]);
  });
});

describe('validatePaymentsCoverTotal', () => {
  it('validates sufficient payment', () => {
    expect(validatePaymentsCoverTotal([{ amount: 10 }, { amount: 5 }], 15)).toBe(true);
    expect(validatePaymentsCoverTotal([{ amount: 20 }], 15)).toBe(true);
  });

  it('rejects insufficient payment', () => {
    expect(validatePaymentsCoverTotal([{ amount: 10 }], 15)).toBe(false);
  });

  it('allows 1 cent tolerance', () => {
    expect(validatePaymentsCoverTotal([{ amount: 14.99 }], 15)).toBe(true);
    expect(validatePaymentsCoverTotal([{ amount: 14.98 }], 15)).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('formats USD', () => {
    expect(formatCurrency(10.50)).toBe('$10.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
