// ============================================================
// CloudPos — Table Detail Modal
// Phase 0D: Extracted from prototype TableDetailContent
// Data: TableService.getTableById() + OrderService.getOrderWithDetails()
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TableService } from '@/services/tables';
import { OrderService } from '@/services/orders';
import { formatCurrency } from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, CreditCard } from 'lucide-react';
import type { DiningTable, Order } from '@/types/database';

interface TableDetailProps {
  tableId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TableDetailModal({ tableId, open, onClose }: TableDetailProps) {
  const navigate = useNavigate();
  const [table, setTable] = useState<DiningTable | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tableId || !open) return;
    setLoading(true);
    const load = async () => {
      try {
        const t = await TableService.getTableById(tableId);
        setTable(t);
        // If table is occupied, try to find its active order
        // Note: Full table-to-order linking will be wired when OrderService gets tableId filter
        if (t.status === 'occupied') {
          // Placeholder: order loaded when table-order FK is established
          setOrder(null);
        } else {
          setOrder(null);
        }
      } catch (err) {
        console.error('Table detail load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tableId, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {table?.name || 'Table'}
            {table && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {table.capacity} seats
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : !order ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              {table?.status === 'occupied'
                ? 'Table is marked occupied, but the active order is not linked in this build yet.'
                : 'Table is available.'}
            </p>
            <Button onClick={() => { onClose(); navigate('/pos'); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              {table?.status === 'occupied' ? 'Open POS' : 'New Order'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Order header */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-primary">#{order.order_number}</span>
              <span className="text-xs text-muted-foreground capitalize">{order.status}</span>
            </div>
            <p className="text-sm text-foreground">{order.customer_name || 'Walk-in'}</p>

            {/* Line items */}
            {order.lines && order.lines.length > 0 && (
              <div className="border rounded-lg divide-y divide-border overflow-hidden">
                {order.lines.map((line, i) => (
                  <div key={i} className="px-3 py-2 flex justify-between text-sm">
                    <span className="text-foreground">
                      {line.quantity}× {line.item_name || 'Item'}
                    </span>
                    <span className="font-medium">
                      {formatCurrency((line.unit_price || 0) * (line.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-border pt-2 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(order.tax_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground pt-1">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount || 0)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { onClose(); navigate('/pos'); }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Items
              </Button>
              <Button
                className="flex-1"
                onClick={() => { onClose(); navigate('/pos'); }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Open POS
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
