import { formatCurrency, parseAmountToAgot } from '@/lib/formatCurrency';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats whole shekel amounts', () => {
    expect(formatCurrency(5000, '₪')).toBe('₪50.00');
    expect(formatCurrency(100, '₪')).toBe('₪1.00');
    expect(formatCurrency(10000, '₪')).toBe('₪100.00');
  });

  it('formats amounts with agorot', () => {
    expect(formatCurrency(5050, '₪')).toBe('₪50.50');
    expect(formatCurrency(101, '₪')).toBe('₪1.01');
    expect(formatCurrency(999, '₪')).toBe('₪9.99');
  });

  it('formats zero', () => {
    expect(formatCurrency(0, '₪')).toBe('₪0.00');
  });

  it('formats large amounts', () => {
    expect(formatCurrency(100000, '₪')).toBe('₪1000.00');
    expect(formatCurrency(999999, '₪')).toBe('₪9999.99');
  });

  it('uses the provided symbol', () => {
    expect(formatCurrency(5000, '$')).toBe('$50.00');
    expect(formatCurrency(5000, '€')).toBe('€50.00');
    expect(formatCurrency(5000, '£')).toBe('£50.00');
  });

  it('always includes two decimal places', () => {
    expect(formatCurrency(200, '₪')).toMatch(/₪\d+\.\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// parseAmountToAgot
// ---------------------------------------------------------------------------

describe('parseAmountToAgot', () => {
  it('parses whole numbers', () => {
    expect(parseAmountToAgot('50')).toBe(5000);
    expect(parseAmountToAgot('1')).toBe(100);
    expect(parseAmountToAgot('100')).toBe(10000);
  });

  it('parses decimal amounts', () => {
    expect(parseAmountToAgot('50.50')).toBe(5050);
    expect(parseAmountToAgot('1.99')).toBe(199);
    expect(parseAmountToAgot('9.99')).toBe(999);
  });

  it('strips non-numeric characters (e.g. currency symbol)', () => {
    expect(parseAmountToAgot('₪50')).toBe(5000);
    expect(parseAmountToAgot('$100')).toBe(10000);
  });

  it('handles rounding correctly', () => {
    // 0.1 + 0.2 floating point edge case
    expect(parseAmountToAgot('0.10')).toBe(10);
    expect(parseAmountToAgot('0.30')).toBe(30);
  });

  it('returns NaN for zero', () => {
    expect(parseAmountToAgot('0')).toBeNaN();
  });

  it('returns NaN for negative values', () => {
    expect(parseAmountToAgot('-50')).toBeNaN();
  });

  it('returns NaN for empty string', () => {
    expect(parseAmountToAgot('')).toBeNaN();
  });

  it('returns NaN for non-numeric strings', () => {
    expect(parseAmountToAgot('abc')).toBeNaN();
    expect(parseAmountToAgot('--')).toBeNaN();
  });

  it('is reversible with formatCurrency', () => {
    const original = 7550;
    const formatted = formatCurrency(original, '₪'); // '₪75.50'
    const stripped = formatted.replace('₪', '');
    expect(parseAmountToAgot(stripped)).toBe(original);
  });
});
