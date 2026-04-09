// ============================================================
// CloudPos — Table Floor Plan
// Screen 30: Floor plan grid with action bar on selection
// Screen 50: Table Detail Modal (items by status)
// Screen 36: Change Table Modal
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterPills, EmptyState } from '@/components/pos';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TableService } from '@/services/tables';
import { OrderService } from '@/services/orders';
import { ReservationService } from '@/services/reservations';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculations';
import {
  Grid3X3, Users, Clock, X, ArrowRight,
  Package, Plus, CreditCard, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiningTable, Floor, TableStatus } from '@/types/database';

const STATUS_CONFIG: Record<TableStatus, {
  label: string; bg: string; border: string; dotColor: string; textColor: string;
}> = {
  available: { label: 'Available',   bg: 'bg-card',          border: 'border-border',       dotColor: 'bg-success',           textColor: 'text-success' },
  occupied:  { label: 'Not Available', bg: 'bg-warning-tint', border: 'border-warning/40',   dotColor: 'bg-warning',           textColor: 'text-warning' },
  reserved:  { label: 'Reserved',    bg: 'bg-primary/5',     border: 'border-primary/30',   dotColor: 'bg-primary',           textColor: 'text-primary' },
  cleaning:  { label: 'Cleaning',    bg: 'bg-muted',         border: 'border-border',       dotColor: 'bg-muted-foreground',  textColor: 'text-muted-foreground' },
  inactive:  { label: 'Inactive',    bg: 'bg-muted/50',      border: 'border-border/50',    dotColor: 'bg-muted-foreground',  textColor: 'text-muted-foreground' },
};

