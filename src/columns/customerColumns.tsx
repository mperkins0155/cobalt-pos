import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';
import type { DataTableColumn } from '@/components/DataTable';
import type { Customer } from '@/types/database';

export const customerColumns: DataTableColumn<Customer>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    sortValue: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim(),
    cell: (r) => (
      <span className="font-semibold text-foreground">
        {[r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown'}
      </span>
    ),
  },
  {
    key: 'phone',
    header: 'Phone',
    cell: (r) => <span className="text-sm text-muted-foreground">{r.phone || '—'}</span>,
  },
  {
    key: 'email',
    header: 'Email',
    className: 'hidden pos-tablet:table-cell',
    cell: (r) => <span className="text-sm text-muted-foreground">{r.email || '—'}</span>,
  },
  {
    key: 'visits',
    header: 'Visits',
    sortable: true,
    sortValue: (r) => r.visit_count,
    className: 'text-right',
    cell: (r) => <span className="tabular-nums">{r.visit_count}</span>,
  },
  {
    key: 'total_spent',
    header: 'Total Spent',
    sortable: true,
    sortValue: (r) => r.total_spent,
    className: 'text-right hidden pos-tablet:table-cell',
    cell: (r) => <span className="tabular-nums">{formatCurrency(r.total_spent)}</span>,
  },
  {
    key: 'last_visit',
    header: 'Last Visit',
    sortable: true,
    sortValue: (r) => r.last_visit_at || '',
    className: 'hidden pos-desktop:table-cell',
    cell: (r) => (
      <span className="text-sm text-muted-foreground">
        {r.last_visit_at ? format(new Date(r.last_visit_at), 'MMM d, yyyy') : '—'}
      </span>
    ),
  },
];
