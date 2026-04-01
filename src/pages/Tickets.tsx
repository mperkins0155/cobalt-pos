// ============================================================
// CloudPos — Kitchen Display (KDS)
// Phase 0D: Enhanced from cobalt-pos Tickets + prototype KDSPage
// Data: OrderService.getOpenTickets()
// TODO Phase 2: Add soundService, auto-refresh, Realtime, station routing
// Last modified: V0.6.3.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderService } from '@/services/orders';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FilterPills, EmptyState } from '@/components/pos';
import { ChefHat, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Order } from '@/types/database';

/** Minutes elapsed → urgency color */
function urgencyClass(createdAt: string): { bg: string; text: string; label: string } {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 10) return { bg: 'border-success/40', text: 'text-success', label: `${mins}m` };
  if (mins < 20) return { bg: 'border-warning/40', text: 'text-warning', label: `${mins}m` };
  return { bg: 'border-destructive/40', text: 'text-destructive', label: `${mins}m` };
}

export default function Tickets() {
  const { organization, currentLocation } = useAuth();
  const [tickets, setTickets] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [bumpingId, setBumpingId] = useState<string | null>(null);

  const loadTickets = async () => {
    if (!organization) return;
    try {
      const result = await OrderService.getOpenTickets(
        organization.id,
        currentLocation?.id
      );
      setTickets(result);
    } catch (err) {
      console.error('KDS load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
    // Auto-refresh every 15s (Phase 2 will add React Query + Realtime)
    const interval = setInterval(loadTickets, 15000);
    return () => clearInterval(interval);
  }, [organization?.id, currentLocation?.id]);

  // Order type filter
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    for (const t of tickets) {
      const type = t.order_type || 'other';
      c[type] = (c[type] || 0) + 1;
    }
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((t) => t.order_type === filter);
  }, [tickets, filter]);

  const filterTabs = [
    { key: 'all', label: 'All', count: typeCounts.all || 0 },
    { key: 'dine_in', label: 'Dine In', count: typeCounts.dine_in || 0 },
    { key: 'takeout', label: 'Take Away', count: typeCounts.takeout || 0 },
  ];

  // Bump order → mark as paid (simplified; Phase 2 adds item-level bumping)
  const bumpOrder = async (order: Order) => {
    setBumpingId(order.id);
    try {
      await OrderService.updateStatus(order.id, 'paid', { completed_at: new Date().toISOString() });
      setTickets((prev) => prev.filter((t) => t.id !== order.id));
      toast.success(`Order #${order.order_number} bumped`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to bump order');
    } finally {
      setBumpingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Kitchen Display</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {tickets.length} open ticket{tickets.length !== 1 ? 's' : ''}
          {' • auto-refreshing'}
        </span>
      </div>

      {/* Filters */}
      <FilterPills
        items={filterTabs}
        active={filter}
        onChange={setFilter}
        className="mb-4"
      />

      {/* Ticket grid */}
      {loading ? (
        <div className="grid pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ChefHat className="h-10 w-10" />}
          title="Kitchen is clear"
          description="No open tickets. New orders will appear automatically."
        />
      ) : (
        <div className="grid pos-tablet:grid-cols-2 pos-desktop:grid-cols-3 gap-3 pb-20 pos-tablet:pb-4">
          {filtered.map((ticket) => {
            const urg = urgencyClass(ticket.created_at);
            const isBumping = bumpingId === ticket.id;
            const typeLabel =
              ticket.order_type === 'dine_in' ? 'Dine In'
                : ticket.order_type === 'takeout' ? 'Take Away'
                  : ticket.order_type;

            return (
              <div
                key={ticket.id}
                className={`bg-card rounded-xl border-2 ${urg.bg} p-4 flex flex-col`}
              >
                {/* Ticket header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-primary">
                    #{ticket.order_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {typeLabel}
                    </Badge>
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${urg.text}`}>
                      <Clock className="h-3 w-3" />
                      {urg.label}
                    </span>
                  </div>
                </div>

                {/* Customer */}
                <p className="text-sm font-medium text-foreground mb-2 truncate">
                  {ticket.customer_name || 'Walk-in'}
                </p>

                {/* Items */}
                <div className="flex-1 space-y-1 mb-3">
                  {ticket.lines && ticket.lines.length > 0 ? (
                    ticket.lines.slice(0, 6).map((line, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">
                          {line.quantity}× {line.item_name || 'Item'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Items loading...</p>
                  )}
                  {ticket.lines && ticket.lines.length > 6 && (
                    <p className="text-[11px] text-muted-foreground">
                      +{ticket.lines.length - 6} more items
                    </p>
                  )}
                </div>

                {/* Bump button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => bumpOrder(ticket)}
                  disabled={isBumping}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  {isBumping ? 'Bumping...' : 'Bump Order'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
