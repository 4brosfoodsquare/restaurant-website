/** All prices are transported as integer minor units (paise) — never floats. */
export function formatMoney(minorUnits, currency = 'INR') {
  const amount = (minorUnits ?? 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
