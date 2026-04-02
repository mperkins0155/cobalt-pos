import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Home, Printer, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { appEnv } from '@/lib/appEnv';
import { OrderService } from '@/services/orders';
import { Receipt as ReceiptCard } from '@/components/Receipt';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order } from '@/types/database';

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    OrderService.getOrderWithDetails(orderId)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="mx-auto max-w-md space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Receipt not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="no-print text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-tint">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Payment Complete</h1>
          <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <ReceiptCard order={order} organization={organization} />

          <aside className="no-print space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-pos">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Receipt Actions</h2>
              <div className="space-y-2">
                <Button className="w-full" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!appEnv.emailReceiptsEnabled}
                  title={
                    appEnv.emailReceiptsEnabled
                      ? 'Email receipt'
                      : 'Email delivery is not enabled in this build yet'
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  {appEnv.emailReceiptsEnabled ? 'Email Receipt' : 'Email Receipt Soon'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/pos', { replace: true })}
                >
                  <Home className="mr-2 h-4 w-4" />
                  New Sale
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
