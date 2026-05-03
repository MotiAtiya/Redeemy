
## Auto-expire flows for warranties / subscriptions / documents (lifecycle events)

**Source:** Story 18.2 review — Moti's feedback during admin-dashboard build (2026-05-03).
**Status:** Deferred. Add as a small follow-up Story (proposed: 18.5 or 19.1) once Epic 18 V1 is fully shipped.

**Background:** Story 18.2 added a `credit_expired` event because `subscribeToCredits` already auto-ticks an active credit to `EXPIRED` past its `expirationDate`. The other categories don't have an equivalent flow today, even though the UI shows them as "expired":

- **Warranty** — `WarrantyStatus.EXPIRED` exists in the enum but the in-code comment marks it as *"reserved for future Firestore-side expiry jobs (not used client-side)."* The doc stays `ACTIVE` after the warranty period ends.
- **Subscription** — no `EXPIRED` status; the enum is `ACTIVE | CANCELLED`. A subscription that should "end" today (e.g., committed period ends) has no lifecycle marker.
- **Document** — has `expirationDate` but no auto-expire flow.

**What to build:**
1. In `subscribeToWarranties` (`src/lib/firestoreWarranties.ts`): mirror the credits auto-expire — when `expirationDate` is in the past and status is ACTIVE, write `{ status: EXPIRED, expiredAt }` with `{ silent: true }` then `void logEvent('warranty_expired', { itemCategory: 'warranty', itemId })`.
2. In `subscribeToDocuments` (`src/lib/firestoreDocuments.ts`): same pattern. Decide whether documents need a status enum at all (today they don't) — could just emit the event without a status change, or add `DocumentStatus.EXPIRED`.
3. Decide on subscription semantics — does an "expired subscription" make sense alongside CANCELLED? If yes, add `SubscriptionStatus.EXPIRED` and an auto-tick from `commitmentEndDate` past.
4. Add the new `EventType` values: `warranty_expired`, `document_expired`, optionally `subscription_expired`.
5. Wire the admin dashboard: extend the EventType union in `redeemy-admin/src/lib/events.ts`, add icons + i18n strings to `(app)/activity/page.tsx`, `messages/he.json`, `messages/en.json`.
6. Story 18.3's Health Banner / count widgets should treat "expired" as not-active (already does via `STATUS_FILTERED` in `users.ts`).

**Estimated effort:** 30–45 min once we touch it.

---

## ~~Persist all user settings across app restarts~~ ✅ RESOLVED

**Source:** review of spec-settings-date-reminder-notif-time
**Finding:** dateFormat, defaultReminderDays, notificationHour (and the pre-existing themeMode) were held only in Zustand in-memory state and reset to defaults on every app restart.
**Resolution:** `settingsStore` now uses Zustand `persist` middleware with AsyncStorage. All settings (theme, language, currency, dateFormat, reminder defaults, notification times, onboarding flag) survive app restarts.
