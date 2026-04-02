import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerService } from '@/services/customers';
import { formatCurrency } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { SearchBar } from '@/components/pos';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import type { Customer } from '@/types/database';

export default function Customers() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        if (search.length >= 2) {
          const results = await CustomerService.search(organization.id, search, 200);
          setCustomers(results);
        } else {
          const { customers: rows } = await CustomerService.list(organization.id, { limit: 200 });
          setCustomers(rows);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization, search]);

  const columns = useMemo<DataTableColumn<Customer>[]>(() => [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      sortValue: (customer) => `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
      cell: (customer) => (
        <div className="space-y-1">
          <div className="font-medium text-foreground">
            {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed customer'}
          </div>
          <div className="text-xs text-muted-foreground">
            {customer.email || customer.phone || 'No contact info'}
          </div>
        </div>
      ),
    },
    {
      key: 'visits',
      header: 'Visits',
      sortable: true,
      className: 'w-[110px]',
      sortValue: (customer) => customer.visit_count,
      cell: (customer) => <span className="font-medium tabular-nums">{customer.visit_count}</span>,
    },
    {
      key: 'spent',
      header: 'Total Spent',
      sortable: true,
      className: 'w-[140px]',
      sortValue: (customer) => customer.total_spent,
      cell: (customer) => (
        <span className="font-medium tabular-nums">{formatCurrency(customer.total_spent)}</span>
      ),
    },
    {
      key: 'last_visit',
      header: 'Last Visit',
      sortable: true,
      className: 'w-[160px]',
      sortValue: (customer) => customer.last_visit_at || '',
      cell: (customer) => (
        <span className="text-sm text-muted-foreground">
          {customer.last_visit_at
            ? new Date(customer.last_visit_at).toLocaleDateString()
            : 'No visits yet'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      sortable: true,
      sortValue: (customer) => (customer.visit_count > 0 ? 1 : 0),
      cell: (customer) => (
        <Badge
          variant="secondary"
          className={customer.visit_count > 0 ? 'bg-success-tint text-success' : 'bg-muted text-muted-foreground'}
        >
          {customer.visit_count > 0 ? 'Returning' : 'New'}
        </Badge>
      ),
    },
  ], []);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Customers</h2>
        </div>
        <Badge variant="secondary" className="bg-primary-tint text-primary">
          {customers.length} loaded
        </Badge>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, or phone"
        />
      </div>

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        rowKey={(customer) => customer.id}
        onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
        emptyTitle="No customers found"
        emptyDescription={search ? `No results for "${search}"` : 'Customer records will appear here.'}
        emptyIcon={<Users className="h-10 w-10" />}
      />
    </div>
  );
}
