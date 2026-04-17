import {
  sortCreditsHome,
  sortCreditsHistory,
  filterActiveCredits,
  filterHistoryCredits,
  dateRangeStart,
} from '@/lib/creditUtils';
import { CreditStatus, type Credit } from '@/types/creditTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'c1',
    userId: 'u1',
    storeName: 'Store',
    amount: 5000,
    category: 'Clothing',
    expirationDate: new Date('2030-12-31'),
    reminderDays: 7,
    status: CreditStatus.ACTIVE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sortCreditsHome
// ---------------------------------------------------------------------------

describe('sortCreditsHome', () => {
  it('sorts by expiration ascending', () => {
    const credits = [
      makeCredit({ id: 'a', expirationDate: new Date('2030-06-01') }),
      makeCredit({ id: 'b', expirationDate: new Date('2030-01-01') }),
      makeCredit({ id: 'c', expirationDate: new Date('2030-12-01') }),
    ];
    const sorted = sortCreditsHome(credits, 'expiration');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by amount descending', () => {
    const credits = [
      makeCredit({ id: 'a', amount: 3000 }),
      makeCredit({ id: 'b', amount: 10000 }),
      makeCredit({ id: 'c', amount: 500 }),
    ];
    const sorted = sortCreditsHome(credits, 'amount');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by storeName ascending (locale)', () => {
    const credits = [
      makeCredit({ id: 'a', storeName: 'Zara' }),
      makeCredit({ id: 'b', storeName: 'Adidas' }),
      makeCredit({ id: 'c', storeName: 'Nike' }),
    ];
    const sorted = sortCreditsHome(credits, 'storeName');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by createdAt descending (most recent first)', () => {
    const credits = [
      makeCredit({ id: 'a', createdAt: new Date('2024-01-01') }),
      makeCredit({ id: 'b', createdAt: new Date('2024-06-01') }),
      makeCredit({ id: 'c', createdAt: new Date('2023-01-01') }),
    ];
    const sorted = sortCreditsHome(credits, 'createdAt');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not mutate the original array', () => {
    const credits = [
      makeCredit({ id: 'a', amount: 100 }),
      makeCredit({ id: 'b', amount: 999 }),
    ];
    const original = [...credits];
    sortCreditsHome(credits, 'amount');
    expect(credits[0].id).toBe(original[0].id);
  });
});

// ---------------------------------------------------------------------------
// sortCreditsHistory
// ---------------------------------------------------------------------------

