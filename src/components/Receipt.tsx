import { Separator } from '@/components/ui/separator';
import type { Order, Organization } from '@/types/database';
import {
  formatMoney,
  formatOrganizationAddress,
  formatPaymentLabel,
  formatReceiptDate,
  getChangeGiven,
  getReceiptFooter,
  getTotalTendered,
} from '@/lib/receiptFormatter';

interface ReceiptProps {
  order: Order;
  organization: Organization | null;
  className?: string;
}

export function Receipt({ order, organization, className }: ReceiptProps) {
  const address = formatOrganizationAddress(organization);
  const totalTendered = getTotalTendered(order);
  const changeGiven = getChangeGiven(order);

  return (
    <article className={`receipt mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-pos ${className || ''}`}>
      <header className="space-y-1 text-center">
        <h1 className="text-xl font-bold">{organization?.name || 'CloudPos'}</h1>
        {address && <p className="text-xs text-muted-foreground">{address}</p>}
        {organization?.phone && <p className="text-xs text-muted-foreground">{organization.phone}</p>}
      </header>

      <Separator className="my-4" />

      <section className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Receipt #</span>
          <span className="font-medium">{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Printed</span>
          <span>{formatReceiptDate(new Date().toISOString())}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Order Date</span>
          <span>{formatReceiptDate(order.created_at)}</span>
        </div>
        {order.cashier && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Server</span>
            <span>{[order.cashier.first_name, order.cashier.last_name].filter(Boolean).join(' ') || 'Staff'}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer</span>
          <span>{order.customer_name || 'Walk-in'}</span>
        </div>
      </section>

      <Separator className="my-4" />

      <section className="space-y-3">
        {(order.lines || []).map((line) => (
          <div key={line.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {line.quantity}× {line.item_name}
                </p>
                {line.variant_name && (
                  <p className="text-xs text-muted-foreground">{line.variant_name}</p>
                )}
                {line.modifiers && line.modifiers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {line.modifiers.map((modifier) => modifier.option_name).join(', ')}
                  </p>
                )}
                {line.notes && (
                  <p className="text-xs italic text-primary">{line.notes}</p>
                )}
              </div>
              <span className="shrink-0 font-medium">
                {formatMoney(line.subtotal, organization?.currency)}
              </span>
            </div>
          </div>
        ))}
      </section>

      <Separator className="my-4" />

      <section className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(order.subtotal_amount, organization?.currency)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-success">
            <span>Discount</span>
            <span>-{formatMoney(order.discount_amount, organization?.currency)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatMoney(order.tax_amount, organization?.currency)}</span>
        </div>
        {order.tip_amount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tip</span>
            <span>{formatMoney(order.tip_amount, organization?.currency)}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatMoney(order.total_amount, organization?.currency)}</span>
        </div>
      </section>

      {(order.payments || []).length > 0 && (
        <>
          <Separator className="my-4" />
          <section className="space-y-2 text-sm">
            {(order.payments || []).map((payment) => (
              <div key={payment.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{formatPaymentLabel(payment)}</span>
                <span>{formatMoney(payment.amount, organization?.currency)}</span>
              </div>
            ))}
            {totalTendered > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tendered</span>
                <span>{formatMoney(totalTendered, organization?.currency)}</span>
              </div>
            )}
            {changeGiven > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span>{formatMoney(changeGiven, organization?.currency)}</span>
              </div>
            )}
          </section>
        </>
      )}

      <Separator className="my-4" />

      <footer className="space-y-1 text-center">
        <p className="text-xs text-muted-foreground">{getReceiptFooter(order, organization)}</p>
        <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
          #{order.order_number}
        </p>
      </footer>
    </article>
  );
}
