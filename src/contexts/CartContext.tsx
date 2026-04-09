// ============================================================
// CloudPos — Cart Context
// Provides a single cart instance across all routes.
// POS, CreateOrder, and Checkout all share the same cart state.
// ============================================================

import { createContext, useContext, type ReactNode } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

type CartContextValue = ReturnType<typeof useCart>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { defaultTaxRate } = useAuth();
  const cart = useCart({ defaultTaxRate: defaultTaxRate?.rate || 0 });
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useSharedCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useSharedCart must be used within CartProvider');
  return ctx;
}
