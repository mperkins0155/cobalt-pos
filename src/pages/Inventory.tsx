// ============================================================
// CloudPos — Inventory Page
// Screen 72: Food card grid with availability badges + stock levels
// Left sidebar filters: Status / Stock Level / Category
// Top tabs: Menu / Ingredients / Request List
// Detail Dish modal overlay
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogService } from '@/services/catalog';
import { InventoryService } from '@/services/inventory';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SearchBar, EmptyState } from '@/components/pos';
import { toast } from 'sonner';
import {
  Package, Plus, X, Tag, AlertTriangle,
  ChevronRight, RefreshCw, BarChart2, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Item, Category, InventoryRecord } from '@/types/database';

type MainTab = 'menu' | 'ingredients' | 'requests';
type StatusFilter = 'all' | 'available' | 'unavailable';
type StockFilter = 'all' | 'empty' | 'low' | 'medium' | 'high';

function stockLevel(record?: InventoryRecord): { label: string; cls: string; dotCls: string; rank: number } {
  if (!record) return { label: 'N/A', cls: 'text-muted-foreground bg-muted', dotCls: 'bg-muted-foreground', rank: -1 };
  const qty = record.quantity_on_hand;
  const thresh = record.low_stock_threshold ?? 10;
  if (qty <= 0)       return { label: 'Empty',  cls: 'text-destructive bg-destructive/10',  dotCls: 'bg-destructive',  rank: 0 };
  if (qty <= thresh)  return { label: 'Low',    cls: 'text-warning bg-warning-tint',         dotCls: 'bg-warning',     rank: 1 };
  if (qty <= thresh * 2) return { label: 'Medium', cls: 'text-primary bg-primary-tint',     dotCls: 'bg-primary',     rank: 2 };
  return               { label: 'High',   cls: 'text-success bg-success-tint',              dotCls: 'bg-success',     rank: 3 };
}

