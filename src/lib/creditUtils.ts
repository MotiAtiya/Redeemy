import { CreditStatus, type Credit } from '@/types/creditTypes';

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export type HomeSortKey = 'expiration' | 'amount' | 'storeName' | 'createdAt';
export type HistorySortKey = 'redeemedAt' | 'storeName' | 'amount';
export type HistoryDateRange = 'thisMonth' | 'last3Months' | 'thisYear' | 'allTime';

export function sortCreditsHome(credits: Credit[], key: HomeSortKey): Credit[] {
  return [...credits].sort((a, b) => {
    switch (key) {
      case 'expiration':
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      case 'amount':
        return b.amount - a.amount;
      case 'storeName':
        return a.storeName.localeCompare(b.storeName);
      case 'createdAt':
        return new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime();
    }
  });
}

export function sortCreditsHistory(credits: Credit[], key: HistorySortKey): Credit[] {
  return [...credits].sort((a, b) => {
    switch (key) {
      case 'redeemedAt': {
        const aT = a.redeemedAt ? new Date(a.redeemedAt as Date).getTime() : 0;
        const bT = b.redeemedAt ? new Date(b.redeemedAt as Date).getTime() : 0;
        return bT - aT;
      }
      case 'storeName':
        return a.storeName.localeCompare(b.storeName);
      case 'amount':
        return b.amount - a.amount;
    }
  });
}

// ---------------------------------------------------------------------------
// Filter by date range (history screen)
// ---------------------------------------------------------------------------

export function dateRangeStart(range: HistoryDateRange): Date {
  const now = new Date();
  switch (range) {
    case 'thisMonth':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'last3Months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case 'thisYear':
      return new Date(now.getFullYear(), 0, 1);
    case 'allTime':
      return new Date(0);
  }
}

export function filterHistoryCredits(
  credits: Credit[],
  searchQuery: string,
  dateRange: HistoryDateRange,
  selectedCategories: string[]
): Credit[] {
  const rangeStart = dateRangeStart(dateRange);
  let result = credits.filter((c) => c.status === CreditStatus.REDEEMED);

  result = result.filter((c) => {
    if (!c.redeemedAt) return false;
    return new Date(c.redeemedAt as Date) >= rangeStart;
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (c) =>
        c.storeName.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
    );
  }

  if (selectedCategories.length > 0) {
    result = result.filter((c) => selectedCategories.includes(c.category));
  }

  return result;
}

export function filterActiveCredits(
  credits: Credit[],
  searchQuery: string,
  selectedCategory: string | null
): Credit[] {
  let result = credits.filter((c) => c.status === CreditStatus.ACTIVE);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (c) =>
        c.storeName.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
    );
  }

  if (selectedCategory) {
    result = result.filter((c) => c.category === selectedCategory);
  }

  return result;
}
