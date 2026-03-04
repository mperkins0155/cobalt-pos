import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { RefundService } from '@/services/refunds';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, RotateCcw, XCircle, Printer, Send, Loader2 } from 'lucide-react';
import type { Order } from '@/types/database';

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { organization, profile, hasRole } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    OrderService.getOrderWithDetails(orderId)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleVoid = async () => {
    if (!order || !profile || !organization) return;
    setProcessing(true);
    try {
      await OrderService.voidOrder(order.id, profile.id, organization.id, 'Voided by manager');
      setOrder({ ...order, status: 'voided' });
      setShowVoidDialog(false);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleFullRefund = async () => {
    if (!order || !profile || !organization) return;
    setProcessing(true);
    try {
      await RefundService.refundFull({
        orgId: organization.id,
        orderId: order.id,
        createdBy: profile.id,
        reasonText: 'Full refund',
      });
      setOrder({ ...order, status: 'refunded', refunded_amount: order.total_amount });
      setShowRefundDialog(false);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const canVoid = ['open', 'pending'].includes(order.status) && hasRole('manager');
  const canRefund = ['paid', 'partially_refunded'].includes(order.status) && hasRole('manager');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
          <p className="text-xs opacity-80">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Badge className="text-xs capitalize">{order.status}</Badge>
      </header>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Line Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(order.lines || []).map((line: any) => (
                <div key={line.id} className="flex justify-between text-sm">
                  <div>
                    <span>{line.quantity}x {line.item_name}</span>
                    {line.variant_name && <span className="text-muted-foreground"> ({line.variant_name})</span>}
                    {(line.modifiers || []).length > 0 && (
                      <p className="text-xs text-muted-foreground ml-4">
                        {line.modifiers.map((m: any) => m.option_name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(line.subtotal)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span><span>{formatCurrency(order.subtotal_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span><span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax</span><span>{formatCurrency(order.tax_amount)}</span>
              </div>
              {order.tip_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tip</span><span>{formatCurrency(order.tip_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span><span>{formatCurrency(order.total_amount)}</span>
              </div>
              {order.refunded_amount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Refunded</span><span>-{formatCurrency(order.refunded_amount)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          {(order.payments || []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(order.payments || []).map((p: any) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{p.tender_type}</Badge>
                      {p.card_last_four && <span className="text-muted-foreground">****{p.card_last_four}</span>}
                      {p.external_provider && <span className="text-muted-foreground">{p.external_provider}</span>}
                    </div>
                    <span className={p.payment_kind === 'refund' ? 'text-red-600' : ''}>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />Print
            </Button>
            {canVoid && (
              <Button variant="outline" className="flex-1 text-destructive" onClick={() => setShowVoidDialog(true)}>
                <XCircle className="h-4 w-4 mr-1" />Void
              </Button>
            )}
            {canRefund && (
              <Button variant="outline" className="flex-1 text-orange-600" onClick={() => setShowRefundDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-1" />Refund
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Void Dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Order #{order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} disabled={processing} className="bg-destructive text-destructive-foreground">
              {processing ? 'Voiding...' : 'Void Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund Order #{order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Full refund of {formatCurrency(order.total_amount - order.refunded_amount)}.
              This will be recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFullRefund} disabled={processing} className="bg-orange-600">
              {processing ? 'Processing...' : 'Refund'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
