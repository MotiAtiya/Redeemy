# Story 18.3: Admin Dashboard — Health Banner & Cost Widget

**Epic:** 18 — Admin Dashboard
**Story Key:** 18-3-admin-dashboard-health-banner-and-cost-widget
**Author:** Moti
**Date:** 2026-05-03
**Status:** done

---

## User Story

As Moti opening the admin dashboard,
I want a health banner that's silent when everything is fine and red when something is broken, plus a cost widget showing my current Firebase spend,
So that I can immediately know if anything needs attention and stay aware of my unit economics — without having to dig through Crashlytics or Firebase Console.

---

## Background & Context

This story adds **two operational-awareness components** to the admin dashboard:

1. **Health Status Banner** — a top-of-page strip that's quietly green when all is well, orange on warnings, red on incidents. Surfaces top crashes (from Crashlytics) and recent failures (from the `events/` collection added in Story 18.2). Implements the "reverse-dashboard" principle from brainstorming: silent until something matters.

2. **Cost Widget** — a card on the home page showing current-month Firebase spend, cost-per-active-user, and a projection at 10× current users. Bakes unit-economics awareness into Moti's daily glance, since he's a bootstrapped solo founder.

**Open question deferred from tech spec — recommended default:** GCP Billing API setup is involved; for V1 we use a manual fallback (an env var `MANUAL_FIREBASE_COST_USD` or a simple admin-editable Firestore doc). Auto-fetch from GCP Billing API is upgraded to V2.

**What this story does NOT implement:**
- Daily Digest Email (Story 18.4)
- Mobile responsive polish (Story 18.4)
- Anomaly detection (V2)
- Push alerts to phone (V3)
- Per-user crash drill-down (V2)
- Historical cost charts (V2)

---

## Acceptance Criteria

### Health Status Banner — Component

**Given** Moti is on any page in the admin dashboard
**When** the page renders
**Then**:
- A `<HealthBanner />` component renders above the page content (under the top bar, full-width)
- The banner shows one of three states:
  - **✅ Green** — "All systems normal" (compact, subtle)
  - **🟠 Orange** — "Issues detected" with a brief summary (e.g. "3 auth failures in last 24h")
  - **🔴 Red** — "Critical issue" with severity indicator and short summary (e.g. "Crash-free users <95%")
- Clicking the banner expands it to show details (top crash signatures, recent error events, affected users)
- The banner is rendered server-side; underlying data refreshes every 60 seconds (`revalidate = 60` on the layout segment)

### Health Status Banner — Logic

**Given** the banner is computing its state
**When** it polls data sources
**Then** the state is computed from these inputs:

1. **Crashlytics integration:**
   - Last 24h crash-free user % (Firebase Crashlytics REST API, scoped to the Redeemy app)
   - Top 5 crash signatures with affected-user counts
   - If REST API access is not yet set up: gracefully fall back to "Crashlytics: not configured" warning state, instructions in tooltip
2. **Recent error events** from `events/` collection (last 24h):
   - Count of `auth_failed` events
   - Count of `firestore_write_failed` events
   - Count of `image_upload_failed` events
3. **Status thresholds:**
   - 🔴 Red: crash-free <95% **OR** ≥10 auth_failed events in last hour **OR** ≥5 firestore_write_failed in last hour
   - 🟠 Orange: crash-free 95-99% **OR** ≥5 auth_failed in 24h **OR** any firestore_write_failed in 24h
   - ✅ Green: otherwise
4. **Visual treatment:**
   - Green: subtle Sage-100 background, small text, no border
   - Orange: amber-100 background with amber-500 left border (RTL-aware: use `border-s-4`)
   - Red: red-100 background with red-500 left border, slight shake animation on first render

**And** clicking the banner header toggles an expanded view that shows:
- Crash-free user % (last 24h, last 7d) with trend arrow
- Top 5 crash signatures (signature, user count, latest occurrence) — clickable to copy signature for searching in Crashlytics
- Recent error events table (last 20 errors) with link to `/activity?filter=errors`

### Crashlytics Integration

**Given** the Firebase service account has Crashlytics permissions
**When** the server fetches Crashlytics data
**Then**:
- A new lib file `src/lib/crashlytics.ts` exports:
  ```typescript
  export async function getCrashFreeUsers(periodDays: 1 | 7): Promise<number | null>;
  export async function getTopCrashSignatures(limit: number): Promise<CrashSignature[]>;
  ```
