import { normalizeTimestamp, normalizeTimestampOrNow } from '@/lib/dateUtils';

// ---------------------------------------------------------------------------
// normalizeTimestamp
// ---------------------------------------------------------------------------

describe('normalizeTimestamp', () => {
  it('returns the same Date instance when given a Date', () => {
    const d = new Date('2025-05-04T10:00:00Z');
    expect(normalizeTimestamp(d)).toEqual(d);
  });

  it('parses ISO strings into Date', () => {
    const result = normalizeTimestamp('2025-05-04T10:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2025-05-04T10:00:00.000Z');
  });

  it('parses numeric epoch ms into Date', () => {
    const ms = 1746352800000; // 2025-05-04T10:00:00Z
    const result = normalizeTimestamp(ms);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toBe(ms);
  });

  it('calls .toDate() on a Firestore Timestamp-like value', () => {
    const expected = new Date('2025-05-04T10:00:00Z');
    const fakeTimestamp = { toDate: () => expected };
    expect(normalizeTimestamp(fakeTimestamp)).toEqual(expected);
  });

  it('returns undefined for null', () => {
    expect(normalizeTimestamp(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeTimestamp(undefined)).toBeUndefined();
  });

  it('prefers .toDate() over Date construction when both could apply', () => {
    // If a value walks like a Timestamp, use it as a Timestamp — don't
    // accidentally `new Date()` an object.
    const tsValue = new Date('2030-01-01');
    const ts = { toDate: () => tsValue };
    expect(normalizeTimestamp(ts)).toEqual(tsValue);
  });
});

// ---------------------------------------------------------------------------
// normalizeTimestampOrNow
// ---------------------------------------------------------------------------

describe('normalizeTimestampOrNow', () => {
  it('returns the input when present', () => {
    const d = new Date('2025-05-04T10:00:00Z');
    expect(normalizeTimestampOrNow(d)).toEqual(d);
  });

  it('returns a Date close to now when value is null', () => {
    const before = Date.now();
    const result = normalizeTimestampOrNow(null);
    const after = Date.now();
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns a Date close to now when value is undefined', () => {
    const before = Date.now();
    const result = normalizeTimestampOrNow(undefined);
    const after = Date.now();
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it('also handles Firestore Timestamp-likes', () => {
    const expected = new Date('2025-05-04');
    const ts = { toDate: () => expected };
    expect(normalizeTimestampOrNow(ts)).toEqual(expected);
  });
});
