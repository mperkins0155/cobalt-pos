// ============================================================
// CloudPos — Inventory Page
// Phase 0D: Built from stub + prototype InventoryPage
// Data: InventoryService.getInventory()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryService } from '@/services/inventory';
import { formatCurrency } from '@/lib/calculations';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { Package, AlertTriangle } from 'lucide-react';
import type { InventoryRecord } from '@/types/database';

/** Stock level classification */
function stockLevel(record: InventoryRecord): { label: string; cls: string } {
  const qty = record.quantity_on_hand;
  const threshold = record.low_stock_threshold ?? 10;
  if (qty <= 0) return { label: 'Empty', cls: 'text-destructive bg-destructive/10' };
  if (qty <= threshold) return { label: 'Low', cls: 'text-warning bg-warning-tint' };
  if (qty <= threshold * 2) return { label: 'Medium', cls: 'text-primary bg-primary-tint' };
  return { label: 'High', cls: 'text-success bg-success-tint' };
}

export default function Inventory() {
  const { organization, currentLocation } = useAuth();
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    if (!organization || !currentLocation) return;
    const load = async () => {
      try {
        const data = await InventoryService.getInventory(
          organization.id,
          currentLocation.id
        );
        setRecords(data);
      } catch (err) {
        console.error('Inventory load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organization, currentLocation]);

  // Compute level counts
  const levelCounts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    for (const r of records) {
      const lvl = stockLevel(r).label.toLowerCase();
      c[lvl] = (c[lvl] || 0) + 1;
    }
    return c;
  }, [records]);

  // Filter
  const filtered = useMemo(() => {
    let result = records;
    if (levelFilter !== 'all') {
      result = result.filter((r) => stockLevel(r).label.toLowerCase() === levelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.item?.name || '').toLowerCase().includes(q) ||
          (r.item?.sku || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, levelFilter, search]);

  const filterTabs = [
    { key: 'all', label: 'All', count: levelCounts.all || 0 },
    { key: 'low', label: 'Low', count: levelCounts.low || 0 },
    { key: 'empty', label: 'Empty', count: levelCounts.empty || 0 },
    { key: 'medium', label: 'Medium', count: levelCounts.medium || 0 },
    { key: 'high', label: 'High', count: levelCounts.high || 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Inventory</h2>
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search item name or SKU" />
        <FilterPills items={filterTabs} active={levelFilter} onChange={setLevelFilter} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title="No inventory items"
          description={search ? `No results for "${search}"` : 'Inventory records will appear when items are stocked.'}
        />
      ) : (
        <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
          {filtered.map((record) => {
            const level = stockLevel(record);
            return (
              <div
                key={record.id}
                className="bg-card rounded-lg border border-border p-3.5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {record.item?.name || 'Unknown Item'}
                    </p>
                    {record.item?.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {record.item.sku}</p>
                    )}
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 font-semibold border-0 shrink-0 ${level.cls}`}>
                    {level.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Qty: <span className="font-semibold text-foreground">{record.quantity_on_hand}</span>
                    {record.low_stock_threshold != null && (
                      <> / threshold: {record.low_stock_threshold}</>
                    )}
                  </span>
                  {record.item?.base_price != null && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(record.item.base_price)}
                    </span>
                  )}
                </div>
                {record.quantity_on_hand <= (record.low_stock_threshold ?? 10) && record.quantity_on_hand > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Low stock — reorder recommended
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
