// ============================================================
// CloudPos — History Page
// Screen 69: Master-detail split layout
// Left: order history cards, Right: bill detail panel
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { toast } from 'sonner';
import {
  Clock, Receipt, Grid3X3, CreditCard, Banknote,
  Smartphone, Package, User, ChevronRight, Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/database';

function orderTypeLabel(order: Order) {
  return order.order_type === 'dine_in' ? 'Dine In'
    : order.order_type === 'takeout' ? 'Take Away'
    : order.order_type === 'delivery' ? 'Delivery'
    : 'In Store';
}

export default function History() {
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders: rows } = await OrderService.listOrders({
          orgId: organization.id, status: 'paid', limit: 300,
        });
        setOrders(rows);
      } catch {
        toast.error('Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization]);

  // Load detail when selection changes
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    const load = async () => {
      setDetailLoading(true);
      try {
        const full = await OrderService.getOrderWithDetails(selectedId);
        setDetail(full);
      } catch {
        toast.error('Failed to load bill details');
      } finally {
        setDetailLoading(false);
      }
    };
    void load();
  }, [selectedId]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.order_type] = (c[o.order_type] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (typeFilter !== 'all') result = result.filter((o) => o.order_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) => o.order_number.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, search, typeFilter]);

  const filterTabs = [
    { key: 'all',       label: 'All Category',  count: typeCounts.all || 0 },
    { key: 'dine_in',   label: 'Dine In',        count: typeCounts.dine_in || 0 },
    { key: 'takeout',   label: 'Take Away',      count: typeCounts.takeout || 0 },
    { key: 'delivery',  label: 'Delivery',       count: typeCounts.delivery || 0 },
  ];

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* ── Left: history list ── */}
      <div className={cn(
        'flex flex-col overflow-hidden border-r border-border',
        selectedId ? 'hidden pos-tablet:flex pos-tablet:w-80 xl:w-96' : 'flex-1'
      )}>
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">History</h2>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search order ID or customer" />
          <div className="mt-2.5">
            <FilterPills items={filterTabs} active={typeFilter} onChange={setTypeFilter} />
          </div>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-10 w-10" />}
              title="No history found"
              description={search ? `No results for "${search}"` : 'Completed orders appear here.'}
            />
          ) : (
            <div className="p-3 space-y-1.5 pb-20 pos-tablet:pb-4">
              {filtered.map((order) => (
                <HistoryCard
                  key={order.id}
                  order={order}
                  selected={selectedId === order.id}
                  onClick={() => setSelectedId(order.id === selectedId ? null : order.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: bill detail panel ── */}
      {selectedId ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Back button on mobile */}
          <div className="pos-tablet:hidden shrink-0 px-4 py-3 border-b border-border">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              ← All History
            </button>
          </div>

          {detailLoading ? (
            <div className="p-5 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : detail ? (
            <BillDetail order={detail} />
          ) : null}
        </div>
      ) : (
        /* Empty state for desktop */
        <div className="hidden pos-tablet:flex flex-1 items-center justify-center bg-background">
          <div className="text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-base font-semibold text-muted-foreground">Select a Bill</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Click an order to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── History card ──
function HistoryCard({
  order, selected, onClick,
}: {
  order: Order;
  selected: boolean;
  onClick: () => void;
}) {
  const customer = order.customer_name || 'Walk-in';
  const date = new Date(order.created_at);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border px-3.5 py-3 transition-all',
        selected
          ? 'border-primary bg-primary-tint'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-pos'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-sm font-bold', selected ? 'text-primary' : 'text-primary')}>
              #{order.order_number}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {orderTypeLabel(order)}
            </Badge>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{customer}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' · '}
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-bold text-foreground">{formatCurrency(order.total_amount || 0)}</span>
          <ChevronRight className={cn('h-4 w-4 transition-colors', selected ? 'text-primary' : 'text-muted-foreground')} />
        </div>
      </div>
    </button>
  );
}

// ── Bill detail panel ──
function BillDetail({ order }: { order: Order }) {
  const lines: any[] = (order as any).lines ?? [];
  const payments: any[] = (order as any).payments ?? [];
  const customer = order.customer_name || 'Walk-in';
  const date = new Date(order.created_at);

  const paymentIcon = (type: string) => {
    if (type === 'cash') return <Banknote className="h-4 w-4" />;
    if (type === 'card') return <CreditCard className="h-4 w-4" />;
    return <Smartphone className="h-4 w-4" />;
  };

  const paymentLabel = (type: string) => {
    if (type === 'cash') return 'Cash';
    if (type === 'card') return 'Card';
    return 'Other';
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Bill header */}
      <div className="mb-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-bold text-foreground">Order #{order.order_number}</h3>
          <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1.5">
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          {' at '}
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Customer + order type */}
      <div className="bg-card rounded-xl border border-border p-3.5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{customer}</p>
            <p className="text-xs text-muted-foreground capitalize">{orderTypeLabel(order)}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Items</h4>
        {lines.length === 0 ? (
          <div className="py-4 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No items loaded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line: any, i: number) => (
              <div key={line.id ?? i} className="flex items-start justify-between gap-3 bg-card rounded-lg border border-border px-3.5 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{line.item_name}</p>
                  {line.modifiers?.length > 0 && (
                    <p className="text-xs text-muted-foreground">{line.modifiers.map((m: any) => m.option_name).join(', ')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatCurrency(line.unit_price)} × {line.quantity}</p>
                </div>
                <span className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(line.subtotal ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.subtotal_amount || 0)}</span>
        </div>
        {(order.discount_amount ?? 0) > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>Discount</span>
            <span>-{formatCurrency(order.discount_amount || 0)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(order.tax_amount || 0)}</span>
        </div>
        {(order.tip_amount ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tip</span>
            <span>{formatCurrency(order.tip_amount || 0)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(order.total_amount || 0)}</span>
        </div>
      </div>

      {/* Payment method */}
      {payments.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Payment</h4>
          <div className="space-y-2">
            {payments.map((p: any, i: number) => (
              <div key={p.id ?? i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  {paymentIcon(p.tender_type)}
                  <span className="font-medium">{paymentLabel(p.tender_type)}</span>
                  {p.cash_received && (
                    <span className="text-xs text-muted-foreground">
                      (received {formatCurrency(p.cash_received)})
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
