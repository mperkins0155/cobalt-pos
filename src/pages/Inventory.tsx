// ============================================================
// CloudPos — Inventory Page
// Figma Screen 72: Food card grid + left filter sidebar
// Tabs: Menu / Ingredients / Request List
// Filters: Dish Status, Stock Level, Category
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogService } from '@/services/catalog';
import { InventoryService } from '@/services/inventory';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SearchBar, EmptyState } from '@/components/pos';
import { Package, Plus, Tag, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Item, Category } from '@/types/database';

type TabKey = 'menu' | 'ingredients' | 'requests';
type StatusFilter = 'all' | 'available' | 'unavailable';
type StockFilter = 'all' | 'low' | 'medium' | 'high' | 'empty';

function stockBadge(qty: number, threshold: number) {
  if (qty <= 0) return { label: 'Empty',  cls: 'text-destructive bg-destructive/10',   icon: XCircle };
  if (qty <= threshold) return { label: 'Low',  cls: 'text-warning bg-warning-tint',   icon: AlertTriangle };
  if (qty <= threshold * 2) return { label: 'Medium', cls: 'text-primary bg-primary-tint', icon: AlertTriangle };
  return { label: 'High', cls: 'text-success bg-success-tint', icon: CheckCircle };
}

export default function Inventory() {
  const { organization, currentLocation } = useAuth();
  const [tab, setTab] = useState<TabKey>('menu');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      try {
        const [cats, itms] = await Promise.all([
          CatalogService.getCategories(organization.id),
          CatalogService.getItems(organization.id),
        ]);
        setCategories(cats);
        // Get ALL items (including inactive)
        setItems(itms);
      } catch {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    })();
  }, [organization]);

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter === 'available')   result = result.filter((i) => i.is_active);
    if (statusFilter === 'unavailable') result = result.filter((i) => !i.is_active);
    if (categoryFilter !== 'all') result = result.filter((i) => i.category_id === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q));
    }
    return result;
  }, [items, statusFilter, categoryFilter, search]);

  const resetFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setSearch('');
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'menu',        label: 'Menu' },
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'requests',    label: 'Request List' },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Left filter sidebar (desktop) ── */}
      <div className="hidden pos-desktop:flex flex-col w-[220px] shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Dish Status */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Dish Status</h4>
            <div className="space-y-1">
              {(['all', 'available', 'unavailable'] as StatusFilter[]).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors
                    ${statusFilter === s ? 'bg-primary-tint text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {s === 'all' ? 'All' : s === 'available' ? 'Available' : 'Not Available'}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Level */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Stock Level</h4>
            <div className="space-y-1">
              {(['all', 'low', 'medium', 'high', 'empty'] as StockFilter[]).map((s) => (
                <button key={s} onClick={() => setStockFilter(s)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors
                    ${stockFilter === s ? 'bg-primary-tint text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">Category</h4>
            <div className="space-y-1">
              <button onClick={() => setCategoryFilter('all')}
                className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors
                  ${categoryFilter === 'all' ? 'bg-primary-tint text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                All
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md transition-colors
                    ${categoryFilter === c.id ? 'bg-primary-tint text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filter
          </Button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Inventory</h2>
            </div>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add New Dish
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border -mb-4">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-all
                  ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search (inside content area, below tabs) */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <SearchBar value={search} onChange={setSearch} placeholder="Search dish name or SKU" />
        </div>

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {tab !== 'menu' ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">{tab === 'ingredients' ? 'Ingredients' : 'Request List'}</p>
              <p className="text-sm mt-1">Coming soon</p>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[180px] rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Package className="h-10 w-10" />} title="No items found"
              description={search ? `No results for "${search}"` : 'Add dishes to your catalog to get started.'} />
          ) : (
            <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3 pb-20 pos-tablet:pb-4">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => setSelected(item)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dish Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end pos-tablet:items-center justify-center p-0 pos-tablet:p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-card rounded-t-2xl pos-tablet:rounded-2xl w-full pos-tablet:max-w-md p-5 shadow-pos-lg"
            onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            <div className="w-full h-40 rounded-xl overflow-hidden bg-muted mb-4">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tag className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-lg font-bold text-foreground">{selected.name}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selected.is_active ? 'bg-success-tint text-success' : 'bg-destructive/10 text-destructive'}`}>
                {selected.is_active ? 'Available' : 'Not Available'}
              </span>
            </div>
            {selected.description && <p className="text-sm text-muted-foreground mb-3">{selected.description}</p>}
            <div className="flex items-center justify-between py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-base font-bold text-primary">{formatCurrency(selected.base_price)}</span>
            </div>
            {selected.sku && (
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-sm text-muted-foreground">SKU</span>
                <span className="text-sm font-mono">{selected.sku}</span>
              </div>
            )}
            <Button className="w-full mt-4" variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-left bg-card rounded-xl border border-border overflow-hidden hover:shadow-pos hover:border-primary/30 transition-all">
      {/* Image */}
      <div className="w-full h-32 bg-muted relative">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
        {/* Availability badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
            ${item.is_active ? 'bg-success text-white' : 'bg-destructive text-white'}`}>
            {item.is_active ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>
      {/* Info */}
      <div className="p-2.5">
        <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
        <p className="text-sm font-bold text-primary">{formatCurrency(item.base_price)}</p>
      </div>
    </button>
  );
}
