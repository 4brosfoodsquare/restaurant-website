import { describe, it, expect } from 'vitest';
import { formatMoney } from '../money.js';

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
