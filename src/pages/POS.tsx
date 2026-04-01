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
import { useCart } from '@/hooks/useCart';
import { CatalogService } from '@/services/catalog';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchBar, FilterPills, EmptyState } from '@/components/pos';
import {
  ShoppingCart, Minus, Plus, Trash2, Tag, Package, Save,
} from 'lucide-react';
import type { Category, Item } from '@/types/database';

export default function POS() {
  const navigate = useNavigate();
  const { organization, defaultTaxRate } = useAuth();
  const cart = useCart({ defaultTaxRate: defaultTaxRate?.rate || 0 });

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load catalog
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
    load();
  }, [organization]);

  // Barcode scanner (keyboard wedge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Enter' && barcodeBuffer.current.length >= 4) {
        const barcode = barcodeBuffer.current;
        barcodeBuffer.current = '';
        handleBarcodeScan(barcode);
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
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
        // TODO Phase 4: Open ModifierModal
      }
    } catch { /* Fall through */ }
    cart.addItem({
      item_id: item.id,
      item_name: item.name,
      unit_price: item.base_price,
      is_taxable: item.taxable,
    });
  }, [cart]);

  const handleCheckout = () => {
    if (cart.isEmpty) return;
    navigate('/pos/checkout');
  };

  // Category filter tabs
  const categoryTabs = [
    { key: 'all', label: 'All', count: items.length },
    ...categories.map((c) => ({
      key: c.id,
      label: c.name,
      count: items.filter((i) => i.category_id === c.id).length,
    })),
  ];

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── Cart Panel (reused in desktop sidebar + mobile sheet) ──
  const CartPanel = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Order Details
          {cart.itemCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">{cart.itemCount}</Badge>
          )}
        </h2>
        {cart.items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={cart.clearCart} className="text-xs h-7 text-destructive hover:text-destructive">
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
          <div className="p-2.5 space-y-1.5">
            {cart.items.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-lg p-2.5">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.item_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.modifiers.map((m) => m.option_name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-primary italic">{item.notes}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground whitespace-nowrap">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
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

      {/* Totals + Charge */}
      {cart.items.length > 0 && (
        <div className="border-t border-border p-3 space-y-1.5">
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
          <div className="flex justify-between font-bold text-base border-t border-border pt-2">
            <span>Total</span>
            <span>{formatCurrency(cart.totals.total)}</span>
          </div>
          <Button className="w-full mt-2 h-12 text-base font-bold" onClick={handleCheckout}>
            Charge {formatCurrency(cart.totals.total)}
          </Button>
        </div>
      )}
    </div>
  );

  // ── Main layout ──
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Product grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search + categories */}
        <div className="p-3 pos-tablet:p-4 space-y-2.5 border-b border-border shrink-0">
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

        {/* Items grid */}
        <ScrollArea className="flex-1 p-3 pos-tablet:p-4">
          {loading ? (
            <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-2.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title="No items found"
              description={searchQuery ? `No results for "${searchQuery}"` : 'Add items in the catalog.'}
            />
          ) : (
            <div className="grid grid-cols-2 pos-tablet:grid-cols-3 pos-desktop:grid-cols-4 gap-2.5 pb-20 lg:pb-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary hover:shadow-pos transition-all active:scale-[0.98]"
                  onClick={() => handleAddToCart(item)}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-16 object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full h-16 bg-muted rounded-lg mb-2 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(item.base_price)}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: Cart sidebar (desktop) */}
      <div className="w-80 xl:w-96 border-l border-border hidden lg:flex flex-col bg-card">
        <CartPanel />
      </div>

      {/* Mobile Cart FAB */}
      {cart.itemCount > 0 && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetTrigger asChild>
              <Button className="w-full h-14 text-base font-bold shadow-pos-lg rounded-xl">
                <ShoppingCart className="h-5 w-5 mr-2" />
                View Cart ({cart.itemCount}) — {formatCurrency(cart.totals.total)}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] p-0">
              <CartPanel />
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