- Authentication uses the same Firebase service account from Story 18.1
- Implementation uses the Crashlytics REST API directly (`https://firebasecrashlytics.googleapis.com`) with an access token from `google-auth-library`
- Results are cached in-memory for 5 minutes (server-side) to avoid rate-limiting
- If API access fails (permission, rate limit, network), functions return `null` and the banner falls back gracefully

**And** if Crashlytics REST access is not yet provisioned, the implementation **must not crash the page** — it logs a server warning and the banner shows "Crashlytics: not configured" with link to setup instructions in README.

### Cost Widget — Component

**Given** Moti is on the home page
**When** the page renders
**Then**:
- A `<CostWidget />` card renders alongside the existing summary cards from Story 18.2
- The card displays:
  - **Hero number:** current month spend in USD (e.g. "$2.40")
  - **Sub-label:** "Firebase spend this month"
  - **Sub-row 1:** "Cost per active user: $0.80" (computed: total spend ÷ active-users-this-month, where active = signed-in within 30 days)
  - **Sub-row 2:** "At 10× users: ~$24/month" (linear extrapolation)
  - **Footer:** small "Updated manually" tag (V1) or "Updated [time ago] from GCP" (V2)
  - Wallet-card visual style consistent with other cards

### Cost Widget — Data Source (V1 manual fallback)

**Given** the V1 implementation uses a manual cost source
**When** the cost is read
**Then**:
- The current month's cost is read from Firestore document `admin_settings/firebase_cost`:
  ```typescript
  interface FirebaseCostDoc {
    monthYear: string;       // 'YYYY-MM'
    amountUSD: number;       // current-month spend
    updatedAt: Timestamp;
    updatedBy: string;       // admin email
  }
  ```
- If the document doesn't exist OR `monthYear !== current month`: the widget shows "—" with a tooltip "Click to enter cost"
- Clicking the widget opens a small modal with a number input + save button → writes back to the same Firestore document
- Only Moti (allowlisted email) can edit (server-side check on the API route `/api/admin/cost`)

### Cost Widget — Active-Users Calculation

**Given** the cost-per-user math runs
**When** "active users this month" is computed
**Then**:
- Active = users whose `lastSignInTime` (from Firebase Auth) is within the last 30 days
- Fallback: if `lastSignInTime` is missing for a user, fall back to most recent `app_opened` or `sign_in` event from `events/` collection
- Floor at 1 to avoid divide-by-zero
- Computed server-side, cached for 60 seconds

### Locale Strings

**Given** the new components are localized
**Then** new strings under `health.*` and `cost.*` namespaces exist in both `messages/he.json` and `messages/en.json`. Examples:
- `health.allSystemsNormal` → "כל המערכות תקינות" / "All systems normal"
- `health.issuesDetected` → "זוהו בעיות" / "Issues detected"
- `health.criticalIssue` → "תקלה חמורה" / "Critical issue"
- `cost.heroLabel` → "הוצאות החודש" / "Spend this month"
- `cost.perActiveUser` → "עלות למשתמש פעיל" / "Cost per active user"
- `cost.at10x` → "ב-10× משתמשים" / "At 10× users"
- `cost.notSet` → "לא הוגדר. לחץ להזנה" / "Not set. Click to enter."

### Quality

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Banner renders all three states correctly (manually verify by toggling thresholds in dev)
- [ ] Cost widget loads and saves correctly
- [ ] No new mobile-app changes (this is admin-web only)

---

## Technical Notes

### `src/components/HealthBanner.tsx`

```typescript
import { getHealthSnapshot } from '@/lib/health';
import { useTranslations } from 'next-intl';

export default async function HealthBanner() {
  const snapshot = await getHealthSnapshot();
  const t = await getTranslations('health');
  const variant = computeVariant(snapshot); // 'green' | 'orange' | 'red'
  return (
    <div className={`border-s-4 ${variantClasses[variant]}`}>
      {/* compact view + expandable details */}
    </div>
  );
}
```

### `src/lib/health.ts`

