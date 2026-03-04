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
import { ArrowLeft, DollarSign, ShoppingCart, TrendingUp, Receipt, AlertTriangle, CalendarDays, Wallet } from 'lucide-react';
import type { InventoryRecord, Reservation } from '@/types/database';

export default function Reports() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [lowStock, setLowStock] = useState<InventoryRecord[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [expenseSnapshot, setExpenseSnapshot] = useState<{ total: number; paid: number; pending: number } | null>(null);

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
      .then(([sales, lowStockRows, reservationRows, expenseRows]) => {
        setSummary(sales);
        setLowStock(lowStockRows);
        setUpcomingReservations(reservationRows);
        setExpenseSnapshot({
          total: expenseRows.total,
          paid: expenseRows.paid,
          pending: expenseRows.pending,
        });
      })
      .catch(console.error);
  }, [organization, currentLocation]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Reports</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={() => navigate('/reports/closeout')}>Z Report</Button>
        </div>
      </header>
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        <h2 className="text-sm font-semibold text-muted-foreground">Today's Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Gross Sales</p><p className="text-lg font-bold">{formatCurrency(summary?.gross_sales || 0)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Orders</p><p className="text-lg font-bold">{summary?.order_count || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Avg Order</p><p className="text-lg font-bold">{formatCurrency(summary?.avg_order_value || 0)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-orange-600" /><div><p className="text-xs text-muted-foreground">Tax Collected</p><p className="text-lg font-bold">{formatCurrency(summary?.tax_collected || 0)}</p></div></div></CardContent></Card>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /><div><p className="text-xs text-muted-foreground">Low Stock Items</p><p className="text-lg font-bold">{lowStock.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-sky-600" /><div><p className="text-xs text-muted-foreground">Upcoming Reservations</p><p className="text-lg font-bold">{upcomingReservations.length}</p></div></div></CardContent></Card>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-indigo-600" /><div><p className="text-xs text-muted-foreground">Expenses (Total)</p><p className="text-lg font-bold">{formatCurrency(expenseSnapshot?.total || 0)}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-amber-600" /><div><p className="text-xs text-muted-foreground">Expenses (Pending)</p><p className="text-lg font-bold">{formatCurrency(expenseSnapshot?.pending || 0)}</p></div></div></CardContent></Card>
        </div>
        {summary?.payment_breakdown && summary.payment_breakdown.length > 0 && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payment Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {summary.payment_breakdown.map(p => (
                <div key={p.tender_type} className="flex justify-between text-sm capitalize">
                  <span>{p.tender_type} ({p.count})</span><span className="font-medium">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {lowStock.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Out-Of-Stock / Low-Stock Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {lowStock.slice(0, 8).map((row) => (
                <div key={row.id} className="flex justify-between text-sm">
                  <span>{row.item?.name || 'Item'}{row.variant?.name ? ` (${row.variant.name})` : ''}</span>
                  <span className="font-medium">{row.quantity_on_hand} / {row.low_stock_threshold}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {upcomingReservations.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Reservations</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {upcomingReservations.map((reservation) => (
                <div key={reservation.id} className="flex justify-between text-sm">
                  <span>{reservation.customer_name || 'Guest'} ({reservation.party_size})</span>
                  <span className="font-medium">{new Date(reservation.reserved_for).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
