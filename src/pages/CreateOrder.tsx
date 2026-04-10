// ============================================================
// CloudPos — Create Order Wizard
// Screens 11–25: 4-step flow matching Figma spec
// Step 1: Customer Info (order type, party size, baby chair, name)
// Step 2: Select Table (floor plan, visual grid — dine-in only)
// Step 3: Select Menu (food grid + cart panel)
// Step 4: Order Summary (review + continue to payment)
// ============================================================

import { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedCart } from '@/contexts/CartContext';
import { CatalogService } from '@/services/catalog';
import { TableService } from '@/services/tables';
import { CustomerService } from '@/services/customers';
import { formatCurrency } from '@/lib/calculations';
import { StepperBar, FilterPills, SearchBar, EmptyState, NumPad, ModifierModal } from '@/components/pos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ArrowLeft, ArrowRight, Users, Baby, Grid3X3,
  Minus, Plus, Trash2, ShoppingCart, Tag, Search,
  ChevronRight, Check, UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, Item, DiningTable, Floor, ModifierGroupWithOptions } from '@/types/database';
import type { CartItemModifier } from '@/types/cart';

// ─── Step types ────────────────────────────────────────────
const STEPS = ['Customer Info', 'Select Table', 'Select Menu', 'Order Summary'];

type OrderType = 'dine_in' | 'takeout';

interface WizardState {
  step: number;
  orderType: OrderType;
  partySize: number;
  babyChair: boolean;
  customerName: string;
  selectedTableId: string | null;
  selectedTableName: string | null;
}

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ORDER_TYPE'; orderType: OrderType }
  | { type: 'SET_PARTY_SIZE'; size: number }
  | { type: 'SET_BABY_CHAIR'; value: boolean }
  | { type: 'SET_CUSTOMER_NAME'; name: string }
  | { type: 'SET_TABLE'; id: string; name: string }
  | { type: 'CLEAR_TABLE' };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step };
    case 'SET_ORDER_TYPE':
      return { ...state, orderType: action.orderType, selectedTableId: null, selectedTableName: null };
    case 'SET_PARTY_SIZE': return { ...state, partySize: Math.max(1, action.size) };
    case 'SET_BABY_CHAIR': return { ...state, babyChair: action.value };
    case 'SET_CUSTOMER_NAME': return { ...state, customerName: action.name };
    case 'SET_TABLE': return { ...state, selectedTableId: action.id, selectedTableName: action.name };
    case 'CLEAR_TABLE': return { ...state, selectedTableId: null, selectedTableName: null };
    default: return state;
  }
}

