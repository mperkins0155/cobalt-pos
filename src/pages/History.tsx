// ============================================================
// CloudPos — History Page
// Figma Screen 69: Left = order history list, Right = bill detail panel
// Tabs: All Category / Dine In / Take Away
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import { Clock, Receipt, Printer, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Order } from '@/types/database';

function typeLabel(t: string) {
  if (t === 'dine_in') return 'Dine In';
  if (t === 'takeout') return 'Take Away';
  if (t === 'delivery') return 'Delivery';
  return t;
}

export default function History() {
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      try {
        const { orders: rows } = await OrderService.listOrders({
          orgId: organization.id, status: 'paid', limit: 500,
        });
        setOrders(rows);
      } catch {
        toast.error('Failed to load order history');
      } finally {
        setLoading(false);
      }
    })();
  }, [organization]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) { c[o.order_type] = (c[o.order_type] || 0) + 1; }
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
    { key: 'all',      label: 'All Category', count: typeCounts.all || 0 },
    { key: 'dine_in',  label: 'Dine In',      count: typeCounts.dine_in || 0 },
    { key: 'takeout',  label: 'Take Away',    count: typeCounts.takeout || 0 },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── LEFT: History list ── */}
      <div className="flex flex-col w-full pos-desktop:w-[420px] shrink-0 border-r border-border overflow-hidden">
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">History</h2>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search order ID or customer" className="mb-3" />
          <FilterPills items={filterTabs} active={typeFilter} onChange={setTypeFilter} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Receipt className="h-10 w-10" />} title="No history found"
                description={search ? `No results for "${search}"` : 'Completed orders will appear here.'} />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((order) => (
                <button key={order.id} onClick={() => setSelected(order)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-colors
                    ${selected?.id === order.id ? 'bg-primary-tint border-l-2 border-primary' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-primary">#{order.order_number}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {order.customer_name || 'Walk-in'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel(order.order_type)}</Badge>
                        {(order as any).dining_table?.name && (
                          <span className="text-[10px] text-muted-foreground">Table {(order as any).dining_table.name}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground shrink-0">{formatCurrency(order.total_amount || 0)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Bill detail ── */}
      <div className="hidden pos-desktop:flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <BillDetail order={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <Receipt className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-base font-medium">Select a Bill</p>
            <p className="text-sm mt-1 opacity-70">Click on an order to view the full bill details</p>
          </div>
        )}
      </div>

      {/* Mobile detail overlay */}
      {selected && (
        <div className="pos-desktop:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <BillDetail order={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

function BillDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const lines: any[] = (order as any).lines ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div>
          <h3 className="text-base font-bold text-foreground">Order #{order.order_number}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="pos-desktop:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Customer info */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-primary-tint text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {(order.customer_name || 'W').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold">{order.customer_name || 'Walk-in'}</div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{typeLabel(order.order_type)}</Badge>
              {(order as any).dining_table?.name && (
                <span className="text-[10px] text-muted-foreground">Table {(order as any).dining_table.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items Ordered</h4>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No item details available</p>
          ) : (
            <div className="space-y-2">
              {lines.map((line: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-sm font-medium">{line.item_name}</div>
                    {line.modifiers?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {line.modifiers.map((m: any) => m.option_name).join(', ')}
                      </div>
                    )}
                    {line.notes && <div className="text-xs italic text-primary">{line.notes}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{formatCurrency(line.unit_price)} × {line.quantity}</div>
                    <div className="text-sm font-bold">{formatCurrency(line.subtotal)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-muted/30 p-3.5 space-y-1.5">
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
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total Sales</span>
            <span>{formatCurrency(order.total_amount || 0)}</span>
          </div>
        </div>

        {/* Payment status badge */}
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-tint text-success text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-success" />
            Paid
          </span>
        </div>
      </div>
    </div>
  );
}
