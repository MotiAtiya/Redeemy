/**
 * Converts an agot integer to a display string using the given currency symbol.
 * formatCurrency(5000, '₪') → "₪50.00"
 * formatCurrency(5050, '$') → "$50.50"
 */
export function formatCurrency(agot: number, symbol: string): string {
  return `${symbol}${(agot / 100).toFixed(2)}`;
}

/**
 * Parses a user-typed amount string to agot integer.
 * Returns NaN if the input is not a valid positive number.
 */
export function parseAmountToAgot(input: string): number {
  if (input.trim().startsWith('-')) return NaN;
  const value = parseFloat(input.replace(/[^0-9.]/g, ''));
  if (isNaN(value) || value <= 0) return NaN;
  return Math.round(value * 100);
}
