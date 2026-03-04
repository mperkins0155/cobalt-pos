import { supabase } from '@/lib/supabase';
import type { Supplier, PurchaseOrder } from '@/types/database';
import { v4 as uuid } from 'uuid';

export const SupplierService = {
  async getById(id: string): Promise<Supplier> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Supplier;
  },

  async create(params: {
    orgId: string;
    locationId?: string;
    name: string;
    code?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    paymentTerms?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        name: params.name,
        code: params.code,
        contact_name: params.contactName,
        email: params.email,
        phone: params.phone,
        website: params.website,
        payment_terms: params.paymentTerms,
        address_line1: params.addressLine1,
        address_line2: params.addressLine2,
        city: params.city,
        state: params.state,
        postal_code: params.postalCode,
        country: params.country,
        notes: params.notes,
        is_active: params.isActive ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Supplier;
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Supplier;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
  },

  async list(params: {
    orgId: string;
    search?: string;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ suppliers: Supplier[]; count: number }> {
    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('name', { ascending: true });

    if (!params.includeInactive) query = query.eq('is_active', true);

    if (params.search) {
      const term = `%${params.search}%`;
      query = query.or(`name.ilike.${term},code.ilike.${term},contact_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { suppliers: (data || []) as Supplier[], count: count || 0 };
  },

  async listOpenPurchaseOrders(supplierId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('supplier_id', supplierId)
      .in('status', ['draft', 'submitted', 'approved', 'partially_received'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as PurchaseOrder[];
  },
};
