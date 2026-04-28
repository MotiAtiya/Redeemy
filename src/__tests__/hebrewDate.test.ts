import {
  toHebrewNumerals,
  toHebrewDate,
  formatHebrewDate,
  getNextGregorianOccurrences,
  getNextHebrewOccurrences,
  nextOccurrenceDate,
  daysUntilNextOccurrence,
} from '@/lib/hebrewDate';

// ---------------------------------------------------------------------------
// Mock @hebcal/core — it ships as ESM and can't be resolved by Jest directly
// ---------------------------------------------------------------------------

jest.mock(
  '@hebcal/core',
  () => {
    class MockHDate {
      private _day: number;
      private _month: number;
      private _year: number;
      private _gregDate: Date;

      constructor(dateOrDay: Date | number, month?: number, year?: number) {
        if (dateOrDay instanceof Date) {
          // Gregorian → Hebrew: hardcoded as 14 Nisan 5784 for any input Date
          this._day = 14;
          this._month = 1;
          this._year = 5784;
          this._gregDate = new Date(dateOrDay);
        } else {
          this._day = dateOrDay as number;
          this._month = month ?? 1;
          this._year = year ?? 5784;
          // Hebrew → Gregorian: always a future date so it passes the > today check
          this._gregDate = new Date(Date.now() + 365 * 86_400_000);
        }
      }
      getDate() { return this._day; }
      getMonth() { return this._month; }
      getFullYear() { return this._year; }
      greg() { return new Date(this._gregDate); }

      static isLeapYear(_year: number) { return false; }
    }
    return { HDate: MockHDate };
  },
  { virtual: true },
);

// ---------------------------------------------------------------------------
// toHebrewNumerals
// ---------------------------------------------------------------------------

describe('toHebrewNumerals', () => {
  it.each([
    [1,   'א'],
    [5,   'ה'],
    [9,   'ט'],
    [10,  'י'],
    [14,  'יד'],
    [20,  'כ'],
    [100, 'ק'],
    [400, 'ת'],
    [500, 'תק'],
  ])('converts %i to %s', (num, expected) => {
    expect(toHebrewNumerals(num)).toBe(expected);
  });

  it('converts 15 to טו (avoids writing God\'s name)', () => {
    expect(toHebrewNumerals(15)).toBe('טו');
  });

  it('converts 16 to טז (avoids writing God\'s name)', () => {
    expect(toHebrewNumerals(16)).toBe('טז');
  });

  it('converts 5784 to התשפד', () => {
    expect(toHebrewNumerals(5784)).toBe('התשפד');
  });

  it('converts 5785 to התשפה', () => {
    expect(toHebrewNumerals(5785)).toBe('התשפה');
  });
});

// ---------------------------------------------------------------------------
// toHebrewDate
// ---------------------------------------------------------------------------

describe('toHebrewDate', () => {
  it('returns an object with getDate/getMonth/getFullYear when afterSunset=false', () => {
    const hdate = toHebrewDate(new Date(2024, 3, 22), false);
    expect(hdate.getDate()).toBe(14);
    expect(hdate.getMonth()).toBe(1);
    expect(hdate.getFullYear()).toBe(5784);
  });

  it('passes a date one day later to HDate when afterSunset=true', () => {
    // Verify our code adds one day before calling HDate
    const base = new Date(2024, 3, 22, 12, 0, 0);
    const result = toHebrewDate(base, true);
    // The mock records the passed date on _gregDate; verify it was April 23
    expect((result as unknown as { _gregDate: Date })._gregDate.getDate()).toBe(23);
  });
});

// ---------------------------------------------------------------------------
// formatHebrewDate
// ---------------------------------------------------------------------------

describe('formatHebrewDate', () => {
  it('formats an HDate as "day בmonth year" in Hebrew', () => {
    const hdate = toHebrewDate(new Date(2024, 3, 22), false); // 14 Nisan 5784
    const formatted = formatHebrewDate(hdate);
    // 14 → יד, Nisan = ניסן, 5784 → התשפד
    expect(formatted).toBe('יד בניסן התשפד');
  });
});

// ---------------------------------------------------------------------------
// getNextGregorianOccurrences
// ---------------------------------------------------------------------------

describe('getNextGregorianOccurrences', () => {
  it('returns the requested count of dates', () => {
    expect(getNextGregorianOccurrences(0, 15, 5)).toHaveLength(5);
    expect(getNextGregorianOccurrences(5, 20, 3)).toHaveLength(3);
  });

  it('defaults to count=5', () => {
    expect(getNextGregorianOccurrences(0, 1)).toHaveLength(5);
  });

  it('all returned dates are strictly in the future', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const d of getNextGregorianOccurrences(5, 15, 5)) {
      expect(d.getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it('returned dates have the correct month and day', () => {
    for (const d of getNextGregorianOccurrences(5, 15, 3)) {
      expect(d.getMonth()).toBe(5);  // June (0-indexed)
      expect(d.getDate()).toBe(15);
    }
  });

  it('increments year for each occurrence', () => {
    const results = getNextGregorianOccurrences(3, 10, 3); // April 10
    expect(results[1].getFullYear()).toBe(results[0].getFullYear() + 1);
    expect(results[2].getFullYear()).toBe(results[0].getFullYear() + 2);
  });
});

// ---------------------------------------------------------------------------
// getNextHebrewOccurrences
// ---------------------------------------------------------------------------

describe('getNextHebrewOccurrences', () => {
  it('returns the requested count', () => {
    expect(getNextHebrewOccurrences(1, 7, 3)).toHaveLength(3);
  });

  it('defaults to count=5', () => {
    expect(getNextHebrewOccurrences(1, 7)).toHaveLength(5);
  });

  it('all returned dates are in the future', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const d of getNextHebrewOccurrences(1, 7, 3)) {
      expect(d.getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it('returns Date objects', () => {
    for (const d of getNextHebrewOccurrences(10, 7, 2)) {
      expect(d).toBeInstanceOf(Date);
    }
  });
});

// ---------------------------------------------------------------------------
// nextOccurrenceDate
// ---------------------------------------------------------------------------

describe('nextOccurrenceDate', () => {
  it('returns a future date for a Gregorian event', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = nextOccurrenceDate(new Date(1990, 5, 15), false);
    expect(result.getTime()).toBeGreaterThan(today.getTime());
  });

  it('preserves the Gregorian month and day', () => {
    const result = nextOccurrenceDate(new Date(2000, 2, 20), false);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(20);
  });

  it('returns a future date for a Hebrew event', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = nextOccurrenceDate(new Date(1990, 0, 1), true, 1, 7);
    expect(result.getTime()).toBeGreaterThan(today.getTime());
  });

  it('uses Gregorian path when useHebrewDate=false even if hebrewDay/Month are provided', () => {
    const result = nextOccurrenceDate(new Date(2000, 0, 15), false, 1, 7);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// daysUntilNextOccurrence
// ---------------------------------------------------------------------------

describe('daysUntilNextOccurrence', () => {
  it('returns a positive integer', () => {
    const days = daysUntilNextOccurrence(new Date(1990, 0, 1), false);
    expect(days).toBeGreaterThan(0);
    expect(Number.isInteger(days)).toBe(true);
  });

  it('returns a positive integer for Hebrew mode', () => {
    const days = daysUntilNextOccurrence(new Date(1990, 5, 1), true, 1, 7);
    expect(days).toBeGreaterThan(0);
  });
});
