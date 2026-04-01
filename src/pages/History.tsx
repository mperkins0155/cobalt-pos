// ============================================================
// CloudPos — History Page
// Phase 0D: Extracted from prototype HistoryPage
// Data: OrderService.listOrders({ status: 'paid' })
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { Clock, Receipt } from 'lucide-react';
import type { Order } from '@/types/database';

export default function History() {
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders } = await OrderService.listOrders({
          orgId: organization.id,
          status: 'paid',
          limit: 200,
        });
        setOrders(orders);
      } catch (err) {
        console.error('History load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organization]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      const t = o.order_type || 'other';
      c[t] = (c[t] || 0) + 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (typeFilter !== 'all') {
      result = result.filter((o) => o.order_type === typeFilter);
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
  }, [orders, typeFilter, search]);

  const filterTabs = [
    { key: 'all', label: 'All', count: typeCounts.all || 0 },
    { key: 'dine_in', label: 'Dine In', count: typeCounts.dine_in || 0 },
    { key: 'takeout', label: 'Take Away', count: typeCounts.takeout || 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">History</h2>
      </div>

      <div className="mb-4 space-y-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search Order ID or Customer Name" />
        <FilterPills items={filterTabs} active={typeFilter} onChange={setTypeFilter} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10" />}
          title="No history found"
          description={search ? `No results for "${search}"` : 'Completed orders will appear here.'}
        />
      ) : (
        <div className="space-y-2 pb-20 pos-tablet:pb-4">
          {filtered.map((order) => (
            <HistoryRow
              key={order.id}
              order={order}
              expanded={selectedId === order.id}
              onToggle={() => setSelectedId((prev) => (prev === order.id ? null : order.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ order, expanded, onToggle }: { order: Order; expanded: boolean; onToggle: () => void }) {
  const typeLabel = order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'takeout' ? 'Take Away' : order.order_type;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-3.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">#{order.order_number}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">{typeLabel}</Badge>
          </div>
          <span className="text-sm font-bold text-foreground">{formatCurrency(order.total_amount || 0)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{order.customer_name || 'Walk-in'}</span>
          <span>{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-3.5 py-3 bg-muted/20 text-sm space-y-2">
          {order.lines && order.lines.length > 0 ? (
            <>
              {order.lines.map((line, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{line.quantity}× {line.item_name || 'Item'}</span>
                  <span className="font-medium">{formatCurrency((line.unit_price || 0) * (line.quantity || 1))}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(order.subtotal_amount || 0)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Tax</span><span>{formatCurrency(order.tax_amount || 0)}</span></div>
                {(order.tip_amount || 0) > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Tip</span><span>{formatCurrency(order.tip_amount || 0)}</span></div>}
                <div className="flex justify-between font-bold pt-1"><span>Total</span><span>{formatCurrency(order.total_amount || 0)}</span></div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-xs">Line items not loaded. Tap to view full details.</p>
          )}
        </div>
      )}
    </div>
  );
}