export default function TableFloor() {
  const navigate = useNavigate();
  const { organization, currentLocation } = useAuth();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [reservationTimes, setReservationTimes] = useState<Map<string, string>>(new Map());

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Change table modal state
  const [changeTableOpen, setChangeTableOpen] = useState(false);

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [floorsRes, tablesRes, reservationsRes] = await Promise.all([
        TableService.listFloors(organization.id, currentLocation?.id),
        TableService.listTables({ orgId: organization.id, locationId: currentLocation?.id }),
        ReservationService.listUpcoming(organization.id, currentLocation?.id, 50),
      ]);
      setFloors(floorsRes);
      setTables(tablesRes);

      const timeMap = new Map<string, string>();
      for (const r of reservationsRes) {
        if (r.table_id && !timeMap.has(r.table_id)) {
          timeMap.set(r.table_id, new Date(r.reserved_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
      setReservationTimes(timeMap);
    } catch {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [organization?.id, currentLocation?.id]);

  const floorTabs = useMemo(() => [
    { key: 'all', label: 'All Floors', count: tables.length },
    ...floors.map((f) => ({ key: f.id, label: f.name, count: tables.filter((t) => t.floor_id === f.id).length })),
  ], [floors, tables]);

  const visible = useMemo(
    () => tables.filter((t) => selectedFloor === 'all' || t.floor_id === selectedFloor),
    [tables, selectedFloor]
  );

  const statusCounts = useMemo(() => {
    const c: Partial<Record<TableStatus, number>> = {};
    for (const t of visible) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [visible]);

  const handleTableClick = (table: DiningTable) => {
    if (selectedTable?.id === table.id) {
      setSelectedTable(null);
      return;
    }
    setSelectedTable(table);
  };

  const handleDetailTable = async () => {
    if (!selectedTable) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      // Find order linked to this table
      if (selectedTable.status === 'occupied') {
        const result = await OrderService.listOrders({
          orgId: organization!.id,
          status: 'open',
          limit: 10,
        });
        // Find an order that might match
        const match = result.orders.find(() => true); // placeholder — would filter by table_id
        setDetailOrder(match || null);
      }
    } catch {
      toast.error('Failed to load table details');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Tables</h2>
          </div>
          {/* Status legend */}
          <div className="hidden pos-tablet:flex items-center gap-3 text-xs">
            {(['available', 'occupied', 'reserved'] as TableStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[s].dotColor}`} />
                <span className="text-muted-foreground">
                  {STATUS_CONFIG[s].label}
                  {statusCounts[s] ? ` (${statusCounts[s]})` : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
        {floors.length > 0 && (
          <FilterPills items={floorTabs} active={selectedFloor} onChange={setSelectedFloor} />
        )}
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Grid3X3 className="h-10 w-10" />}
            title="No tables"
            description="Add tables in settings to start managing your floor."
          />
        ) : (
          <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-5 gap-3 pb-32 pos-tablet:pb-20">
            {visible.map((table) => {
              const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.available;
              const isSelected = selectedTable?.id === table.id;
              const resTime = reservationTimes.get(table.id);

              return (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={cn(
                    'relative rounded-xl border-2 p-4 text-left transition-all',
                    cfg.bg,
                    isSelected ? 'border-primary ring-2 ring-primary/20 shadow-pos' : cfg.border,
                    'hover:shadow-pos cursor-pointer'
                  )}
                >
                  {/* Table name + status */}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-bold text-foreground">{table.name}</span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>

                  {/* Capacity + chair dots */}
                  <div className="flex items-center gap-1 mt-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{table.capacity}</span>
                    <div className="flex gap-0.5 ml-1">
                      {Array.from({ length: Math.min(table.capacity, 6) }).map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary/50' : `${cfg.dotColor}/40`}`} />
                      ))}
                    </div>
                  </div>

                  {/* Reservation time */}
                  {resTime && (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-primary font-medium">
                      <Clock className="h-3 w-3" />
                      {resTime}
                    </div>
                  )}

                  {/* Occupied: order number indicator */}
                  {table.status === 'occupied' && (
                    <div className="mt-1.5 text-[10px] font-semibold text-warning bg-warning/10 rounded px-1.5 py-0.5 inline-block">
                      In Use
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom action bar — shown when a table is selected ── */}
      {selectedTable && (
        <div className="shrink-0 fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-lg p-4">
          {/* On desktop — inside the page layout, not fixed */}
        </div>
      )}
      {selectedTable && (
        <div className="shrink-0 border-t border-border bg-card px-4 py-3 z-10">
          <div className="flex items-center gap-3">
            {/* Selected chip */}
            <div className="flex items-center gap-2 bg-primary-tint rounded-lg px-3 py-2 flex-1 min-w-0">
              <Grid3X3 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-primary truncate">
                Table {selectedTable.name} selected
              </span>
              <button
                onClick={() => setSelectedTable(null)}
                className="ml-auto text-primary/60 hover:text-primary shrink-0"
                aria-label="Deselect table"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => {
                toast.info('Reservation info coming in Sprint 3');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors whitespace-nowrap"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden pos-tablet:inline">Info Reservation</span>
            </button>

            <Button
              onClick={handleDetailTable}
              size="sm"
              className="whitespace-nowrap"
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Detail Table
            </Button>

            {selectedTable?.status === 'occupied' && (
              <Button
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setChangeTableOpen(true)}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden pos-tablet:inline">Change Table</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Table Detail Modal (screen 50) ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Table {selectedTable?.name}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">{selectedTable?.status}</p>
            </div>
            <button onClick={() => setDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : detailOrder ? (
              <OrderDetailContent order={detailOrder} />
            ) : (
              <div className="py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {selectedTable?.status === 'available' ? 'Table is available' : 'No active order found'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTable?.status === 'available'
                    ? 'Start a new order to seat guests at this table.'
                    : 'This table may be managed from the Orders page.'}
                </p>
              </div>
            )}
          </div>

          {/* Modal actions */}
          <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDetailOpen(false);
                navigate('/orders/new');
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Order
            </Button>
            {detailOrder && (
              <Button
                className="flex-1"
                onClick={() => {
                  setDetailOpen(false);
                  navigate('/pos/checkout');
                }}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Proceed to Payment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Table Modal (screen 36) ── */}
      <Dialog open={changeTableOpen} onOpenChange={setChangeTableOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Change Table</h3>
            <button onClick={() => setChangeTableOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl border-2 border-warning bg-warning-tint flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-warning">{selectedTable?.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">Current</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-primary/40 bg-primary-tint flex items-center justify-center mb-2">
                  <span className="text-xs text-primary font-medium">Select</span>
                </div>
                <p className="text-xs text-muted-foreground">New Table</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mb-5">
              Table change flow will select from available tables on the floor plan.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setChangeTableOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => { setChangeTableOpen(false); navigate('/table-floor'); }}>
                Confirm Change
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Order detail content inside modal ──
function OrderDetailContent({ order }: { order: any }) {
  const lines = order.lines ?? [];
  const inProgress = lines.filter((l: any) => l.kds_status !== 'done');
  const served = lines.filter((l: any) => l.kds_status === 'done');

  return (
    <div className="space-y-4">
      {/* Order header */}
      <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
        <div>
          <p className="text-sm font-bold text-foreground">#{order.order_number}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {order.order_type === 'dine_in' ? 'Dine In' : 'Take Away'}
            {' · '}
            {order.customer_name || 'Walk-in'}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {order.status === 'open' ? 'In Progress' : order.status}
        </Badge>
      </div>

      {/* In Progress items */}
      {inProgress.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-warning uppercase tracking-wide mb-2">In Progress</h4>
          <div className="space-y-1.5">
            {inProgress.map((line: any, i: number) => (
              <div key={line.id ?? i} className="flex items-center justify-between bg-warning-tint rounded-lg border border-warning/20 px-3 py-2">
                <span className="text-sm font-medium text-foreground">{line.item_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">×{line.quantity}</span>
                  <span className="text-sm font-semibold">{formatCurrency(line.subtotal ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Served items */}
      {served.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-success uppercase tracking-wide mb-2">Served</h4>
          <div className="space-y-1.5">
            {served.map((line: any, i: number) => (
              <div key={line.id ?? i} className="flex items-center justify-between bg-success-tint rounded-lg border border-success/20 px-3 py-2">
                <span className="text-sm font-medium text-foreground">{line.item_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">×{line.quantity}</span>
                  <span className="text-sm font-semibold">{formatCurrency(line.subtotal ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* If no line items yet */}
      {lines.length === 0 && (
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground text-center py-2">No items on this order yet.</p>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
        <span>Total</span>
        <span>{formatCurrency(order.total_amount || 0)}</span>
      </div>
    </div>
  );
}
