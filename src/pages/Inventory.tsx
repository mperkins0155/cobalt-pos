// ============================================================
// CloudPos — Inventory Page
// Figma spec: Screen 72 — food card grid with images,
// left filter sidebar (status/stock level/category), tabs (Menu/Ingredients/Requests)
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search, SlidersHorizontal, RotateCcw, Tag, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogService } from '@/services/catalog';
import { InventoryService } from '@/services/inventory';
import { formatCurrency } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/pos';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { Category, Item } from '@/types/database';

type StockLevel = 'all' | 'high' | 'medium' | 'low' | 'empty';
type AvailFilter = 'all' | 'available' | 'unavailable';
type TabKey = 'menu' | 'ingredients' | 'requests';

function stockLevelOf(qty: number, threshold: number): StockLevel {
  if (qty <= 0) return 'empty';
  if (qty <= threshold) return 'low';
  if (qty <= threshold * 2) return 'medium';
  return 'high';
}

const STOCK_CFG: Record<string, { label: string; pill: string; dot: string }> = {
  high:   { label: 'High',   pill: 'text-success bg-success-tint',   dot: 'bg-success' },
  medium: { label: 'Medium', pill: 'text-primary bg-primary-tint',   dot: 'bg-primary' },
  low:    { label: 'Low',    pill: 'text-warning bg-warning-tint',   dot: 'bg-warning' },
  empty:  { label: 'Empty',  pill: 'text-destructive bg-destructive/10', dot: 'bg-destructive' },
};

/* ── Item card ── */
function ItemCard({ item, stockQty, onClick }: { item: Item; stockQty: number; onClick: () => void }) {
  const threshold = 10;
  const level = stockLevelOf(stockQty, threshold);
  const cfg = STOCK_CFG[level];
  const isAvailable = item.is_active !== false;

  return (
    <button
      onClick={onClick}
      className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-pos transition-shadow text-left group"
    >
      {/* Image */}
      {item.image_url ? (
        <div className="relative">
          <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover" />
          <div className={cn(
            'absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full',
            isAvailable ? 'text-success bg-success-tint' : 'text-muted-foreground bg-muted'
          )}>
            {isAvailable ? 'Available' : 'Unavailable'}
          </div>
        </div>
      ) : (
        <div className="relative w-full h-32 bg-muted flex items-center justify-center">
          <Tag className="h-8 w-8 text-muted-foreground" />
          <div className={cn(
            'absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full',
            isAvailable ? 'text-success bg-success-tint' : 'text-muted-foreground bg-muted'
          )}>
            {isAvailable ? 'Available' : 'Unavailable'}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <div className="text-sm font-semibold text-foreground truncate mb-1">{item.name}</div>
        <div className="text-sm font-bold text-primary mb-2">{formatCurrency(item.base_price)}</div>
        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cfg.pill)}>
            {cfg.label} Stock
          </span>
          <span className="text-xs text-muted-foreground">{stockQty} left</span>
        </div>
      </div>
    </button>
  );
}

