import { supabase } from '@/lib/supabase';
import type { Expense, ExpenseCategory, ExpenseStatus } from '@/types/database';
import { v4 as uuid } from 'uuid';

export const ExpenseService = {
  async listCategories(orgId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []) as ExpenseCategory[];
  },

  async ensureCategory(orgId: string, name: string): Promise<ExpenseCategory> {
    const trimmed = name.trim();
    const { data: existing, error: findError } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('org_id', orgId)
      .ilike('name', trimmed)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) return existing as ExpenseCategory;

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        id: uuid(),
        org_id: orgId,
        name: trimmed,
        sort_order: 0,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ExpenseCategory;
  },

  async getById(id: string): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, supplier:suppliers(*), category:expense_categories(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Expense;
  },

  async create(params: {
    orgId: string;
    locationId?: string;
    supplierId?: string;
    categoryId?: string;
    expenseNumber?: string;
    expenseDate?: string;
    dueDate?: string;
    subtotalAmount: number;
    taxAmount?: number;
    paymentMethod?: Expense['payment_method'];
    notes?: string;
    attachmentUrl?: string;
    reimbursable?: boolean;
    createdBy?: string;
  }): Promise<Expense> {
    const subtotalAmount = params.subtotalAmount;
    const taxAmount = params.taxAmount || 0;
    const total = subtotalAmount + taxAmount;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        id: uuid(),
        org_id: params.orgId,
        location_id: params.locationId,
        supplier_id: params.supplierId,
        category_id: params.categoryId,
        expense_number: params.expenseNumber || `EXP-${Date.now()}`,
        expense_date: params.expenseDate || new Date().toISOString(),
        due_date: params.dueDate,
        status: 'draft',
        subtotal_amount: subtotalAmount,
        tax_amount: taxAmount,
        total_amount: total,
        payment_method: params.paymentMethod,
        notes: params.notes,
        attachment_url: params.attachmentUrl,
        reimbursable: params.reimbursable ?? false,
        created_by: params.createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  async update(id: string, updates: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  async setStatus(id: string, status: ExpenseStatus): Promise<Expense> {
    const updates: Partial<Expense> = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    return this.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  async list(params: {
    orgId: string;
    locationId?: string;
    supplierId?: string;
    categoryId?: string;
    status?: ExpenseStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ expenses: Expense[]; count: number }> {
    let query = supabase
      .from('expenses')
      .select('*, supplier:suppliers(name), category:expense_categories(name)', { count: 'exact' })
      .eq('org_id', params.orgId)
      .order('expense_date', { ascending: false });

    if (params.locationId) query = query.eq('location_id', params.locationId);
    if (params.supplierId) query = query.eq('supplier_id', params.supplierId);
    if (params.categoryId) query = query.eq('category_id', params.categoryId);
    if (params.status) query = query.eq('status', params.status);
    if (params.dateFrom) query = query.gte('expense_date', params.dateFrom);
    if (params.dateTo) query = query.lte('expense_date', params.dateTo);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;
    return { expenses: (data || []) as Expense[], count: count || 0 };
  },

  async getSummary(orgId: string, locationId?: string): Promise<{
    total: number;
    paid: number;
    pending: number;
    byCategory: Array<{ category: string; total: number }>;
  }> {
    let query = supabase
      .from('expenses')
      .select('id,total_amount,status,category:expense_categories(name)')
      .eq('org_id', orgId);

    if (locationId) query = query.eq('location_id', locationId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as Array<Expense & { category?: { name?: string } }>;
    const total = rows.reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const paid = rows
      .filter(row => row.status === 'paid')
      .reduce((sum, row) => sum + (row.total_amount || 0), 0);
    const pending = rows
      .filter(row => row.status !== 'paid' && row.status !== 'void')
      .reduce((sum, row) => sum + (row.total_amount || 0), 0);

    const byCategoryMap = new Map<string, number>();
    rows.forEach(row => {
      const key = row.category?.name || 'Uncategorized';
      byCategoryMap.set(key, (byCategoryMap.get(key) || 0) + (row.total_amount || 0));
    });

    return {
      total,
      paid,
      pending,
      byCategory: Array.from(byCategoryMap.entries())
        .map(([category, value]) => ({ category, total: value }))
        .sort((a, b) => b.total - a.total),
    };
  },
};
