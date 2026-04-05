// ============================================================
// CloudPos — Checkout / Payment Page
// Figma spec: Screen 26/27 — split layout, left=order summary,
// right=payment tabs (Cash/Card/Other) with numpad + quick-fill
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useAuditLog } from '@/hooks/useAuditLog';
import { OrderService } from '@/services/orders';
import { PaymentService } from '@/services/payments';
import { formatCurrency, calcChangeDue, calcTipFromPercent, round2 } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NumPad } from '@/components/pos/NumPad';
import { ArrowLeft, CreditCard, Banknote, Smartphone, Check, Loader2, Save, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { TenderType } from '@/types/database';

type PayTab = 'cash' | 'card' | 'other';
type Step = 'tip' | 'payment';

export default function Checkout() {
  const navigate = useNavigate();
  const { organization, profile, currentLocation, tipSettings, defaultTaxRate } = useAuth();
  const cart = useCart({ defaultTaxRate: defaultTaxRate?.rate || 0 });
  const { log } = useAuditLog();

  const [step, setStep] = useState<Step>(tipSettings?.mode !== 'off' ? 'tip' : 'payment');
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [payTab, setPayTab] = useState<PayTab>('cash');
  const [cashInput, setCashInput] = useState('');
  const [otherProvider, setOtherProvider] = useState('');
  const [otherRef, setOtherRef] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipPcts = tipSettings?.suggested_percentages || [15, 18, 20, 25];
  const cashAmount = parseFloat(cashInput) || 0;
  const changeDue = payTab === 'cash' && cashAmount > 0 ? calcChangeDue(cart.totals.total, cashAmount) : 0;
  const canPay = payTab === 'cash'
    ? cashAmount >= cart.totals.total
    : payTab === 'other'
    ? otherProvider.length > 0
    : false;

  // NumPad handler for cash input
  const handleNumKey = (digit: string) => {
    setCashInput(prev => {
      const raw = (prev.replace('.', '') + digit).replace(/^0+/, '') || '0';
      const cents = parseInt(raw, 10);
      return (cents / 100).toFixed(2);
    });
  };
  const handleNumDelete = () => {
    setCashInput(prev => {
      const raw = prev.replace('.', '').slice(0, -1) || '0';
      const cents = parseInt(raw, 10);
      return (cents / 100).toFixed(2);
    });
  };

  const quickFill = (amount: number) => setCashInput(amount.toFixed(2));
  const exactFill = () => setCashInput(round2(cart.totals.total).toFixed(2));

  const handleTip = (pct: number) => {
    setSelectedTip(pct);
    setCustomTip('');
    cart.setTipByPercent(pct);
  };
  const handleCustomTip = (val: string) => {
    setCustomTip(val);
    setSelectedTip(null);
    cart.setTipAmount(parseFloat(val) || 0);
  };

  const processPayment = useCallback(async () => {
    if (!organization || !profile) return;
    if (payTab === 'card') {
      setError('Card payment integration is coming soon. Please use Cash or Other.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const order = await OrderService.createOrder(
        organization.id, currentLocation?.id, profile.id, cart.getCartState(), 'pending'
      );
      if (payTab === 'cash') {
        const received = cashAmount || cart.totals.total;
        await PaymentService.recordCashPayment(organization.id, order.id, cart.totals.total, received, cart.tipAmount);
      } else {
        await PaymentService.recordOtherPayment(organization.id, order.id, cart.totals.total, otherProvider, otherRef, cart.tipAmount);
      }
      await PaymentService.finalizeOrderPayments(organization.id, order.id, cart.totals.total, cart.totals.total);
      void log({ actionType: 'order.paid', entityType: 'order', entityId: order.id, metadata: { order_number: order.order_number, total: cart.totals.total, payment_method: payTab } });
      cart.clearCart();
      navigate(`/pos/receipt/${order.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  }, [organization, profile, currentLocation, cart, payTab, cashAmount, otherProvider, otherRef, navigate, log]);

  const saveAsTicket = async () => {
    if (!organization || !profile) return;
    try {
      const ticket = await OrderService.saveAsTicket(organization.id, currentLocation?.id, profile.id, cart.getCartState());
      toast.success(`Tab saved — Order #${ticket.order_number}`);
      cart.clearCart();
      navigate('/pos', { replace: true });
    } catch (err: any) { toast.error(err.message || 'Failed to save tab'); }
  };

  if (cart.isEmpty && step === 'payment') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">Your cart is empty.</div>
          <Button onClick={() => navigate('/pos')}>Back to POS</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── LEFT PANEL: Customer info + order summary ── */}
      <div className="flex-1 overflow-y-auto border-r border-border">
        <div className="p-4 pos-tablet:p-5 pos-desktop:px-6 pos-desktop:py-5">
          {/* Back + Save */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={saveAsTicket} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
              <Save className="h-4 w-4" /> Save Tab
            </button>
          </div>

          <h2 className="text-lg font-bold mb-4">Payment</h2>

          {/* Customer info card */}
          {cart.customer_name && (
            <div className="bg-muted rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                {cart.customer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{cart.customer_name}</div>
                <div className="text-xs text-muted-foreground">Customer</div>
              </div>
            </div>
          )}

          {/* Order line items */}
          <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
            <div className="grid grid-cols-[1fr_40px_80px] gap-x-2 px-4 py-2 bg-muted text-[11px] text-muted-foreground font-medium border-b border-border">
              <span>Item</span><span className="text-center">Qty</span><span className="text-right">Price</span>
            </div>
            {cart.items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_40px_80px] gap-x-2 px-4 py-2.5 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.item_name}</div>
                  {item.modifiers.length > 0 && (
                    <div className="text-xs text-muted-foreground">{item.modifiers.map(m => m.option_name).join(', ')}</div>
                  )}
                </div>
                <span className="text-sm text-center text-muted-foreground">{item.quantity}</span>
                <span className="text-sm text-right font-semibold">{formatCurrency(item.line_total)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 px-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cart.totals.subtotal)}</span>
            </div>
            {cart.totals.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span><span>-{formatCurrency(cart.totals.discount_amount)}</span>
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
            <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(cart.totals.total)}</span>
            </div>
          </div>

          {/* Tip step (shown on mobile below summary) */}
          {step === 'tip' && (
            <div className="mt-5 pos-desktop:hidden">
              <TipSelector
                pcts={tipPcts}
                selected={selectedTip}
                custom={customTip}
                subtotal={cart.totals.subtotal}
                onSelect={handleTip}
                onCustom={handleCustomTip}
                onSkip={() => { cart.setTipAmount(0); setStep('payment'); }}
                onContinue={() => setStep('payment')}
                total={cart.totals.total}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Payment method + numpad ── */}
      <div className="w-full pos-tablet:w-[380px] pos-desktop:w-[420px] flex flex-col border-l border-border bg-card overflow-y-auto">
        <div className="p-4 pos-tablet:p-5 flex flex-col h-full">

          {/* Tip step on desktop */}
          {step === 'tip' && (
            <div className="hidden pos-desktop:block mb-5">
              <TipSelector
                pcts={tipPcts}
                selected={selectedTip}
                custom={customTip}
                subtotal={cart.totals.subtotal}
                onSelect={handleTip}
                onCustom={handleCustomTip}
                onSkip={() => { cart.setTipAmount(0); setStep('payment'); }}
                onContinue={() => setStep('payment')}
                total={cart.totals.total}
              />
            </div>
          )}

          {step === 'payment' && (
            <>
              {/* Payment method tabs */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {([
                  { key: 'cash' as PayTab,  icon: Banknote,    label: 'Cash' },
                  { key: 'card' as PayTab,  icon: CreditCard,  label: 'Card' },
                  { key: 'other' as PayTab, icon: Smartphone,  label: 'Other' },
                ]).map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setPayTab(key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-all font-medium text-sm',
                      payTab === key
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                      key === 'card' && 'opacity-60'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                    {key === 'card' && <span className="text-[10px]">Coming Soon</span>}
                  </button>
                ))}
              </div>

              {/* Cash panel */}
              {payTab === 'cash' && (
                <div className="flex flex-col flex-1">
                  <div className="text-center mb-3">
                    <div className="text-xs text-muted-foreground mb-1">Input Money</div>
                    <div className="text-4xl font-bold text-foreground tabular-nums">
                      ${cashInput || '0.00'}
                    </div>
                    {changeDue > 0 && (
                      <div className="mt-2 rounded-lg bg-success-tint border border-success/20 px-3 py-2">
                        <div className="text-xs font-medium text-success">Change Due</div>
                        <div className="text-2xl font-bold text-success">{formatCurrency(changeDue)}</div>
                      </div>
                    )}
                  </div>

                  {/* Quick-fill buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[20, 50, 100, 200].map(amt => (
                      <button
                        key={amt}
                        onClick={() => quickFill(amt)}
                        className="py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-accent transition-colors"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={exactFill}
                    className="w-full py-2 mb-3 rounded-lg border border-primary/30 bg-primary-tint text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                  >
                    Exact — {formatCurrency(cart.totals.total)}
                  </button>

                  {/* NumPad */}
                  <NumPad onKey={handleNumKey} onDelete={handleNumDelete} onSubmit={canPay ? () => { void processPayment(); } : undefined} className="mb-4" />
                </div>
              )}

              {/* Other payment panel */}
              {payTab === 'other' && (
                <div className="space-y-3 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    {['Venmo', 'Cash App', 'Zelle', 'PayPal'].map(p => (
                      <button
                        key={p}
                        onClick={() => setOtherProvider(p)}
                        className={cn(
                          'py-2.5 rounded-lg border-2 text-sm font-semibold transition-all',
                          otherProvider === p ? 'border-primary bg-primary-tint text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Reference / confirmation # (optional)"
                    value={otherRef}
                    onChange={e => setOtherRef(e.target.value)}
                  />
                </div>
              )}

              {/* Card panel */}
              {payTab === 'card' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
                  <div className="text-base font-semibold text-foreground mb-2">Card Payments Coming Soon</div>
                  <div className="text-sm text-muted-foreground">Helcim integration is in progress. Use Cash or Other for now.</div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive mt-3" role="alert">
                  {error}
                </div>
              )}

              {/* Pay Now CTA */}
              {payTab !== 'card' && (
                <Button
                  className="h-14 w-full text-lg font-bold mt-4"
                  disabled={!canPay || processing}
                  onClick={() => { void processPayment(); }}
                >
                  {processing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
                  ) : (
                    <><Check className="mr-2 h-5 w-5" />Pay Now — {formatCurrency(cart.totals.total)}</>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tip selector sub-component ── */
function TipSelector({ pcts, selected, custom, subtotal, onSelect, onCustom, onSkip, onContinue, total }: {
  pcts: number[]; selected: number | null; custom: string; subtotal: number;
  onSelect: (p: number) => void; onCustom: (v: string) => void;
  onSkip: () => void; onContinue: () => void; total: number;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">Add a tip?</h3>
      <div className="grid grid-cols-4 gap-2">
        {pcts.map(pct => (
          <button
            key={pct}
            onClick={() => onSelect(pct)}
            className={cn(
              'flex flex-col items-center py-2.5 rounded-xl border-2 transition-all text-sm font-bold',
              selected === pct ? 'border-primary bg-primary-tint text-primary' : 'border-border bg-card text-foreground hover:border-primary/40'
            )}
          >
            {pct}%
            <span className="text-[10px] font-normal text-muted-foreground mt-0.5">
              {formatCurrency(calcTipFromPercent(subtotal, pct))}
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Custom amount"
            className="pl-8"
            type="number" step="0.01" min="0" value={custom}
            onChange={e => onCustom(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={onSkip}>No Tip</Button>
      </div>
      <Button className="w-full h-12 font-bold" onClick={onContinue}>
        Continue — {formatCurrency(total)}
      </Button>
    </div>
  );
}
