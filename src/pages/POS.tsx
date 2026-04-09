// ============================================================
// CloudPos — POS Register Page
// Phase 0D-2: Restyled with CloudPos design, removed standalone header
// Data: CatalogService.getCategories() + getItems()
// Cart: useCart hook (shared via context)
// Last modified: V0.6.4.0 — see VERSION_LOG.md
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedCart } from '@/contexts/CartContext';
import { CatalogService } from '@/services/catalog';
import { formatCurrency } from '@/lib/calculations';
import type { CartItemModifier } from '@/types/cart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar, FilterPills, EmptyState, ModifierModal } from '@/components/pos';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Tag,
  Package,
} from 'lucide-react';
import type { Category, Item, ModifierGroupWithOptions } from '@/types/database';

type ItemWithModifiers = Item & { modifier_groups: ModifierGroupWithOptions[] };

export default function POS() {
  const navigate = useNavigate();
  const { organization, defaultTaxRate } = useAuth();
  const cart = useSharedCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [modifierItem, setModifierItem] = useState<ItemWithModifiers | null>(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!organization) return;
    const load = async () => {
      try {
        const [cats, itms] = await Promise.all([
          CatalogService.getCategories(organization.id),
          CatalogService.getItems(organization.id),
        ]);
        setCategories(cats);
        setItems(itms);
      } catch (err) {
        console.error('Failed to load catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [organization]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Enter' && barcodeBuffer.current.length >= 4) {
        const barcode = barcodeBuffer.current;
        barcodeBuffer.current = '';
        void handleBarcodeScan(barcode);
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [organization]);

  const handleBarcodeScan = async (barcode: string) => {
    if (!organization) return;
    const result = await CatalogService.lookupBarcode(organization.id, barcode);
    if (result.found && result.item_id) {
      cart.addItem({
        item_id: result.item_id,
        item_name: result.item_name || 'Unknown',
        variant_id: result.variant_id,
        variant_name: result.variant_name,
        unit_price: result.price || 0,
        is_taxable: true,
      });
    }
  };

  const handleAddToCart = useCallback(async (item: Item) => {
    try {
      const fullItem = await CatalogService.getItemWithModifiers(item.id);
      if (fullItem.modifier_groups.length > 0) {
        setModifierItem(fullItem);
        return;
      }
    } catch {
      // If modifier loading fails, still allow adding the base item.
    }

    cart.addItem({
      item_id: item.id,
      item_name: item.name,
      unit_price: item.base_price,
      is_taxable: item.taxable,
    });
  }, [cart]);

  const handleAddWithModifiers = useCallback(
    ({ modifiers, quantity }: { modifiers: CartItemModifier[]; quantity: number }) => {
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
    },
    [cart, modifierItem]
  );

  const handleCheckout = () => {
    if (cart.isEmpty) return;
    navigate('/pos/checkout');
  };

  const categoryTabs = [
    { key: 'all', label: 'All', count: items.length },
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
      count: items.filter((item) => item.category_id === category.id).length,
    })),
  ];

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const CartPanel = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h2 className="text-sm font-bold text-foreground">
          Order Details
          {cart.itemCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {cart.itemCount}
            </Badge>
          )}
        </h2>
        {cart.items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={cart.clearCart}
            className="h-7 text-xs text-destructive hover:text-destructive"
          >
            Reset
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {cart.items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-8 w-8" />}
            title="Cart is empty"
            description="Tap items or scan barcode"
            className="py-10"
          />
        ) : (
          <div className="space-y-1.5 p-2.5">
            {cart.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.item_name}
                    </p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.modifiers.map((modifier) => modifier.option_name).join(', ')}
                      </p>
                    )}
                    {item.notes && <p className="text-xs italic text-primary">{item.notes}</p>}
                  </div>
                  <p className="whitespace-nowrap text-sm font-bold text-foreground">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => cart.removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {cart.items.length > 0 && (
        <div className="space-y-1.5 border-t border-border p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatCurrency(cart.totals.subtotal)}</span>
          </div>
          {cart.totals.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>Discount</span>
              <span>-{formatCurrency(cart.totals.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="text-foreground">{formatCurrency(cart.totals.tax_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(cart.totals.total)}</span>
          </div>
          <Button className="mt-2 h-12 w-full text-base font-bold" onClick={handleCheckout}>
            Charge {formatCurrency(cart.totals.total)}
          </Button>
        </div>
      )}
    </div>
  );

  // ── Main layout ──
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 space-y-2.5 border-b border-border p-3 pos-tablet:p-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search items or scan barcode..."
          />
          <FilterPills
            items={categoryTabs}
            active={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        <ScrollArea className="flex-1 p-3 pos-tablet:p-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="No items found"
              description={
                searchQuery ? `No results for "${searchQuery}"` : 'Add items in the catalog.'
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pb-20 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 lg:pb-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-pos active:scale-[0.98]"
                  onClick={() => {
                    void handleAddToCart(item);
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="mb-2 h-16 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex h-16 w-full items-center justify-center rounded-lg bg-muted">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm font-bold text-primary">
                    {formatCurrency(item.base_price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="hidden w-80 flex-col border-l border-border bg-card lg:flex xl:w-96">
        <CartPanel />
      </div>

      {cart.itemCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-30 lg:hidden">
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetTrigger asChild>
              <Button className="h-14 w-full rounded-xl text-base font-bold shadow-pos-lg">
                <ShoppingCart className="mr-2 h-5 w-5" />
                View Cart ({cart.itemCount}) — {formatCurrency(cart.totals.total)}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] p-0">
              <CartPanel />
            </SheetContent>
          </Sheet>
        </div>
      )}

      <ModifierModal
        item={modifierItem}
        open={modifierItem !== null}
        onClose={() => setModifierItem(null)}
        onAddToCart={handleAddWithModifiers}
      />
    </div>
  );
}
