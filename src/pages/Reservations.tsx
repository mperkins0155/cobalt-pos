// ============================================================
// CloudPos — Reservations Page
// Phase 9: Full reservation management with filter pills + modal
// Last modified: V0.7.3.0 — see VERSION_LOG.md
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  UtensilsCrossed,
  StickyNote,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterPills, EmptyState } from '@/components/pos';
import { NewReservationModal } from '@/components/reservations/NewReservationModal';
import { ReservationService } from '@/services/reservations';
import { TableService } from '@/services/tables';
import { toast } from '@/components/ui/sonner';
import type { DiningTable, Reservation, ReservationStatus } from '@/types/database';

// ── helpers ──────────────────────────────────────────────────

function formatReservationTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, today)) return `Today, ${timeStr}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${timeStr}`;
  return (
    d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    `, ${timeStr}`
  );
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isUpcoming(r: Reservation): boolean {
  return (
    (r.status === 'pending' || r.status === 'confirmed') &&
    new Date(r.reserved_for) >= new Date()
  );
}

const STATUS_STYLE: Record<
  ReservationStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; dot: string }
> = {
  pending:   { label: 'Pending',   variant: 'secondary',   dot: 'bg-warning' },
  confirmed: { label: 'Confirmed', variant: 'default',     dot: 'bg-primary' },
  seated:    { label: 'Seated',    variant: 'default',     dot: 'bg-success' },
  completed: { label: 'Completed', variant: 'outline',     dot: 'bg-muted-foreground' },
  cancelled: { label: 'Cancelled', variant: 'destructive', dot: 'bg-destructive' },
  no_show:   { label: 'No Show',   variant: 'destructive', dot: 'bg-destructive' },
};

type FilterKey = 'upcoming' | 'today' | 'all' | 'done';

// ── Reservations page ─────────────────────────────────────────

