// ============================================================
// CloudPos — Catalog Management
// Item + Category CRUD admin page
// Manager+ only route
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogService } from '@/services/catalog';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { toast } from 'sonner';
import {
  Package, Plus, Pencil, Tag, LayoutGrid, Check, X,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Item, Category } from '@/types/database';
import { v4 as uuid } from 'uuid';

type CatalogTab = 'items' | 'categories';

export default function Catalog() {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<CatalogTab>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Edit/Create dialogs
  const [editItem, setEditItem] = useState<Partial<Item> | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Partial<Category> | null>(null);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!organization) return;
    try {
      const [cats, itms] = await Promise.all([
        CatalogService.getCategories(organization.id),
        CatalogService.getItems(organization.id),
      ]);
      setCategories(cats);
      setItems(itms);
    } catch {
      toast.error('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => { void load(); }, [load]);

  const categoryTabs = [
    { key: 'all', label: 'All', count: items.length },
    ...categories.map((c) => ({ key: c.id, label: c.name, count: items.filter((i) => i.category_id === c.id).length })),
  ];

  const filteredItems = items.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category_id === categoryFilter;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredCategories = categories.filter((cat) =>
    !search || cat.name.toLowerCase().includes(search.toLowerCase())
  );

  // Save item
  const handleSaveItem = async () => {
    if (!editItem || !organization) return;
    if (!editItem.name?.trim()) { toast.error('Item name is required'); return; }
    if (!editItem.base_price || editItem.base_price < 0) { toast.error('Price must be 0 or more'); return; }

    setSaving(true);
    try {
      if (editItem.id) {
        await CatalogService.updateItem(editItem.id, editItem);
        toast.success('Item updated');
      } else {
        await CatalogService.createItem({
          ...editItem,
          id: uuid(),
          org_id: organization.id,
          item_type: 'standard',
          sold_by: 'each',
          taxable: true,
          track_inventory: false,
          sort_order: items.length,
          is_active: true,
        } as Item);
        toast.success('Item created');
      }
      setEditItemOpen(false);
      setEditItem(null);
      void load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  // Save category
  const handleSaveCategory = async () => {
    if (!editCategory || !organization) return;
    if (!editCategory.name?.trim()) { toast.error('Category name is required'); return; }

    setSaving(true);
    try {
      if (editCategory.id) {
        // Update not in CatalogService yet — use direct approach
        toast.info('Category update coming soon');
      } else {
        await CatalogService.createCategory({
          ...editCategory,
          id: uuid(),
          org_id: organization.id,
          is_active: true,
          sort_order: categories.length,
        } as Category);
        toast.success('Category created');
      }
      setEditCategoryOpen(false);
      setEditCategory(null);
      void load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="shrink-0 flex border-b border-border bg-card">
        {(['items', 'categories'] as CatalogTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors capitalize',
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'items' ? <Package className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            {tab}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({tab === 'items' ? items.length : categories.length})
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={activeTab === 'items' ? 'Search items...' : 'Search categories...'}
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (activeTab === 'items') {
              setEditItem({ name: '', base_price: 0, is_active: true });
              setEditItemOpen(true);
            } else {
              setEditCategory({ name: '', is_active: true });
              setEditCategoryOpen(true);
            }
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add {activeTab === 'items' ? 'Item' : 'Category'}
        </Button>
      </div>

      {/* Category filter pills (items tab only) */}
      {activeTab === 'items' && (
        <div className="shrink-0 px-4 py-2.5 border-b border-border">
          <FilterPills items={categoryTabs} active={categoryFilter} onChange={setCategoryFilter} />
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : activeTab === 'items' ? (
            filteredItems.length === 0 ? (
              <EmptyState icon={<Package className="h-10 w-10" />} title="No items found" description="Add your first menu item." />
            ) : (
              <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
                {filteredItems.map((item) => (
                  <CatalogItemRow
                    key={item.id}
                    item={item}
                    categoryName={categories.find((c) => c.id === item.category_id)?.name}
                    onEdit={() => { setEditItem(item); setEditItemOpen(true); }}
                  />
                ))}
              </div>
            )
          ) : (
            filteredCategories.length === 0 ? (
              <EmptyState icon={<LayoutGrid className="h-10 w-10" />} title="No categories" description="Add your first category." />
            ) : (
              <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
                {filteredCategories.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    itemCount={items.filter((i) => i.category_id === cat.id).length}
                    onEdit={() => { setEditCategory(cat); setEditCategoryOpen(true); }}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {/* ── Edit Item Dialog ── */}
      <Dialog open={editItemOpen} onOpenChange={(o) => { if (!o) { setEditItemOpen(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-base font-bold">{editItem?.id ? 'Edit Item' : 'New Item'}</h3>
            <button onClick={() => { setEditItemOpen(false); setEditItem(null); }} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name *</Label>
              <Input
                value={editItem?.name ?? ''}
                onChange={(e) => setEditItem((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Cheeseburger"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-7"
                    value={editItem?.base_price ?? ''}
                    onChange={(e) => setEditItem((prev) => prev ? { ...prev, base_price: parseFloat(e.target.value) || 0 } : prev)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Category</Label>
                <select
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                  value={editItem?.category_id ?? ''}
                  onChange={(e) => setEditItem((prev) => prev ? { ...prev, category_id: e.target.value || undefined } : prev)}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description</Label>
              <Input
                value={editItem?.description ?? ''}
                onChange={(e) => setEditItem((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">SKU</Label>
              <Input
                value={editItem?.sku ?? ''}
                onChange={(e) => setEditItem((prev) => prev ? { ...prev, sku: e.target.value } : prev)}
                placeholder="Optional SKU / barcode"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditItem((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-all',
                  editItem?.is_active ? 'border-success bg-success-tint text-success' : 'border-border text-muted-foreground'
                )}
              >
                {editItem?.is_active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {editItem?.is_active ? 'Available' : 'Unavailable'}
              </button>
            </div>
          </div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => { setEditItemOpen(false); setEditItem(null); }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={saving} onClick={handleSaveItem}>
              {saving ? 'Saving...' : editItem?.id ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Category Dialog ── */}
      <Dialog open={editCategoryOpen} onOpenChange={(o) => { if (!o) { setEditCategoryOpen(false); setEditCategory(null); } }}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-base font-bold">{editCategory?.id ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => { setEditCategoryOpen(false); setEditCategory(null); }} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name *</Label>
              <Input
                value={editCategory?.name ?? ''}
                onChange={(e) => setEditCategory((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="e.g. Burgers, Drinks..."
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description</Label>
              <Input
                value={editCategory?.description ?? ''}
                onChange={(e) => setEditCategory((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="flex gap-3 px-5 py-4 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => { setEditCategoryOpen(false); setEditCategory(null); }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={saving} onClick={handleSaveCategory}>
              {saving ? 'Saving...' : editCategory?.id ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Item row card ──
function CatalogItemRow({ item, categoryName, onEdit }: { item: Item; categoryName?: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-primary/30 hover:shadow-pos transition-all">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Tag className="h-5 w-5 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
          <Badge className={cn('text-[10px] border-0 shrink-0', item.is_active ? 'bg-success-tint text-success' : 'bg-muted text-muted-foreground')}>
            {item.is_active ? 'Active' : 'Off'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{categoryName ?? 'Uncategorized'}</p>
        {item.sku && <p className="text-[10px] text-muted-foreground/60">SKU: {item.sku}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-foreground">{formatCurrency(item.base_price)}</span>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={`Edit ${item.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Category row card ──
function CategoryRow({ category, itemCount, onEdit }: { category: Category; itemCount: number; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-3 hover:border-primary/30 hover:shadow-pos transition-all">
      <div className="w-10 h-10 rounded-lg bg-primary-tint flex items-center justify-center shrink-0">
        <LayoutGrid className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{category.name}</p>
        <p className="text-xs text-muted-foreground">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
      </div>
      <button
        onClick={onEdit}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label={`Edit ${category.name}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
