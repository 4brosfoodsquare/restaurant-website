import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'fbfs.cart.v1';
const MAX_QUANTITY = 20;

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Cart lives client-side only, for display and building the order request.
 * Prices shown here are a snapshot taken when the item was added — they are
 * never sent as-is to the backend as the source of truth; the order API
 * recomputes everything from the current menu at checkout time.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitialCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable (private browsing, quota) — cart just won't persist.
    }
  }, [items]);

  const addItem = useCallback((menuItem, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItem.id);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menuItem.id
            ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity) }
            : line,
        );
      }
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          slug: menuItem.slug,
          priceMinor: menuItem.priceMinor,
          imageUrl: menuItem.imageUrl,
          dietType: menuItem.dietType,
          quantity: Math.min(MAX_QUANTITY, quantity),
        },
      ];
    });
  }, []);

  const removeItem = useCallback((menuItemId) => {
    setItems((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  }, []);

  const setQuantity = useCallback((menuItemId, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.menuItemId !== menuItemId);
      return prev.map((line) =>
        line.menuItemId === menuItemId ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) } : line,
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
    const subtotalMinor = items.reduce((sum, line) => sum + line.priceMinor * line.quantity, 0);
    return { items, itemCount, subtotalMinor, addItem, removeItem, setQuantity, clearCart };
  }, [items, addItem, removeItem, setQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