export default function Reservations() {
  const { organization, currentLocation } = useAuth();
  const { log } = useAuditLog();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('upcoming');

  const tableNameById = useMemo(
    () => new Map(tables.map((t) => [t.id, t.name])),
    [tables]
  );

  const loadData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [resResult, tablesResult] = await Promise.all([
        ReservationService.list({
          orgId: organization.id,
          locationId: currentLocation?.id,
          limit: 200,
        }),
        TableService.listTables({
          orgId: organization.id,
          locationId: currentLocation?.id,
          includeInactive: false,
        }),
      ]);
      setReservations(resResult.reservations);
      setTables(tablesResult);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization?.id, currentLocation?.id]);

  // ── filter logic ──
  const filtered = useMemo(() => {
    switch (filter) {
      case 'upcoming': return reservations.filter(isUpcoming);
      case 'today':    return reservations.filter((r) => isToday(r.reserved_for));
      case 'done':     return reservations.filter(
        (r) => r.status === 'completed' || r.status === 'cancelled' || r.status === 'no_show'
      );
      default:         return reservations;
    }
  }, [reservations, filter]);

  const filterTabs = useMemo(() => [
    { key: 'upcoming', label: 'Upcoming', count: reservations.filter(isUpcoming).length },
    { key: 'today',    label: 'Today',    count: reservations.filter((r) => isToday(r.reserved_for)).length },
    { key: 'all',      label: 'All',      count: reservations.length },
    {
      key: 'done',
      label: 'Done',
      count: reservations.filter(
        (r) => r.status === 'completed' || r.status === 'cancelled' || r.status === 'no_show'
      ).length,
    },
  ], [reservations]);

  // ── status transitions ──
  const updateStatus = async (reservation: Reservation, status: ReservationStatus) => {
    setUpdatingId(reservation.id);
    try {
      const updated = await ReservationService.setStatus(reservation.id, status);
      setReservations((prev) => prev.map((r) => (r.id === reservation.id ? updated : r)));

      if (reservation.table_id) {
        if (status === 'seated') {
          await TableService.setTableStatus(reservation.table_id, 'occupied');
        } else if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
          await TableService.setTableStatus(reservation.table_id, 'available');
        }
      }

      void log({
        actionType: 'reservation.status_changed',
        entityType: 'reservation',
        entityId: reservation.id,
        metadata: {
          reservation_number: reservation.reservation_number,
          from_status: reservation.status,
          to_status: status,
          guest_name: reservation.customer_name,
        },
      });

      toast.success(`Marked as ${STATUS_STYLE[status].label}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update reservation');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreated = (reservation: Reservation) => {
    setReservations((prev) => [reservation, ...prev]);
    setFilter('upcoming');
    void log({
      actionType: 'reservation.created',
      entityType: 'reservation',
      entityId: reservation.id,
      metadata: {
        reservation_number: reservation.reservation_number,
        guest_name: reservation.customer_name,
        party_size: reservation.party_size,
        reserved_for: reservation.reserved_for,
        table_id: reservation.table_id,
      },
    });
  };

  // ── render ────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Reservations</h2>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New reservation
        </Button>
      </div>

      {/* Filter pills */}
      <FilterPills
        items={filterTabs}
        active={filter}
        onChange={(key) => setFilter(key as FilterKey)}
        className="mb-5"
      />

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="No reservations"
          description={
            filter === 'upcoming'
              ? 'No upcoming reservations. Hit "New reservation" to add one.'
              : filter === 'today'
              ? 'No reservations scheduled for today.'
              : 'No reservations found.'
          }
        />
      ) : (
        <div className="space-y-3 pb-20 pos-tablet:pb-4">
          {filtered.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              tableName={r.table_id ? tableNameById.get(r.table_id) : undefined}
              isUpdating={updatingId === r.id}
              onUpdateStatus={updateStatus}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <NewReservationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        orgId={organization?.id ?? ''}
        locationId={currentLocation?.id}
        tables={tables}
        onCreated={handleCreated}
      />
    </div>
  );
}

// ── ReservationCard ────────────────────────────────────────

interface CardProps {
  reservation: Reservation;
  tableName?: string;
  isUpdating: boolean;
  onUpdateStatus: (reservation: Reservation, status: ReservationStatus) => void;
}

function ReservationCard({ reservation: r, tableName, isUpdating, onUpdateStatus }: CardProps) {
  const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
  const isPastDue =
    new Date(r.reserved_for) < new Date() && r.status === 'pending';

  return (
    <div
      className={`
        relative rounded-xl border bg-card p-4 transition-shadow hover:shadow-pos
        ${r.status === 'seated' ? 'border-success/40 bg-success/5' : 'border-border'}
        ${r.status === 'cancelled' || r.status === 'no_show' ? 'opacity-60' : ''}
      `}
    >
      {/* Top row: name + status badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {r.customer_name || 'Guest'}
          </p>
          {r.customer_phone && (
            <p className="text-xs text-muted-foreground mt-0.5">{r.customer_phone}</p>
          )}
        </div>
        <Badge
          variant={style.variant}
          className="shrink-0 gap-1 text-xs"
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </Badge>
      </div>

      {/* Detail row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className={`h-3.5 w-3.5 ${isPastDue ? 'text-destructive' : ''}`} />
          <span className={isPastDue ? 'text-destructive font-medium' : ''}>
            {formatReservationTime(r.reserved_for)}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          Party of {r.party_size}
        </span>
        {tableName && (
          <span className="flex items-center gap-1">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Table {tableName}
          </span>
        )}
        {r.special_requests && (
          <span className="flex items-center gap-1 max-w-xs truncate">
            <StickyNote className="h-3.5 w-3.5 shrink-0" />
            {r.special_requests}
          </span>
        )}
      </div>

      {/* Action buttons or spinner */}
      {isUpdating ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Updating…
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {r.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => onUpdateStatus(r, 'confirmed')}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => onUpdateStatus(r, 'seated')}
              >
                Seat now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => onUpdateStatus(r, 'cancelled')}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </>
          )}
          {r.status === 'confirmed' && (
            <>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => onUpdateStatus(r, 'seated')}
              >
                Seat now
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => onUpdateStatus(r, 'no_show')}
              >
                No show
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => onUpdateStatus(r, 'cancelled')}
              >
                Cancel
              </Button>
            </>
          )}
          {r.status === 'seated' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => onUpdateStatus(r, 'completed')}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Mark complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
