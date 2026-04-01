// ============================================================
// CloudPos — Customer Detail Page
// Phase 0D: Built from stub + prototype CustomerProfileModal
// Data: CustomerService.getById() + CustomerService.getOrderHistory()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CustomerService } from '@/services/customers';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/pos';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  ShoppingCart,
  DollarSign,
  FileText,
  Tag,
} from 'lucide-react';
import type { Customer } from '@/types/database';

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      try {
        const [cust, history] = await Promise.all([
          CustomerService.getById(customerId),
          CustomerService.getOrderHistory(customerId, 20),
        ]);
        setCustomer(cust);
        setOrders(history);
      } catch (err) {
        console.error('Customer load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          icon={<User className="h-10 w-10" />}
          title="Customer not found"
          description="This customer may have been removed."
          action={
            <Button variant="outline" onClick={() => navigate('/customers')}>
              Back to Customers
            </Button>
          }
        />
      </div>
    );
  }

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unknown';
  const initials = (customer.first_name?.[0] || '') + (customer.last_name?.[0] || '') || '?';

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-3 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Profile header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{name}</h2>
          <p className="text-sm text-muted-foreground">
            Customer since {new Date(customer.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 pos-tablet:grid-cols-2 gap-4 max-w-3xl">
        {/* Contact info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.last_visit_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Last visit: {new Date(customer.last_visit_at).toLocaleDateString()}</span>
              </div>
            )}
            {customer.tags && customer.tags.length > 0 && (
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}
            {customer.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">{customer.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-3.5 w-3.5" />
                Total Visits
              </div>
              <span className="text-lg font-bold text-foreground">{customer.visit_count || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Total Spent
              </div>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(customer.total_spent || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Avg per Visit
              </div>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(customer.visit_count > 0 ? (customer.total_spent || 0) / customer.visit_count : 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order history */}
      <Card className="mt-4 max-w-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
          ) : (
            <div className="space-y-2 pb-20 pos-tablet:pb-0">
              {orders.map((order: any) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="w-full text-left bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between mb-0.5">
                    <span className="text-sm font-semibold text-primary">#{order.order_number}</span>
                    <span className="text-sm font-bold">{formatCurrency(order.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{order.status}</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
