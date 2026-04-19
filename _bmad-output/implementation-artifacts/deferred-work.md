
## Persist all user settings across app restarts
**Source:** review of spec-settings-date-reminder-notif-time
**Finding:** dateFormat, defaultReminderDays, notificationHour (and the pre-existing themeMode) are held only in Zustand in-memory state and reset to defaults on every app restart. Language is the only setting currently persisted (via AsyncStorage in i18n.ts).
**Suggested fix:** Add zustand `persist` middleware with AsyncStorage to `settingsStore`, or save/restore each setting via AsyncStorage in the same pattern as `saveLanguage`.
