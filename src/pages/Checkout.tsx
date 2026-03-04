import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { OrderService } from '@/services/orders';
import { PaymentService } from '@/services/payments';
import { formatCurrency, calcChangeDue, calcTipFromPercent, round2 } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, CreditCard, Banknote, Smartphone, DollarSign,
  Check, Loader2, Split, Save,
} from 'lucide-react';
import type { TenderType } from '@/types/database';

type CheckoutStep = 'tip' | 'payment' | 'processing' | 'complete';

export default function Checkout() {
  const navigate = useNavigate();
  const { organization, profile, currentLocation, tipSettings } = useAuth();
  const cart = useCart({ defaultTaxRate: 0 }); // Cart is loaded from context/state

  const [step, setStep] = useState<CheckoutStep>(
    tipSettings?.mode !== 'off' ? 'tip' : 'payment'
  );
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<TenderType | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [otherProvider, setOtherProvider] = useState('');
  const [otherReference, setOtherReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipPercentages = tipSettings?.suggested_percentages || [15, 18, 20, 25];

  // Tip handling
  const handleTipSelect = (percent: number) => {
    setSelectedTip(percent);
    setCustomTip('');
    cart.setTipByPercent(percent);
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    setSelectedTip(null);
    const amount = parseFloat(value) || 0;
    cart.setTipAmount(amount);
  };

  const handleNoTip = () => {
    setSelectedTip(0);
    setCustomTip('');
    cart.setTipAmount(0);
  };

  const handleContinueToPayment = () => setStep('payment');

  // Payment processing
  const processPayment = useCallback(async () => {
    if (!organization || !profile) return;
    setProcessing(true);
    setError(null);

    try {
      // 1. Create order
      const order = await OrderService.createOrder(
        organization.id,
        currentLocation?.id,
        profile.id,
        cart.getCartState(),
        'pending'
      );

      // 2. Process payment based on method
      if (paymentMethod === 'cash') {
        const received = parseFloat(cashReceived) || cart.totals.total;
        await PaymentService.recordCashPayment(
          organization.id,
          order.id,
          cart.totals.total,
          received,
          cart.tipAmount
        );
      } else if (paymentMethod === 'other') {
        await PaymentService.recordOtherPayment(
          organization.id,
          order.id,
          cart.totals.total,
          otherProvider,
          otherReference,
          cart.tipAmount
        );
      } else if (paymentMethod === 'card') {
        // Initialize HelcimPay.js
        const { checkoutToken } = await PaymentService.initializeCardPayment(
          order.id,
          cart.totals.total,
          organization.currency
        );

        // HelcimPay.js modal flow would go here
        // For now, we'll simulate - in production this triggers the HelcimPay.js modal
        // The callback from HelcimPay.js would call PaymentService.validateCardPayment
        throw new Error('Card payment UI integration pending — use cash or other for now');
      }

      // 3. Finalize order
      await PaymentService.finalizeOrderPayments(
        organization.id,
        order.id,
        cart.totals.total,
        cart.totals.total // fully paid
      );

      // 4. Navigate to receipt
      cart.clearCart();
      navigate(`/pos/receipt/${order.id}`, { replace: true });

    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setProcessing(false);
    }
  }, [organization, profile, currentLocation, cart, paymentMethod, cashReceived, otherProvider, otherReference, navigate]);

  const handleSaveAsTicket = async () => {
    if (!organization || !profile) return;
    try {
      await OrderService.saveAsTicket(
        organization.id,
        currentLocation?.id,
        profile.id,
        cart.getCartState()
      );
      cart.clearCart();
      navigate('/pos', { replace: true });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const changeDue = paymentMethod === 'cash' && cashReceived
    ? calcChangeDue(cart.totals.total, parseFloat(cashReceived) || 0)
    : 0;

  const canProcess = paymentMethod === 'cash'
    ? (parseFloat(cashReceived) || 0) >= cart.totals.total
    : paymentMethod === 'other'
      ? otherProvider.length > 0
      : paymentMethod === 'card';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Checkout</h1>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="text-primary-foreground text-xs" onClick={handleSaveAsTicket}>
            <Save className="h-4 w-4 mr-1" />Save Tab
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Order Summary */}
        <Card>
          <CardContent className="pt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({cart.itemCount} items)</span>
              <span>{formatCurrency(cart.totals.subtotal)}</span>
            </div>
            {cart.totals.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(cart.totals.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>{formatCurrency(cart.totals.tax_amount)}</span>
            </div>
            {cart.tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tip</span>
                <span>{formatCurrency(cart.tipAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(cart.totals.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tip Selection */}
        {step === 'tip' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add a tip?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {tipPercentages.map(pct => (
                  <Button
                    key={pct}
                    variant={selectedTip === pct ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-2"
                    onClick={() => handleTipSelect(pct)}
                  >
                    <span className="text-sm font-bold">{pct}%</span>
                    <span className="text-xs opacity-70">
                      {formatCurrency(calcTipFromPercent(cart.totals.subtotal, pct))}
                    </span>
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Custom tip"
                    className="pl-8"
                    type="number"
                    step="0.01"
                    value={customTip}
                    onChange={e => handleCustomTip(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleNoTip}>
                  No Tip
                </Button>
              </div>

              <Button className="w-full h-12" onClick={handleContinueToPayment}>
                Continue — {formatCurrency(cart.totals.total)}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Selection */}
        {step === 'payment' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Method buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-6 w-6 mb-1" />
                  <span className="text-xs">Card</span>
                </Button>
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-6 w-6 mb-1" />
                  <span className="text-xs">Cash</span>
                </Button>
                <Button
                  variant={paymentMethod === 'other' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setPaymentMethod('other')}
                >
                  <Smartphone className="h-6 w-6 mb-1" />
                  <span className="text-xs">Other</span>
                </Button>
              </div>

              {/* Cash amount */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <Label className="text-sm">Amount received</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 text-lg h-12"
                      type="number"
                      step="0.01"
                      placeholder={cart.totals.total.toFixed(2)}
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {/* Quick cash buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20, 50, 100].map(amt => (
                      <Button
                        key={amt}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setCashReceived(String(amt))}
                      >
                        ${amt}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs col-span-2"
                      onClick={() => setCashReceived(cart.totals.total.toFixed(2))}
                    >
                      Exact
                    </Button>
                  </div>
                  {changeDue > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600">Change Due</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(changeDue)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Other payment */}
              {paymentMethod === 'other' && (
                <div className="space-y-2">
                  <Label className="text-sm">Payment app</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Venmo', 'Cash App', 'Zelle', 'PayPal'].map(p => (
                      <Button
                        key={p}
                        variant={otherProvider === p ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setOtherProvider(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                  <Input
                    placeholder="Reference / confirmation (optional)"
                    value={otherReference}
                    onChange={e => setOtherReference(e.target.value)}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Process button */}
              <Button
                className="w-full h-14 text-lg font-bold"
                disabled={!canProcess || processing}
                onClick={processPayment}
              >
                {processing ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><Check className="h-5 w-5 mr-2" />Pay {formatCurrency(cart.totals.total)}</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