```typescript
import { adminFirestore } from '@/lib/firebaseAdmin';
import { getCrashFreeUsers, getTopCrashSignatures } from '@/lib/crashlytics';

export interface HealthSnapshot {
  crashFreeUsers24h: number | null;
  crashFreeUsers7d: number | null;
  topCrashes: CrashSignature[];
  authFailures24h: number;
  firestoreWriteFailures24h: number;
  imageUploadFailures24h: number;
  computedAt: Date;
}

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const [crashFree24h, crashFree7d, topCrashes, eventCounts] = await Promise.all([
    getCrashFreeUsers(1),
    getCrashFreeUsers(7),
    getTopCrashSignatures(5),
    countErrorEvents(since24h),
  ]);
  return {
    crashFreeUsers24h: crashFree24h,
    crashFreeUsers7d: crashFree7d,
    topCrashes,
    ...eventCounts,
    computedAt: new Date(),
  };
}

async function countErrorEvents(sinceMs: number) {
  const sinceDate = new Date(sinceMs);
  const types = ['auth_failed', 'firestore_write_failed', 'image_upload_failed'];
  const counts = await Promise.all(
    types.map((type) =>
      adminFirestore
        .collection('events')
        .where('type', '==', type)
        .where('timestamp', '>=', sinceDate)
        .count()
        .get()
        .then((s) => s.data().count),
    ),
  );
  return {
    authFailures24h: counts[0],
    firestoreWriteFailures24h: counts[1],
    imageUploadFailures24h: counts[2],
  };
}
```

### `src/lib/crashlytics.ts`

```typescript
import { GoogleAuth } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/firebase'];

const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

let cache: { snapshot: any; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

async function getAccessToken() {
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

export async function getCrashFreeUsers(periodDays: 1 | 7): Promise<number | null> {
  // ... call Crashlytics REST API; return percentage or null on failure
}

export async function getTopCrashSignatures(limit: number) {
  // ... return array of { signature, userCount, latestOccurrence }
}
```

### `src/components/CostWidget.tsx`

```typescript
import { adminFirestore } from '@/lib/firebaseAdmin';
import { getActiveUserCount } from '@/lib/users';

export default async function CostWidget() {
  const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const [costDoc, activeUsers] = await Promise.all([
    adminFirestore.doc('admin_settings/firebase_cost').get(),
    getActiveUserCount(),
  ]);
  const cost = costDoc.exists && costDoc.data()?.monthYear === monthYear
    ? costDoc.data()?.amountUSD
    : null;
  // ... render hero, perUser, projection, edit button
}
```

### `/api/admin/cost/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/session';
import { isEmailAllowed } from '@/lib/allowlist';
import { adminFirestore } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !isEmailAllowed(session.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { amountUSD } = await req.json();
  if (typeof amountUSD !== 'number' || amountUSD < 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  await adminFirestore.doc('admin_settings/firebase_cost').set({
    monthYear: new Date().toISOString().slice(0, 7),
    amountUSD,
    updatedAt: new Date(),
    updatedBy: session.email,
  });
  return NextResponse.json({ ok: true });
}
```

### Firestore Security Rules — `admin_settings/`

The `admin_settings/` collection should be **completely inaccessible to mobile-app clients** (only Admin SDK can read/write). Add:

```
match /admin_settings/{docId} {
  allow read, write: if false;
}
```

(This is a defense-in-depth rule; the Admin SDK bypasses rules anyway.)

### Crashlytics Setup — README addendum

Add to admin-app README a short setup section:
1. Firebase Console → Project Settings → Service Accounts → Generate new private key (already done in 18.1)
2. Verify the service account has the role `Firebase Crashlytics Viewer` (or `Editor`) — add via GCP IAM if missing
3. No additional Firebase Console config needed; the REST API uses the same service account

---

## Dependencies / Sequencing

- **Hard dependency on Story 18.2:** `events/` collection must exist and be populated for error counts to work.
- **Soft dependency:** Crashlytics REST API access must be enabled in GCP — if not, banner gracefully degrades.

---

## Done Definition

- [ ] All Acceptance Criteria pass
- [ ] Health banner correctly reflects production data (force a test crash via dev mobile build to verify red state)
- [ ] Cost widget editable and persistent
- [ ] Banner handles missing Crashlytics access gracefully (verified by temporarily revoking IAM permission)
- [ ] No regression on `/users` or `/activity` pages from Story 18.2
