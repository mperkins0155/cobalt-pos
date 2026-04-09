// ============================================================
// CloudPos — Reservations Page + 4-Step Wizard
// Screen 38-46: Reservation Info → Select Table → Add Dishes → Summary
// Also shows upcoming reservations list
// ============================================================

import { useState, useEffect, useReducer, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ReservationService } from '@/services/reservations';
import { TableService } from '@/services/tables';
import { CatalogService } from '@/services/catalog';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StepperBar, FilterPills, SearchBar, EmptyState } from '@/components/pos';
import { toast } from 'sonner';
import {
  CalendarDays, Plus, X, Minus, Baby,
  Users, Grid3X3, Check, ArrowRight, UtensilsCrossed,
  Clock, Tag, ChevronRight, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation, DiningTable, Floor, Item } from '@/types/database';

const WIZARD_STEPS = ['Reservation Info', 'Select Table', 'Add Dishes', 'Summary'];

interface WizardState {
  customerName: string;
  date: string;
  time: string;
  partySize: number;
  babyChair: boolean;
  tableId: string | null;
  tableName: string | null;
  dishes: { item: Item; qty: number }[];
}

type WizardAction =
  | { type: 'SET_FIELD'; field: keyof WizardState; value: any }
  | { type: 'SET_TABLE'; id: string; name: string }
  | { type: 'CLEAR_TABLE' }
  | { type: 'ADD_DISH'; item: Item }
  | { type: 'REMOVE_DISH'; itemId: string }
  | { type: 'SET_DISH_QTY'; itemId: string; qty: number };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value };
    case 'SET_TABLE':  return { ...state, tableId: action.id, tableName: action.name };
    case 'CLEAR_TABLE': return { ...state, tableId: null, tableName: null };
    case 'ADD_DISH': {
      const existing = state.dishes.find((d) => d.item.id === action.item.id);
      if (existing) return { ...state, dishes: state.dishes.map((d) => d.item.id === action.item.id ? { ...d, qty: d.qty + 1 } : d) };
      return { ...state, dishes: [...state.dishes, { item: action.item, qty: 1 }] };
    }
    case 'REMOVE_DISH': return { ...state, dishes: state.dishes.filter((d) => d.item.id !== action.itemId) };
    case 'SET_DISH_QTY': {
      if (action.qty <= 0) return { ...state, dishes: state.dishes.filter((d) => d.item.id !== action.itemId) };
      return { ...state, dishes: state.dishes.map((d) => d.item.id === action.itemId ? { ...d, qty: action.qty } : d) };
    }
    default: return state;
  }
}

