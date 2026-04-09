// ============================================================
// CloudPos — Inventory Page
// Screen 72: Food card grid with left filter sidebar
// Tabs: Menu / Ingredients / Request List
// Left sidebar: Dish Status, Stock Level, Category filters
// Main: food cards with image, availability badge, stock level
// Detail modal: dish info + ingredients list
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogService } from '@/services/catalog';
import { InventoryService } from '@/services/inventory';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SearchBar, EmptyState } from '@/components/pos';
import { toast } from 'sonner';
import {
  Package, Plus, X, Tag, RotateCcw,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, Item } from '@/types/database';
import type { InventoryRecord } from '@/types/database';

type Tab = 'menu' | 'ingredients' | 'requests';
type StatusFilter = 'all' | 'available' | 'unavailable';
type StockFilter = 'all' | 'high' | 'medium' | 'low' | 'empty';

function getStockLevel(record?: InventoryRecord): { label: StockFilter; cls: string; dotCls: string } {
  if (!record) return { label: 'high', cls: 'text-success bg-success-tint', dotCls: 'bg-success' };
  const qty = record.quantity_on_hand;
  const thresh = record.low_stock_threshold ?? 10;
  if (qty <= 0)          return { label: 'empty',  cls: 'text-destructive bg-destructive/10', dotCls: 'bg-destructive' };
  if (qty <= thresh)     return { label: 'low',    cls: 'text-warning bg-warning-tint',       dotCls: 'bg-warning' };
  if (qty <= thresh * 2) return { label: 'medium', cls: 'text-primary bg-primary-tint',       dotCls: 'bg-primary' };
  return                        { label: 'high',   cls: 'text-success bg-success-tint',       dotCls: 'bg-success' };
}

