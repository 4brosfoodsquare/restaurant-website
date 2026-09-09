/** All prices are transported as integer minor units (paise) — never floats. */
export function formatMoney(minorUnits, currency = 'INR') {
  const amount = (minorUnits ?? 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/**
 * A dish seeded before the restaurant has set its price carries 0, which must
 * never reach a customer as "₹0" — that reads as free. Such a dish isn't
 * orderable online either; the storefront asks the customer to call instead,
 * and the moment a real price is entered in Admin → Menu it behaves normally.
 */
export function isPriced(minorUnits) {
  return typeof minorUnits === 'number' && minorUnits > 0;
}

export function formatPrice(minorUnits) {
  return isPriced(minorUnits) ? formatMoney(minorUnits) : 'Price on request';
}
