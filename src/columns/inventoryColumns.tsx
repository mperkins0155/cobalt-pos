import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import type { DataTableColumn } from '@/components/DataTable';
import type { InventoryRecord } from '@/types/database';

function stockBadge(qty: number, threshold?: number | null) {
  const t = threshold ?? 10;
  if (qty <= 0) return 'border-destructive/20 bg-destructive-tint text-destructive';
  if (qty <= t) return 'border-warning/20 bg-warning-tint text-warning';
  return 'border-success/20 bg-success-tint text-success';
}

function stockLabel(qty: number, threshold?: number | null) {
  const t = threshold ?? 10;
  if (qty <= 0) return 'Out';
  if (qty <= t) return 'Low';
  return 'In Stock';
}

export const inventoryColumns: DataTableColumn<InventoryRecord>[] = [
  {
    key: 'item',
    header: 'Item',
    sortable: true,
    sortValue: (r) => r.item?.name || '',
    cell: (r) => <span className="font-semibold text-foreground">{r.item?.name || 'Unknown'}</span>,
  },
  {
    key: 'sku',
    header: 'SKU',
    className: 'hidden pos-tablet:table-cell',
    cell: (r) => (
      <span className="font-mono text-xs text-muted-foreground">{r.item?.sku || '—'}</span>
    ),
  },
  {
    key: 'quantity',
    header: 'On Hand',
    sortable: true,
    sortValue: (r) => r.quantity_on_hand,
    className: 'text-right',
    cell: (r) => <span className="tabular-nums font-semibold">{r.quantity_on_hand}</span>,
  },
  {
    key: 'stock_level',
    header: 'Status',
    cell: (r) => (
      <Badge className={stockBadge(r.quantity_on_hand, r.low_stock_threshold)}>
        {stockLabel(r.quantity_on_hand, r.low_stock_threshold)}
      </Badge>
    ),
  },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    sortValue: (r) => r.item?.price || 0,
    className: 'text-right hidden pos-tablet:table-cell',
    cell: (r) => (
      <span className="tabular-nums">{r.item?.price ? formatCurrency(r.item.price) : '—'}</span>
    ),
  },
  {
    key: 'threshold',
    header: 'Low At',
    className: 'text-right hidden pos-desktop:table-cell',
    cell: (r) => (
      <span className="tabular-nums text-muted-foreground">{r.low_stock_threshold ?? '—'}</span>
    ),
  },
];