// ─── Main wizard ───────────────────────────────────────────
export default function CreateOrder() {
  const navigate = useNavigate();
  const { organization, currentLocation, defaultTaxRate } = useAuth();
  const cart = useSharedCart();

  const [wizard, dispatch] = useReducer(wizardReducer, {
    step: 0,
    orderType: 'dine_in',
    partySize: 2,
    babyChair: false,
    customerName: '',
    selectedTableId: null,
    selectedTableName: null,
  });

  // Skip table step for takeout
  const effectiveSteps = wizard.orderType === 'takeout'
    ? ['Customer Info', 'Select Menu', 'Order Summary']
    : STEPS;

  const goNext = () => {
    const nextStep = wizard.step + 1;
    // Skip step 1 (Select Table) if takeout
    if (wizard.orderType === 'takeout' && nextStep === 1) {
      dispatch({ type: 'SET_STEP', step: 2 });
    } else {
      dispatch({ type: 'SET_STEP', step: nextStep });
    }
  };

  const goBack = () => {
    if (wizard.step === 0) {
      navigate(-1);
      return;
    }
    const prevStep = wizard.step - 1;
    if (wizard.orderType === 'takeout' && prevStep === 1) {
      dispatch({ type: 'SET_STEP', step: 0 });
    } else {
      dispatch({ type: 'SET_STEP', step: prevStep });
    }
  };

  // Sync wizard choices into cart
  useEffect(() => {
    cart.setOrderType(wizard.orderType === 'dine_in' ? 'dine_in' : 'takeout');
    // Sync customer name so Checkout shows it and it's stored on the order
    cart.setCustomerNameOnly(wizard.customerName || undefined);
  }, [wizard.orderType, wizard.customerName]);

  // Stepper index — adjust for takeout (no table step shown)
  const stepperIndex = wizard.orderType === 'takeout' && wizard.step >= 2
    ? wizard.step - 1
    : wizard.step;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-foreground flex-1">New Order</h2>
        </div>
        <StepperBar
          steps={effectiveSteps}
          current={stepperIndex}
          className="px-4 pb-3"
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {wizard.step === 0 && (
          <StepCustomerInfo
            wizard={wizard}
            dispatch={dispatch}
            onNext={goNext}
          />
        )}
        {wizard.step === 1 && wizard.orderType === 'dine_in' && (
          <StepSelectTable
            wizard={wizard}
            dispatch={dispatch}
            orgId={organization?.id}
            locationId={currentLocation?.id}
            onNext={goNext}
          />
        )}
        {wizard.step === 2 && (
          <StepSelectMenu
            orgId={organization?.id}
            cart={cart}
            onNext={goNext}
          />
        )}
        {wizard.step === 3 && (
          <StepOrderSummary
            wizard={wizard}
            cart={cart}
            onConfirm={() => navigate('/pos/checkout')}
          />
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Customer Info ─────────────────────────────────
function StepCustomerInfo({
  wizard,
  dispatch,
  onNext,
}: {
  wizard: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}) {
  const canContinue = wizard.customerName.trim().length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-lg mx-auto space-y-6 pb-24">
        {/* Order type */}
        <div>
          <Label className="text-sm font-semibold text-foreground mb-3 block">Order Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {(['dine_in', 'takeout'] as OrderType[]).map((type) => (
              <button
                key={type}
                onClick={() => dispatch({ type: 'SET_ORDER_TYPE', orderType: type })}
                className={cn(
                  'flex items-center justify-center gap-2.5 py-4 rounded-xl border-2 font-semibold text-sm transition-all',
                  wizard.orderType === type
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                )}
              >
                {type === 'dine_in' ? (
                  <UtensilsCrossed className="h-4 w-4" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {type === 'dine_in' ? 'Dine In' : 'Take Away'}
              </button>
            ))}
          </div>
        </div>

        {/* Party size — dine-in only */}
        {wizard.orderType === 'dine_in' && (
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              How many people?
            </Label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => dispatch({ type: 'SET_PARTY_SIZE', size: wizard.partySize - 1 })}
                disabled={wizard.partySize <= 1}
                className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-2xl font-bold text-foreground w-8 text-center tabular-nums">
                {wizard.partySize}
              </span>
              <button
                onClick={() => dispatch({ type: 'SET_PARTY_SIZE', size: wizard.partySize + 1 })}
                className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">guests</span>
            </div>
          </div>
        )}

        {/* Baby chair — dine-in only */}
        {wizard.orderType === 'dine_in' && (
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">
              Baby Chair Needed?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {([false, true] as boolean[]).map((val) => (
                <button
                  key={String(val)}
                  onClick={() => dispatch({ type: 'SET_BABY_CHAIR', value: val })}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all',
                    wizard.babyChair === val
                      ? 'border-primary bg-primary-tint text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  )}
                >
                  <Baby className="h-4 w-4" />
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer name */}
        <div>
          <Label htmlFor="customer-name" className="text-sm font-semibold text-foreground mb-2 block">
            Customer Name
          </Label>
          <Input
            id="customer-name"
            placeholder="Enter customer name"
            value={wizard.customerName}
            onChange={(e) => dispatch({ type: 'SET_CUSTOMER_NAME', name: e.target.value })}
            className="h-12 text-base"
            autoFocus
          />
        </div>

        {/* Continue */}
        <Button
          className="w-full h-12 font-bold text-base"
          disabled={!canContinue}
          onClick={onNext}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </ScrollArea>
  );
}

// ─── Step 2: Select Table ──────────────────────────────────
const TABLE_STATUS_CONFIG = {
  available: { label: 'Available', bg: 'bg-card', border: 'border-border', text: 'text-foreground', dot: 'bg-success' },
  occupied: { label: 'Not Available', bg: 'bg-warning-tint', border: 'border-warning/40', text: 'text-warning', dot: 'bg-warning' },
  reserved: { label: 'Reserved', bg: 'bg-primary/5', border: 'border-primary/30', text: 'text-primary', dot: 'bg-primary' },
  cleaning: { label: "Can't Select", bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  inactive: { label: 'Inactive', bg: 'bg-muted/50', border: 'border-border/50', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

function StepSelectTable({
  wizard,
  dispatch,
  orgId,
  locationId,
  onNext,
}: {
  wizard: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  orgId?: string;
  locationId?: string;
  onNext: () => void;
}) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      try {
        const [floorsRes, tablesRes] = await Promise.all([
          TableService.listFloors(orgId, locationId),
          TableService.listTables({ orgId, locationId, includeInactive: false }),
        ]);
        setFloors(floorsRes);
        setTables(tablesRes);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [orgId, locationId]);

  const floorTabs = [
    { key: 'all', label: 'All', count: tables.length },
    ...floors.map((f) => ({
      key: f.id,
      label: f.name,
      count: tables.filter((t) => t.floor_id === f.id).length,
    })),
  ];

  const visible = tables.filter(
    (t) => selectedFloor === 'all' || t.floor_id === selectedFloor
  );

  const handleSelect = (table: DiningTable) => {
    if (table.status !== 'available') return;
    if (wizard.selectedTableId === table.id) {
      dispatch({ type: 'CLEAR_TABLE' });
    } else {
      dispatch({ type: 'SET_TABLE', id: table.id, name: table.name });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Legend */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border bg-card flex items-center gap-4 flex-wrap">
        {Object.entries(TABLE_STATUS_CONFIG).slice(0, 4).map(([status, cfg]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Floor tabs */}
      {floors.length > 0 && (
        <div className="shrink-0 px-4 py-2.5 border-b border-border">
          <FilterPills items={floorTabs} active={selectedFloor} onChange={setSelectedFloor} />
        </div>
      )}

      {/* Table grid */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Grid3X3 className="h-10 w-10" />}
            title="No tables found"
            description="Add tables in settings to assign them to orders."
          />
        ) : (
          <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-3 pb-24">
            {visible.map((table) => {
              const cfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG.available;
              const isSelected = wizard.selectedTableId === table.id;
              const isSelectable = table.status === 'available';

              return (
                <button
                  key={table.id}
                  onClick={() => handleSelect(table)}
                  disabled={!isSelectable}
                  className={cn(
                    'relative rounded-xl border-2 p-4 text-left transition-all',
                    cfg.bg,
                    isSelected ? 'border-primary ring-2 ring-primary/20' : cfg.border,
                    isSelectable ? 'hover:border-primary/60 hover:shadow-pos cursor-pointer' : 'cursor-not-allowed opacity-70'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="text-sm font-bold text-foreground mb-1">{table.name}</div>
                  <div className={`text-xs font-medium mb-2 ${cfg.text}`}>{cfg.label}</div>
                  {/* Chair dots */}
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{table.capacity}</span>
                    <div className="flex gap-0.5 ml-1">
                      {Array.from({ length: Math.min(table.capacity, 6) }).map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary/60' : 'bg-muted-foreground/40'}`} />
                      ))}
                    </div>
                  </div>
                  {/* Occupied: show order badge */}
                  {table.status === 'occupied' && table.current_order_id && (
                    <div className="mt-1.5 text-[10px] font-semibold text-warning bg-warning-tint rounded px-1.5 py-0.5 inline-block">
                      In Use
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-border bg-card p-4">
        {wizard.selectedTableId ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-primary-tint rounded-lg px-3 py-2">
              <Grid3X3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Table {wizard.selectedTableName} selected
              </span>
              <button
                onClick={() => dispatch({ type: 'CLEAR_TABLE' })}
                className="ml-auto text-primary/60 hover:text-primary"
                aria-label="Clear table selection"
              >
                ✕
              </button>
            </div>
            <Button onClick={onNext} className="shrink-0 font-bold">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-1">
            Select an available table to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Select Menu ───────────────────────────────────
type ItemWithModifiers = Item & { modifier_groups: ModifierGroupWithOptions[] };

function StepSelectMenu({
  orgId,
  cart,
  onNext,
}: {
  orgId?: string;
  cart: ReturnType<typeof useSharedCart>;
  onNext: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [modifierItem, setModifierItem] = useState<ItemWithModifiers | null>(null);

  // H1 fix: memoize cart qty per item_id to avoid O(n²) in render
  const cartQtyMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const ci of cart.items) {
      m.set(ci.item_id, (m.get(ci.item_id) || 0) + ci.quantity);
    }
    return m;
  }, [cart.items]);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Item | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      try {
        const [cats, itms] = await Promise.all([
          CatalogService.getCategories(orgId),
          CatalogService.getItems(orgId),
        ]);
        setCategories(cats);
        setItems(itms);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [orgId]);

  const categoryTabs = [
    { key: 'all', label: 'All', count: items.length },
    ...categories.map((c) => ({
      key: c.id,
      label: c.name,
      count: items.filter((i) => i.category_id === c.id).length,
    })),
  ];

  const filtered = items.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddToCart = useCallback(async (item: Item) => {
    try {
      const full = await CatalogService.getItemWithModifiers(item.id);
      if (full.modifier_groups.length > 0) {
        setModifierItem(full);
        return;
      }
    } catch (err) {
      // Modifier load failed — add item without modifiers and log
      console.warn('Failed to load modifiers, adding without:', err);
    }
    cart.addItem({ item_id: item.id, item_name: item.name, unit_price: item.base_price, is_taxable: item.taxable });
  }, [cart]);

  const handleAddWithModifiers = useCallback(({ modifiers, quantity }: { modifiers: CartItemModifier[]; quantity: number }) => {
    if (!modifierItem) return;
    cart.addItem({
      item_id: modifierItem.id,
      item_name: modifierItem.name,
      unit_price: modifierItem.base_price,
      quantity,
      modifiers,
      is_taxable: modifierItem.taxable,
    });
    setModifierItem(null);
  }, [cart, modifierItem]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: menu */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Search + category pills */}
        <div className="shrink-0 p-3 space-y-2.5 border-b border-border">
          <SearchBar value={search} onChange={setSearch} placeholder="Search menu..." />
          <FilterPills items={categoryTabs} active={selectedCategory} onChange={setSelectedCategory} />
        </div>

        {/* Food grid */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {loading ? (
              <div className="grid grid-cols-2 pos-tablet:grid-cols-3 gap-2.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<Tag className="h-10 w-10" />} title="No items found" description="Try a different category or search." />
            ) : (
              <div className="grid grid-cols-2 pos-tablet:grid-cols-3 gap-2.5 pb-20 lg:pb-4">
                {filtered.map((item) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    onAdd={() => void handleAddToCart(item)}
                    onExpand={() => { setDetailItem(item); setItemDetailOpen(true); }}
                    cartQty={cartQtyMap.get(item.id) || 0}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: cart panel (desktop) */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col border-l border-border bg-card">
        <CartPanel cart={cart} onCheckout={onNext} />
      </div>

      {/* Mobile: floating cart button */}
      {cart.itemCount > 0 && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
          <button
            onClick={onNext}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-between px-5 shadow-pos-lg"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}
            </span>
            <span>{formatCurrency(cart.totals.total)}</span>
          </button>
        </div>
      )}

      {/* Modifier modal */}
      <ModifierModal
        item={modifierItem}
        open={modifierItem !== null}
        onClose={() => setModifierItem(null)}
        onAddToCart={handleAddWithModifiers}
      />

      {/* Item detail dialog */}
      {detailItem && (
        <ItemDetailDialog
          item={detailItem}
          open={itemDetailOpen}
          onClose={() => { setItemDetailOpen(false); setDetailItem(null); }}
          onAdd={() => { void handleAddToCart(detailItem); setItemDetailOpen(false); setDetailItem(null); }}
        />
      )}
    </div>
  );
}

// ─── Menu card ─────────────────────────────────────────────
function MenuCard({
  item,
  onAdd,
  onExpand,
  cartQty,
}: {
  item: Item;
  onAdd: () => void;
  onExpand: () => void;
  cartQty: number;
}) {
  return (
    <div className="relative bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-pos transition-all group">
      {/* Availability badge */}
      {!item.is_active && (
        <div className="absolute top-2 left-2 z-10 bg-destructive/90 text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
          Unavailable
        </div>
      )}
      {/* Cart qty badge */}
      {cartQty > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {cartQty}
        </div>
      )}

      {/* Image */}
      <div className="relative">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-28 object-cover" />
        ) : (
          <div className="w-full h-28 bg-muted flex items-center justify-center">
            <Tag className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
        {/* Expand button */}
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="View details"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-sm font-semibold text-foreground line-clamp-1 mb-0.5">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">{formatCurrency(item.base_price)}</span>
          <button
            onClick={onAdd}
            disabled={!item.is_active}
            className="h-7 px-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item detail dialog ────────────────────────────────────
function ItemDetailDialog({
  item,
  open,
  onClose,
  onAdd,
}: {
  item: Item;
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
            <span className="text-lg font-bold text-primary">{formatCurrency(item.base_price)}</span>
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
          )}
          <Button className="w-full h-12 font-bold" onClick={onAdd}>
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cart panel ────────────────────────────────────────────
function CartPanel({
  cart,
  onCheckout,
}: {
  cart: ReturnType<typeof useSharedCart>;
  onCheckout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">
          Order Details
          {cart.itemCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">{cart.itemCount}</Badge>
          )}
        </h3>
        {cart.items.length > 0 && (
          <button
            onClick={cart.clearCart}
            className="text-xs text-destructive hover:text-destructive/80 font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {/* Items */}
      <ScrollArea className="flex-1">
        {cart.items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-8 w-8" />}
            title="Cart is empty"
            description="Tap items to add them"
            className="py-10"
          />
        ) : (
          <div className="p-3 space-y-2">
            {cart.items.map((item) => (
              <div key={item.id} className="bg-background rounded-lg border border-border p-2.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{item.item_name}</p>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">{item.modifiers.map(m => m.option_name).join(', ')}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatCurrency(item.line_total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                      aria-label="Increase"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => cart.removeItem(item.id)}
                    className="text-destructive hover:text-destructive/80 p-1"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals + checkout */}
      {cart.items.length > 0 && (
        <div className="shrink-0 border-t border-border p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(cart.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(cart.totals.tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
            <span>Total</span>
            <span>{formatCurrency(cart.totals.total)}</span>
          </div>
          <Button className="w-full h-12 font-bold mt-2" onClick={onCheckout}>
            Continue — {formatCurrency(cart.totals.total)}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Order Summary ─────────────────────────────────
function StepOrderSummary({
  wizard,
  cart,
  onConfirm,
}: {
  wizard: WizardState;
  cart: ReturnType<typeof useSharedCart>;
  onConfirm: () => void;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: item list */}
      <ScrollArea className="flex-1 p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Order Items</h3>
        {cart.items.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="h-10 w-10" />} title="No items" description="Go back and add items to the order." />
        ) : (
          <div className="space-y-3 pb-24">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-card rounded-xl border border-border p-3">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {(item as any).image_url ? (
                    <img src={(item as any).image_url} alt={item.item_name} className="w-full h-full object-cover" />
                  ) : (
                    <Tag className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.item_name}</p>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">{formatCurrency(item.line_total)}</span>
                  </div>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.modifiers.map(m => m.option_name).join(' + ')}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">{formatCurrency(item.unit_price + item.modifiers_total)} × {item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Right: summary panel */}
      <div className="hidden pos-tablet:flex flex-col w-72 border-l border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">Customer Info</h3>
        <div className="bg-background rounded-xl border border-border p-4 space-y-2 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {(wizard.customerName || 'G').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{wizard.customerName || 'Guest'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {wizard.orderType === 'dine_in' ? 'Dine In' : 'Take Away'}
                {wizard.orderType === 'dine_in' && ` · ${wizard.partySize} guests`}
              </p>
            </div>
          </div>
          {wizard.selectedTableName && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Table {wizard.selectedTableName}</span>
            </div>
          )}
          {wizard.babyChair && (
            <div className="flex items-center gap-2">
              <Baby className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Baby chair requested</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(cart.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(cart.totals.tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatCurrency(cart.totals.total)}</span>
          </div>
        </div>

        <Button
          className="w-full h-12 font-bold"
          disabled={cart.isEmpty}
          onClick={onConfirm}
        >
          Continue to Payment
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Mobile: bottom CTA */}
      {!cart.isEmpty && (
        <div className="pos-tablet:hidden fixed bottom-20 left-4 right-4 z-30">
          <Button className="w-full h-14 font-bold text-base" onClick={onConfirm}>
            Continue to Payment — {formatCurrency(cart.totals.total)}
          </Button>
        </div>
      )}
    </div>
  );
}
