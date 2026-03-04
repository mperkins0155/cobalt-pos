import { supabase } from '@/lib/supabase';
import type { Category, Item, Variant, ModifierGroupWithOptions } from '@/types/database';
import type { BarcodeScanResult } from '@/types/cart';

export const CatalogService = {
  async getCategories(orgId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data || []) as Category[];
  },

  async getItems(orgId: string, categoryId?: string): Promise<Item[]> {
    let query = supabase
      .from('items')
      .select('*, category:categories(*), variants(*)')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('sort_order');

    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Item[];
  },

  async getItemWithModifiers(itemId: string): Promise<Item & { modifier_groups: ModifierGroupWithOptions[] }> {
    const { data: item, error } = await supabase
      .from('items')
      .select('*, category:categories(*), variants(*)')
      .eq('id', itemId)
      .single();

    if (error) throw error;

    // Get modifier groups linked to this item
    const { data: links } = await supabase
      .from('item_modifier_groups')
      .select('modifier_group_id, sort_order')
      .eq('item_id', itemId)
      .order('sort_order');

    const groupIds = (links || []).map(l => l.modifier_group_id);
    let modifier_groups: ModifierGroupWithOptions[] = [];

    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from('modifier_groups')
        .select('*, options:modifier_options(*)')
        .in('id', groupIds);

      modifier_groups = (groups || []).map(g => ({
        ...g,
        options: (g.options || []).filter((o: any) => o.is_active).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })) as ModifierGroupWithOptions[];

      // Sort by link sort_order
      const orderMap = new Map((links || []).map(l => [l.modifier_group_id, l.sort_order]));
      modifier_groups.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
    }

    return { ...item, modifier_groups } as Item & { modifier_groups: ModifierGroupWithOptions[] };
  },

  async lookupBarcode(orgId: string, barcode: string): Promise<BarcodeScanResult> {
    // Check items first
    const { data: items } = await supabase
      .from('items')
      .select('id, name, base_price, barcode')
      .eq('org_id', orgId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .limit(1);

    if (items && items.length > 0) {
      return {
        found: true,
        item_id: items[0].id,
        item_name: items[0].name,
        price: items[0].base_price,
        barcode,
      };
    }

    // Check variants
    const { data: variants } = await supabase
      .from('variants')
      .select('id, name, price_override, price_adjustment, item_id, barcode, items!inner(id, name, base_price, org_id)')
      .eq('barcode', barcode)
      .eq('is_active', true)
      .limit(1);

    if (variants && variants.length > 0) {
      const v = variants[0] as any;
      const price = v.price_override ?? (v.items.base_price + v.price_adjustment);
      return {
        found: true,
        item_id: v.items.id,
        variant_id: v.id,
        item_name: v.items.name,
        variant_name: v.name,
        price,
        barcode,
      };
    }

    return { found: false, barcode };
  },

  async createItem(item: Partial<Item>): Promise<Item> {
    const { data, error } = await supabase
      .from('items').insert(item).select().single();
    if (error) throw error;
    return data as Item;
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    const { data, error } = await supabase
      .from('items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Item;
  },

  async createCategory(cat: Partial<Category>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories').insert(cat).select().single();
    if (error) throw error;
    return data as Category;
  },
};
