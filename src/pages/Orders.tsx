// ============================================================
// CloudPos — Orders Page
// Screen 8: Order list as 3-column card grid
// Each card: order#/type/date, table badge, customer name,
// progress bar, item list, total, "See Details" + "Pay Bills"
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
import { toast } from 'sonner';
import {
  Plus, ClipboardList, Grid3X3, ChevronDown, ChevronUp,
  CreditCard, Eye, ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/database';

const STATUS_CONFIG: Record<string, { label: string; colorClass: string; progress: number }> = {
  open:               { label: 'In Progress',       colorClass: 'bg-warning',           progress: 40 },
  pending:            { label: 'Waiting Payment',    colorClass: 'bg-primary',           progress: 75 },
  paid:               { label: 'Completed',          colorClass: 'bg-success',           progress: 100 },
  voided:             { label: 'Voided',             colorClass: 'bg-muted-foreground',  progress: 0 },
  refunded:           { label: 'Refunded',           colorClass: 'bg-destructive',       progress: 100 },
  partially_refunded: { label: 'Part. Refund',       colorClass: 'bg-destructive',       progress: 100 },
  failed:             { label: 'Failed',             colorClass: 'bg-destructive',       progress: 0 },
};

const STATUS_TEXT: Record<string, string> = {
  open: 'text-warning', pending: 'text-primary', paid: 'text-success',
  voided: 'text-muted-foreground', refunded: 'text-destructive',
  partially_refunded: 'text-destructive', failed: 'text-destructive',
};

type SortKey = 'latest' | 'oldest' | 'type';

export default function Orders() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('latest');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders: rows } = await OrderService.listOrders({ orgId: organization.id, limit: 200 });
        setOrders(rows);
      } catch {
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const filterTabs = [
    { key: 'all',     label: 'All',             count: statusCounts.all || 0 },
    { key: 'open',    label: 'In Progress',      count: statusCounts.open || 0 },
    { key: 'pending', label: 'Ready to Serve',   count: statusCounts.pending || 0 },
    { key: 'paid',    label: 'Completed',        count: statusCounts.paid || 0 },
  ];

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') result = result.filter((o) => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) => o.order_number.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'oldest': return [...result].sort((a, b) => a.created_at.localeCompare(b.created_at));
      case 'type':   return [...result].sort((a, b) => a.order_type.localeCompare(b.order_type));
      default:       return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }, [orders, statusFilter, search, sort]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Orders</h2>
        </div>
        <Button onClick={() => navigate('/orders/new')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create New Order
        </Button>
      </div>

      {/* Search + sort + filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Search Order ID or Customer Name" />
          </div>
          <div className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 h-10 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden pos-tablet:inline">Sort by: </span>
              {sort === 'latest' ? 'Latest' : sort === 'oldest' ? 'Oldest' : 'Type'}
              {sortOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-pos overflow-hidden w-44">
                  {(['latest', 'oldest', 'type'] as SortKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSort(key); setSortOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      {key === 'latest' ? 'Latest Order' : key === 'oldest' ? 'Oldest Order' : 'Order Type'}
                      {sort === key && (
                        <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <FilterPills items={filterTabs} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="No orders found"
          description={search ? `No results for "${search}"` : 'Create a new order to get started.'}
        />
      ) : (
        <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDetail={() => navigate(`/orders/${order.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onDetail }: { order: Order; onDetail: () => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.failed;
  const textCls = STATUS_TEXT[order.status] ?? 'text-muted-foreground';
  const customerName = order.customer_name || 'Walk-in';
  const typeLabel = order.order_type === 'dine_in' ? 'Dine In'
    : order.order_type === 'takeout' ? 'Take Away'
    : order.order_type === 'delivery' ? 'Delivery' : 'In Store';
  const lines: any[] = (order as any).lines ?? [];
  const visibleLines = expanded ? lines : lines.slice(0, 3);
  const canPay = order.status === 'open' || order.status === 'pending';

  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col overflow-hidden hover:shadow-pos transition-shadow">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">#{order.order_number}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">{typeLabel}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{dateStr} · {timeStr}</span>
      </div>

      {/* Customer + table */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-sm font-semibold text-foreground truncate mr-3">{customerName}</span>
        {(order as any).dining_table_id && (
          <span className="flex items-center gap-1 shrink-0 text-xs font-medium text-muted-foreground bg-muted rounded px-2 py-0.5">
            <Grid3X3 className="h-3 w-3" />
            Table
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-semibold ${textCls}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground">{cfg.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${cfg.colorClass}`} style={{ width: `${cfg.progress}%` }} />
        </div>
      </div>

      {/* Item list */}
      {lines.length > 0 && (
        <div className="px-4 pb-2.5 border-t border-border/50 pt-2.5 space-y-1.5">
          {visibleLines.map((line: any, i: number) => (
            <div key={line.id ?? i} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded border border-border shrink-0" />
              <span className="flex-1 text-xs text-foreground truncate">{line.item_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">×{line.quantity}</span>
              <span className="text-xs font-medium shrink-0">{formatCurrency(line.subtotal ?? 0)}</span>
            </div>
          ))}
          {lines.length > 3 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
            >
              {expanded
                ? <><ChevronUp className="h-3 w-3" /> Show less</>
                : <><ChevronDown className="h-3 w-3" /> +{lines.length - 3} more items</>}
            </button>
          )}
        </div>
      )}

      {/* Total + buttons */}
      <div className="mt-auto px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-base font-bold text-foreground">{formatCurrency(order.total_amount || 0)}</span>
        <div className="flex gap-2">
          <button
            onClick={onDetail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            See Details
          </button>
          {canPay && (
            <button
              onClick={() => navigate('/pos/checkout')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Pay Bills
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
