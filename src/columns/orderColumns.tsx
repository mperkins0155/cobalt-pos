import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';
import type { DataTableColumn } from '@/components/DataTable';
import type { Order } from '@/types/database';

const statusColors: Record<string, string> = {
  open: 'border-primary/20 bg-primary-tint text-primary',
  pending: 'border-warning/20 bg-warning-tint text-warning',
  paid: 'border-success/20 bg-success-tint text-success',
  voided: 'border-destructive/20 bg-destructive-tint text-destructive',
  refunded: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  partially_refunded: 'border-warning/20 bg-warning-tint text-warning',
  failed: 'border-destructive/20 bg-destructive-tint text-destructive',
};

export const orderColumns: DataTableColumn<Order>[] = [
  {
    key: 'order_number',
    header: 'Order #',
    sortable: true,
    sortValue: (r) => r.order_number,
    cell: (r) => <span className="font-mono font-semibold text-foreground">#{r.order_number}</span>,
  },
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    sortValue: (r) => r.created_at,
    cell: (r) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(r.created_at), 'MMM d, h:mm a')}
      </span>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    sortable: true,
    sortValue: (r) => r.customer_name || '',
    cell: (r) => <span className="text-sm">{r.customer_name || 'Walk-in'}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    cell: (r) => (
      <Badge variant="outline" className="text-xs capitalize">
        {r.order_type === 'dine_in' ? 'Dine In' : 'Takeout'}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (r) => r.status,
    cell: (r) => (
      <Badge className={statusColors[r.status] || ''}>
        {r.status.replace(/_/g, ' ')}
      </Badge>
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
