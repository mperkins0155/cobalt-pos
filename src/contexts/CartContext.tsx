// ============================================================
// CloudPos — Cart Context
// Provides a single cart instance across all routes.
// POS, CreateOrder, and Checkout all share the same cart state.
// ============================================================

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

type CartContextValue = ReturnType<typeof useCart>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { defaultTaxRate } = useAuth();
  // Start with 0 — synced once auth resolves (handles the loading race)
  const cart = useCart({ defaultTaxRate: 0 });

  // Sync tax rate whenever auth finishes loading
  useEffect(() => {
    if (defaultTaxRate?.rate != null) {
      cart.setTaxRate(defaultTaxRate.rate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTaxRate?.rate]);

  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useSharedCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useSharedCart must be used within CartProvider');
  return ctx;
}