/* ── Filter sidebar ── */
function FilterSidebar({
  categories, activeCategory, setCategory,
  stockLevel, setStockLevel,
  availability, setAvailability,
  onReset,
}: {
  categories: Category[];
  activeCategory: string; setCategory: (v: string) => void;
  stockLevel: StockLevel; setStockLevel: (v: StockLevel) => void;
  availability: AvailFilter; setAvailability: (v: AvailFilter) => void;
  onReset: () => void;
}) {
  const hasFilter = activeCategory !== 'all' || stockLevel !== 'all' || availability !== 'all';
  return (
    <div className="w-52 shrink-0 border-r border-border bg-card overflow-y-auto p-4 space-y-5">
      {/* Dish status */}
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Dish Status</div>
        {(['all', 'available', 'unavailable'] as AvailFilter[]).map(v => (
          <button
            key={v}
            onClick={() => setAvailability(v)}
            className={cn(
              'w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors mb-0.5',
              availability === v ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
            )}
          >
            {v === 'all' ? 'All' : v === 'available' ? 'Available' : 'Not Available'}
          </button>
        ))}
      </div>

      {/* Stock level */}
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Stock Level</div>
        {(['all', 'high', 'medium', 'low', 'empty'] as StockLevel[]).map(v => (
          <button
            key={v}
            onClick={() => setStockLevel(v)}
            className={cn(
              'w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors mb-0.5 flex items-center gap-2',
              stockLevel === v ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
            )}
          >
            {v !== 'all' && <span className={cn('w-2 h-2 rounded-full shrink-0', STOCK_CFG[v].dot)} />}
            {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Category */}
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Category</div>
        <button
          onClick={() => setCategory('all')}
          className={cn(
            'w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors mb-0.5',
            activeCategory === 'all' ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
          )}
        >All</button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              'w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors mb-0.5',
              activeCategory === c.id ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Reset */}
      {hasFilter && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
        </button>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function Inventory() {
  const { organization, currentLocation } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('menu');
  const [category, setCategory] = useState('all');
  const [stockLevel, setStockLevel] = useState<StockLevel>('all');
  const [availability, setAvailability] = useState<AvailFilter>('all');
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const [cats, itms] = await Promise.all([
          CatalogService.getCategories(organization.id),
          CatalogService.getItems(organization.id),
        ]);
        setCategories(cats);
        setItems(itms);
        // Load inventory quantities if location available
        if (currentLocation) {
          try {
            const inv = await InventoryService.getInventory(organization.id, currentLocation.id);
            const map = new Map<string, number>();
            for (const r of inv) { if (r.item_id) map.set(r.item_id, r.quantity_on_hand); }
            setStockMap(map);
          } catch { /* inventory not critical */ }
        }
      } catch { toast.error('Failed to load inventory'); }
      finally { setLoading(false); }
    };
    void load();
  }, [organization, currentLocation]);

  const filtered = useMemo(() => {
    let r = items;
    if (category !== 'all') r = r.filter(i => i.category_id === category);
    if (availability === 'available') r = r.filter(i => i.is_active !== false);
    else if (availability === 'unavailable') r = r.filter(i => i.is_active === false);
    if (stockLevel !== 'all') {
      r = r.filter(i => {
        const qty = stockMap.get(i.id) ?? 99;
        return stockLevelOf(qty, 10) === stockLevel;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(i => i.name.toLowerCase().includes(q) || (i.sku || '').toLowerCase().includes(q));
    }
    return r;
  }, [items, category, availability, stockLevel, search, stockMap]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'menu', label: 'Menu' },
    { key: 'ingredients', label: 'Ingredients' },
    { key: 'requests', label: 'Request List' },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter sidebar — desktop always, mobile toggleable */}
      {showSidebar && (
        <div className="hidden pos-tablet:flex">
          <FilterSidebar
            categories={categories}
            activeCategory={category} setCategory={setCategory}
            stockLevel={stockLevel} setStockLevel={setStockLevel}
            availability={availability} setAvailability={setAvailability}
            onReset={() => { setCategory('all'); setStockLevel('all'); setAvailability('all'); }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-4 pos-tablet:p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Inventory</h2>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add New Dish
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-3">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                  activeTab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search item name or SKU..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5">
          {activeTab === 'menu' && (
            loading ? (
              <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<Package className="h-10 w-10" />} title="No items found"
                description={search ? `No results for "${search}"` : 'Add items to your catalog to get started.'} />
            ) : (
              <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3 pb-20 pos-tablet:pb-4">
                {filtered.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    stockQty={stockMap.get(item.id) ?? 99}
                    onClick={() => {}}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'ingredients' && (
            <EmptyState
              icon={<SlidersHorizontal className="h-10 w-10" />}
              title="Ingredients tracking"
              description="Ingredient-level inventory tracking will be available in V2."
            />
          )}

          {activeTab === 'requests' && (
            <EmptyState
              icon={<CheckCircle className="h-10 w-10" />}
              title="No pending requests"
              description="Stock request list is empty. Requests from low-stock alerts appear here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
