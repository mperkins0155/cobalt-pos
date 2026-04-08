// ============================================================
// CloudPos — Dashboard
// Screens 5-6: greeting + live clock, 4 stat cards,
// 3-column Kanban, right sidebar (available tables + out of stock)
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { TableService } from '@/services/tables';
import { InventoryService } from '@/services/inventory';
import { ReportingService, type SalesSummary } from '@/services/reporting';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/pos';
import { toast } from 'sonner';
import {
  Plus, Wallet, TrendingUp, CheckCircle, Clock,
  Grid3X3, ChevronDown, Users, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order, DiningTable, InventoryRecord, Floor } from '@/types/database';

type DisplayStatus = 'In Progress' | 'Waiting for Payment' | 'Served';

function mapStatus(status: Order['status']): DisplayStatus {
  switch (status) {
    case 'open':
    case 'pending':
      return 'In Progress';
    case 'paid':
      return 'Served';
    default:
      return 'Waiting for Payment';
  }
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, organization, currentLocation } = useAuth();
  const now = useLiveClock();

  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [lowStock, setLowStock] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');

  const userName = profile?.first_name || 'Team';
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const load = useCallback(async () => {
    if (!organization) return;
    try {
      const [ordersRes, summaryRes, tablesRes, floorsRes] = await Promise.all([
        OrderService.listOrders({ orgId: organization.id, limit: 100 }),
        ReportingService.getSalesSummary(organization.id).catch(() => null),
        TableService.listTables({ orgId: organization.id, locationId: currentLocation?.id }),
        TableService.listFloors(organization.id, currentLocation?.id),
      ]);
      setOrders(ordersRes.orders);
      setSummary(summaryRes);
      setTables(tablesRes);
      setFloors(floorsRes);

      // Low stock — only if location available
      if (currentLocation) {
        try {
          const inv = await InventoryService.getInventory(organization.id, currentLocation.id);
          setLowStock(inv.filter((r) => {
            const qty = r.quantity_on_hand;
            const thresh = r.low_stock_threshold ?? 10;
            return qty <= thresh;
          }).slice(0, 5));
        } catch { /* skip */ }
      }
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [organization, currentLocation]);

  useEffect(() => { void load(); }, [load]);

  const activeOrders = orders.filter(
    (o) => o.status !== 'paid' && o.status !== 'voided' && o.status !== 'refunded'
  );
  const grouped = {
    ip: activeOrders.filter((o) => mapStatus(o.status) === 'In Progress'),
    wp: activeOrders.filter((o) => mapStatus(o.status) === 'Waiting for Payment'),
    sv: activeOrders.filter((o) => mapStatus(o.status) === 'Served'),
  };
  const completedToday = orders.filter((o) => o.status === 'paid').length;

  // Sidebar: filter tables by floor
  const availableTables = tables.filter(
    (t) => t.status === 'available' && (selectedFloor === 'all' || t.floor_id === selectedFloor)
  );

  const floorOptions = [
    { id: 'all', name: 'All Floors' },
    ...floors.map((f) => ({ id: f.id, name: f.name })),
  ];

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-6 pos-desktop:py-5 min-w-0">

        {/* Greeting bar */}
        <div className="flex items-start justify-between mb-4 pos-tablet:mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-0.5">
              {greeting}, {userName} 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              Give your best service today — happy working!
            </p>
          </div>
          <div className="hidden pos-tablet:flex flex-col items-end shrink-0 ml-4">
            <p className="text-2xl font-bold text-foreground tabular-nums">{timeStr}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
        </div>

        {/* Create Order CTA (mobile) */}
        <Button
          className="w-full mb-4 h-11 font-bold pos-tablet:hidden"
          onClick={() => navigate('/orders/new')}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create New Order
        </Button>

        {/* Stat cards — 4 cards */}
        <div className="grid grid-cols-2 pos-desktop:grid-cols-4 gap-2.5 mb-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
          ) : (
            <>
              <StatCard icon={<Wallet className="h-4 w-4" />} label="Today's Earning"
                value={formatCurrency(summary?.total_collected ?? 0)} accent="warning" />
              <StatCard icon={<TrendingUp className="h-4 w-4" />} label="In Progress"
                value={grouped.ip.length} accent="primary" />
              <StatCard icon={<CheckCircle className="h-4 w-4" />} label="Ready to Serve"
                value={grouped.sv.length} accent="success" />
              <StatCard icon={<Clock className="h-4 w-4" />} label="Completed"
                value={completedToday} accent="muted" />
            </>
          )}
        </div>

        {/* Kanban columns */}
        {loading ? (
          <div className="grid pos-tablet:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid pos-tablet:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
            {([
              ['In Progress',       grouped.ip, 'warning', 'bg-warning/10 text-warning'],
              ['Waiting Payment',   grouped.wp, 'primary', 'bg-primary-tint text-primary'],
              ['Served',            grouped.sv, 'success', 'bg-success-tint text-success'],
            ] as const).map(([title, items, _accent, badgeCls]) => (
              <KanbanColumn
                key={title}
                title={title}
                items={items as Order[]}
                badgeCls={badgeCls}
                onOrderClick={(o) => navigate(`/orders/${o.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div className="hidden pos-desktop:flex flex-col w-72 xl:w-80 border-l border-border bg-card overflow-hidden shrink-0">
        {/* Create Order button */}
        <div className="px-4 py-4 border-b border-border">
          <Button className="w-full font-bold" onClick={() => navigate('/orders/new')}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create New Order
          </Button>
        </div>

        {/* Available tables */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Table Available</h3>
              <span className="text-xs font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full">
                {availableTables.length} free
              </span>
            </div>
            {/* Floor selector */}
            {floors.length > 0 && (
              <FloorSelector
                options={floorOptions}
                value={selectedFloor}
                onChange={setSelectedFloor}
              />
            )}
          </div>

          {loading ? (
            <div className="px-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : availableTables.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Grid3X3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No available tables</p>
            </div>
          ) : (
            <div className="px-4 space-y-1.5 pb-4">
              {availableTables.map((table) => (
                <div
                  key={table.id}
                  className="flex items-center justify-between bg-background rounded-lg border border-border px-3 py-2.5 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate('/table-floor')}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm font-semibold text-foreground">{table.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {table.capacity}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Out of Stock */}
          <div className="px-4 pt-2 pb-2 border-t border-border">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Out of Stock
            </h3>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : lowStock.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">All items well stocked</p>
            ) : (
              <div className="space-y-2 pb-4">
                {lowStock.map((record) => (
                  <div key={record.id} className="flex items-center justify-between bg-warning-tint rounded-lg border border-warning/20 px-3 py-2">
                    <span className="text-xs font-semibold text-foreground truncate mr-2">
                      {record.item?.name ?? 'Unknown'}
                    </span>
                    <span className="text-xs font-bold text-warning shrink-0">
                      {record.quantity_on_hand} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ──
function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: 'warning' | 'primary' | 'success' | 'muted';
}) {
  const accentMap = {
    warning: 'text-warning bg-warning/10',
    primary:  'text-primary bg-primary-tint',
    success:  'text-success bg-success-tint',
    muted:    'text-muted-foreground bg-muted',
  };
  return (
    <div className="bg-card rounded-xl border border-border p-3.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${accentMap[accent]}`}>
        {icon}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

// ── Kanban column ──
function KanbanColumn({
  title, items, badgeCls, onOrderClick,
}: {
  title: string;
  items: Order[];
  badgeCls: string;
  onOrderClick: (o: Order) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">No orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((o) => <OrderKanbanCard key={o.id} order={o} onClick={() => onOrderClick(o)} />)}
        </div>
      )}
    </div>
  );
}

// ── Order kanban card ──
function OrderKanbanCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const customer = order.customer_name || 'Walk-in';
  const lines: any[] = (order as any).lines ?? [];
  const typeLabel = order.order_type === 'dine_in' ? 'Dine In'
    : order.order_type === 'takeout' ? 'Take Away' : 'In Store';
  const statusCfg = {
    open: { bar: 'bg-warning', pct: 40 },
    pending: { bar: 'bg-primary', pct: 75 },
    paid: { bar: 'bg-success', pct: 100 },
  } as Record<string, { bar: string; pct: number }>;
  const cfg = statusCfg[order.status] ?? { bar: 'bg-muted-foreground', pct: 0 };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl border border-border p-3 hover:shadow-pos hover:border-primary/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-primary">#{order.order_number}</span>
          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-medium">
            {typeLabel}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Customer */}
      <p className="text-sm font-semibold text-foreground truncate mb-2">{customer}</p>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${cfg.pct}%` }} />
      </div>

      {/* Item count + total */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {lines.length > 0 ? `${lines.length} item${lines.length !== 1 ? 's' : ''}` : 'No items yet'}
        </span>
        <span className="text-sm font-bold text-foreground">
          {formatCurrency(order.total_amount || 0)}
        </span>
      </div>
    </button>
  );
}

// ── Floor selector ──
function FloorSelector({
  options, value, onChange,
}: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        {selected?.name ?? 'All Floors'}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-pos overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={cn(
                  'w-full px-3 py-2.5 text-left text-sm transition-colors',
                  value === opt.id ? 'bg-primary-tint text-primary font-semibold' : 'text-foreground hover:bg-accent'
                )}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
