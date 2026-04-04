import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';
import type { DataTableColumn } from '@/components/DataTable';
import type { PurchaseOrder } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'text-muted-foreground',
  submitted: 'border-primary/20 bg-primary-tint text-primary',
  approved: 'border-success/20 bg-success-tint text-success',
  ordered: 'border-primary/20 bg-primary-tint text-primary',
  partially_received: 'border-warning/20 bg-warning-tint text-warning',
  received: 'border-success/20 bg-success-tint text-success',
  cancelled: 'border-destructive/20 bg-destructive-tint text-destructive',
  closed: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

export const purchaseOrderColumns: DataTableColumn<PurchaseOrder>[] = [
  {
    key: 'po_number',
    header: 'PO #',
    sortable: true,
    sortValue: (r) => r.po_number,
    cell: (r) => <span className="font-mono font-semibold text-foreground">#{r.po_number}</span>,
  },
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    sortValue: (r) => r.order_date,
    cell: (r) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(r.order_date), 'MMM d, yyyy')}
      </span>
    ),
  },
  {
    key: 'supplier',
    header: 'Supplier',
    sortable: true,
    sortValue: (r) => r.supplier?.name || '',
    cell: (r) => <span className="text-sm">{r.supplier?.name || '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (r) => r.status,
    cell: (r) => (
      <Badge variant="outline" className={statusColors[r.status] || ''}>
        {r.status.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    key: 'expected',
    header: 'Expected',
    className: 'hidden pos-tablet:table-cell',
    sortable: true,
    sortValue: (r) => r.expected_date || '',
    cell: (r) => (
      <span className="text-sm text-muted-foreground">
        {r.expected_date ? format(new Date(r.expected_date), 'MMM d') : '—'}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Total',
    sortable: true,
    sortValue: (r) => r.total_amount,
    className: 'text-right',
    cell: (r) => (
      <span className="font-semibold tabular-nums">{formatCurrency(r.total_amount)}</span>
    ),
  },
];
