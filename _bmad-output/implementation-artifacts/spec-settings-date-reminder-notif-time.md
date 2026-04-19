---
title: 'Add Date Format, Default Reminder, and Notification Time Settings'
type: 'feature'
created: '2026-04-19'
status: 'done'
baseline_commit: '35afe16b88878554ece6e8a91bbc5a1c59c47ccb'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three behavioral values are hardcoded — date display format (`DD/MM/YYYY`), default reminder days (7), and notification fire time (09:00) — giving users no control over them.

**Approach:** Add three new fields to `settingsStore`, expose them in the Settings section of the More screen (each with a bottom sheet picker), and wire each to the code that currently uses the hardcoded value.

## Boundaries & Constraints

**Always:**
- Date format options: `DD/MM/YYYY` and `MM/DD/YYYY` only.
- Default reminder options: the 4 existing presets (1d, 7d, 30d, 90d).
- Notification time options: fixed list of hours — 7, 8, 9, 10, 12, 18, 20 (displayed as "7:00 AM", "9:00 AM", etc., localised per language).
- Settings must persist across app restarts (existing Zustand persist mechanism applies).
- Changing notification time must reschedule all active credit notifications.
- Changing default reminder does NOT retroactively update existing credits — only affects new ones.

**Ask First:**
- If persisting settings requires changes beyond settingsStore (e.g. AsyncStorage key migration), halt and ask.

**Never:**
- Free-text or custom time input — preset list only.
- Retroactively updating reminderDays on existing credits.
- Changing notification minute (always :00).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| User changes date format | Switches to MM/DD/YYYY | All date displays in app update immediately | — |
| User opens Add Credit after setting default reminder to 30d | defaultReminderDays = 30 | Reminder chip pre-selected is "1 Month" | — |
| User changes notification time | Sets to 20:00, has active credits with notifications | All active credit notifications rescheduled to fire at 20:00 on expiry day | Reschedule errors silently swallowed (best-effort) |
| User changes notification time when notifications disabled | notificationsEnabled = false | Setting saved, no reschedule attempted | — |

</frozen-after-approval>

## Code Map

- `src/stores/settingsStore.ts` — add `dateFormat`, `defaultReminderDays`, `notificationHour` fields + setters
- `src/lib/formatDate.ts` — new shared util: reads `dateFormat` from store, formats a `Date`
- `src/app/add-credit.tsx` line 196, 281 — use `settingsStore.defaultReminderDays` as initial state; use shared `formatDate`
- `src/lib/notifications.ts` line 93 — replace hardcoded `9` with `settingsStore.notificationHour`
- `src/app/(tabs)/more.tsx` — add 3 new rows in Settings card + 3 bottom sheet modals
- `src/locales/en.json` + `src/locales/he.json` — add translation keys for new settings UI

## Tasks & Acceptance

**Execution:**
- [x] `src/stores/settingsStore.ts` -- add `dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY'` (default `'DD/MM/YYYY'`), `defaultReminderDays: number` (default `7`), `notificationHour: number` (default `9`) with setters -- extends existing settings model
- [x] `src/lib/formatDate.ts` -- create new file: `export function formatDate(date: Date): string` reads `dateFormat` from store and returns formatted string -- centralises all date formatting
- [x] `src/app/add-credit.tsx` -- replace inline `formatDate` function with import from `@/lib/formatDate`; replace `DEFAULT_REMINDER_DAYS` with `useSettingsStore.getState().defaultReminderDays` as `useState` initial value -- respects user preferences
- [x] `src/lib/notifications.ts` -- replace `expiryTrigger.setHours(9, 0, 0, 0)` with `setHours(useSettingsStore.getState().notificationHour, 0, 0, 0)` -- fires notification at user-chosen time
- [x] `src/app/(tabs)/more.tsx` -- add Date Format row, Default Reminder row, Notification Time row to Settings card; add 3 bottom sheet modals; wire notification time change to `rescheduleAllNotifications` when `notificationsEnabled` is true -- UI surface for all three settings
- [x] `src/locales/en.json` + `src/locales/he.json` -- add keys: `more.dateFormat.*`, `more.defaultReminder.*`, `more.notifTime.*` -- i18n

**Acceptance Criteria:**
- Given the user sets date format to MM/DD/YYYY, when they open Add Credit and pick an expiration date, then the date shown on the button reads MM/DD/YYYY format.
- Given the user sets default reminder to "1 Month", when they open Add Credit for a new credit, then the "1 Month" chip is pre-selected.
- Given the user sets notification time to 20:00, when a credit notification fires, then it fires at 8 PM (verified by checking scheduled notification trigger in Expo dev tools).
- Given notificationsEnabled is false, when the user changes notification time, then no reschedule is attempted.

## Design Notes

**Notification hour display:** Format hours as `HH:00` in 24h for Hebrew locale and `H:00 AM/PM` for English — use `Intl.DateTimeFormat` or simple lookup table.

**Bottom sheet pattern:** Reuse the existing theme/language bottom sheet pattern (radio-list style with checkmark).

## Suggested Review Order

**New data model**

- Single source of truth for three new user preferences
  [`settingsStore.ts:4`](../../src/stores/settingsStore.ts#L4)

**Date formatting logic**

- New shared util reads dateFormat from store; replaces inline function
  [`formatDate.ts:1`](../../src/lib/formatDate.ts#L1)

- add-credit now imports shared formatDate; lazy init reads defaultReminderDays
  [`add-credit.tsx:198`](../../src/app/add-credit.tsx#L198)

**Notification scheduling**

- Expiry trigger hour now reads from store instead of hardcoded 9
  [`notifications.ts:93`](../../src/lib/notifications.ts#L93)

**Settings UI**

- Three new rows wired to bottom sheets in Settings card
  [`more.tsx:387`](../../src/app/(tabs)/more.tsx#L387)

- Three new bottom sheet modals (date format, reminder, notif time)
  [`more.tsx:541`](../../src/app/(tabs)/more.tsx#L541)

**Peripherals**

- Translation keys for all three settings (EN + HE)
  [`en.json:84`](../../src/locales/en.json#L84)

## Verification

**Manual checks:**
- Add Credit: open fresh → reminder pre-selection matches setting.
- Add Credit: pick expiry date → date button label uses chosen format.
- More screen: all 3 new rows appear under Settings, each opens a bottom sheet with correct options and a checkmark on the current value.
- Change notification time → Expo Go notification schedule viewer shows updated trigger time.