export default function Inventory() {
  const { organization, currentLocation } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>('menu');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const [catsRes, itemsRes] = await Promise.all([
          CatalogService.getCategories(organization.id),
          CatalogService.getItems(organization.id),
        ]);
        setCategories(catsRes);
        setItems(itemsRes);

        if (currentLocation) {
          try {
            const inv = await InventoryService.getInventory(organization.id, currentLocation.id);
            setInventory(inv);
          } catch { /* no inventory records yet */ }
        }
      } catch {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization, currentLocation]);

  // Build inventory map: item_id → record
  const inventoryMap = useMemo(() => {
    const m = new Map<string, InventoryRecord>();
    for (const r of inventory) if (r.item_id) m.set(r.item_id, r);
    return m;
  }, [inventory]);

  // Filtered items
  const filtered = useMemo(() => {
    let result = items;

    // Status filter
    if (statusFilter === 'available')   result = result.filter((i) => i.is_active);
    if (statusFilter === 'unavailable') result = result.filter((i) => !i.is_active);

    // Category filter
    if (categoryFilter !== 'all') result = result.filter((i) => i.category_id === categoryFilter);

    // Stock filter
    if (stockFilter !== 'all') {
      result = result.filter((i) => {
        const rec = inventoryMap.get(i.id);
        const lvl = stockLevel(rec).label.toLowerCase();
        return lvl === stockFilter;
      });
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q));
    }

    return result;
  }, [items, statusFilter, categoryFilter, stockFilter, search, inventoryMap]);

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || search !== '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top tabs */}
      <div className="shrink-0 flex border-b border-border bg-card">
        {(['menu', 'ingredients', 'requests'] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-semibold capitalize border-b-2 transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'menu' ? 'Menu' : tab === 'ingredients' ? 'Ingredients' : 'Request List'}
          </button>
        ))}
      </div>

      {activeTab !== 'menu' ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<BarChart2 className="h-10 w-10" />}
            title={activeTab === 'ingredients' ? 'Ingredients tracking' : 'Request List'}
            description="This section is coming in a future update."
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left sidebar filter ── */}
          {sidebarOpen && (
            <div className="hidden pos-tablet:flex flex-col w-56 border-r border-border bg-card shrink-0 overflow-y-auto">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Dish Status */}
              <div className="px-4 pb-4 border-b border-border">
                <p className="text-xs font-semibold text-foreground mb-2">Dish Status</p>
                {([['all', 'All'], ['available', 'Available'], ['unavailable', 'Not Available']] as [StatusFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={cn(
                      'w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-sm transition-colors',
                      statusFilter === key ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {label}
                    {statusFilter === key && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>

              {/* Stock Level */}
              <div className="px-4 py-4 border-b border-border">
                <p className="text-xs font-semibold text-foreground mb-2">Stock Level</p>
                {([
                  ['all',    'All',    ''],
                  ['empty',  'Empty',  'bg-destructive'],
                  ['low',    'Low',    'bg-warning'],
                  ['medium', 'Medium', 'bg-primary'],
                  ['high',   'High',   'bg-success'],
                ] as [StockFilter, string, string][]).map(([key, label, dotCls]) => (
                  <button
                    key={key}
                    onClick={() => setStockFilter(key)}
                    className={cn(
                      'w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors',
                      stockFilter === key ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {dotCls && <span className={`w-2 h-2 rounded-full ${dotCls}`} />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Category */}
              <div className="px-4 py-4">
                <p className="text-xs font-semibold text-foreground mb-2">Category</p>
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    'w-full text-left py-1.5 px-2 rounded-lg text-sm transition-colors',
                    categoryFilter === 'all' ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      'w-full text-left py-1.5 px-2 rounded-lg text-sm transition-colors',
                      categoryFilter === cat.id ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Main content ── */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} placeholder="Search dishes..." />
              </div>
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className={cn(
                  'hidden pos-tablet:flex items-center gap-1.5 px-3 h-10 rounded-lg border text-sm font-medium transition-colors',
                  sidebarOpen ? 'border-primary bg-primary-tint text-primary' : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>
              <Button size="sm" className="shrink-0">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden pos-tablet:inline">Add New Dish</span>
                <span className="pos-tablet:hidden">Add</span>
              </Button>
            </div>

            {/* Food card grid */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {loading ? (
                  <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={<Package className="h-10 w-10" />}
                    title="No dishes found"
                    description={hasActiveFilters ? 'Try adjusting your filters.' : 'Add dishes to get started.'}
                  />
                ) : (
                  <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3 pb-20 pos-tablet:pb-4">
                    {filtered.map((item) => {
                      const rec = inventoryMap.get(item.id);
                      const lvl = stockLevel(rec);
                      return (
                        <InventoryItemCard
                          key={item.id}
                          item={item}
                          stockLabel={lvl.label}
                          stockCls={lvl.cls}
                          stockDot={lvl.dotCls}
                          onDetail={() => { setDetailItem(item); setDetailOpen(true); }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* ── Detail Dish Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[85vh] flex flex-col">
          {/* Image */}
          {detailItem?.image_url ? (
            <img src={detailItem.image_url} alt={detailItem.name} className="w-full h-44 object-cover shrink-0" />
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center shrink-0">
              <Tag className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-5">
              {/* Dish info */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{detailItem?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {categories.find((c) => c.id === detailItem?.category_id)?.name ?? 'Uncategorized'}
                  </p>
                </div>
                <span className="text-lg font-bold text-primary shrink-0">
                  {formatCurrency(detailItem?.base_price ?? 0)}
                </span>
              </div>

              {detailItem?.description && (
                <p className="text-sm text-muted-foreground mb-4">{detailItem.description}</p>
              )}

              {/* Availability badge */}
              <div className="flex items-center gap-2 mb-4">
                <Badge className={cn('border-0', detailItem?.is_active ? 'bg-success-tint text-success' : 'bg-destructive/10 text-destructive')}>
                  {detailItem?.is_active ? 'Available' : 'Not Available'}
                </Badge>
                {detailItem && inventoryMap.get(detailItem.id) && (
                  <Badge className={cn('border-0', stockLevel(inventoryMap.get(detailItem.id)).cls)}>
                    {stockLevel(inventoryMap.get(detailItem.id)).label} Stock
                  </Badge>
                )}
              </div>

              {/* Stock details */}
              {detailItem && inventoryMap.get(detailItem.id) && (
                <div className="bg-card rounded-xl border border-border p-4 mb-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Inventory</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantity on hand</span>
                      <span className="font-semibold">{inventoryMap.get(detailItem.id)!.quantity_on_hand}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Low stock threshold</span>
                      <span className="font-semibold">{inventoryMap.get(detailItem.id)!.low_stock_threshold ?? 10}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Servings / SKU */}
              <div className="grid grid-cols-2 gap-3">
                {detailItem?.sku && (
                  <div className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">SKU</p>
                    <p className="text-sm font-bold">{detailItem.sku}</p>
                  </div>
                )}
                <div className="bg-card rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Cost</p>
                  <p className="text-sm font-bold">{detailItem?.cost_price ? formatCurrency(detailItem?.cost) : '—'}</p>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            <Button className="flex-1">
              Edit Dish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Inventory item card ──
function InventoryItemCard({
  item, stockLabel, stockCls, stockDot, onDetail,
}: {
  item: Item;
  stockLabel: string;
  stockCls: string;
  stockDot: string;
  onDetail: () => void;
}) {
  return (
    <div className="relative bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-pos transition-all group">
      {/* Availability badge */}
      <div className="absolute top-2 left-2 z-10">
        <Badge
          className={cn(
            'text-[10px] font-semibold border-0 px-1.5 py-0.5',
            item.is_active ? 'bg-success/90 text-white' : 'bg-destructive/90 text-white'
          )}
        >
          {item.is_active ? 'Available' : 'Unavailable'}
        </Badge>
      </div>

      {/* Expand button */}
      <button
        onClick={onDetail}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="View details"
      >
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Image */}
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-muted flex items-center justify-center">
          <Tag className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground line-clamp-1 mb-1">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">{formatCurrency(item.base_price)}</span>
          {/* Stock level dot + label */}
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${stockDot}`} />
            <span className={`text-[10px] font-semibold ${stockCls.split(' ')[0]}`}>{stockLabel}</span>
          </div>
        </div>
        {stockLabel === 'Low' || stockLabel === 'Empty' ? (
          <div className="flex items-center gap-1 mt-1.5">
            <AlertTriangle className="h-3 w-3 text-warning" />
            <span className="text-[10px] text-warning font-medium">Restock needed</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
