import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext.jsx';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const item1 = { id: 1, name: 'Chicken Biriyani', slug: 'chicken-biriyani', priceMinor: 24900, imageUrl: null, dietType: 'non_veg' };
const item2 = { id: 2, name: 'Veg Biriyani', slug: 'veg-biriyani', priceMinor: 19900, imageUrl: null, dietType: 'veg' };

beforeEach(() => {
  localStorage.clear();
});

describe('CartContext', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotalMinor).toBe(0);
  });

  it('adds an item and computes subtotal from the item price snapshot, not any client-editable price', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 2));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.subtotalMinor).toBe(24900 * 2);
  });

  it('adding the same item again increases quantity rather than duplicating the line', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 1));
    act(() => result.current.addItem(item1, 3));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(4);
  });

  it('caps quantity at the max (20) even across repeated adds', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 15));
    act(() => result.current.addItem(item1, 15));
    expect(result.current.items[0].quantity).toBe(20);
  });

  it('setQuantity updates an existing line', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 1));
    act(() => result.current.setQuantity(item1.id, 5));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('setQuantity to zero or below removes the line', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 1));
    act(() => result.current.setQuantity(item1.id, 0));
    expect(result.current.items).toHaveLength(0);
  });

  it('removeItem removes only the targeted line', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 1));
    act(() => result.current.addItem(item2, 1));
    act(() => result.current.removeItem(item1.id));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].menuItemId).toBe(item2.id);
  });

  it('clearCart empties everything', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 1));
    act(() => result.current.addItem(item2, 1));
    act(() => result.current.clearCart());
    expect(result.current.items).toEqual([]);
  });

  it('computes subtotal across multiple distinct lines', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 2));
    act(() => result.current.addItem(item2, 1));
    expect(result.current.subtotalMinor).toBe(24900 * 2 + 19900 * 1);
    expect(result.current.itemCount).toBe(3);
  });

  it('persists to localStorage and a fresh provider mount picks it up', () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(item1, 2));
    unmount();

    const { result: result2 } = renderHook(() => useCart(), { wrapper });
    expect(result2.current.items).toHaveLength(1);
    expect(result2.current.items[0].quantity).toBe(2);
  });
});
