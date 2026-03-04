import { describe, expect, it } from 'vitest';
import { isValidQuotationStatusTransition } from './quotations';

describe('isValidQuotationStatusTransition', () => {
  it('allows valid transitions', () => {
    expect(isValidQuotationStatusTransition('draft', 'sent')).toBe(true);
    expect(isValidQuotationStatusTransition('sent', 'accepted')).toBe(true);
    expect(isValidQuotationStatusTransition('accepted', 'converted')).toBe(true);
    expect(isValidQuotationStatusTransition('rejected', 'draft')).toBe(true);
    expect(isValidQuotationStatusTransition('expired', 'draft')).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(isValidQuotationStatusTransition('converted', 'draft')).toBe(false);
    expect(isValidQuotationStatusTransition('accepted', 'sent')).toBe(false);
    expect(isValidQuotationStatusTransition('rejected', 'converted')).toBe(false);
  });

  it('allows idempotent transition to same status', () => {
    expect(isValidQuotationStatusTransition('sent', 'sent')).toBe(true);
  });
});
