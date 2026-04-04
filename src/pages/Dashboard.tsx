import { toast } from '@/components/ui/sonner';
// ============================================================
// CloudPos — Dashboard Page
// Phase 0D: Extracted from prototype DashboardContent
// Data: OrderService.listOrders() + ReportingService.getSalesSummary()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { ReportingService, type SalesSummary } from '@/services/reporting';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatCard,
  FilterPills,
  EmptyState,
  SearchBar,
} from '@/components/pos';
import {
  Plus,
  Wallet,
  TrendingUp,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Order } from '@/types/database';

/** Map cobalt-pos order statuses to display groups */
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const userName = profile?.first_name || 'Team';

  // Load orders + sales summary
  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const [ordersRes, summaryRes] = await Promise.all([
          OrderService.listOrders({ orgId: organization.id, limit: 50 }),
          ReportingService.getSalesSummary(organization.id).catch(() => null),
        ]);
        setOrders(ordersRes.orders);
        setSummary(summaryRes);
      } catch (err) {
        console.error('Dashboard load error:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organization]);

  // Filter active (non-completed) orders
  const activeOrders = orders.filter(
    (o) => o.status !== 'paid' && o.status !== 'voided' && o.status !== 'refunded'
  );
  const grouped = {
    ip: activeOrders.filter((o) => mapStatus(o.status) === 'In Progress'),
    wp: activeOrders.filter((o) => mapStatus(o.status) === 'Waiting for Payment'),
    sv: activeOrders.filter((o) => mapStatus(o.status) === 'Served'),
  };

  // Mobile filter
  const tabs = [
    { key: 'all', label: 'All', count: activeOrders.length },
    { key: 'In Progress', label: 'Progress', count: grouped.ip.length },
    { key: 'Waiting for Payment', label: 'Waiting', count: grouped.wp.length },
    { key: 'Served', label: 'Served', count: grouped.sv.length },
  ];
  const filtered =
    filter === 'all'
      ? activeOrders
      : activeOrders.filter((o) => mapStatus(o.status) === filter);

  // Stats
  const totalEarning = summary?.total_collected ?? 0;
  const inProgressCount = grouped.ip.length;
  const servedCount = grouped.sv.length;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pos-tablet:mb-5">
        <div>
          <h2 className="text-lg pos-tablet:text-xl font-bold text-foreground mb-1">
            {greeting}, {userName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Give your best services for customers, happy working!
          </p>
        </div>
        <Button
          onClick={() => navigate('/pos')}
          className="hidden pos-tablet:inline-flex"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create New Order
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-2.5 pos-tablet:gap-3 mb-4 pos-tablet:mb-5">
        {loading ? (
          <>
            <Skeleton className="flex-1 h-[88px] rounded-lg" />
            <Skeleton className="flex-1 h-[88px] rounded-lg" />
            <Skeleton className="flex-1 h-[88px] rounded-lg" />
          </>
        ) : (
          <>
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Total Earning"
              value={formatCurrency(totalEarning)}
              accent="warning"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="In Progress"
              value={inProgressCount}
              accent="primary"
            />
            <StatCard
              icon={<CheckCircle className="h-4 w-4" />}
              label="Ready to Serve"
              value={servedCount}
              accent="success"
            />
          </>
        )}
      </div>

      {/* Order Kanban (desktop) / Filtered List (mobile) */}
      {loading ? (
        <div className="grid pos-tablet:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile: filter pills + flat list */}
          <div className="pos-tablet:hidden">
            <FilterPills
              items={tabs}
              active={filter}
              onChange={setFilter}
              className="mb-3"
            />
            <div className="space-y-2 pb-20">
              {filtered.length === 0 ? (
                <EmptyState
                  title="No orders"
                  description="Create a new order to get started."
                />
              ) : (
                filtered.map((o) => (
                  <OrderCardMini
                    key={o.id}
                    order={o}
                    onClick={() => navigate(`/orders/${o.id}`)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Tablet/Desktop: 3-column kanban */}
          <div className="hidden pos-tablet:flex gap-3 pos-desktop:gap-4">
            {(
              [
                ['In Progress', grouped.ip, 'warning'] as const,
                ['Waiting for Payment', grouped.wp, 'primary'] as const,
                ['Served', grouped.sv, 'success'] as const,
              ]
            ).map(([title, items, accent]) => (
              <div key={title} className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2.5">
                  <h3 className="text-sm font-bold text-foreground">{title}</h3>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full
                      ${accent === 'warning' ? 'text-warning bg-warning-tint' : ''}
                      ${accent === 'primary' ? 'text-primary bg-primary-tint' : ''}
                      ${accent === 'success' ? 'text-success bg-success-tint' : ''}
                    `}
                  >
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <EmptyState
                    title="No orders"
                    description={`No ${title.toLowerCase()} orders`}
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-2">
                    {items.map((o) => (
                      <OrderCardMini
                        key={o.id}
                        order={o}
                        onClick={() => navigate(`/orders/${o.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mobile FAB */}
      <div className="pos-tablet:hidden fixed bottom-20 right-4 z-30">
        <Button
          size="lg"
          className="rounded-full shadow-pos-lg h-14 w-14 p-0"
          onClick={() => navigate('/pos')}
          aria-label="Create new order"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

/* ── Mini order card for Dashboard kanban columns ── */

function OrderCardMini({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const status = mapStatus(order.status);
  const customerName =
    order.customer_name ||
    (order.customer as any)?.first_name ||
    'Walk-in';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-lg border border-border p-3 hover:shadow-pos transition-shadow"
    >
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold">
          <span className="text-primary">#{order.order_number}</span>
          {' / '}
          {order.order_type === 'dine_in' ? 'Dine In' : order.order_type === 'takeout' ? 'Take Away' : order.order_type}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="text-sm font-semibold text-foreground truncate mb-1">
        {customerName}
      </div>
      <div className="flex justify-between items-center">
        <span
          className={`text-[11px] font-medium
            ${status === 'In Progress' ? 'text-warning' : ''}
            ${status === 'Served' ? 'text-success' : ''}
            ${status === 'Waiting for Payment' ? 'text-primary' : ''}
          `}
        >
          {status}
        </span>
        <span className="text-sm font-bold">
          {formatCurrency(order.total_amount || 0)}
        </span>
      </div>
    </button>
  );
}
