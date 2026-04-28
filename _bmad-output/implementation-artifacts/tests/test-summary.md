# Test Automation Summary

**Generated:** 2026-04-28
**Framework:** Jest 29 + jest-expo

---

## Generated Tests

### Unit Tests

| File | Tests | Coverage Target |
|------|-------|----------------|
| `src/__tests__/hebrewDate.test.ts` | 31 | `src/lib/hebrewDate.ts` |
| `src/__tests__/subscriptionNotifications.test.ts` | 29 | `src/lib/subscriptionNotifications.ts` |
| `src/__tests__/occasionNotifications.test.ts` | 17 | `src/lib/occasionNotifications.ts` |

**Total new tests: 77** — all passing.

---

## Coverage by Module

### `hebrewDate.ts` — 31 tests

- `toHebrewNumerals`: digit/tens/hundreds/thousands conversions, special cases 15 (טו) and 16 (טז) to avoid writing God's name, compound values (5784=התשפד)
- `toHebrewDate`: Gregorian→Hebrew conversion, afterSunset=true shifts input by +1 day
- `formatHebrewDate`: Hebrew date formatted as "day בmonth year" (14 Nisan 5784 → "יד בניסן התשפד")
- `getNextGregorianOccurrences`: count, future-only constraint, correct month/day, year increment
- `getNextHebrewOccurrences`: count, future-only, Date object return type
- `nextOccurrenceDate`: Gregorian path, Hebrew path, fallback when hebrewDay/Month missing
- `daysUntilNextOccurrence`: positive integer for both Gregorian and Hebrew modes

**Note:** `@hebcal/core` is mocked with `{ virtual: true }` because the package ships as ESM and Jest cannot resolve it without Babel transformation. The mock provides a `MockHDate` class that accurately simulates Gregorian↔Hebrew conversions for test purposes.

### `subscriptionNotifications.ts` — 29 tests

- **Guard conditions:** notificationsEnabled=false, permission denied → empty result
- **Periodic review (free / monthly-no-fixed):** schedules 1 review reminder; early return prevents billing reminders; `hasFixedPeriod: undefined` does NOT trigger periodic review path
- **Auto renewal:** N-days-before + renewal notification; subscriptionLastDayAlert=false omits renewal ID; subscriptionReminderDays=0 skips advance reminder
- **Manual renewal:** N-days-before + 1-day-before reminders; subscriptionReminderDays=0 schedules only 1-day-before
- **Monthly fixed commitment:** uses `commitmentEndDate` as anchor (not `getNextBillingDate`); accepts ISO string dates (Firestore serialization)
- **Special period:** reminderSpecialPeriodEnabled=true schedules specialPeriodNotificationId; 7 days before for months-based; min(floor(days/2), 3) for day-based; minimum 1 day
- **cancelSubscriptionNotifications:** cancels all IDs, renewalNotificationId, specialPeriodNotificationId; handles empty arrays
- **getSubscriptionIdFromNotification:** extracts ID when type=subscription; null for wrong type/missing data
- **isRenewalPromptNotification:** detects notificationType=renewal and intent=renew; false for non-subscription type

### `occasionNotifications.ts` — 17 tests

- **buildOccasionTitle:** correct i18n key for each occasion type (birthday/anniversary/yahrzeit/other)
- **Guard conditions:** notificationsEnabled=false, permission denied, both alert flags off → empty result
- **Gregorian scheduling:** 5 on-day notifications; 10 notifications when early reminder enabled; 5 early-only when on-day disabled; correct month/day passed to getNextGregorianOccurrences
- **Hebrew calendar:** uses getNextHebrewOccurrences with correct day/month/count; falls back to Gregorian when hebrewDay/Month are undefined
- **cancelOccasionNotifications:** cancels all IDs; no-op for empty array; no-op for undefined

---

## Pre-existing Test Suite State

| File | Status | Notes |
|------|--------|-------|
| `subscriptionUtils.test.ts` | ✅ Pass | 34 tests |
| `creditUtils.test.ts` | ✅ Pass | passing |
| `validation.test.ts` | ✅ Pass | passing |
| `formatCurrency.test.ts` | ✅ Pass | passing |
| `notifications.test.ts` | ❌ Pre-existing fail | `@react-native-async-storage` import issue in test environment |

Total suite: **176 tests passing**, 1 pre-existing failing suite (not introduced here).

---

## Next Steps

- Run tests in CI (`npm run test:ci`)
- Fix pre-existing `notifications.test.ts` failure (AsyncStorage mock setup)
- Consider adding integration tests for Firestore operations if a local emulator is available
