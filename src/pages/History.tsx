import { toast } from '@/components/ui/sonner';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { SearchBar, FilterPills } from '@/components/pos';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import type { Order } from '@/types/database';

function orderTypeLabel(order: Order) {
  return order.order_type === 'dine_in'
    ? 'Dine In'
    : order.order_type === 'takeout'
      ? 'Take Away'
      : order.order_type;
}

export default function History() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders: rows } = await OrderService.listOrders({
          orgId: organization.id,
          status: 'paid',
          limit: 300,
        });
        setOrders(rows);
      } catch (err) {
        console.error('History load error:', err);
        toast.error('Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const order of orders) {
      counts[order.order_type] = (counts[order.order_type] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (typeFilter !== 'all') {
      result = result.filter((order) => order.order_type === typeFilter);
    }
    if (search.trim()) {
      const normalized = search.toLowerCase();
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(normalized) ||
          (order.customer_name || '').toLowerCase().includes(normalized)
      );
    }
    return result;
  }, [orders, search, typeFilter]);

  const filterTabs = [
    { key: 'all', label: 'All', count: typeCounts.all || 0 },
    { key: 'dine_in', label: 'Dine In', count: typeCounts.dine_in || 0 },
    { key: 'takeout', label: 'Take Away', count: typeCounts.takeout || 0 },
    { key: 'delivery', label: 'Delivery', count: typeCounts.delivery || 0 },
  ];

  const columns = useMemo<DataTableColumn<Order>[]>(() => [
    {
      key: 'order',
      header: 'Order',
      sortable: true,
      sortValue: (order) => order.order_number,
      cell: (order) => (
        <div className="space-y-1">
          <div className="font-medium text-primary">#{order.order_number}</div>
          <div className="text-xs text-muted-foreground">
            {order.customer_name || 'Walk-in'}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      className: 'w-[130px]',
      sortValue: (order) => order.order_type,
      cell: (order) => (
        <Badge variant="secondary" className="text-[10px]">
          {orderTypeLabel(order)}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Completed',
      sortable: true,
      className: 'w-[180px]',
      sortValue: (order) => order.created_at,
      cell: (order) => (
        <span className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      sortable: true,
      className: 'w-[100px]',
      sortValue: (order) => order.lines?.length ?? 0,
      cell: (order) => (
        <span className="font-medium tabular-nums">{order.lines?.length ?? '—'}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      className: 'w-[120px]',
      sortValue: (order) => order.total_amount,
      cell: (order) => (
        <span className="font-medium tabular-nums">{formatCurrency(order.total_amount || 0)}</span>
      ),
    },
  ], []);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">History</h2>
      </div>

      <div className="mb-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search order ID or customer" />
        <FilterPills items={filterTabs} active={typeFilter} onChange={setTypeFilter} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        rowKey={(order) => order.id}
        onRowClick={(order) => navigate(`/orders/${order.id}`)}
        emptyTitle="No history found"
        emptyDescription={search ? `No results for "${search}"` : 'Completed orders will appear here.'}
        emptyIcon={<Receipt className="h-10 w-10" />}
      />
    </div>
  );
}
