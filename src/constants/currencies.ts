export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const DEFAULT_CURRENCY: Currency = {
  code: 'ILS',
  symbol: '₪',
  name: 'Israeli New Shekel',
};

/**
 * Format an agot integer (₪ × 100) into a display string.
 * e.g. formatCurrency(5000) → "₪50.00"
 *
 * Always use this function for display — never store formatted strings.
 */
export function formatCurrency(agot: number): string {
  const amount = agot / 100;
  return `${DEFAULT_CURRENCY.symbol}${amount.toFixed(2)}`;
}

/**
 * Parse a user-typed amount string into agot integer.
 * e.g. parseAmountToAgot("50.75") → 5075
 * Returns NaN if the input is invalid.
 */
export function parseAmountToAgot(input: string): number {
  const parsed = parseFloat(input);
  if (isNaN(parsed) || parsed <= 0) return NaN;
  return Math.round(parsed * 100);
}
