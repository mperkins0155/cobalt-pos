// ============================================================
// CloudPos — Reports Page
// Phase 0D: Enhanced from cobalt-pos Reports with CloudPos design
// Data: ReportingService + InventoryService + ReservationService + ExpenseService
// TODO Phase 3: Add recharts (SalesChart, PaymentBreakdown, CategoryRevenue, HourlyVolume)
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportingService, type SalesSummary } from '@/services/reporting';
import { InventoryService } from '@/services/inventory';
import { ReservationService } from '@/services/reservations';
import { ExpenseService } from '@/services/expenses';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/pos';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Receipt,
  AlertTriangle,
  CalendarDays,
  Wallet,
  FileText,
} from 'lucide-react';
import type { InventoryRecord, Reservation } from '@/types/database';

export default function Reports() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [lowStock, setLowStock] = useState<InventoryRecord[]>([]);
  const [upcomingRes, setUpcomingRes] = useState<Reservation[]>([]);
  const [expenses, setExpenses] = useState<{ total: number; paid: number; pending: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Promise.all([
      ReportingService.getSalesSummary(organization.id, currentLocation?.id, today.toISOString()),
      InventoryService.getLowStockAlerts(organization.id, currentLocation?.id),
      ReservationService.listUpcoming(organization.id, currentLocation?.id, 5),
      ExpenseService.getSummary(organization.id, currentLocation?.id),
    ])
      .then(([sales, stock, reservations, exp]) => {
        setSummary(sales);
        setLowStock(stock);
        setUpcomingRes(reservations);
        setExpenses({ total: exp.total, paid: exp.paid, pending: exp.pending });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organization, currentLocation]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Reports</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/reports/closeout')}>
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Z-Report
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 pos-desktop:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Sales summary stat cards */}
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Today's Summary</h3>
          <div className="grid grid-cols-2 pos-desktop:grid-cols-4 gap-3 mb-5">
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Gross Sales" value={formatCurrency(summary?.gross_sales || 0)} accent="success" />
            <StatCard icon={<ShoppingCart className="h-4 w-4" />} label="Orders" value={summary?.order_count || 0} accent="primary" />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg Order" value={formatCurrency(summary?.avg_order_value || 0)} accent="primary" />
            <StatCard icon={<Receipt className="h-4 w-4" />} label="Tax Collected" value={formatCurrency(summary?.tax_collected || 0)} accent="warning" />
          </div>

          <div className="grid grid-cols-2 pos-desktop:grid-cols-4 gap-3 mb-5">
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Tips" value={formatCurrency(summary?.tips || 0)} accent="success" />
            <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Low Stock" value={lowStock.length} accent="warning" />
            <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Reservations" value={upcomingRes.length} accent="primary" />
            <StatCard icon={<Wallet className="h-4 w-4" />} label="Expenses" value={formatCurrency(expenses?.total || 0)} accent="warning" />
          </div>

          {/* Payment breakdown */}
          {summary?.payment_breakdown && summary.payment_breakdown.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.payment_breakdown.map((p) => (
                  <div key={p.tender_type} className="flex justify-between items-center text-sm">
                    <span className="capitalize text-muted-foreground">
                      {p.tender_type} <span className="text-xs">({p.count})</span>
                    </span>
                    <span className="font-semibold">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Low stock alerts */}
          {lowStock.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-warning">Low Stock Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {lowStock.slice(0, 8).map((row) => (
                  <div key={row.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
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

          {/* Upcoming reservations */}
          {upcomingRes.length > 0 && (
            <Card className="mb-4 pb-20 pos-tablet:pb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Upcoming Reservations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {upcomingRes.map((r) => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {r.customer_name || 'Guest'} ({r.party_size})
                    </span>
                    <span className="font-medium text-primary">
                      {new Date(r.reserved_for).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