describe('sortCreditsHistory', () => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  it('sorts by redeemedAt descending (most recent first)', () => {
    const credits = [
      makeCredit({ id: 'a', status: CreditStatus.REDEEMED, redeemedAt: weekAgo }),
      makeCredit({ id: 'b', status: CreditStatus.REDEEMED, redeemedAt: now }),
      makeCredit({ id: 'c', status: CreditStatus.REDEEMED, redeemedAt: dayAgo }),
    ];
    const sorted = sortCreditsHistory(credits, 'redeemedAt');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('puts credits without redeemedAt last when sorting by redeemedAt', () => {
    const credits = [
      makeCredit({ id: 'a', status: CreditStatus.REDEEMED, redeemedAt: undefined }),
      makeCredit({ id: 'b', status: CreditStatus.REDEEMED, redeemedAt: now }),
    ];
    const sorted = sortCreditsHistory(credits, 'redeemedAt');
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('a');
  });

  it('sorts by storeName ascending', () => {
    const credits = [
      makeCredit({ id: 'a', storeName: 'Zara' }),
      makeCredit({ id: 'b', storeName: 'Mango' }),
    ];
    const sorted = sortCreditsHistory(credits, 'storeName');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('sorts by amount descending', () => {
    const credits = [
      makeCredit({ id: 'a', amount: 100 }),
      makeCredit({ id: 'b', amount: 9999 }),
      makeCredit({ id: 'c', amount: 500 }),
    ];
    const sorted = sortCreditsHistory(credits, 'amount');
    expect(sorted.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });
});

// ---------------------------------------------------------------------------
// filterActiveCredits
// ---------------------------------------------------------------------------

describe('filterActiveCredits', () => {
  const credits = [
    makeCredit({ id: 'a', storeName: 'Zara', category: 'Clothing', status: CreditStatus.ACTIVE }),
    makeCredit({ id: 'b', storeName: 'Nike', category: 'Sports', status: CreditStatus.ACTIVE }),
    makeCredit({ id: 'c', storeName: 'Zara', category: 'Clothing', status: CreditStatus.REDEEMED }),
    makeCredit({ id: 'd', storeName: 'Amazon', category: 'Electronics', status: CreditStatus.ACTIVE, notes: 'birthday gift' }),
  ];

  it('excludes REDEEMED credits', () => {
    const result = filterActiveCredits(credits, '', null);
    expect(result.map((c) => c.id)).not.toContain('c');
  });

  it('filters by store name search (case insensitive)', () => {
    const result = filterActiveCredits(credits, 'zara', null);
    expect(result.map((c) => c.id)).toEqual(['a']);
  });

  it('filters by notes search', () => {
    const result = filterActiveCredits(credits, 'birthday', null);
    expect(result.map((c) => c.id)).toEqual(['d']);
  });

  it('filters by category', () => {
    const result = filterActiveCredits(credits, '', 'Sports');
    expect(result.map((c) => c.id)).toEqual(['b']);
  });

  it('combines search and category filter', () => {
    const result = filterActiveCredits(credits, 'za', 'Clothing');
    expect(result.map((c) => c.id)).toEqual(['a']);
  });

  it('returns all active credits when no filters', () => {
    const result = filterActiveCredits(credits, '', null);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when search matches nothing', () => {
    const result = filterActiveCredits(credits, 'xxxnotfound', null);
    expect(result).toHaveLength(0);
  });

  it('ignores whitespace-only search queries', () => {
    const result = filterActiveCredits(credits, '   ', null);
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// filterHistoryCredits
// ---------------------------------------------------------------------------

describe('filterHistoryCredits', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 5);
  const lastYear = new Date(now.getFullYear() - 1, 6, 1);

  const credits = [
    makeCredit({ id: 'a', storeName: 'Zara', category: 'Clothing', status: CreditStatus.REDEEMED, redeemedAt: thisMonth }),
    makeCredit({ id: 'b', storeName: 'Nike', category: 'Sports', status: CreditStatus.REDEEMED, redeemedAt: twoMonthsAgo }),
    makeCredit({ id: 'c', storeName: 'Amazon', category: 'Electronics', status: CreditStatus.REDEEMED, redeemedAt: lastYear }),
    makeCredit({ id: 'd', storeName: 'Active', category: 'Other', status: CreditStatus.ACTIVE }),
  ];

  it('excludes ACTIVE credits', () => {
    const result = filterHistoryCredits(credits, '', 'allTime', []);
    expect(result.map((c) => c.id)).not.toContain('d');
  });

  it('returns all redeemed credits for allTime range', () => {
    const result = filterHistoryCredits(credits, '', 'allTime', []);
    expect(result).toHaveLength(3);
  });

  it('filters to thisMonth range', () => {
    const result = filterHistoryCredits(credits, '', 'thisMonth', []);
    expect(result.map((c) => c.id)).toContain('a');
    expect(result.map((c) => c.id)).not.toContain('b');
    expect(result.map((c) => c.id)).not.toContain('c');
  });

  it('filters to last3Months range', () => {
    const result = filterHistoryCredits(credits, '', 'last3Months', []);
    expect(result.map((c) => c.id)).toContain('a');
    expect(result.map((c) => c.id)).toContain('b');
    expect(result.map((c) => c.id)).not.toContain('c');
  });

  it('filters by category', () => {
    const result = filterHistoryCredits(credits, '', 'allTime', ['Clothing']);
    expect(result.map((c) => c.id)).toEqual(['a']);
  });

  it('filters by search query', () => {
    const result = filterHistoryCredits(credits, 'Nike', 'allTime', []);
    expect(result.map((c) => c.id)).toEqual(['b']);
  });

  it('combines search + category + date range', () => {
    const result = filterHistoryCredits(credits, 'Zara', 'thisMonth', ['Clothing']);
    expect(result.map((c) => c.id)).toEqual(['a']);
  });
});

// ---------------------------------------------------------------------------
// dateRangeStart
// ---------------------------------------------------------------------------

describe('dateRangeStart', () => {
  it('thisMonth returns the 1st of current month', () => {
    const result = dateRangeStart('thisMonth');
    const now = new Date();
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getDate()).toBe(1);
  });

  it('thisYear returns Jan 1 of current year', () => {
    const result = dateRangeStart('thisYear');
    const now = new Date();
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it('allTime returns epoch (Jan 1 1970)', () => {
    const result = dateRangeStart('allTime');
    expect(result.getTime()).toBe(0);
  });

  it('last3Months returns a date ~3 months ago', () => {
    const result = dateRangeStart('last3Months');
    const now = new Date();
    const diffMs = now.getTime() - result.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Should be roughly 90 days ± a day or two for month length variation
    expect(diffDays).toBeGreaterThan(85);
    expect(diffDays).toBeLessThan(95);
  });
});
