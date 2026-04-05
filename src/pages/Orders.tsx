// ============================================================
// CloudPos — Orders Page
// Figma spec: Screen 8 — 3-column card grid, full OrderCard,
// search bar, filter pills with counts, sort dropdown, Pay Bills CTA
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { Plus, ClipboardList, ChevronDown, Check, ArrowRight, CreditCard, Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Order } from '@/types/database';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
  open:               { label: 'In Progress',     pill: 'text-warning bg-warning-tint' },
  pending:            { label: 'In Progress',     pill: 'text-warning bg-warning-tint' },
  paid:               { label: 'Completed',       pill: 'text-success bg-success-tint' },
  voided:             { label: 'Voided',          pill: 'text-muted-foreground bg-muted' },
  refunded:           { label: 'Refunded',        pill: 'text-destructive bg-destructive/10' },
  partially_refunded: { label: 'Partial Refund',  pill: 'text-destructive bg-destructive/10' },
  failed:             { label: 'Failed',          pill: 'text-destructive bg-destructive/10' },
};

type SortKey = 'latest' | 'oldest' | 'type';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'latest', label: 'Latest Order' },
  { key: 'oldest', label: 'Oldest Order' },
  { key: 'type',   label: 'Order Type'   },
];

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find(o => o.key === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm font-medium border border-border rounded-lg px-3 h-10 bg-card hover:bg-accent transition-colors whitespace-nowrap"
      >
        <span className="text-muted-foreground text-xs">Sort by:</span>
        {current.label}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                {opt.label}
                {opt.key === value && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrderCard({ order, onClick, onPay }: { order: Order; onClick: () => void; onPay: (e: React.MouseEvent) => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.failed;
  const customerName = order.customer_name || (order as any).customer?.first_name || 'Walk-in';
  const typeLabel = order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'takeout' ? 'Take Away' : order.order_type || 'Order';
  const tableLabel = (order as any).dining_table?.name || (order as any).table_name;
  const lines: any[] = (order as any).lines || [];
  const isActive = order.status === 'open' || order.status === 'pending';

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-pos transition-shadow cursor-pointer" onClick={onClick}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold">Order# <span className="text-primary">#{order.order_number}</span></span>
            <span className="text-muted-foreground text-xs">/</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel}</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', cfg.pill)}>{cfg.label}</span>
      </div>

      {/* Table + customer */}
      <div className="flex items-center gap-2.5">
        {tableLabel ? (
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            {String(tableLabel).replace(/table\s*/i, '').slice(0, 4)}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground">Customer</div>
          <div className="text-sm font-semibold text-foreground truncate">{customerName}</div>
        </div>
      </div>

      {/* Status indicator */}
      {isActive ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-border">
            <div className="h-full rounded-full bg-warning" style={{ width: '40%' }} />
          </div>
          <span className="text-[11px] font-semibold text-warning shrink-0">In Progress</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Check className="h-3.5 w-3.5 text-success" />
          <span className="text-xs font-medium text-success">{cfg.label}</span>
        </div>
      )}

      {/* Line items */}
      {lines.length > 0 && (
        <div className="border-t border-border pt-2.5 space-y-1">
          <div className="grid grid-cols-[1fr_32px_72px] gap-x-2 text-[10px] text-muted-foreground mb-1">
            <span>Items</span><span className="text-right">Qty</span><span className="text-right">Price</span>
          </div>
          {lines.slice(0, 3).map((line: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_32px_72px] gap-x-2 text-[12px]">
              <span className="truncate text-foreground">{line.item_name}</span>
              <span className="text-right text-muted-foreground">{line.quantity}</span>
              <span className="text-right font-semibold">{formatCurrency(line.subtotal || 0)}</span>
            </div>
          ))}
          {lines.length > 3 && <div className="text-[11px] text-muted-foreground">+{lines.length - 3} more items</div>}
          <div className="flex justify-between pt-1.5 border-t border-dashed border-border mt-1.5">
            <span className="text-xs font-bold">Total</span>
            <span className="text-sm font-bold">{formatCurrency(order.total_amount || 0)}</span>
          </div>
        </div>
      )}

      {lines.length === 0 && (
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-bold">{formatCurrency(order.total_amount || 0)}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8 gap-1" onClick={onClick}>
          See Details <ArrowRight className="h-3 w-3" />
        </Button>
        {isActive && (
          <Button size="sm" className="flex-1 text-xs h-8 gap-1" onClick={onPay}>
            Pay Bills <CreditCard className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('latest');

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders: rows } = await OrderService.listOrders({ orgId: organization.id, limit: 200 });
        setOrders(rows);
      } catch { toast.error('Failed to load orders'); }
      finally { setLoading(false); }
    };
    load();
  }, [organization]);

  const filterTabs = useMemo(() => [
    { key: 'all',       label: 'All',                 count: orders.length },
    { key: 'active',    label: 'In Progress',         count: orders.filter(o => o.status === 'open' || o.status === 'pending').length },
    { key: 'completed', label: 'Ready to Served',     count: orders.filter(o => o.status === 'paid').length },
    { key: 'waiting',   label: 'Waiting for Payment', count: orders.filter(o => o.status === 'pending').length },
  ], [orders]);

  const filtered = useMemo(() => {
    let r = orders;
    if (statusFilter === 'active')    r = r.filter(o => o.status === 'open' || o.status === 'pending');
    else if (statusFilter === 'completed') r = r.filter(o => o.status === 'paid');
    else if (statusFilter === 'waiting')   r = r.filter(o => o.status === 'pending');
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(o => o.order_number.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q));
    }
    if (sort === 'latest') r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === 'oldest') r = [...r].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sort === 'type')   r = [...r].sort((a, b) => (a.order_type || '').localeCompare(b.order_type || ''));
    return r;
  }, [orders, statusFilter, search, sort]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Order</h2>
        </div>
        <Button onClick={() => navigate('/pos')}>
          <Plus className="h-4 w-4 mr-1.5" />Create New Order
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search Order ID or Customer Name" />
        </div>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      <div className="mb-4">
        <FilterPills items={filterTabs} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="No orders found"
          description={search ? `No results for "${search}"` : 'Create a new order to get started.'} />
      ) : (
        <div className="grid grid-cols-1 pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
          {filtered.map(order => (
            <OrderCard
              key={order.id} order={order}
              onClick={() => navigate(`/orders/${order.id}`)}
              onPay={e => { e.stopPropagation(); navigate('/pos/checkout'); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
