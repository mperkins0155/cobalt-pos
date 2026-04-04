import { toast } from '@/components/ui/sonner';
// ============================================================
// CloudPos — Orders Page
// Phase 0D: Enhanced from cobalt-pos Orders.tsx + prototype OrderListPage
// Data: OrderService.listOrders()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { Plus, ClipboardList } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/database';

/** Status display config */
const STATUS_THEME: Record<string, { label: string; cls: string }> = {
  open: { label: 'In Progress', cls: 'text-warning bg-warning-tint' },
  pending: { label: 'Pending', cls: 'text-primary bg-primary-tint' },
  paid: { label: 'Completed', cls: 'text-success bg-success-tint' },
  voided: { label: 'Voided', cls: 'text-muted-foreground bg-muted' },
  refunded: { label: 'Refunded', cls: 'text-destructive bg-destructive/10' },
  partially_refunded: { label: 'Partial Refund', cls: 'text-destructive bg-destructive/10' },
  failed: { label: 'Failed', cls: 'text-destructive bg-destructive/10' },
};

export default function Orders() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders } = await OrderService.listOrders({
          orgId: organization.id,
          limit: 200,
        });
        setOrders(orders);
      } catch (err) {
        console.error('Failed to load orders:', err);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organization]);

  // Compute status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders]);

  // Filter by status + search
  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, statusFilter, search]);

  // Filter pill config
  const filterTabs = [
    { key: 'all', label: 'All', count: statusCounts.all || 0 },
    { key: 'open', label: 'In Progress', count: statusCounts.open || 0 },
    { key: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
    { key: 'paid', label: 'Completed', count: statusCounts.paid || 0 },
    { key: 'voided', label: 'Voided', count: statusCounts.voided || 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header row */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Orders</h2>
        </div>
        <Button onClick={() => navigate('/pos')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create New Order
        </Button>
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search Order ID or Customer Name"
        />
        <FilterPills
          items={filterTabs}
          active={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Order list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[84px] rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="No orders found"
          description={
            search
              ? `No results for "${search}"`
              : 'Create a new order to get started.'
          }
        />
      ) : (
        <div className="space-y-2 pb-20 pos-tablet:pb-4">
          {filtered.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onClick={() => navigate(`/orders/${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Order row card ── */

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const theme = STATUS_THEME[order.status] || STATUS_THEME.failed;
  const customerName = order.customer_name || 'Walk-in';
  const typeLabel =
    order.order_type === 'dine_in'
      ? 'Dine In'
      : order.order_type === 'takeout'
        ? 'Take Away'
        : order.order_type;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-lg border border-border p-3.5 hover:shadow-pos transition-shadow"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">
            #{order.order_number}
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 font-medium"
          >
            {typeLabel}
          </Badge>
        </div>
        <Badge className={`text-[10px] px-2 py-0.5 font-semibold border-0 ${theme.cls}`}>
          {theme.label}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground truncate mr-3">
          {customerName}
        </span>
        <span className="text-sm font-bold text-foreground shrink-0">
          {formatCurrency(order.total_amount || 0)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {new Date(order.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </button>
  );
}