export default function Reservations() {
  const { organization, currentLocation } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadReservations = useCallback(async () => {
    if (!organization) return;
    try {
      const { reservations: rows } = await ReservationService.list({ orgId: organization.id, limit: 100 });
      setReservations(rows);
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => { void loadReservations(); }, [loadReservations]);

  const statusCounts: Record<string, number> = { all: reservations.length };
  for (const r of reservations) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

  const filterTabs = [
    { key: 'all',       label: 'All',        count: statusCounts.all || 0 },
    { key: 'pending',   label: 'Pending',    count: statusCounts.pending || 0 },
    { key: 'confirmed', label: 'Confirmed',  count: statusCounts.confirmed || 0 },
    { key: 'seated',    label: 'Seated',     count: statusCounts.seated || 0 },
    { key: 'completed', label: 'Completed',  count: statusCounts.completed || 0 },
  ];

  const filtered = statusFilter === 'all'
    ? reservations
    : reservations.filter((r) => r.status === statusFilter);

  const STATUS_COLOR: Record<string, string> = {
    pending:   'text-warning bg-warning-tint',
    confirmed: 'text-primary bg-primary-tint',
    seated:    'text-success bg-success-tint',
    completed: 'text-muted-foreground bg-muted',
    cancelled: 'text-destructive bg-destructive/10',
    no_show:   'text-destructive bg-destructive/10',
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pos-tablet:p-5 pos-desktop:px-7 pos-desktop:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Reservations</h2>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Reservation
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4">
        <FilterPills items={filterTabs} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Reservations list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="No reservations"
          description="Create a reservation to get started."
        />
      ) : (
        <div className="space-y-2 pb-20 pos-tablet:pb-4">
          {filtered.map((res) => {
            const statusCls = STATUS_COLOR[res.status] ?? 'text-muted-foreground bg-muted';
            const resDate = new Date(res.reserved_for);
            return (
              <div key={res.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                {/* Date/time */}
                <div className="shrink-0 text-center w-14">
                  <p className="text-xl font-bold text-foreground leading-none">{resDate.getDate()}</p>
                  <p className="text-xs text-muted-foreground">{resDate.toLocaleDateString(undefined, { month: 'short' })}</p>
                  <p className="text-xs font-medium text-primary mt-0.5">
                    {resDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="w-px h-12 bg-border shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-foreground truncate">
                      {res.customer_name || 'Guest'}
                    </p>
                    <Badge className={cn('border-0 text-[10px] shrink-0', statusCls)}>
                      {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{res.party_size}</span>
                    {res.table && <span className="flex items-center gap-1"><Grid3X3 className="h-3 w-3" />{(res.table as any).name}</span>}
                    {res.special_requests && <span className="truncate">{res.special_requests}</span>}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Wizard dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden gap-0">
          <ReservationWizard
            orgId={organization?.id}
            locationId={currentLocation?.id}
            onClose={() => setWizardOpen(false)}
            onCreated={() => { setWizardOpen(false); void loadReservations(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reservation Wizard ──
function ReservationWizard({
  orgId, locationId, onClose, onCreated,
}: {
  orgId?: string;
  locationId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [wizard, dispatch] = useReducer(wizardReducer, {
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    partySize: 2,
    babyChair: false,
    tableId: null,
    tableName: null,
    dishes: [],
  });

  const canStep1 = wizard.customerName.trim().length > 0 && wizard.date && wizard.time;
  const canStep2 = !!wizard.tableId;

  const handleCreate = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const reservedFor = new Date(`${wizard.date}T${wizard.time}`).toISOString();
      await ReservationService.create({
        orgId,
        locationId,
        tableId: wizard.tableId ?? undefined,
        customerName: wizard.customerName,
        partySize: wizard.partySize,
        reservedFor,
        specialRequests: wizard.babyChair ? 'Baby chair needed' : undefined,
        status: 'confirmed',
      });
      toast.success('Reservation created!');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create reservation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="shrink-0 bg-card border-b border-border">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-base font-bold text-foreground">New Reservation</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <StepperBar steps={WIZARD_STEPS} current={step} className="pb-4 px-5" />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {step === 0 && <WizardStep1 wizard={wizard} dispatch={dispatch} />}
        {step === 1 && <WizardStep2 wizard={wizard} dispatch={dispatch} orgId={orgId} locationId={locationId} />}
        {step === 2 && <WizardStep3 wizard={wizard} dispatch={dispatch} orgId={orgId} />}
        {step === 3 && <WizardStep4 wizard={wizard} onConfirm={handleCreate} saving={saving} />}
      </div>

      {/* Footer nav */}
      <div className="shrink-0 border-t border-border bg-card px-5 py-4 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}>
          {step === 0 ? 'Cancel' : '← Back'}
        </Button>
        {step < 3 ? (
          <Button
            disabled={(step === 0 && !canStep1) || (step === 1 && !canStep2)}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Reservation'}
          </Button>
        )}
      </div>
    </>
  );
}

// ── Step 1: Reservation Info ──
function WizardStep1({ wizard, dispatch }: { wizard: WizardState; dispatch: React.Dispatch<WizardAction> }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-md mx-auto">
        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Customer Name</Label>
          <Input
            placeholder="Enter customer name"
            value={wizard.customerName}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'customerName', value: e.target.value })}
            className="h-11"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Date</Label>
            <Input
              type="date"
              value={wizard.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'date', value: e.target.value })}
              className="h-11"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Time</Label>
            <Input
              type="time"
              value={wizard.time}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'time', value: e.target.value })}
              className="h-11"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">How many people?</Label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'partySize', value: Math.max(1, wizard.partySize - 1) })}
              className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{wizard.partySize}</span>
            <button
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'partySize', value: wizard.partySize + 1 })}
              className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">guests</span>
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-2 block">Baby Chair?</Label>
          <div className="grid grid-cols-2 gap-3">
            {([false, true] as const).map((val) => (
              <button
                key={String(val)}
                onClick={() => dispatch({ type: 'SET_FIELD', field: 'babyChair', value: val })}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all',
                  wizard.babyChair === val ? 'border-primary bg-primary-tint text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <Baby className="h-4 w-4" />
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Step 2: Select Table ──
function WizardStep2({
  wizard, dispatch, orgId, locationId,
}: {
  wizard: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  orgId?: string;
  locationId?: string;
}) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      TableService.listFloors(orgId, locationId),
      TableService.listTables({ orgId, locationId }),
    ]).then(([f, t]) => { setFloors(f); setTables(t); }).catch(() => toast.error('Failed to load tables')).finally(() => setLoading(false));
  }, [orgId, locationId]);

  const visible = tables.filter((t) => selectedFloor === 'all' || t.floor_id === selectedFloor);
  const floorTabs = [
    { key: 'all', label: 'All', count: tables.length },
    ...floors.map((f) => ({ key: f.id, label: f.name, count: tables.filter((t) => t.floor_id === f.id).length })),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {floors.length > 0 && (
        <div className="shrink-0 px-5 py-3 border-b border-border">
          <FilterPills items={floorTabs} active={selectedFloor} onChange={setSelectedFloor} />
        </div>
      )}
      <ScrollArea className="flex-1 p-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 pos-tablet:grid-cols-3 gap-3">
            {visible.map((table) => {
              const isSelected = wizard.tableId === table.id;
              const isAvailable = table.status === 'available';
              return (
                <button
                  key={table.id}
                  onClick={() => isAvailable && (isSelected ? dispatch({ type: 'CLEAR_TABLE' }) : dispatch({ type: 'SET_TABLE', id: table.id, name: table.name }))}
                  disabled={!isAvailable}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all',
                    isSelected ? 'border-primary bg-primary-tint ring-2 ring-primary/20' : isAvailable ? 'border-border bg-card hover:border-primary/50' : 'border-border bg-muted opacity-60 cursor-not-allowed'
                  )}
                >
                  {isSelected && <Check className="h-4 w-4 text-primary mb-1" />}
                  <p className="text-sm font-bold text-foreground">{table.name}</p>
                  <p className={cn('text-xs font-medium mt-0.5', isAvailable ? 'text-success' : 'text-warning')}>
                    {isAvailable ? 'Available' : 'Occupied'}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />{table.capacity} seats
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Step 3: Add Dishes ──
function WizardStep3({
  wizard, dispatch, orgId,
}: {
  wizard: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  orgId?: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId) return;
    CatalogService.getItems(orgId)
      .then(setItems)
      .catch(() => toast.error('Failed to load menu'))
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = items.filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full overflow-hidden">
      {/* Menu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 p-3 border-b border-border">
          <SearchBar value={search} onChange={setSearch} placeholder="Search menu..." />
        </div>
        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((item) => {
                const inCart = wizard.dishes.find((d) => d.item.id === item.id)?.qty ?? 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => dispatch({ type: 'ADD_DISH', item })}
                    className="bg-card rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:shadow-pos transition-all"
                  >
                    <div className="w-full h-20 rounded-lg bg-muted flex items-center justify-center mb-2 overflow-hidden">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Tag className="h-5 w-5 text-muted-foreground/40" />}
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-primary">{formatCurrency(item.base_price)}</span>
                      {inCart > 0 && <Badge variant="secondary" className="text-[10px]">{inCart}</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart */}
      <div className="hidden pos-tablet:flex w-64 flex-col border-l border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Pre-Order ({wizard.dishes.length})</p>
        </div>
        <ScrollArea className="flex-1 p-3">
          {wizard.dishes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Tap items to pre-order</p>
          ) : (
            <div className="space-y-2">
              {wizard.dishes.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center justify-between gap-2 bg-background rounded-lg border border-border px-2.5 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.base_price * qty)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => dispatch({ type: 'SET_DISH_QTY', itemId: item.id, qty: qty - 1 })} className="w-5 h-5 rounded border border-border flex items-center justify-center"><Minus className="h-2.5 w-2.5" /></button>
                    <span className="text-xs font-bold w-4 text-center tabular-nums">{qty}</span>
                    <button onClick={() => dispatch({ type: 'SET_DISH_QTY', itemId: item.id, qty: qty + 1 })} className="w-5 h-5 rounded border border-border flex items-center justify-center"><Plus className="h-2.5 w-2.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {wizard.dishes.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>{formatCurrency(wizard.dishes.reduce((s, d) => s + d.item.base_price * d.qty, 0))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Summary ──
function WizardStep4({
  wizard, onConfirm, saving,
}: {
  wizard: WizardState;
  onConfirm: () => void;
  saving: boolean;
}) {
  const resDate = new Date(`${wizard.date}T${wizard.time}`);
  const dishTotal = wizard.dishes.reduce((s, d) => s + d.item.base_price * d.qty, 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Dishes */}
      <ScrollArea className="flex-1 p-5">
        <h4 className="text-sm font-bold text-foreground mb-3">Pre-Ordered Dishes</h4>
        {wizard.dishes.length === 0 ? (
          <div className="bg-muted rounded-xl p-6 text-center mb-4">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No dishes pre-ordered</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {wizard.dishes.map(({ item, qty }) => (
              <div key={item.id} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Tag className="h-4 w-4 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.base_price)} × {qty}</p>
                </div>
                <span className="text-sm font-bold text-foreground">{formatCurrency(item.base_price * qty)}</span>
              </div>
            ))}
          </div>
        )}
        {dishTotal > 0 && (
          <div className="flex justify-between text-base font-bold border-t border-border pt-3 mb-4">
            <span>Dish Total</span>
            <span>{formatCurrency(dishTotal)}</span>
          </div>
        )}
      </ScrollArea>

      {/* Reservation details panel */}
      <div className="hidden pos-tablet:flex w-72 flex-col border-l border-border bg-card p-5">
        <h4 className="text-sm font-bold text-foreground mb-4">Reservation Details</h4>
        <div className="space-y-3 bg-background rounded-xl border border-border p-4">
          <DetailRow icon={<Tag className="h-3.5 w-3.5" />} label="Customer" value={wizard.customerName || 'Guest'} />
          <DetailRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Date" value={resDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })} />
          <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Time" value={resDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          {wizard.tableName && <DetailRow icon={<Grid3X3 className="h-3.5 w-3.5" />} label="Table" value={wizard.tableName} />}
          <DetailRow icon={<Users className="h-3.5 w-3.5" />} label="Guests" value={String(wizard.partySize)} />
          {wizard.babyChair && <DetailRow icon={<Baby className="h-3.5 w-3.5" />} label="Baby Chair" value="Yes" />}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-foreground truncate">{value}</span>
    </div>
  );
}
