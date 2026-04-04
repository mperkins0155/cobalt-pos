import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/DataTable';
import type { Profile, AppRole } from '@/types/database';

const roleBadge: Record<AppRole, string> = {
  owner: 'border-primary/20 bg-primary-tint text-primary',
  manager: 'border-success/20 bg-success-tint text-success',
  cashier: 'border-warning/20 bg-warning-tint text-warning',
  accountant: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

export const staffColumns: DataTableColumn<Profile>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    sortValue: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim(),
    cell: (r) => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {(r.first_name?.[0] || '?').toUpperCase()}
        </div>
        <span className="font-semibold text-foreground">
          {[r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unknown'}
        </span>
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    sortValue: (r) => r.role,
    cell: (r) => (
      <Badge className={roleBadge[r.role] || ''}>
        {r.role}
      </Badge>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    className: 'hidden pos-tablet:table-cell',
    cell: (r) => <span className="text-sm text-muted-foreground">{r.email || '—'}</span>,
  },
  {
    key: 'phone',
    header: 'Phone',
    className: 'hidden pos-desktop:table-cell',
    cell: (r) => <span className="text-sm text-muted-foreground">{r.phone || '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (r) => (
      <Badge variant={r.is_active ? 'default' : 'outline'} className={
        r.is_active
          ? 'border-success/20 bg-success-tint text-success'
          : 'text-muted-foreground'
      }>
        {r.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];
