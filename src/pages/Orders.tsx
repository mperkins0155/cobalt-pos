import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/database';

const STATUS_COLORS: Record<OrderStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  voided: 'bg-gray-100 text-gray-800',
  refunded: 'bg-red-100 text-red-800',
  partially_refunded: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
};

export default function Orders() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const { orders } = await OrderService.listOrders({
          orgId: organization.id,
          status: statusFilter,
          limit: 100,
        });
        setOrders(orders);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [organization, statusFilter]);

  const statuses: (OrderStatus | 'all')[] = ['all', 'open', 'paid', 'refunded', 'voided'];

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/pos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Orders</h1>
      </header>

      <div className="p-3 border-b flex gap-1.5 overflow-x-auto">
        {statuses.map(s => (
          <Button
            key={s}
            variant={(s === 'all' && !statusFilter) || statusFilter === s ? 'default' : 'outline'}
            size="sm"
            className="text-xs shrink-0 capitalize"
            onClick={() => setStatusFilter(s === 'all' ? undefined : s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No orders found</p>
          ) : (
            orders.map(order => (
              <button
                key={order.id}
                className="w-full bg-card border rounded-lg p-3 text-left hover:border-primary transition-colors"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium text-sm">#{order.order_number}</span>
                    <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </Badge>
                  </div>
                  <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>{order.customer_name || 'Walk-in'}</span>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
