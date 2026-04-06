// ============================================================
// CloudPos — Checkout / Payment Page
// Screen 26-27: Split layout
// Left: customer info + order line items + member lookup
// Right: Cash/Card/Other tabs + numpad + quick-fill buttons
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useAuditLog } from '@/hooks/useAuditLog';
import { OrderService } from '@/services/orders';
import { PaymentService } from '@/services/payments';
import { NumPad } from '@/components/pos';
import { formatCurrency, calcChangeDue, calcTipFromPercent, round2 } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CreditCard, Banknote, Smartphone, Search, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TenderType } from '@/types/database';

type PayMethod = 'cash' | 'card' | 'other';

export default function Checkout() {
  const navigate = useNavigate();
  const { organization, profile, currentLocation, tipSettings, defaultTaxRate } = useAuth();
  const cart = useCart({ defaultTaxRate: defaultTaxRate?.rate || 0 });
  const { log } = useAuditLog();

  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [cashInput, setCashInput] = useState('');        // built digit by digit
  const [memberCode, setMemberCode] = useState('');
  const [otherProvider, setOtherProvider] = useState('');
  const [otherRef, setOtherRef] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tip state
  const tipPercentages = tipSettings?.suggested_percentages || [15, 18, 20, 25];
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [showTipStep, setShowTipStep] = useState(tipSettings?.mode !== 'off');

  const cashAmount = parseFloat(cashInput) || 0;
  const changeDue = payMethod === 'cash' && cashAmount > 0
    ? calcChangeDue(cart.totals.total, cashAmount)
    : 0;

  const canPay = payMethod === 'cash'
    ? cashAmount >= cart.totals.total
    : payMethod === 'other'
    ? otherProvider.length > 0
    : false;

  // Numpad handlers
  const handleNumKey = useCallback((digit: string) => {
    setCashInput((prev) => {
      const next = prev + digit;
      // Max 8 chars, no double decimal
      if (next.replace('.', '').length > 8) return prev;
      return next;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setCashInput((prev) => prev.slice(0, -1));
  }, []);

  const handleQuickFill = (amount: number) => {
    setCashInput(String(amount));
  };

  const handleExact = () => {
    setCashInput(round2(cart.totals.total).toFixed(2));
  };

  const processPayment = useCallback(async () => {
    if (!organization || !profile) return;
    if (payMethod === 'card') {
      setError('Card payment coming soon — use Cash or Other for now.');
      return;
    }
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

      if (payMethod === 'cash') {
        const received = cashAmount || cart.totals.total;
        await PaymentService.recordCashPayment(
          organization.id, order.id, cart.totals.total, received, cart.tipAmount
        );
      } else if (payMethod === 'other') {
        await PaymentService.recordOtherPayment(
          organization.id, order.id, cart.totals.total,
          otherProvider, otherRef, cart.tipAmount
        );
      }

      await PaymentService.finalizeOrderPayments(
        organization.id, order.id, cart.totals.total, cart.totals.total
      );

      void log({
        actionType: 'order.paid',
        entityType: 'order',
        entityId: order.id,
        metadata: { order_number: order.order_number, total: cart.totals.total, payment_method: payMethod },
      });

      cart.clearCart();
      navigate(`/pos/receipt/${order.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setProcessing(false);
    }
  }, [organization, profile, currentLocation, cart, payMethod, cashAmount, otherProvider, otherRef, navigate, log]);

  const handleSaveTab = async () => {
    if (!organization || !profile) return;
    try {
      const ticket = await OrderService.saveAsTicket(
        organization.id, currentLocation?.id, profile.id, cart.getCartState()
      );
      toast.success(`Tab #${ticket.order_number} saved`);
      cart.clearCart();
      navigate('/pos', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tab');
    }
  };

  // If cart is empty, redirect
  if (cart.isEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button onClick={() => navigate('/pos')}>Go to POS</Button>
      </div>
    );
  }

  const cartLines: any[] = cart.items;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h2 className="text-base font-bold text-foreground">Payment</h2>
        <button
          onClick={handleSaveTab}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Tab
        </button>
      </div>

      {/* Tip screen (shown first if tip mode is on) */}
      {showTipStep ? (
        <div className="flex-1 overflow-y-auto p-5 max-w-lg mx-auto w-full">
          <h3 className="text-lg font-bold text-foreground mb-1">Add a Tip?</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Subtotal: {formatCurrency(cart.totals.subtotal)}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {tipPercentages.map((pct) => (
              <button
                key={pct}
                onClick={() => { setSelectedTip(pct); cart.setTipByPercent(pct); }}
                className={cn(
                  'flex flex-col items-center py-3 rounded-xl border-2 transition-all',
                  selectedTip === pct
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/40'
                )}
              >
                <span className="text-base font-bold">{pct}%</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatCurrency(calcTipFromPercent(cart.totals.subtotal, pct))}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Custom tip amount"
              type="number"
              step="0.01"
              min="0"
              className="h-11"
              onChange={(e) => { setSelectedTip(null); cart.setTipAmount(parseFloat(e.target.value) || 0); }}
            />
            <button
              onClick={() => { setSelectedTip(0); cart.setTipAmount(0); }}
              className={cn(
                'px-4 rounded-lg border-2 text-sm font-semibold transition-all whitespace-nowrap',
                selectedTip === 0 ? 'border-primary bg-primary-tint text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              No Tip
            </button>
          </div>
          <Button className="w-full h-12 font-bold text-base" onClick={() => setShowTipStep(false)}>
            Continue — {formatCurrency(cart.totals.total)}
          </Button>
        </div>
      ) : (
        /* Main payment split layout */
        <div className="flex-1 flex overflow-hidden">
          {/* ── LEFT PANEL: order summary ── */}
          <div className="flex flex-col w-full lg:w-[45%] xl:w-[42%] border-r border-border overflow-hidden">
            {/* Customer info */}
            <div className="shrink-0 px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {(cart.customerName || 'G').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{cart.customerName || 'Guest'}</p>
                  <p className="text-xs text-muted-foreground">
                    Order · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              {/* Member code lookup */}
              <div className="flex gap-2">
                <Input
                  placeholder="Member code"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  className="h-9 text-sm"
                />
                <button className="flex items-center gap-1 px-3 h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors whitespace-nowrap">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </button>
              </div>
            </div>

            {/* Order line items */}
            <ScrollArea className="flex-1 px-5 py-3">
              <div className="space-y-2.5">
                {cartLines.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
                      {item.modifiers?.length > 0 && (
                        <p className="text-xs text-muted-foreground">{item.modifiers.map((m: any) => m.option_name).join(', ')}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Totals */}
            <div className="shrink-0 px-5 py-4 border-t border-border space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(cart.totals.subtotal)}</span>
              </div>
              {cart.totals.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span>
                  <span>-{formatCurrency(cart.totals.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(cart.totals.tax_amount)}</span>
              </div>
              {cart.tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip</span>
                  <span>{formatCurrency(cart.tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(cart.totals.total)}</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: payment method ── */}
          <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
            {/* Method tabs */}
            <div className="shrink-0 flex border-b border-border">
              {([
                { key: 'cash', icon: Banknote, label: 'Cash' },
                { key: 'card', icon: CreditCard, label: 'Card', disabled: true },
                { key: 'other', icon: Smartphone, label: 'Other' },
              ] as const).map(({ key, icon: Icon, label, disabled }) => (
                <button
                  key={key}
                  onClick={() => !disabled && setPayMethod(key as PayMethod)}
                  disabled={disabled}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-colors',
                    payMethod === key
                      ? 'border-primary text-primary bg-primary-tint'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                    disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {disabled && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-normal">Soon</span>}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5 space-y-4">
                {payMethod === 'cash' && (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Input Money</p>
                      <p className="text-4xl font-bold text-foreground tabular-nums">
                        {cashInput ? `$${cashInput}` : '$0'}
                      </p>
                      {changeDue > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-success-tint text-success rounded-full px-3 py-1 text-sm font-bold">
                          Change: {formatCurrency(changeDue)}
                        </div>
                      )}
                    </div>

                    {/* Quick-fill buttons */}
                    <div className="grid grid-cols-4 gap-2">
                      {[20, 50, 100, 200].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleQuickFill(amt)}
                          className="py-2 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-accent hover:border-primary/40 transition-colors"
                        >
                          ${amt}
                        </button>
                      ))}
                      <button
                        onClick={handleExact}
                        className="col-span-4 py-2 rounded-lg border border-primary/30 bg-primary-tint text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                      >
                        Exact — {formatCurrency(cart.totals.total)}
                      </button>
                    </div>

                    {/* Numpad */}
                    <NumPad
                      onKey={handleNumKey}
                      onDelete={handleDelete}
                      onSubmit={canPay ? () => void processPayment() : undefined}
                      className="mx-auto max-w-[240px]"
                    />
                  </>
                )}

                {payMethod === 'card' && (
                  <div className="text-center py-8 space-y-3">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-base font-semibold text-foreground">Card Payments Coming Soon</p>
                    <p className="text-sm text-muted-foreground">Helcim integration is pending. Use Cash or Other.</p>
                  </div>
                )}

                {payMethod === 'other' && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Payment App</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Venmo', 'Cash App', 'Zelle', 'PayPal'].map((provider) => (
                          <button
                            key={provider}
                            onClick={() => setOtherProvider(provider)}
                            className={cn(
                              'py-2.5 rounded-lg border-2 text-sm font-semibold transition-all',
                              otherProvider === provider
                                ? 'border-primary bg-primary-tint text-primary'
                                : 'border-border text-foreground hover:border-primary/40'
                            )}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      placeholder="Reference / confirmation (optional)"
                      value={otherRef}
                      onChange={(e) => setOtherRef(e.target.value)}
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Pay button */}
                <Button
                  className="w-full h-14 text-lg font-bold"
                  disabled={!canPay || processing}
                  onClick={() => void processPayment()}
                >
                  {processing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Check className="mr-2 h-5 w-5" /> Pay {formatCurrency(cart.totals.total)}</>
                  )}
                </Button>
              </div>
            </ScrollArea>
          </div>

          {/* Mobile: stacked payment below order */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border p-4 space-y-3">
            <div className="flex gap-2">
              {(['cash', 'card', 'other'] as PayMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => m !== 'card' && setPayMethod(m)}
                  disabled={m === 'card'}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg border-2 text-xs font-semibold capitalize transition-all',
                    payMethod === m ? 'border-primary bg-primary-tint text-primary' : 'border-border text-muted-foreground',
                    m === 'card' && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            {payMethod === 'cash' && (
              <div className="flex gap-2">
                {[20, 50, 100].map((amt) => (
                  <button key={amt} onClick={() => handleQuickFill(amt)}
                    className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent"
                  >${amt}</button>
                ))}
                <button onClick={handleExact}
                  className="flex-1 py-2 rounded-lg border border-primary/30 bg-primary-tint text-primary text-sm font-semibold"
                >Exact</button>
              </div>
            )}
            <Button
              className="w-full h-12 font-bold"
              disabled={!canPay || processing}
              onClick={() => void processPayment()}
            >
              {processing ? 'Processing...' : `Pay ${formatCurrency(cart.totals.total)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
