import { describe, expect, it } from 'vitest';
import { computePurchaseReceivePlan } from './purchasing';

describe('computePurchaseReceivePlan', () => {
  it('marks status received when all remaining quantities are received (default receive-all)', () => {
    const { lineReceipts, statusAfterReceive } = computePurchaseReceivePlan([
      { id: 'l1', quantity_ordered: 5, quantity_received: 2 },
      { id: 'l2', quantity_ordered: 3, quantity_received: 0 },
    ]);

    expect(statusAfterReceive).toBe('received');
    expect(lineReceipts).toEqual([
      {
        lineId: 'l1',
        quantityOrdered: 5,
        quantityPreviouslyReceived: 2,
        quantityReceivedThisAction: 3,
        quantityReceivedTotal: 5,
        pendingQuantity: 0,
      },
      {
        lineId: 'l2',
        quantityOrdered: 3,
        quantityPreviouslyReceived: 0,
        quantityReceivedThisAction: 3,
        quantityReceivedTotal: 3,
        pendingQuantity: 0,
      },
    ]);
  });

  it('caps received quantity at remaining amount for explicit line requests', () => {
    const { lineReceipts, statusAfterReceive } = computePurchaseReceivePlan(
      [{ id: 'l1', quantity_ordered: 4, quantity_received: 3 }],
      [{ lineId: 'l1', quantityReceived: 5 }]
    );

    expect(statusAfterReceive).toBe('received');
    expect(lineReceipts[0].quantityReceivedThisAction).toBe(1);
    expect(lineReceipts[0].quantityReceivedTotal).toBe(4);
    expect(lineReceipts[0].pendingQuantity).toBe(0);
  });

  it('returns partially_received when some quantities remain after receipt', () => {
    const { lineReceipts, statusAfterReceive } = computePurchaseReceivePlan(
      [
        { id: 'l1', quantity_ordered: 10, quantity_received: 0 },
        { id: 'l2', quantity_ordered: 8, quantity_received: 6 },
      ],
      [
        { lineId: 'l1', quantityReceived: 2 },
        { lineId: 'l2', quantityReceived: 1 },
      ]
    );

    expect(statusAfterReceive).toBe('partially_received');
    expect(lineReceipts[0].pendingQuantity).toBe(8);
    expect(lineReceipts[1].pendingQuantity).toBe(1);
  });

  it('keeps status approved when explicit requests receive zero quantity', () => {
    const { lineReceipts, statusAfterReceive } = computePurchaseReceivePlan(
      [{ id: 'l1', quantity_ordered: 3, quantity_received: 1 }],
      [{ lineId: 'l1', quantityReceived: 0 }]
    );

    expect(statusAfterReceive).toBe('approved');
    expect(lineReceipts[0].quantityReceivedThisAction).toBe(0);
    expect(lineReceipts[0].pendingQuantity).toBe(2);
  });
});

