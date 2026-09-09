import { describe, it, expect } from 'vitest';
import { formatMoney, formatPrice, isPriced } from '../money.js';

describe('formatMoney', () => {
  it('formats whole-rupee amounts without decimals', () => {
    expect(formatMoney(24900)).toBe('₹249');
  });

  it('formats fractional amounts with two decimals', () => {
    expect(formatMoney(24950)).toBe('₹249.50');
  });

  it('treats a missing amount as zero', () => {
    expect(formatMoney(undefined)).toBe('₹0');
  });

  it('formats zero correctly', () => {
    expect(formatMoney(0)).toBe('₹0');
  });
});

describe('unpriced dishes', () => {
  it('treats a zero price as not yet priced', () => {
    expect(isPriced(0)).toBe(false);
    expect(isPriced(undefined)).toBe(false);
    expect(isPriced(null)).toBe(false);
  });

  it('treats any positive price as priced', () => {
    expect(isPriced(1)).toBe(true);
    expect(isPriced(24900)).toBe(true);
  });

  // "₹0" reads as free, which is worse than saying nothing — a dish the owner
  // hasn't priced yet must never look like a giveaway.
  it('never shows a zero price as a money amount', () => {
    expect(formatPrice(0)).toBe('Price on request');
    expect(formatPrice(undefined)).toBe('Price on request');
  });

  it('shows a real price normally', () => {
    expect(formatPrice(24900)).toBe('₹249');
  });
});
