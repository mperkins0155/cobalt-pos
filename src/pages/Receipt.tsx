import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Printer, Send, Home } from 'lucide-react';
import type { Order } from '@/types/database';

export default function Receipt() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    OrderService.getOrderWithDetails(orderId).then(setOrder).catch(console.error);
  }, [orderId]);

  if (!order) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Payment Complete</h1>
          <p className="text-muted-foreground">Order #{order.order_number}</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-left space-y-1">
          {(order.lines || []).map((line: any) => (
            <div key={line.id} className="flex justify-between text-sm">
              <span>{line.quantity}x {line.item_name}</span>
              <span>{formatCurrency(line.subtotal)}</span>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(order.subtotal_amount)}</span></div>
          {order.discount_amount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span></div>}
          <div className="flex justify-between text-sm"><span>Tax</span><span>{formatCurrency(order.tax_amount)}</span></div>
          {order.tip_amount > 0 && <div className="flex justify-between text-sm"><span>Tip</span><span>{formatCurrency(order.tip_amount)}</span></div>}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(order.total_amount)}</span></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
          <Button variant="outline" className="flex-1">
            <Send className="h-4 w-4 mr-1" />Email
          </Button>
        </div>
        <Button className="w-full h-12" onClick={() => navigate('/pos', { replace: true })}>
          <Home className="h-4 w-4 mr-2" />New Sale
        </Button>
      </div>
    </div>
  );
}
