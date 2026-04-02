import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, CalendarDays, DollarSign, FileText, Receipt, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ReportingService, type SalesSummary } from '@/services/reporting';
import { OrderService } from '@/services/orders';
import { InventoryService } from '@/services/inventory';
import { ReservationService } from '@/services/reservations';
import { ExpenseService } from '@/services/expenses';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/pos';
import type { InventoryRecord, Order, Reservation } from '@/types/database';

type ReportOrderTypePoint = { type: string; total: number; count: number };
type HourlyPoint = { hour: string; orders: number; revenue: number };

const PaymentBreakdownChart = lazy(() => import('@/components/reports/PaymentBreakdownChart'));
const OrderTypeRevenueChart = lazy(() => import('@/components/reports/OrderTypeRevenueChart'));
const HourlyVolumeChart = lazy(() => import('@/components/reports/HourlyVolumeChart'));

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export default function Reports() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [lowStock, setLowStock] = useState<InventoryRecord[]>([]);
  const [upcomingRes, setUpcomingRes] = useState<Reservation[]>([]);
  const [expenses, setExpenses] = useState<{ total: number; paid: number; pending: number } | null>(null);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const dayStart = startOfToday();

    const load = async () => {
      try {
        const [sales, stock, reservations, exp, orderResult] = await Promise.all([
          ReportingService.getSalesSummary(organization.id, currentLocation?.id, dayStart.toISOString()),
          InventoryService.getLowStockAlerts(organization.id, currentLocation?.id),
          ReservationService.listUpcoming(organization.id, currentLocation?.id, 5),
          ExpenseService.getSummary(organization.id, currentLocation?.id),
          OrderService.listOrders({
            orgId: organization.id,
            locationId: currentLocation?.id,
            status: 'paid',
            dateFrom: dayStart.toISOString(),
            limit: 500,
          }),
        ]);

        setSummary(sales);
        setLowStock(stock);
        setUpcomingRes(reservations);
        setExpenses({ total: exp.total, paid: exp.paid, pending: exp.pending });
        setTodayOrders(orderResult.orders);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [organization, currentLocation]);

  const orderTypeRevenue = useMemo<ReportOrderTypePoint[]>(() => {
    const totals = new Map<string, ReportOrderTypePoint>();
    for (const order of todayOrders) {
      const key = order.order_type || 'in_store';
      const current = totals.get(key) || { type: key, total: 0, count: 0 };
      current.total += order.total_amount || 0;
      current.count += 1;
      totals.set(key, current);
    }
    return Array.from(totals.values());
  }, [todayOrders]);

  const hourlyVolume = useMemo<HourlyPoint[]>(() => {
    const hours = new Map<string, HourlyPoint>();
    for (let hour = 0; hour < 24; hour += 1) {
      const label = `${hour.toString().padStart(2, '0')}:00`;
      hours.set(label, { hour: label, orders: 0, revenue: 0 });
    }

    for (const order of todayOrders) {
      const date = new Date(order.created_at);
      const key = `${date.getHours().toString().padStart(2, '0')}:00`;
      const bucket = hours.get(key);
      if (!bucket) continue;
      bucket.orders += 1;
      bucket.revenue += order.total_amount || 0;
    }

    return Array.from(hours.values()).filter((point) => point.orders > 0);
  }, [todayOrders]);

  const paymentBreakdown = summary?.payment_breakdown || [];
  const chartFallback = <Skeleton className="h-[280px] rounded-lg" />;

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Reports</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/reports/closeout')}>
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Z-Report
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 pos-desktop:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-[88px] rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 pos-desktop:grid-cols-2">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Today's Summary</h3>
          <div className="mb-5 grid grid-cols-2 gap-3 pos-desktop:grid-cols-4">
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Gross Sales" value={formatCurrency(summary?.gross_sales || 0)} accent="success" />
            <StatCard icon={<ShoppingCart className="h-4 w-4" />} label="Orders" value={summary?.order_count || 0} accent="primary" />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg Order" value={formatCurrency(summary?.avg_order_value || 0)} accent="primary" />
            <StatCard icon={<Receipt className="h-4 w-4" />} label="Tax Collected" value={formatCurrency(summary?.tax_collected || 0)} accent="warning" />
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 pos-desktop:grid-cols-4">
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Tips" value={formatCurrency(summary?.tips || 0)} accent="success" />
            <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Low Stock" value={lowStock.length} accent="warning" />
            <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Reservations" value={upcomingRes.length} accent="primary" />
            <StatCard icon={<Wallet className="h-4 w-4" />} label="Expenses" value={formatCurrency(expenses?.total || 0)} accent="warning" />
          </div>

          <div className="mb-5 grid gap-4 pos-desktop:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payment data for this range.</p>
                ) : (
                  <Suspense fallback={chartFallback}>
                    <PaymentBreakdownChart data={paymentBreakdown} />
                  </Suspense>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Revenue by Order Type</CardTitle>
              </CardHeader>
              <CardContent>
                {orderTypeRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed orders for this range.</p>
                ) : (
                  <Suspense fallback={chartFallback}>
                    <OrderTypeRevenueChart data={orderTypeRevenue} />
                  </Suspense>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-5 grid gap-4 pos-desktop:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Hourly Volume</CardTitle>
              </CardHeader>
              <CardContent>
                {hourlyVolume.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hourly order data yet today.</p>
                ) : (
                  <Suspense fallback={<Skeleton className="h-[300px] rounded-lg" />}>
                    <HourlyVolumeChart data={hourlyVolume} />
                  </Suspense>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {lowStock.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-warning">Low Stock Alerts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lowStock.slice(0, 6).map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-foreground">
                          {row.item?.name || 'Item'}
                          {row.variant?.name ? ` (${row.variant.name})` : ''}
                        </span>
                        <span className="font-medium text-warning">
                          {row.quantity_on_hand} / {row.low_stock_threshold}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {upcomingRes.length > 0 && (
                <Card className="pb-20 pos-tablet:pb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Upcoming Reservations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {upcomingRes.map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {reservation.customer_name || 'Guest'} ({reservation.party_size})
                        </span>
                        <span className="font-medium text-primary">
                          {new Date(reservation.reserved_for).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
