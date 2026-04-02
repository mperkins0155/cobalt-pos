import { describe, expect, it } from 'vitest';
import { resolveRefundTenderType } from '@/services/refunds';

describe('resolveRefundTenderType', () => {
  it('uses the latest sale payment tender type', () => {
    expect(
      resolveRefundTenderType([
        { payment_kind: 'sale', tender_type: 'cash', created_at: '2026-04-01T10:00:00Z' },
        { payment_kind: 'sale', tender_type: 'other', created_at: '2026-04-01T11:00:00Z' },
      ])
    ).toBe('other');
  });

  it('ignores refund records when determining original tender', () => {
    expect(
      resolveRefundTenderType([
        { payment_kind: 'sale', tender_type: 'cash', created_at: '2026-04-01T10:00:00Z' },
        { payment_kind: 'refund', tender_type: 'card', created_at: '2026-04-01T12:00:00Z' },
      ])
    ).toBe('cash');
  });

  it('falls back to other when no sale payments exist', () => {
    expect(resolveRefundTenderType([])).toBe('other');
  });
});
