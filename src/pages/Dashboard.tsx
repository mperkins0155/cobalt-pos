// ============================================================
// CloudPos — Dashboard Page
// Figma spec: Screen 5/6 — greeting bar with live clock,
// 4 stat cards, Kanban columns, right sidebar (available tables + out of stock)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { TableService } from '@/services/tables';
import { ReportingService, type SalesSummary } from '@/services/reporting';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/pos';
import { StatCard } from '@/components/pos/StatCard';
import {
  Plus, Wallet, TrendingUp, CheckCircle, Clock,
  Users, ChevronRight, Check, CreditCard,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { Order, DiningTable } from '@/types/database';

/* ── Live clock ── */
function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/* ── Status helpers ── */
type KanbanGroup = 'In Progress' | 'Waiting for Payment' | 'Served';
function mapStatus(status: Order['status']): KanbanGroup {
  if (status === 'open' || status === 'pending') return 'In Progress';
  if (status === 'paid') return 'Served';
  return 'Waiting for Payment';
}

/* ── Mini order card for kanban ── */
function KanbanCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const group = mapStatus(order.status);
  const customer = order.customer_name || (order as any).customer?.first_name || 'Walk-in';
  const typeLabel = order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'takeout' ? 'Take Away' : 'Order';
  const lines: any[] = (order as any).lines || [];
  const statusColor = group === 'In Progress' ? 'text-warning' : group === 'Served' ? 'text-success' : 'text-primary';
  const badgeClass = group === 'In Progress' ? 'text-warning bg-warning-tint' : group === 'Served' ? 'text-success bg-success-tint' : 'text-primary bg-primary-tint';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl border border-border p-3.5 hover:shadow-pos transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-xs font-semibold">Order# <span className="text-primary">#{order.order_number}</span></span>
          <span className="text-muted-foreground text-xs"> / {typeLabel}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground">Customer</div>
          <div className="text-sm font-semibold truncate">{customer}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {group === 'In Progress' ? (
          <div className="flex items-center gap-1.5 flex-1 mr-2">
            <div className="h-1.5 flex-1 rounded-full bg-border">
              <div className="h-full rounded-full bg-warning" style={{ width: '40%' }} />
            </div>
            <span className="text-[11px] font-bold text-warning">40%</span>
          </div>
        ) : (
          <div className={cn('flex items-center gap-1', statusColor)}>
            <Check className="h-3 w-3" />
            <span className="text-xs font-medium">{group}</span>
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-full', badgeClass)}>
            {lines.length} Items
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    </button>
  );
}

/* ── Table availability sidebar item ── */
function TableSidebarItem({ table }: { table: DiningTable }) {
  const isAvailable = table.status === 'available';
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', isAvailable ? 'bg-success' : 'bg-warning')} />
        <span className="text-sm font-medium text-foreground">{table.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{table.capacity} seats</span>
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', isAvailable ? 'text-success bg-success-tint' : 'text-warning bg-warning-tint')}>
          {isAvailable ? 'Available' : 'Occupied'}
        </Badge>
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const now = useLiveClock();

  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organization) return;
    try {
      const [ordersRes, summaryRes, tablesRes] = await Promise.all([
        OrderService.listOrders({ orgId: organization.id, limit: 50 }),
        ReportingService.getSalesSummary(organization.id).catch(() => null),
        TableService.listTables({ orgId: organization.id }).catch(() => []),
      ]);
      setOrders(ordersRes.orders);
      setSummary(summaryRes);
      setTables(tablesRes);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => { load(); }, [load]);

  // Greeting
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = profile?.first_name || 'Team';

  // Kanban groups — active orders only
  const active = orders.filter(o => o.status !== 'voided' && o.status !== 'refunded');
  const inProgress = active.filter(o => mapStatus(o.status) === 'In Progress');
  const waiting = active.filter(o => mapStatus(o.status) === 'Waiting for Payment');
  const served = active.filter(o => mapStatus(o.status) === 'Served');

  // Stats
  const totalEarning = summary?.total_collected ?? 0;
  const completedToday = orders.filter(o => o.status === 'paid').length;

  // Sidebar: available tables
  const availableTables = tables.filter(t => t.status === 'available').slice(0, 8);

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-6 pos-desktop:py-5">

        {/* Greeting bar */}
        <div className="flex flex-col pos-tablet:flex-row pos-tablet:items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{greeting}, {userName}! 👋</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Give your best service for customers, happy working!</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden pos-tablet:block">
              <div className="text-lg font-bold text-foreground tabular-nums">{timeStr}</div>
              <div className="text-xs text-muted-foreground">{dateStr}</div>
            </div>
            <Button onClick={() => navigate('/pos')} className="shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Create New Order
            </Button>
          </div>
        </div>

        {/* 4 Stat cards */}
        <div className="grid grid-cols-2 pos-desktop:grid-cols-4 gap-3 mb-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard icon={<Wallet className="h-5 w-5" />} label="Total Earning" value={formatCurrency(totalEarning)} accent="warning" />
              <StatCard icon={<TrendingUp className="h-5 w-5" />} label="In Progress" value={inProgress.length} accent="primary" />
              <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Ready to Served" value={served.length} accent="success" />
              <StatCard icon={<Clock className="h-5 w-5" />} label="Completed" value={completedToday} accent="primary" />
            </>
          )}
        </div>

        {/* Kanban columns */}
        {loading ? (
          <div className="grid pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-4">
            {([
              ['In Progress', inProgress, 'warning'] as const,
              ['Waiting for Payment', waiting, 'primary'] as const,
              ['Served', served, 'success'] as const,
            ]).map(([title, items, accent]) => (
              <div key={title}>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-bold text-foreground">{title}</h3>
                  <span className={cn(
                    'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                    accent === 'warning' ? 'text-warning bg-warning-tint' : '',
                    accent === 'primary' ? 'text-primary bg-primary-tint' : '',
                    accent === 'success' ? 'text-success bg-success-tint' : '',
                  )}>
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2">
                    <div className="text-sm text-muted-foreground">No orders</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(o => (
                      <KanbanCard key={o.id} order={o} onClick={() => navigate(`/orders/${o.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <div className="pos-tablet:hidden fixed bottom-20 right-4 z-30">
          <Button size="lg" className="rounded-full shadow-pos-lg h-14 w-14 p-0" onClick={() => navigate('/pos')} aria-label="Create new order">
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* ── Right Sidebar (desktop only) ── */}
      <div className="hidden pos-desktop:flex w-72 flex-col border-l border-border bg-card overflow-y-auto">
        {/* Available tables section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Table Available</h3>
            <button
              onClick={() => navigate('/table-floor')}
              className="text-xs text-primary font-medium hover:underline"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : availableTables.length === 0 ? (
            <EmptyState title="All tables occupied" description="No available tables right now." className="py-4" />
          ) : (
            <div>
              {availableTables.map(t => <TableSidebarItem key={t.id} table={t} />)}
            </div>
          )}
        </div>

        {/* Out of stock section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">Out of Stock</h3>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-primary font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div className="text-sm font-medium text-foreground">All stocked up</div>
            <div className="text-xs text-muted-foreground mt-1">No out-of-stock items</div>
          </div>
        </div>
      </div>
    </div>
  );
}
