
## Verify BigQuery auto-cost integration after data lands

**Source:** Story 18.4 (Admin Dashboard) — Moti enabled BigQuery billing export on 2026-05-03 and the integration code is committed in `redeemy-admin@2cfca0d`.
**Status:** Code ready; needs IAM grant + BigQuery data + manual verification.

**What to do when picked up:**
1. Confirm the service account `firebase-adminsdk-fbsvc@redeemy-39e9b.iam.gserviceaccount.com` has the `BigQuery User` role (covers `BigQuery Job User` + read access). If not granted yet, add it via [IAM Console](https://console.cloud.google.com/iam-admin/iam?project=redeemy-39e9b).
2. Wait for BigQuery billing export data to land (typically 24–48h after enabling).
3. Manually trigger the cron once: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<deployed-url>/api/cron/refresh-cost` (or against `localhost:3000` after `npm run dev`).
4. Expected success: `{"ok":true,"amountUSD":<n>,"updatedBy":"auto:bigquery"}`. The Cost Widget on the dashboard home will show the ⚡ "Auto-updated from BigQuery" tag.
5. If it returns `{"ok":true,"skipped":"no_bigquery_data_yet"}`, data hasn't propagated yet — wait longer.

The Vercel cron is already configured (daily at 02:00 UTC) — once it works manually, production will run automatically every night.

---

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
