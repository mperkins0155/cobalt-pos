import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { appEnv } from '@/lib/appEnv';
import { OrderService } from '@/services/orders';
import { PaymentService } from '@/services/payments';
import { formatCurrency, calcChangeDue, calcTipFromPercent, round2 } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  Check,
  Loader2,
  Save,
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
        organization.id,
        currentLocation?.id,
        profile.id,
        cart.getCartState(),
        'pending'
      );

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
        await PaymentService.initializeCardPayment(
          order.id,
          cart.totals.total,
          organization.currency
        );
        throw new Error('Card payment UI integration pending — use cash or other for now');
      }

      await PaymentService.finalizeOrderPayments(
        organization.id,
        order.id,
        cart.totals.total,
        cart.totals.total
      );

      cart.clearCart();
      navigate(`/pos/receipt/${order.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setProcessing(false);
    }
  }, [
    organization,
    profile,
    currentLocation,
    cart,
    paymentMethod,
    cashReceived,
    otherProvider,
    otherReference,
    navigate,
  ]);

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

  const changeDue =
    paymentMethod === 'cash' && cashReceived
      ? calcChangeDue(cart.totals.total, parseFloat(cashReceived) || 0)
      : 0;

  const canProcess =
    paymentMethod === 'cash'
      ? (parseFloat(cashReceived) || 0) >= cart.totals.total
      : paymentMethod === 'other'
        ? otherProvider.length > 0
        : paymentMethod === 'card';

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      <div className="mb-5 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveAsTicket}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save Tab
        </Button>
      </div>

      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <CardContent className="space-y-2 pt-5">
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
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(cart.totals.total)}</span>
            </div>
          </CardContent>
        </Card>

        {step === 'tip' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add a tip?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {tipPercentages.map((percentage) => (
                  <Button
                    key={percentage}
                    variant={selectedTip === percentage ? 'default' : 'outline'}
                    className="flex h-auto flex-col py-2.5"
                    onClick={() => handleTipSelect(percentage)}
                  >
                    <span className="text-sm font-bold">{percentage}%</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatCurrency(calcTipFromPercent(cart.totals.subtotal, percentage))}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                <Button variant="outline" onClick={handleNoTip}>
                  No Tip
                </Button>
              </div>
              <Button className="h-12 w-full font-bold" onClick={() => setStep('payment')}>
                Continue — {formatCurrency(cart.totals.total)}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {([
                  {
                    key: 'card' as TenderType,
                    icon: CreditCard,
                    label: 'Card',
                    disabled: !appEnv.cardPaymentsEnabled,
                    hint: 'Helcim checkout UI still pending',
                  },
                  { key: 'cash' as TenderType, icon: Banknote, label: 'Cash' },
                  { key: 'other' as TenderType, icon: Smartphone, label: 'Other' },
                ]).map(({ key, icon: Icon, label, disabled, hint }) => (
                  <Button
                    key={key}
                    variant={paymentMethod === key ? 'default' : 'outline'}
                    className="flex h-auto flex-col py-3.5 disabled:pointer-events-none disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => setPaymentMethod(key)}
                    title={hint}
                  >
                    <Icon className="mb-1 h-6 w-6" />
                    <span className="text-xs font-medium">{label}</span>
                    {disabled && <span className="mt-1 text-[10px] text-muted-foreground">Soon</span>}
                  </Button>
                ))}
              </div>

              {!appEnv.cardPaymentsEnabled && (
                <div className="rounded-lg border border-warning/20 bg-warning-tint p-3 text-sm text-warning">
                  Card checkout is not enabled in this build yet. Use cash or another payment app for live sales.
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">Amount received</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-12 pl-8 text-lg"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={roundCurrencyInput(cart.totals.total)}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 5, 10, 20, 50, 100].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setCashReceived(String(amount))}
                      >
                        ${amount}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2 text-xs"
                      onClick={() => setCashReceived(roundCurrencyInput(cart.totals.total))}
                    >
                      Exact
                    </Button>
                  </div>
                  {changeDue > 0 && (
                    <div className="rounded-lg border border-success/20 bg-success-tint p-3 text-center">
                      <p className="text-xs font-medium text-success">Change Due</p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(changeDue)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'other' && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">Payment app</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Venmo', 'Cash App', 'Zelle', 'PayPal'].map((provider) => (
                      <Button
                        key={provider}
                        variant={otherProvider === provider ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setOtherProvider(provider)}
                      >
                        {provider}
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

              {error && (
                <div
                  className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button
                className="h-14 w-full text-lg font-bold"
                disabled={!canProcess || processing}
                onClick={() => {
                  void processPayment();
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Pay {formatCurrency(cart.totals.total)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function roundCurrencyInput(amount: number): string {
  return round2(amount).toLocaleString('en-US', {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
