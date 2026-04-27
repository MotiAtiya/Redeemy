
## ~~Persist all user settings across app restarts~~ ✅ RESOLVED

**Source:** review of spec-settings-date-reminder-notif-time
**Finding:** dateFormat, defaultReminderDays, notificationHour (and the pre-existing themeMode) were held only in Zustand in-memory state and reset to defaults on every app restart.
**Resolution:** `settingsStore` now uses Zustand `persist` middleware with AsyncStorage. All settings (theme, language, currency, dateFormat, reminder defaults, notification times, onboarding flag) survive app restarts.
