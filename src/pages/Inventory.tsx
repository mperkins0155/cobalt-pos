import { toast } from '@/components/ui/sonner';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryService } from '@/services/inventory';
import { formatCurrency } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { SearchBar, FilterPills } from '@/components/pos';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import type { InventoryRecord } from '@/types/database';

function stockLevel(record: InventoryRecord): { label: string; cls: string; rank: number } {
  const qty = record.quantity_on_hand;
  const threshold = record.low_stock_threshold ?? 10;
  if (qty <= 0) return { label: 'Empty', cls: 'text-destructive bg-destructive/10', rank: 0 };
  if (qty <= threshold) return { label: 'Low', cls: 'text-warning bg-warning-tint', rank: 1 };
  if (qty <= threshold * 2) return { label: 'Medium', cls: 'text-primary bg-primary-tint', rank: 2 };
  return { label: 'High', cls: 'text-success bg-success-tint', rank: 3 };
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
        const data = await InventoryService.getInventory(organization.id, currentLocation.id);
        setRecords(data);
      } catch (err) {
        console.error('Inventory load error:', err);
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization, currentLocation]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: records.length };
    for (const record of records) {
      const key = stockLevel(record).label.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [records]);

  const filtered = useMemo(() => {
    let result = records;
    if (levelFilter !== 'all') {
      result = result.filter((record) => stockLevel(record).label.toLowerCase() === levelFilter);
    }
    if (search.trim()) {
      const normalized = search.toLowerCase();
      result = result.filter(
        (record) =>
          (record.item?.name || '').toLowerCase().includes(normalized) ||
          (record.item?.sku || '').toLowerCase().includes(normalized)
      );
    }
    return result;
  }, [levelFilter, records, search]);

  const filterTabs = [
    { key: 'all', label: 'All', count: levelCounts.all || 0 },
    { key: 'empty', label: 'Empty', count: levelCounts.empty || 0 },
    { key: 'low', label: 'Low', count: levelCounts.low || 0 },
    { key: 'medium', label: 'Medium', count: levelCounts.medium || 0 },
    { key: 'high', label: 'High', count: levelCounts.high || 0 },
  ];

  const columns = useMemo<DataTableColumn<InventoryRecord>[]>(() => [
    {
      key: 'item',
      header: 'Item',
      sortable: true,
      sortValue: (record) => record.item?.name || '',
      cell: (record) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">
            {record.item?.name || 'Unknown item'}
            {record.variant?.name ? ` (${record.variant.name})` : ''}
          </div>
          <div className="text-xs text-muted-foreground">
            {record.item?.sku ? `SKU: ${record.item.sku}` : 'No SKU'}
          </div>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Stock',
      sortable: true,
      className: 'w-[120px]',
      sortValue: (record) => record.quantity_on_hand,
      cell: (record) => (
        <span className="font-medium tabular-nums">{record.quantity_on_hand}</span>
      ),
    },
    {
      key: 'threshold',
      header: 'Threshold',
      sortable: true,
      className: 'w-[120px]',
      sortValue: (record) => record.low_stock_threshold ?? 0,
      cell: (record) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {record.low_stock_threshold ?? '—'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      className: 'w-[120px]',
      sortValue: (record) => record.item?.base_price ?? 0,
      cell: (record) => (
        <span className="font-medium tabular-nums">
          {record.item?.base_price != null ? formatCurrency(record.item.base_price) : '—'}
        </span>
      ),
    },
    {
      key: 'level',
      header: 'Level',
      sortable: true,
      className: 'w-[130px]',
      sortValue: (record) => stockLevel(record).rank,
      cell: (record) => {
        const level = stockLevel(record);
        return (
          <div className="flex items-center gap-2">
            <Badge className={`border-0 ${level.cls}`}>{level.label}</Badge>
            {level.label !== 'High' && (
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            )}
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Inventory</h2>
      </div>

      <div className="mb-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search item name or SKU" />
        <FilterPills items={filterTabs} active={levelFilter} onChange={setLevelFilter} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        rowKey={(record) => record.id}
        emptyTitle="No inventory items"
        emptyDescription={search ? `No results for "${search}"` : 'Inventory records will appear when items are stocked.'}
        emptyIcon={<Package className="h-10 w-10" />}
      />
    </div>
  );
}
