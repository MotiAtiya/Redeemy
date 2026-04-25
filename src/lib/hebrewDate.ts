import { HDate } from '@hebcal/core';

// ---------------------------------------------------------------------------
// Hebrew numerals (gematria)
// ---------------------------------------------------------------------------

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

/**
 * Converts an integer to Hebrew letter numerals (gematria).
 * Handles special cases 15=טו, 16=טז to avoid writing God's name.
 * Supports values up to 9999.
 */
export function toHebrewNumerals(num: number): string {
  let result = '';
  let n = num;

  // Thousands (1–9)
  if (n >= 1000) {
    result += ONES[Math.floor(n / 1000)];
    n = n % 1000;
  }

  // Hundreds
  if (n >= 100) {
    result += HUNDREDS[Math.floor(n / 100)];
    n = n % 100;
  }

  // Special cases to avoid writing divine names
  if (n === 15) return result + 'טו';
  if (n === 16) return result + 'טז';

  // Tens
  if (n >= 10) {
    result += TENS[Math.floor(n / 10)];
    n = n % 10;
  }

  // Ones
  result += ONES[n];

  return result;
}

// ---------------------------------------------------------------------------
// Hebrew month names
// ---------------------------------------------------------------------------

const HEBREW_MONTHS: Record<number, string> = {
  1: 'ניסן',
  2: 'אייר',
  3: 'סיוון',
  4: 'תמוז',
  5: 'אב',
  6: 'אלול',
  7: 'תשרי',
  8: 'חשוון',
  9: 'כסלו',
  10: 'טבת',
  11: 'שבט',
  12: 'אדר א׳',
  13: 'אדר ב׳',
};

/**
 * In @hebcal/core, in a non-leap year the single Adar is month 13 (ADAR_II).
 * In a leap year, month 12 = Adar I, month 13 = Adar II.
 */
function hebrewMonthName(month: number, isLeap: boolean): string {
  if (month === 13 && !isLeap) return 'אדר';
  return HEBREW_MONTHS[month] ?? '';
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Converts a Gregorian date to a Hebrew date.
 * If afterSunset is true, adds one day before converting (the Hebrew day
 * starts at nightfall the previous evening).
 */
export function toHebrewDate(gregorianDate: Date, afterSunset: boolean): HDate {
  if (afterSunset) {
    const next = new Date(gregorianDate);
    next.setDate(next.getDate() + 1);
    return new HDate(next);
  }
  return new HDate(gregorianDate);
}

/**
 * Returns a human-readable Hebrew date string, e.g. "יד בניסן התשפד".
 * Day and year are rendered as Hebrew letter numerals.
 */
export function formatHebrewDate(hdate: HDate): string {
  const day = hdate.getDate();
  const month = hdate.getMonth();
  const year = hdate.getFullYear();
  const isLeap = HDate.isLeapYear(year);
  const monthName = hebrewMonthName(month, isLeap);
  const dayStr = toHebrewNumerals(day);
  const yearStr = toHebrewNumerals(year);
  return `${dayStr} ב${monthName} ${yearStr}`;
}

// ---------------------------------------------------------------------------
// Next occurrences
// ---------------------------------------------------------------------------

/**
 * Returns the next `count` Gregorian dates on which the Hebrew date
 * (hebrewDay / hebrewMonth) falls, starting from tomorrow.
 *
 * Skips years where the Hebrew date doesn't exist (e.g. Adar I in non-leap year).
 */
export function getNextHebrewOccurrences(
  hebrewDay: number,
  hebrewMonth: number,
  count: number = 5,
): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayHeb = new HDate(today);

  const results: Date[] = [];
  let hebrewYear = todayHeb.getFullYear();

  while (results.length < count) {
    try {
      const candidate = new HDate(hebrewDay, hebrewMonth, hebrewYear);
      const greg = candidate.greg();
      greg.setHours(0, 0, 0, 0);
      if (greg > today) results.push(greg);
    } catch {
      // Skip invalid Hebrew date (e.g., Adar I in non-leap year)
    }
    hebrewYear++;
  }
  return results;
}

/**
 * Returns the next `count` Gregorian dates that match the given
 * month/day (Gregorian, 0-indexed month) each year.
 */
export function getNextGregorianOccurrences(
  month: number,
  day: number,
  count: number = 5,
): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: Date[] = [];
  let year = today.getFullYear();

  while (results.length < count) {
    const candidate = new Date(year, month, day);
    candidate.setHours(0, 0, 0, 0);
    if (candidate > today) results.push(candidate);
    year++;
  }
  return results;
}

/**
 * Returns the single next occurrence date for display/scheduling.
 */
export function nextOccurrenceDate(
  eventDate: Date,
  useHebrewDate: boolean,
  hebrewDay?: number,
  hebrewMonth?: number,
): Date {
  if (useHebrewDate && hebrewDay != null && hebrewMonth != null) {
    const occ = getNextHebrewOccurrences(hebrewDay, hebrewMonth, 1);
    return occ[0] ?? new Date();
  }
  const occ = getNextGregorianOccurrences(eventDate.getMonth(), eventDate.getDate(), 1);
  return occ[0] ?? new Date();
}

/**
 * Days from today until the next occurrence (can be 0 = today).
 */
export function daysUntilNextOccurrence(
  eventDate: Date,
  useHebrewDate: boolean,
  hebrewDay?: number,
  hebrewMonth?: number,
): number {
  const next = nextOccurrenceDate(eventDate, useHebrewDate, hebrewDay, hebrewMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
