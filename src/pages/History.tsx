// ============================================================
// CloudPos — History Page
// Figma spec: Screen 69 — master-detail split layout,
// history cards left, full bill detail panel right on click
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Clock, Receipt, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/database';

function typeLabel(o: Order) {
  return o.order_type === 'dine_in' ? 'Dine In' : o.order_type === 'takeout' ? 'Take Away' : o.order_type || 'Order';
}

/* ── History row card ── */
function HistoryCard({ order, selected, onClick }: { order: Order; selected: boolean; onClick: () => void }) {
  const customer = order.customer_name || 'Walk-in';
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-3.5 transition-all',
        selected ? 'border-primary bg-primary-tint' : 'border-border bg-card hover:shadow-pos'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-primary">#{order.order_number}</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel(order)}</Badge>
          <ChevronRight className={cn('h-4 w-4 transition-colors', selected ? 'text-primary' : 'text-muted-foreground')} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground truncate mr-2">{customer}</span>
        <span className="text-sm font-bold shrink-0">{formatCurrency(order.total_amount || 0)}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </button>
  );
}

/* ── Bill detail panel ── */
function BillDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const customer = order.customer_name || 'Walk-in';
  const lines: any[] = (order as any).lines || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <div className="text-sm font-bold text-foreground">Order #{order.order_number}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors pos-desktop:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Customer + type */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
          {customer.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{customer}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel(order)}</Badge>
            <Badge className="text-[10px] px-1.5 py-0 text-success bg-success-tint border-0">Paid</Badge>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto">
        {lines.length > 0 ? (
          <div className="p-4 space-y-0">
            <div className="grid grid-cols-[1fr_36px_80px] gap-x-2 text-[11px] text-muted-foreground mb-2 font-medium">
              <span>Item</span><span className="text-center">Qty</span><span className="text-right">Price</span>
            </div>
            {lines.map((line: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_36px_80px] gap-x-2 py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{line.item_name}</div>
                  {line.modifiers?.length > 0 && (
                    <div className="text-xs text-muted-foreground">{line.modifiers.map((m: any) => m.option_name).join(', ')}</div>
                  )}
                </div>
                <span className="text-sm text-center text-muted-foreground">{line.quantity}</span>
                <span className="text-sm text-right font-semibold">{formatCurrency(line.subtotal || 0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground py-10">No item details available</div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.subtotal_amount || 0)}</span>
        </div>
        {(order.discount_amount || 0) > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>Discount</span><span>-{formatCurrency(order.discount_amount || 0)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(order.tax_amount || 0)}</span>
        </div>
        {(order.tip_amount || 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tip</span>
            <span>{formatCurrency(order.tip_amount || 0)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t border-border pt-2">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(order.total_amount || 0)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function History() {
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders: rows } = await OrderService.listOrders({ orgId: organization.id, status: 'paid', limit: 300 });
        setOrders(rows);
      } catch { toast.error('Failed to load history'); }
      finally { setLoading(false); }
    };
    void load();
  }, [organization]);

  const filterTabs = useMemo(() => [
    { key: 'all',      label: 'All Category', count: orders.length },
    { key: 'dine_in',  label: 'Dine In',      count: orders.filter(o => o.order_type === 'dine_in').length },
    { key: 'takeout',  label: 'Take Away',    count: orders.filter(o => o.order_type === 'takeout').length },
  ], [orders]);

  const filtered = useMemo(() => {
    let r = orders;
    if (typeFilter !== 'all') r = r.filter(o => o.order_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(o => o.order_number.toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q));
    }
    return r;
  }, [orders, typeFilter, search]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Left: List ── */}
      <div className={cn(
        'flex flex-col border-r border-border overflow-hidden',
        selected ? 'hidden pos-desktop:flex pos-desktop:w-[420px]' : 'flex-1'
      )}>
        {/* Header */}
        <div className="shrink-0 p-4 pos-tablet:p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">History</h2>
          </div>
          <div className="space-y-2">
            <SearchBar value={search} onChange={setSearch} placeholder="Search order ID or customer" />
            <FilterPills items={filterTabs} active={typeFilter} onChange={setTypeFilter} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 pos-tablet:p-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Receipt className="h-10 w-10" />} title="No history found"
              description={search ? `No results for "${search}"` : 'Completed orders will appear here.'} />
          ) : (
            <div className="space-y-2 pb-20 pos-desktop:pb-4">
              {filtered.map(o => (
                <HistoryCard key={o.id} order={o} selected={selected?.id === o.id} onClick={() => setSelected(o)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Detail panel ── */}
      <div className={cn(
        'flex-1 bg-card overflow-hidden',
        selected ? 'flex flex-col' : 'hidden pos-desktop:flex pos-desktop:flex-col'
      )}>
        {selected ? (
          <BillDetail order={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-base font-semibold text-foreground mb-1">Select Bill</div>
            <div className="text-sm text-muted-foreground">Click an order on the left to view full bill details</div>
          </div>
        )}
      </div>
    </div>
  );
}
