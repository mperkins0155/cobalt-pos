import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';
import type { DataTableColumn } from '@/components/DataTable';
import type { Expense } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'text-muted-foreground',
  submitted: 'border-primary/20 bg-primary-tint text-primary',
  approved: 'border-success/20 bg-success-tint text-success',
  rejected: 'border-destructive/20 bg-destructive-tint text-destructive',
  paid: 'border-success/20 bg-success-tint text-success',
  voided: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

export const expenseColumns: DataTableColumn<Expense>[] = [
  {
    key: 'number',
    header: 'Expense #',
    sortable: true,
    sortValue: (r) => r.expense_number || '',
    cell: (r) => (
      <span className="font-mono font-semibold text-foreground">
        {r.expense_number || '—'}
      </span>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    sortValue: (r) => r.expense_date,
    cell: (r) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(r.expense_date), 'MMM d, yyyy')}
      </span>
    ),
  },
  {
    key: 'supplier',
    header: 'Vendor',
    sortable: true,
    sortValue: (r) => r.supplier?.name || '',
    cell: (r) => <span className="text-sm">{r.supplier?.name || '—'}</span>,
  },
  {
    key: 'category',
    header: 'Category',
    className: 'hidden pos-tablet:table-cell',
    cell: (r) => <span className="text-sm text-muted-foreground">{r.category?.name || '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (r) => r.status,
    cell: (r) => (
      <Badge variant="outline" className={statusColors[r.status] || ''}>
        {r.status}
      </Badge>
    ),
  },
  {
    key: 'total',
    header: 'Amount',
    sortable: true,
    sortValue: (r) => r.total_amount,
    className: 'text-right',
    cell: (r) => (
      <span className="font-semibold tabular-nums">{formatCurrency(r.total_amount)}</span>
    ),
  },
];
