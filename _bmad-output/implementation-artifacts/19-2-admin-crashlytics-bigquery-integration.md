# Story 19.2: Admin — Crashlytics via BigQuery

**Epic:** 19 — Admin Dashboard V1.5 quick wins
**Story Key:** 19-2-admin-crashlytics-bigquery-integration
**Author:** Moti
**Date:** 2026-05-04
**Status:** planned

---

## User Story

As Moti looking at the Health Banner,
I want it to surface real Crashlytics data — crash-free user %, top crash signatures — sourced from the BigQuery export I already enabled,
So that the banner becomes genuinely meaningful rather than just signalling on event-log errors.

---

## Background & Context

In Story 18.3 we built the Health Banner, but Crashlytics integration was deferred because Firebase's public REST API doesn't expose crash-free metrics. Now that BigQuery billing-export is set up (Story 18.4 follow-up), we know BigQuery + service account access works in this project. The same approach extends to **Crashlytics → BigQuery export** which Firebase supports as a separate toggle.

This story:
1. Asks the user to enable Crashlytics→BigQuery export (separate from billing).
2. Adds a BigQuery query that returns crash-free user % and top crash signatures for the last 24h / 7d.
3. Wires the result into the existing `<HealthBanner />` so its variant calculation includes Crashlytics signals.

**What this story does NOT do:**
- Drill-down to a specific crash report (would need stack-trace storage)
- Per-user crash history
- Crash trend charts (V2)
- Real-time crash alerts (Story for V2)

---

## Acceptance Criteria

### Setup (one-time, by Moti)

**Given** Moti opens [Firebase Console → Crashlytics → Settings (gear icon) → BigQuery](https://console.firebase.google.com/project/redeemy-39e9b/crashlytics)
**When** he enables the BigQuery export and chooses dataset `firebase_crashlytics` (default name) in project `redeemy-39e9b`
**Then** Firebase starts streaming crash data into BigQuery (initial lag 24–48h is normal).

⚠️ This is a different toggle from Billing→BigQuery. Both are supported simultaneously.

### Code

**Given** the dataset has data
**When** the dashboard renders any page
**Then** `<HealthBanner />` includes new Crashlytics signals:
- `crashFreeUsers24h` (number 0-100, or null)
- `crashFreeUsers7d` (number 0-100, or null)
- `topCrashSignatures` — array of `{ signature, userCount, latestOccurrence }` (top 5)

**And** the variant logic is updated:
- 🔴 **Red:** crash-free 24h < 95%
- 🟠 **Orange:** crash-free 24h between 95–99%
- (existing thresholds for events/errors stay)

**And** the expanded banner now shows:
- Crash-free user % (24h, 7d) with a simple trend arrow
- Top 5 crash signatures with affected-user counts

### Graceful fallback

**Given** the BigQuery dataset doesn't exist yet (export not enabled or warming up)
**When** `<HealthBanner />` queries Crashlytics
**Then** the call returns `null` for crash data; banner falls back to existing event-based logic; no error to user.

### Local dev parity

**Given** I'm running `npm run dev` locally
**When** the banner queries Crashlytics
**Then** it works using the same service-account credentials in `.env.local`.

### Quality

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Verified locally: trigger a forced crash from a dev mobile build → see the count appear in BigQuery the next day → see the banner go orange/red

---

## Technical Notes

### Files

```
src/lib/crashlytics.ts        # NEW — getCrashlyticsSnapshot()
src/lib/health.ts             # UPDATE — pull Crashlytics into snapshot
src/components/HealthBanner.tsx          # UPDATE — render new fields
src/components/HealthBannerExpanded.tsx  # UPDATE — show signatures
messages/{he,en}.json         # UPDATE — health.details.crashFreeUsers24h etc.
.env.example / .env.local     # UPDATE — CRASHLYTICS_DATASET=firebase_crashlytics
```

### `lib/crashlytics.ts` skeleton

```typescript
import { BigQuery } from '@google-cloud/bigquery';

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
const DATASET = process.env.CRASHLYTICS_DATASET ?? 'firebase_crashlytics';

export interface CrashSignature {
  signature: string;
  userCount: number;
  latestOccurrence: number;
}

export async function getCrashlyticsSnapshot() {
  // Returns { crashFreeUsers24h: number|null, crashFreeUsers7d: number|null, topCrashSignatures: CrashSignature[] }
  // Returns nulls / [] gracefully when dataset is missing.
}
```

### BigQuery query (rough sketch — verify schema)

Crashlytics export schema typically includes fields like:
- `event_timestamp`
- `user_pseudo_id` / `installation_uuid`
- `app.bundle_short_version`
- `is_fatal`
- `exceptions` (repeated record)
- `issue.title`, `issue.subtitle`

Sample crash-free %:
```sql
WITH users_in_period AS (
  SELECT installation_uuid,
         MAX(IF(is_fatal, 1, 0)) AS had_crash
  FROM `redeemy-39e9b.firebase_crashlytics.<auto-table>`
  WHERE event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  GROUP BY installation_uuid
)
SELECT
  ROUND(100 * SUM(IF(had_crash = 0, 1, 0)) / COUNT(*), 2) AS crash_free_pct
FROM users_in_period;
```

The exact table name uses `*` wildcard (Firebase creates per-app tables). Confirm at implementation time by inspecting the dataset.

### Health variant update

In `lib/health.ts` `computeVariant`:
```typescript
if (crashFree24h !== null && crashFree24h < 95) return 'red';
if (crashFree24h !== null && crashFree24h < 99) return 'orange';
// existing event-error checks
```

### Caching

In-memory cache for 5 minutes (same pattern as we considered originally). Not strictly needed at 3 users but useful as the call grows.

---

## Dependencies / Sequencing

- **Hard dependency:** Crashlytics→BigQuery export enabled by Moti and 24–48h of warm-up.
- **No mobile-app changes.**

---

## Done Definition

- [ ] All AC pass
- [ ] Crashlytics export enabled
- [ ] Banner shows real crash-free % when there are crashes; otherwise stays green
- [ ] No error to UI when BigQuery dataset is missing (graceful fallback verified)
