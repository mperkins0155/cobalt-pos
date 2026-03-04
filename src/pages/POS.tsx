import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { CatalogService } from '@/services/catalog';
import { formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShoppingCart, Settings, ClipboardList, Users, BarChart3,
  LogOut, Search, Minus, Plus, Trash2, X, Package, Tag,
  MapPin, ScanBarcode, ReceiptText, Archive,
} from 'lucide-react';
import type { Category, Item } from '@/types/database';
import type { CartItemModifier } from '@/types/cart';

export default function POS() {
  const navigate = useNavigate();
  const { organization, profile, currentLocation, signOut, defaultTaxRate, hasRole } = useAuth();
  const cart = useCart({ defaultTaxRate: defaultTaxRate?.rate || 0 });

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
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
      // Ignore if focused on an input
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
    // Check for modifiers
    try {
      const fullItem = await CatalogService.getItemWithModifiers(item.id);
      if (fullItem.modifier_groups.length > 0) {
        // TODO: Open modifier modal
        // For now, add without modifiers
      }
    } catch {
      // Fall through
    }

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

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ---- Render ----

  const CartPanel = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">
          Cart {cart.itemCount > 0 && <Badge variant="secondary" className="ml-1">{cart.itemCount}</Badge>}
        </h2>
        {cart.items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={cart.clearCart} className="text-xs h-7">
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {cart.items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Tap items or scan barcode to add</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {cart.items.map(item => (
              <div key={item.id} className="bg-card border rounded-lg p-2.5">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.modifiers.map(m => m.option_name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-blue-600 italic">{item.notes}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium whitespace-nowrap">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => cart.removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Totals */}
      {cart.items.length > 0 && (
        <div className="border-t p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(cart.totals.subtotal)}</span>
          </div>
          {cart.totals.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(cart.totals.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(cart.totals.tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-1.5">
            <span>Total</span>
            <span>{formatCurrency(cart.totals.total)}</span>
          </div>

          <Button className="w-full mt-2 h-12 text-base font-semibold" onClick={handleCheckout}>
            Charge {formatCurrency(cart.totals.total)}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-bold leading-tight">{organization?.name || 'Cobalt POS'}</h1>
            <div className="flex items-center gap-2 text-xs opacity-80">
              <span>{profile?.first_name} ({profile?.role})</span>
              {currentLocation && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {currentLocation.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-primary-foreground h-8 px-2 text-xs" onClick={() => navigate('/pos/tickets')}>
            <ReceiptText className="h-4 w-4 mr-1" />Tickets
          </Button>
          <Button variant="ghost" size="sm" className="text-primary-foreground h-8 px-2 text-xs" onClick={() => navigate('/orders')}>
            <ClipboardList className="h-4 w-4 mr-1" />Orders
          </Button>
          {hasRole('manager') && (
            <>
              <Button variant="ghost" size="sm" className="text-primary-foreground h-8 px-2 text-xs" onClick={() => navigate('/customers')}>
                <Users className="h-4 w-4 mr-1" />Customers
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground h-8 px-2 text-xs" onClick={() => navigate('/reports')}>
                <BarChart3 className="h-4 w-4 mr-1" />Reports
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground h-8 px-2 text-xs" onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="text-primary-foreground h-8 px-2 text-xs" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + Categories */}
          <div className="p-3 space-y-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items or scan barcode..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <ScrollArea className="w-full" orientation="horizontal">
              <div className="flex gap-1.5 pb-1">
                <Button
                  variant={!selectedCategory ? 'default' : 'outline'}
                  size="sm" className="h-7 text-xs shrink-0"
                  onClick={() => setSelectedCategory(undefined)}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm" className="h-7 text-xs shrink-0"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}
                    {cat.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Items Grid */}
          <ScrollArea className="flex-1 p-3">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    className="bg-card border rounded-lg p-3 text-left hover:border-primary hover:shadow-sm transition-all active:scale-[0.98]"
                    onClick={() => handleAddToCart(item)}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-14 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-14 bg-muted rounded mb-2 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-sm text-primary font-semibold">{formatCurrency(item.base_price)}</p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Cart (desktop) */}
        <div className="w-80 xl:w-96 border-l hidden lg:flex flex-col">
          <CartPanel />
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {cart.itemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4">
          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetTrigger asChild>
              <Button className="w-full h-14 text-base font-semibold shadow-lg rounded-xl">
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
