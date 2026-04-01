import * as React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/calculations';

/* ── Types (matches prototype Order shape, will align with database types in Phase 0D) ── */

type KdsStatus = 'pending' | 'cooking' | 'done';

interface OrderItem {
  menuId?: string;
  name: string;
  qty: number;
  price: number;
  station?: string;
  kdsStatus?: KdsStatus;
}

interface OrderCardOrder {
  id: string;
  type: string;
  date: string;
  table?: string | null;
  customer: string;
  progress: number;
  status: string;
  items?: OrderItem[];
  total?: number;
  grandTotal?: number;
}

interface OrderCardProps {
  order: OrderCardOrder;
  expanded?: boolean;
  onSeeDetails?: () => void;
  onPayBills?: () => void;
  className?: string;
}

/* ── Status helpers ── */

function statusColor(status: string): string {
  switch (status) {
    case 'In Progress': return 'text-warning';
    case 'Served': return 'text-success';
    case 'Waiting for Payment': return 'text-primary';
    case 'Completed': return 'text-success';
    default: return 'text-muted-foreground';
  }
}

function progressBarColor(progress: number): string {
  return progress < 50 ? 'bg-warning' : 'bg-success';
}

/* ── Component ── */

function OrderCard({
  order,
  expanded,
  onSeeDetails,
  onPayBills,
  className,
}: OrderCardProps) {
  const isInProgress = order.status === 'In Progress';
  const itemCount = order.items?.length ?? 0;

  return (
    <Card
      className={cn(
        'p-4 border transition-shadow hover:shadow-pos cursor-pointer',
        className
      )}
    >
      {/* Header: Order ID + Date */}
      <div className="flex justify-between mb-2">
        <span className="text-xs font-semibold">
          Order# <span className="text-primary">{order.id}</span> / {order.type}
        </span>
        <span className="text-[11px] text-muted-foreground">{order.date}</span>
      </div>

      {/* Customer + Table badge */}
      <div className="flex items-center gap-2 mb-2.5">
        {order.table && (
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
            {order.table}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">Customer</div>
          <div className="text-sm font-semibold text-foreground truncate">
            {order.customer}
          </div>
        </div>
      </div>

      {/* Status row */}
      <div className="flex justify-between items-center">
        {isInProgress ? (
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-1.5 rounded-full bg-border">
              <div
                className={cn('h-full rounded-full transition-all', progressBarColor(order.progress))}
                style={{ width: `${Math.min(100, Math.max(0, order.progress))}%` }}
              />
            </div>
            <span className={cn('text-[11px] font-bold', order.progress < 50 ? 'text-warning' : 'text-success')}>
              {order.progress}%
            </span>
            <span className="text-[11px] text-warning">In Progress</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Check className={cn('h-3.5 w-3.5', statusColor(order.status))} />
            <span className={cn('text-xs font-medium', statusColor(order.status))}>
              {order.status}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-primary">
            {itemCount} Items
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>

      {/* Expanded: item list + totals + action buttons */}
      {expanded && order.items && (
        <>
          <div className="mt-3 pt-2.5 border-t">
            {/* Column headers */}
            <div className="flex text-[11px] text-muted-foreground mb-1.5 gap-1">
              <span className="flex-1">Items</span>
              <span className="w-10 text-right">Qty</span>
              <span className="w-[70px] text-right">Price</span>
            </div>
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center text-[13px] text-foreground py-1 gap-1">
                <span className="flex-1 truncate">{item.name}</span>
                <span className="w-10 text-right text-muted-foreground">{item.qty}</span>
                <span className="w-[70px] text-right font-semibold">
                  {formatCurrency(item.price * item.qty)}
                </span>
              </div>
            ))}
            <div className="flex justify-between mt-2 pt-2 border-t border-dashed font-bold text-sm">
              <span>Total</span>
              <span>{formatCurrency(order.grandTotal ?? order.total ?? 0)}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {onSeeDetails && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onSeeDetails}>
                See Details
              </Button>
            )}
            {onPayBills && (
              <Button size="sm" className="flex-1" onClick={onPayBills}>
                Pay Bills
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

export { OrderCard };
export type { OrderCardOrder, OrderItem, KdsStatus };