export default function Inventory() {
  const { organization, currentLocation } = useAuth();

  const [tab, setTab] = useState<Tab>('menu');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Detail modal
  const [detailItem, setDetailItem] = useState<Item | null>(null);

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

        if (currentLocation) {
          const inv = await InventoryService.getInventory(organization.id, currentLocation.id);
          setInventory(inv);
        }
      } catch {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization, currentLocation]);

  // Build inventory map for quick lookup
  const inventoryMap = useMemo(() => {
    const m = new Map<string, InventoryRecord>();
    for (const r of inventory) m.set(r.item_id, r);
    return m;
  }, [inventory]);

  const filtered = useMemo(() => {
    let result = items;

    if (statusFilter === 'available')   result = result.filter((i) => i.is_active);
    if (statusFilter === 'unavailable') result = result.filter((i) => !i.is_active);

    if (stockFilter !== 'all') {
      result = result.filter((i) => {
        const rec = inventoryMap.get(i.id);
        return getStockLevel(rec).label === stockFilter;
      });
    }

    if (categoryFilter !== 'all') result = result.filter((i) => i.category_id === categoryFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }

    return result;
  }, [items, statusFilter, stockFilter, categoryFilter, search, inventoryMap]);

  const resetFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* ── Left filter sidebar ── */}
      <div className={cn(
        'shrink-0 border-r border-border bg-card overflow-y-auto transition-all',
        sidebarOpen ? 'w-52' : 'w-0 overflow-hidden'
      )}>
        <div className="p-4 min-w-[208px]">
          {/* Sidebar header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Dish Status */}
          <FilterSection title="Dish Status">
            {(['all', 'available', 'unavailable'] as StatusFilter[]).map((s) => (
              <FilterOption
                key={s}
                label={s === 'all' ? 'All' : s === 'available' ? 'Available' : 'Not Available'}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </FilterSection>

          {/* Stock Level */}
          <FilterSection title="Stock Level">
            {(['all', 'high', 'medium', 'low', 'empty'] as StockFilter[]).map((s) => (
              <FilterOption
                key={s}
                label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                active={stockFilter === s}
                dot={s !== 'all' ? getStockLevel(s === 'empty' ? { quantity_on_hand: 0 } as InventoryRecord : s === 'low' ? { quantity_on_hand: 1, low_stock_threshold: 10 } as InventoryRecord : s === 'medium' ? { quantity_on_hand: 15, low_stock_threshold: 10 } as InventoryRecord : undefined).dotCls : undefined}
                onClick={() => setStockFilter(s)}
              />
            ))}
          </FilterSection>

          {/* Category */}
          <FilterSection title="Category">
            <FilterOption label="All" active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} />
            {categories.map((cat) => (
              <FilterOption
                key={cat.id}
                label={cat.name}
                active={categoryFilter === cat.id}
                count={items.filter((i) => i.category_id === cat.id).length}
                onClick={() => setCategoryFilter(cat.id)}
              />
            ))}
          </FilterSection>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
                aria-label="Toggle filters"
              >
                <Package className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-bold text-foreground">Inventory</h2>
            </div>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add New Dish
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            {(['menu', 'ingredients', 'requests'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <SearchBar value={search} onChange={setSearch} placeholder="Search item name..." />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'menu' && (
            <>
              {loading ? (
                <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Package className="h-10 w-10" />}
                  title="No items found"
                  description={hasActiveFilters ? 'Try adjusting your filters.' : 'Add menu items to see them here.'}
                />
              ) : (
                <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3 pb-20 pos-tablet:pb-4">
                  {filtered.map((item) => {
                    const rec = inventoryMap.get(item.id);
                    const stock = getStockLevel(rec);
                    return (
                      <InventoryItemCard
                        key={item.id}
                        item={item}
                        record={rec}
                        stockLevel={stock}
                        onClick={() => setDetailItem(item)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'ingredients' && (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="Ingredients tracking"
              description="Link ingredients to menu items in the item detail view."
            />
          )}

          {tab === 'requests' && (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="No pending requests"
              description="Ingredient restock requests will appear here."
            />
          )}
        </div>
      </div>

      {/* ── Detail modal ── */}
      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          record={inventoryMap.get(detailItem.id)}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

// ── Filter section ──
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full mb-2"
      >
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function FilterOption({
  label, active, onClick, count, dot,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all',
        active ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
      )}
    >
      <span className="flex items-center gap-2">
        {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[11px] text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

// ── Inventory item card ──
function InventoryItemCard({
  item, record, stockLevel, onClick,
}: {
  item: Item;
  record?: InventoryRecord;
  stockLevel: { label: StockFilter; cls: string; dotCls: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-pos transition-all text-left group"
    >
      {/* Image */}
      <div className="relative">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover" />
        ) : (
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            <Tag className="h-7 w-7 text-muted-foreground/40" />
          </div>
        )}
        {/* Availability badge */}
        <div className={cn(
          'absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full',
          item.is_active ? 'bg-success text-white' : 'bg-destructive text-white'
        )}>
          {item.is_active ? 'Available' : 'Unavailable'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground truncate mb-1">{item.name}</p>
        <p className="text-sm font-bold text-primary mb-2">{formatCurrency(item.base_price)}</p>

        {/* Stock badge */}
        <div className="flex items-center justify-between">
          <Badge className={cn('border-0 text-[10px]', stockLevel.cls)}>
            {stockLevel.label.charAt(0).toUpperCase() + stockLevel.label.slice(1)}
            {record && ` (${record.quantity_on_hand})`}
          </Badge>
          {stockLevel.label === 'low' || stockLevel.label === 'empty' ? (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ── Item detail modal ──
function ItemDetailModal({
  item, record, onClose,
}: {
  item: Item;
  record?: InventoryRecord;
  onClose: () => void;
}) {
  const stock = getStockLevel(record);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Image */}
        <div className="relative shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-44 object-cover" />
          ) : (
            <div className="w-full h-44 bg-muted flex items-center justify-center">
              <Tag className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Item info */}
          <div>
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
              <span className="text-lg font-bold text-primary">{formatCurrency(item.base_price)}</span>
            </div>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Status</p>
              <Badge className={cn('border-0 text-xs', item.is_active ? 'bg-success-tint text-success' : 'bg-destructive/10 text-destructive')}>
                {item.is_active ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Stock Level</p>
              <Badge className={cn('border-0 text-xs', stock.cls)}>
                {stock.label.charAt(0).toUpperCase() + stock.label.slice(1)}
              </Badge>
            </div>
            {record && (
              <>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">On Hand</p>
                  <p className="text-base font-bold text-foreground">{record.quantity_on_hand}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Low Threshold</p>
                  <p className="text-base font-bold text-foreground">{record.low_stock_threshold ?? '—'}</p>
                </div>
              </>
            )}
          </div>

          {/* Ingredients placeholder */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-2">Ingredients</h4>
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">No ingredients linked yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Link ingredients to track usage automatically.</p>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1">Edit Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
