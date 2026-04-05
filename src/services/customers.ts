import { supabase } from '@/lib/supabase';
import type { Customer } from '@/types/database';
import { v4 as uuid } from 'uuid';

export const CustomerService = {
  async search(orgId: string, query: string, limit: number = 20): Promise<Customer[]> {
    const term = `%${query}%`;
    const { data, error } = await supabase
      .from('pos_customers')
      .select('*')
      .eq('org_id', orgId)
      .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
      .order('last_visit_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as Customer[];
  },

  async getById(id: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('pos_customers').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Customer;
  },

  async create(params: {
    orgId: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }): Promise<Customer> {
    const { data, error } = await supabase
      .from('pos_customers')
      .insert({ id: uuid(), org_id: params.orgId, ...params })
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('pos_customers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Customer;
  },

  async getOrderHistory(customerId: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('pos_orders')
      .select('id, order_number, status, total_amount, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async list(orgId: string, params?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
  }): Promise<{ customers: Customer[]; count: number }> {
    const { data, count, error } = await supabase
      .from('pos_customers')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order(params?.sortBy || 'created_at', { ascending: false })
      .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 50) - 1);

    if (error) throw error;
    return { customers: (data || []) as Customer[], count: count || 0 };
  },
};
