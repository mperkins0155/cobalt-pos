import { supabase } from '@/lib/supabase';
import type { InventoryRecord, InventoryEvent, InventoryEventType } from '@/types/database';
import { v4 as uuid } from 'uuid';

export const InventoryService = {
  /** Get inventory for a location */
  async getInventory(orgId: string, locationId: string, lowStockOnly?: boolean): Promise<InventoryRecord[]> {
    let query = supabase
      .from('inventory')
      .select('*, item:items(name, sku, barcode, image_url, is_active), variant:variants(name, sku), location:locations(name)')
      .eq('org_id', orgId)
      .eq('location_id', locationId);

    if (lowStockOnly) {
      query = query.not('low_stock_threshold', 'is', null)
        .filter('quantity_on_hand', 'lte', 'low_stock_threshold');
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as InventoryRecord[];
  },

  /** Adjust stock (manual adjustment, receive, count, waste) */
  async adjustStock(params: {
    orgId: string;
    locationId: string;
    itemId: string;
    variantId?: string;
    delta: number;
    eventType: InventoryEventType;
    reasonCodeId?: string;
    notes?: string;
    createdBy: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<InventoryEvent> {
    // Upsert inventory record (variant may be null, so handle null-safe lookup)
    let inventoryLookup = supabase
      .from('inventory')
      .select('id, quantity_on_hand')
      .eq('location_id', params.locationId)
      .eq('item_id', params.itemId);

    if (params.variantId) {
      inventoryLookup = inventoryLookup.eq('variant_id', params.variantId);
    } else {
      inventoryLookup = inventoryLookup.is('variant_id', null);
    }

    const { data: existing } = await inventoryLookup.maybeSingle();

    const newQty = (existing?.quantity_on_hand || 0) + params.delta;

    if (existing) {
      await supabase.from('inventory')
        .update({ quantity_on_hand: newQty })
        .eq('id', existing.id);
    } else {
      await supabase.from('inventory').insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        item_id: params.itemId,
        variant_id: params.variantId,
        quantity_on_hand: newQty,
      });
    }

    // Record event
    const { data: event, error } = await supabase
      .from('inventory_events')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        item_id: params.itemId,
        variant_id: params.variantId,
        event_type: params.eventType,
        delta: params.delta,
        quantity_after: newQty,
        reference_id: params.referenceId,
        reference_type: params.referenceType,
        reason_code_id: params.reasonCodeId,
        notes: params.notes,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log for adjustments
    if (['adjustment', 'count', 'waste'].includes(params.eventType)) {
      await supabase.from('audit_logs').insert({
        org_id: params.orgId,
        actor_user_id: params.createdBy,
        action_type: 'inventory_adjust',
        entity_type: 'item',
        entity_id: params.itemId,
        metadata: { delta: params.delta, event_type: params.eventType, notes: params.notes },
      });
    }

    return event as InventoryEvent;
  },

  /** Decrement stock for a completed order */
  async decrementForOrder(orgId: string, locationId: string, orderLines: Array<{
    item_id?: string;
    variant_id?: string;
    quantity: number;
  }>, orderId: string, userId: string): Promise<void> {
    for (const line of orderLines) {
      if (!line.item_id) continue;
      await this.adjustStock({
        orgId,
        locationId,
        itemId: line.item_id,
        variantId: line.variant_id,
        delta: -line.quantity,
        eventType: 'sale',
        createdBy: userId,
        referenceId: orderId,
        referenceType: 'order',
      });
    }
  },

  /** Get low stock alerts */
  async getLowStockAlerts(orgId: string, locationId?: string): Promise<InventoryRecord[]> {
    let query = supabase
      .from('inventory')
      .select('*, item:items(name, sku, image_url)')
      .eq('org_id', orgId)
      .not('low_stock_threshold', 'is', null);

    if (locationId) query = query.eq('location_id', locationId);

    // Filter where quantity_on_hand <= low_stock_threshold
    // Supabase doesn't support column-to-column comparison directly,
    // so we fetch all and filter client-side
    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as InventoryRecord[]).filter(
      r => r.low_stock_threshold != null && r.quantity_on_hand <= r.low_stock_threshold
    );
  },
};
