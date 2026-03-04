import { supabase } from '@/lib/supabase';
import type { PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from '@/types/database';
import { v4 as uuid } from 'uuid';

type ReceiveLineInput = { lineId: string; quantityReceived: number };

export type PurchaseReceiveLineResult = {
  lineId: string;
  quantityOrdered: number;
  quantityPreviouslyReceived: number;
  quantityReceivedThisAction: number;
  quantityReceivedTotal: number;
  pendingQuantity: number;
};

export function computePurchaseReceivePlan(
  poLines: Array<Pick<PurchaseOrderLine, 'id' | 'quantity_ordered' | 'quantity_received'>>,
  requestedLines?: ReceiveLineInput[]
): {
  lineReceipts: PurchaseReceiveLineResult[];
  statusAfterReceive: PurchaseOrderStatus;
} {
  const requested = new Map((requestedLines || []).map(line => [line.lineId, Math.max(0, line.quantityReceived)]));

  const lineReceipts = poLines.map(line => {
    const alreadyReceived = Number(line.quantity_received || 0);
    const ordered = Number(line.quantity_ordered || 0);
    const remaining = Math.max(0, ordered - alreadyReceived);

    const receiveAmount = requestedLines
      ? Math.min(remaining, requested.get(line.id) ?? 0)
      : remaining;

    const receivedTotal = alreadyReceived + receiveAmount;

    return {
      lineId: line.id,
      quantityOrdered: ordered,
      quantityPreviouslyReceived: alreadyReceived,
      quantityReceivedThisAction: receiveAmount,
      quantityReceivedTotal: receivedTotal,
      pendingQuantity: Math.max(0, ordered - receivedTotal),
    };
  });

  const hasAnyReceivedThisAction = lineReceipts.some(line => line.quantityReceivedThisAction > 0);
  const allComplete = lineReceipts.every(line => line.pendingQuantity === 0);

  return {
    lineReceipts,
    statusAfterReceive: allComplete ? 'received' : hasAnyReceivedThisAction ? 'partially_received' : 'approved',
  };
}

export const PurchasingService = {
  async getById(id: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(*), lines:purchase_order_items(*, item:items(*), variant:variants(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as PurchaseOrder;
  },

  async create(params: {
    orgId: string;
    supplierId: string;
    locationId?: string;
    purchaseOrderNumber?: string;
    orderDate?: string;
    expectedDate?: string;
    currency?: string;
    discountAmount?: number;
    shippingAmount?: number;
    notes?: string;
    createdBy?: string;
    quotationId?: string;
    lines?: Array<{
      item_id?: string;
      variant_id?: string;
      item_name: string;
      sku?: string;
      quantity_ordered: number;
      unit_cost: number;
      discount_amount?: number;
      tax_amount?: number;
      line_total?: number;
    }>;
  }): Promise<PurchaseOrder> {
    const poId = uuid();
    const lines = params.lines || [];
    const subtotal = lines.reduce((sum, line) => sum + ((line.line_total ?? line.quantity_ordered * line.unit_cost) || 0), 0);
    const discount = lines.reduce((sum, line) => sum + (line.discount_amount || 0), 0) + (params.discountAmount || 0);
    const tax = lines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
    const shipping = params.shippingAmount || 0;
    const total = subtotal - discount + tax + shipping;

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        id: poId,
        org_id: params.orgId,
        supplier_id: params.supplierId,
        location_id: params.locationId,
        po_number: params.purchaseOrderNumber || `PO-${Date.now()}`,
        status: 'draft',
        order_date: params.orderDate || new Date().toISOString(),
        expected_date: params.expectedDate,
        currency: params.currency || 'USD',
        subtotal_amount: subtotal,
        discount_amount: discount,
        tax_amount: tax,
        shipping_amount: shipping,
        total_amount: total,
        notes: params.notes,
        quotation_id: params.quotationId,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (poError) throw poError;

    if (lines.length > 0) {
      const payload = lines.map((line, index) => ({
        id: uuid(),
        purchase_order_id: poId,
        item_id: line.item_id,
        variant_id: line.variant_id,
        item_name: line.item_name,
        sku: line.sku,
        quantity_ordered: line.quantity_ordered,
        quantity_received: 0,
        unit_cost: line.unit_cost,
        discount_amount: line.discount_amount ?? 0,
        tax_amount: line.tax_amount ?? 0,
        line_total: line.line_total ?? line.quantity_ordered * line.unit_cost,
        sort_order: index,
      }));
      const { error: lineError } = await supabase.from('purchase_order_items').insert(payload);
      if (lineError) throw lineError;
    }

    return po as PurchaseOrder;
  },

  async update(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PurchaseOrder;
  },

  async upsertLines(purchaseOrderId: string, lines: Array<Partial<PurchaseOrderLine> & { item_name: string; quantity_ordered: number; unit_cost: number }>): Promise<void> {
    const payload = lines.map((line, index) => ({
      id: line.id || uuid(),
      purchase_order_id: purchaseOrderId,
      item_id: line.item_id,
      variant_id: line.variant_id,
      item_name: line.item_name,
      sku: line.sku,
      quantity_ordered: line.quantity_ordered,
      quantity_received: line.quantity_received ?? 0,
      unit_cost: line.unit_cost,
      discount_amount: line.discount_amount ?? 0,
      tax_amount: line.tax_amount ?? 0,
      line_total: line.line_total ?? line.quantity_ordered * line.unit_cost,
      sort_order: line.sort_order ?? index,
    }));

    const { error } = await supabase
      .from('purchase_order_items')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  },

  async setStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
    if (error) throw error;
  },

  async list(params: {
    orgId: string;
    supplierId?: string;
    locationId?: string;
    status?: PurchaseOrderStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ purchaseOrders: PurchaseOrder[]; count: number }> {
    let query = supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name, code)', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('created_at', { ascending: false });

    if (params.supplierId) query = query.eq('supplier_id', params.supplierId);
    if (params.locationId) query = query.eq('location_id', params.locationId);
    if (params.status) query = query.eq('status', params.status);
    if (params.dateFrom) query = query.gte('order_date', params.dateFrom);
    if (params.dateTo) query = query.lte('order_date', params.dateTo);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { purchaseOrders: (data || []) as PurchaseOrder[], count: count || 0 };
  },

  async receivePurchaseOrderStub(params: {
    purchaseOrderId: string;
    receivedBy: string;
    lines?: Array<{ lineId: string; quantityReceived: number }>;
    notes?: string;
  }): Promise<{
    purchaseOrder: PurchaseOrder;
    receivePreview: {
      lineReceipts: PurchaseReceiveLineResult[];
      statusAfterReceive: PurchaseOrderStatus;
      inventoryEventsCreated: false;
      notes?: string;
    };
  }> {
    const purchaseOrder = await this.getById(params.purchaseOrderId);
    const poLines = purchaseOrder.lines || [];

    const { lineReceipts, statusAfterReceive } = computePurchaseReceivePlan(poLines, params.lines);

    return {
      purchaseOrder,
      receivePreview: {
        lineReceipts,
        statusAfterReceive,
        inventoryEventsCreated: false,
        notes: params.notes,
      },
    };
  },

  async receivePurchaseOrder(params: {
    purchaseOrderId: string;
    receivedBy: string;
    locationId?: string;
    receiptNumber?: string;
    referenceNumber?: string;
    notes?: string;
    lines?: ReceiveLineInput[];
  }): Promise<{
    purchaseOrder: PurchaseOrder;
    receipt: {
      id: string;
      receiptNumber: string;
      statusAfterReceive: PurchaseOrderStatus;
      inventoryEventsCreated: number;
      lineReceipts: PurchaseReceiveLineResult[];
    };
  }> {
    const purchaseOrder = await this.getById(params.purchaseOrderId);
    const poLines = purchaseOrder.lines || [];
    if (!purchaseOrder.org_id) {
      throw new Error('Purchase order is missing org context');
    }

    const receiveLocationId = params.locationId || purchaseOrder.location_id;
    if (!receiveLocationId) {
      throw new Error('Purchase order has no location. Select a location before receiving.');
    }

    const { lineReceipts, statusAfterReceive } = computePurchaseReceivePlan(poLines, params.lines);
    const receiptLines = lineReceipts.filter(line => line.quantityReceivedThisAction > 0);

    if (receiptLines.length === 0) {
      throw new Error('No quantities selected for receipt.');
    }

    // 1) Update received quantities on PO lines.
    for (const receiptLine of receiptLines) {
      const { error: lineUpdateError } = await supabase
        .from('purchase_order_items')
        .update({ quantity_received: receiptLine.quantityReceivedTotal })
        .eq('id', receiptLine.lineId);
      if (lineUpdateError) throw lineUpdateError;
    }

    // 2) Apply inventory increments + create inventory events for lines tied to catalog items.
    let inventoryEventsCreated = 0;
    for (const receiptLine of receiptLines) {
      const sourceLine = poLines.find(line => line.id === receiptLine.lineId);
      if (!sourceLine?.item_id) continue;

      let inventoryLookup = supabase
        .from('inventory')
        .select('id, quantity_on_hand')
        .eq('org_id', purchaseOrder.org_id)
        .eq('location_id', receiveLocationId)
        .eq('item_id', sourceLine.item_id);

      if (sourceLine.variant_id) {
        inventoryLookup = inventoryLookup.eq('variant_id', sourceLine.variant_id);
      } else {
        inventoryLookup = inventoryLookup.is('variant_id', null);
      }

      const { data: existingInventory, error: lookupError } = await inventoryLookup.maybeSingle();
      if (lookupError) throw lookupError;

      const quantityAfter = Number(existingInventory?.quantity_on_hand || 0) + receiptLine.quantityReceivedThisAction;

      if (existingInventory) {
        const { error: inventoryUpdateError } = await supabase
          .from('inventory')
          .update({ quantity_on_hand: quantityAfter, updated_at: new Date().toISOString() })
          .eq('id', existingInventory.id);
        if (inventoryUpdateError) throw inventoryUpdateError;
      } else {
        const { error: inventoryInsertError } = await supabase
          .from('inventory')
          .insert({
            id: uuid(),
            org_id: purchaseOrder.org_id,
            location_id: receiveLocationId,
            item_id: sourceLine.item_id,
            variant_id: sourceLine.variant_id,
            quantity_on_hand: quantityAfter,
          });
        if (inventoryInsertError) throw inventoryInsertError;
      }

      const { error: eventInsertError } = await supabase
        .from('inventory_events')
        .insert({
          id: uuid(),
          org_id: purchaseOrder.org_id,
          location_id: receiveLocationId,
          item_id: sourceLine.item_id,
          variant_id: sourceLine.variant_id,
          event_type: 'receive',
          delta: receiptLine.quantityReceivedThisAction,
          quantity_after: quantityAfter,
          reference_id: purchaseOrder.id,
          reference_type: 'purchase_order',
          notes: params.notes,
          created_by: params.receivedBy,
        });
      if (eventInsertError) throw eventInsertError;

      inventoryEventsCreated += 1;
    }

    // 3) Update PO status based on pending quantities.
    const { error: poUpdateError } = await supabase
      .from('purchase_orders')
      .update({ status: statusAfterReceive })
      .eq('id', purchaseOrder.id);
    if (poUpdateError) throw poUpdateError;

    // 4) Create receipt record.
    const receiptNumber = params.receiptNumber || `RCV-${Date.now()}`;
    const receiptId = uuid();
    const { error: receiptInsertError } = await supabase
      .from('purchase_order_receipts')
      .insert({
        id: receiptId,
        org_id: purchaseOrder.org_id,
        location_id: receiveLocationId,
        purchase_order_id: purchaseOrder.id,
        receipt_number: receiptNumber,
        received_by: params.receivedBy,
        reference_number: params.referenceNumber,
        notes: params.notes,
      });
    if (receiptInsertError) throw receiptInsertError;

    // 5) Audit log.
    await supabase.from('audit_logs').insert({
      org_id: purchaseOrder.org_id,
      actor_user_id: params.receivedBy,
      action_type: 'purchase_receive',
      entity_type: 'purchase_order',
      entity_id: purchaseOrder.id,
      metadata: {
        receipt_number: receiptNumber,
        status_after_receive: statusAfterReceive,
        inventory_events_created: inventoryEventsCreated,
        line_receipts: lineReceipts,
      },
    });

    const refreshed = await this.getById(purchaseOrder.id);

    return {
      purchaseOrder: refreshed,
      receipt: {
        id: receiptId,
        receiptNumber,
        statusAfterReceive,
        inventoryEventsCreated,
        lineReceipts,
      },
    };
  },
};
