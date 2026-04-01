// ============================================================
// CloudPos — Checkout / Payment Page
// Phase 0D-2: Restyled with CloudPos design, removed standalone header
// Data: OrderService.createOrder() + PaymentService
// Last modified: V0.6.4.0 — see VERSION_LOG.md
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { OrderService } from '@/services/orders';
import { PaymentService } from '@/services/payments';
import { formatCurrency, calcChangeDue, calcTipFromPercent } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, CreditCard, Banknote, Smartphone, DollarSign,
  Check, Loader2, Save,
} from 'lucide-react';
import type { TenderType } from '@/types/database';

type CheckoutStep = 'tip' | 'payment' | 'processing' | 'complete';

export default function Checkout() {
  const navigate = useNavigate();
  const { organization, profile, currentLocation, tipSettings } = useAuth();
  const cart = useCart({ defaultTaxRate: 0 });

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

  const handleTipSelect = (percent: number) => {
    setSelectedTip(percent);
    setCustomTip('');
    cart.setTipByPercent(percent);
  };
  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    setSelectedTip(null);
    cart.setTipAmount(parseFloat(value) || 0);
  };
  const handleNoTip = () => {
    setSelectedTip(0);
    setCustomTip('');
    cart.setTipAmount(0);
  };

  const processPayment = useCallback(async () => {
    if (!organization || !profile) return;
    setProcessing(true);
    setError(null);
    try {
      const order = await OrderService.createOrder(
        organization.id, currentLocation?.id, profile.id,
        cart.getCartState(), 'pending'
      );
      if (paymentMethod === 'cash') {
        const received = parseFloat(cashReceived) || cart.totals.total;
        await PaymentService.recordCashPayment(
          organization.id, order.id, cart.totals.total, received, cart.tipAmount
        );
      } else if (paymentMethod === 'other') {
        await PaymentService.recordOtherPayment(
          organization.id, order.id, cart.totals.total,
          otherProvider, otherReference, cart.tipAmount
        );
      } else if (paymentMethod === 'card') {
        const { checkoutToken } = await PaymentService.initializeCardPayment(
          order.id, cart.totals.total, organization.currency
        );
        throw new Error('Card payment UI integration pending — use cash or other for now');
      }
      await PaymentService.finalizeOrderPayments(
        organization.id, order.id, cart.totals.total, cart.totals.total
      );
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
        organization.id, currentLocation?.id, profile.id, cart.getCartState()
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
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Back + Save Tab */}
      <div className="flex items-center justify-between mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveAsTicket}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Tab
        </Button>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        {/* Order Summary */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({cart.itemCount} items)</span>
              <span className="text-foreground">{formatCurrency(cart.totals.subtotal)}</span>
            </div>
            {cart.totals.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <span>-{formatCurrency(cart.totals.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-foreground">{formatCurrency(cart.totals.tax_amount)}</span>
            </div>
            {cart.tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip</span>
                <span className="text-foreground">{formatCurrency(cart.tipAmount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
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
                {tipPercentages.map((pct) => (
                  <Button
                    key={pct}
                    variant={selectedTip === pct ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-2.5"
                    onClick={() => handleTipSelect(pct)}
                  >
                    <span className="text-sm font-bold">{pct}%</span>
                    <span className="text-[11px] text-muted-foreground">
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
                    min="0"
                    maxLength={8}
                    value={customTip}
                    onChange={(e) => handleCustomTip(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleNoTip}>No Tip</Button>
              </div>
              <Button className="w-full h-12 font-bold" onClick={() => setStep('payment')}>
                Continue — {formatCurrency(cart.totals.total)}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Method */}
        {step === 'payment' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'card' as TenderType, icon: CreditCard, label: 'Card' },
                  { key: 'cash' as TenderType, icon: Banknote, label: 'Cash' },
                  { key: 'other' as TenderType, icon: Smartphone, label: 'Other' },
                ]).map(({ key, icon: Icon, label }) => (
                  <Button
                    key={key}
                    variant={paymentMethod === key ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3.5"
                    onClick={() => setPaymentMethod(key)}
                  >
                    <Icon className="h-6 w-6 mb-1" />
                    <span className="text-xs font-medium">{label}</span>
                  </Button>
                ))}
              </div>

              {/* Cash input */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">Amount received</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 text-lg h-12"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={cart.totals.total.toFixed(2)}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20, 50, 100].map((amt) => (
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
                    <div className="bg-success-tint border border-success/20 rounded-lg p-3 text-center">
                      <p className="text-xs text-success font-medium">Change Due</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(changeDue)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Other payment */}
              {paymentMethod === 'other' && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">Payment app</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Venmo', 'Cash App', 'Zelle', 'PayPal'].map((p) => (
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
                    onChange={(e) => setOtherReference(e.target.value)}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}

              {/* Process */}
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
