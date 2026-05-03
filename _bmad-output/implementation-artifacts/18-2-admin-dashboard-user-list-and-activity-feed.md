# Story 18.2: Admin Dashboard — User List & Activity Feed

**Epic:** 18 — Admin Dashboard
**Story Key:** 18-2-admin-dashboard-user-list-and-activity-feed
**Author:** Moti
**Date:** 2026-05-03
**Status:** planned

---

## User Story

As Moti looking at the admin dashboard,
I want to see a live list of every Redeemy user with all their attributes and per-feature item counts, plus a real-time feed of recent app events,
So that at the current scale (3 users, growing to 50) I have direct, individual visibility into who exists, what they're doing, and when.

---

## Background & Context

This story delivers the **two core screens of the V1 MVP**: the Live User List and the Recent Activity Feed. Per the brainstorming insight, at <50 users the dashboard's job is NOT to show DAU charts and retention curves — those are statistically meaningless. Its job is to make every individual user and every event visible.

Two changes happen across two codebases:

1. **Mobile app (`Redeemy` repo):** Add a new `events/` Firestore collection and a `logEvent()` helper, and instrument it at all user-event call sites (auth, item create/update/delete, family operations, error paths).
2. **Admin web app (`redeemy-admin` repo):** Add `/users` and `/activity` pages that read users + items + events server-side via the Firebase Admin SDK and render them.

The home page (`/`) is updated to show summary cards linking to both screens.

**What this story does NOT implement:**
- Health Status Banner (Story 18.3)
- Cost Widget (Story 18.3)
- Daily Digest Email (Story 18.4)
- Mobile-responsive polish beyond basic Tailwind defaults (Story 18.4)
- Per-user drill-down screen (deferred to V2)
- Filtering/segmentation of users (deferred to V2)
- Charts of any kind

---

## Acceptance Criteria

### Mobile-App Side: Event Logging Infrastructure

**Given** the mobile-app codebase
**When** event-logging is added
**Then**:
- A new file `src/lib/eventLog.ts` exports a single function:
  ```typescript
  export type EventType =
    | 'sign_in' | 'sign_up' | 'sign_out'
    | 'item_created' | 'item_updated' | 'item_deleted'
    | 'family_created' | 'family_joined' | 'family_left'
    | 'auth_failed' | 'image_upload_failed' | 'firestore_write_failed'
    | 'app_opened';

  export async function logEvent(type: EventType, payload?: {
    itemCategory?: 'credit' | 'warranty' | 'subscription' | 'occasion' | 'document';
    itemId?: string;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<void>;
  ```
- `logEvent` writes to Firestore collection `events/`
- `logEvent` is **fire-and-forget**: never `await`-ed by callers; never blocks user-facing UI; failures are silently swallowed (log to console only)
- `logEvent` automatically attaches: `userId` (from current auth state), `userName` (display name or email), `timestamp` (server timestamp), `appVersion` (from `expo-constants`), `platform` (ios/android), `locale` (current i18n locale)
- If user is not authenticated, `logEvent` falls back to userId = `'anon'` and userName = `null` (only valid for `auth_failed` and `app_opened` event types)

**Given** the user signs in or signs up
**Then** `logEvent('sign_in')` or `logEvent('sign_up')` is called from `authStore`

**Given** the user signs out
**Then** `logEvent('sign_out')` is called BEFORE the auth state is cleared

**Given** the user fails to sign in (wrong password, etc.)
**Then** `logEvent('auth_failed', ...)` ~~is called~~ — **deferred to Story 18.3.** Reason: the `events/` Firestore rule requires `request.auth != null` to write, but auth-failure events fire by definition before the user is authenticated. Surfacing them requires either Cloud Functions listening to Firebase Auth audit logs server-side, or relaxing the rule (which creates a DDoS surface). Story 18.3 (Health Banner) will integrate Firebase Auth audit logs server-side via the Admin SDK, which is the right architectural place.

**Given** the user creates a credit/warranty/subscription/occasion/document
**Then** the corresponding `firestore*.ts` file (e.g., `firestoreCredits.ts`) calls `logEvent('item_created', { itemCategory: 'credit', itemId })` after a successful write
- Same pattern for `item_updated` and `item_deleted`
- Per-feature instrumentation lives in: `firestoreCredits.ts`, `firestoreWarranties.ts`, `firestoreSubscriptions.ts`, `firestoreOccasions.ts`, `firestoreDocuments.ts`

**Given** a user creates, joins, or leaves a family
**Then** `logEvent('family_created' | 'family_joined' | 'family_left', { metadata: { familyId } })` is called from the family-related Firestore lib

**Given** the app launches (root layout mounts)
**Then** `logEvent('app_opened')` is called once per cold start

**Given** Firestore write fails or image upload fails
**Then** `logEvent('firestore_write_failed' | 'image_upload_failed', { metadata: { errorCode, attemptedOperation } })` is called from the catch block

**And** the Firestore security rules for `/events/{eventId}` allow authenticated users to CREATE only (no read, no update, no delete) — clients can never read the events collection.

**And** TypeScript compiles with zero errors (`npx tsc --noEmit`).

### Mobile-App Side: Firestore Rules & Indexes

**Given** Firestore security rules are deployed
**Then**:
- `match /events/{eventId}` allows `create` if `request.auth != null` and the document's `userId` matches `request.auth.uid` (or equals `'anon'`)
- `read`, `update`, `delete` are denied for all clients (only Admin SDK can read)
- Composite index on `(timestamp desc)` is added for the events collection

### Admin-Web Side: User List Page (`/users`)

**Given** Moti is logged into the admin dashboard
**When** he visits `/users`
**Then** the page is a server component that queries:
- All users via `adminAuth.listUsers()` (paginated; assume <1000 users for V1)
- All user docs from Firestore `users/` collection
- Per-user item counts: COUNT for each of `credits`, `warranties`, `subscriptions`, `occasions`, `documents` filtered by `userId == user.uid` AND not soft-deleted
- All `families/` docs (joined to users via `members` array)

**And** the rendered table shows one row per user with these columns:
| Column | Source |
|---|---|
| Avatar | `photoURL` from Auth, fallback to initials |
| Name | `displayName` from Auth or Firestore `users` doc |
| Email | from Auth |
| Signed up | `creationTime` from Auth — formatted as relative ("3 days ago") + tooltip with absolute date |
| Last active | `lastSignInTime` from Auth — relative + tooltip |
| Locale | from `users/{uid}.locale` (he/en); fall back to "—" |
| Platform | most recent `platform` from `events/` collection per user (latest `app_opened` or `sign_in`) |
| Family | family name + size, if user is in a family; "—" otherwise |
| Credits | count |
| Warranties | count |
| Subscriptions | count |
| Occasions | count |
| Documents | count |
| Total items | sum |

**And** the table is sortable by clicking column headers (ascending/descending toggle).

**And** the table is rendered using shadcn/ui's `Table` primitive with the wallet-card surrounding container.

**And** users are sorted by signup date desc (newest first) by default.

**And** if a user has zero total items, their row shows a subtle "🌱 zero-state" badge to draw attention.

**And** the page has a small header showing the **total user count** as a hero number ("3 users") with a fresh-looking refresh button.

### Admin-Web Side: Activity Feed Page (`/activity`)

**Given** Moti visits `/activity`
**When** the page loads
**Then**:
- A server component fetches the last **200 events** from Firestore `events/` collection, ordered by `timestamp desc`
- Each event is rendered as a row in a vertical timeline / list
- Each row shows:
  - Icon (per event type — see icon mapping below)
  - User name + email (right-aligned in RTL, left-aligned in LTR)
  - Event description (locale-aware, e.g. "יצר זיכוי" / "Created a credit")
  - Item category icon if applicable (e.g., 💳 for credit, 🛡 for warranty, 🔁 for subscription, 🎂 for occasion, 📄 for document)
  - Relative time ("2 minutes ago") + tooltip with absolute timestamp
  - App version + platform + locale as a subtle metadata row
- Failed-write events (`firestore_write_failed`, `image_upload_failed`, `auth_failed`) are shown in a red-tinted card to stand out
- Auto-refresh every 30 seconds via Next.js's revalidate mechanism (`export const revalidate = 30`)

**And** the activity feed page displays a top toggle: "All events / Errors only" — when "Errors only" is selected, only `*_failed` events are shown.

**And** the icon mapping is:
| Event type | Icon (lucide) |
|---|---|
| sign_in | LogIn |
| sign_up | UserPlus |
| sign_out | LogOut |
| item_created | Plus |
| item_updated | Pencil |
| item_deleted | Trash2 |
| family_created / joined / left | Users |
| auth_failed | ShieldAlert |
| image_upload_failed / firestore_write_failed | AlertTriangle |
| app_opened | Smartphone |

### Admin-Web Side: Home Page (`/`) Updates

**Given** Moti is on the home page after this story
**Then** the placeholder "Welcome" content is replaced with two summary cards:
- Card 1: "Users" — shows total user count, today's signups, link to `/users`
- Card 2: "Activity" — shows event count today, link to `/activity`

**And** both cards use the wallet-card style (`shadow-wallet`, `rounded-xl`, `bg-white`).

### Locale Strings

**Given** the i18n bundles are updated
**Then** `messages/he.json` and `messages/en.json` contain all new strings used in this story under namespaces `users.*`, `activity.*`, `home.*` — no hardcoded user-facing strings in the UI.

### Quality

- [ ] Mobile-app `npx tsc --noEmit` passes
- [ ] Admin-app `npm run build` passes
- [ ] User list renders correctly with the 3 production users (and any additional invited users)
- [ ] Activity feed shows events captured in the last 24 hours after deployment
- [ ] Visual style matches Story 18.1 (Sage-teal, Wallet-card, Heebo)

---

## Technical Notes

### Mobile-App: `src/lib/eventLog.ts`

```typescript
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore, auth } from '@/lib/firebase'; // existing
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import i18n from '@/lib/i18n'; // existing
import type { EventType } from '@/types/eventTypes';

interface LogPayload {
  itemCategory?: 'credit' | 'warranty' | 'subscription' | 'occasion' | 'document';
  itemId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export async function logEvent(type: EventType, payload?: LogPayload) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(firestore, 'events'), {
      type,
      userId: user?.uid ?? 'anon',
      userName: user?.displayName ?? user?.email ?? null,
      timestamp: serverTimestamp(),
      appVersion: Constants.expoConfig?.version ?? 'unknown',
      platform: Platform.OS as 'ios' | 'android',
      locale: i18n.language as 'he' | 'en',
      ...payload,
    });
  } catch (err) {
    // Fire-and-forget. Log to console for development.
    if (__DEV__) console.warn('[eventLog]', err);
  }
}
```

### Mobile-App: Call-site instrumentation example

In `src/lib/firestoreCredits.ts`:
```typescript
export async function createCredit(input: CreditInput): Promise<string> {
  const docRef = await addDoc(collection(firestore, 'credits'), { ...input });
  void logEvent('item_created', { itemCategory: 'credit', itemId: docRef.id });
  return docRef.id;
}
```

The `void` keyword is intentional — it explicitly drops the promise so reviewers see the fire-and-forget intent.

### Mobile-App: Firestore Rules (snippet)

```
match /events/{eventId} {
  allow create: if request.auth != null
                && (request.resource.data.userId == request.auth.uid
                    || request.resource.data.userId == 'anon');
  allow read, update, delete: if false; // Admin SDK only
}
```

### Admin-Web: Server-side data fetching for `/users`

```typescript
// src/app/users/page.tsx
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin';

async function loadUsers() {
  const usersResult = await adminAuth.listUsers(1000);
  const userDocsSnap = await adminFirestore.collection('users').get();
  const userDocs = new Map(userDocsSnap.docs.map((d) => [d.id, d.data()]));
  const familiesSnap = await adminFirestore.collection('families').get();

  const counts = await Promise.all(
    ['credits', 'warranties', 'subscriptions', 'occasions', 'documents'].map(async (col) => {
      const snap = await adminFirestore.collection(col).get();
      const map = new Map<string, number>();
      snap.docs.forEach((d) => {
        const uid = d.data().userId;
        if (!uid) return;
        map.set(uid, (map.get(uid) ?? 0) + 1);
      });
      return [col, map] as const;
    }),
  );
  // ... join everything into the final user-row shape
}

export const revalidate = 60; // refresh server-rendered list every 60s
export default async function UsersPage() {
  const users = await loadUsers();
  // ... render <UsersTable users={users} />
}
```

### Admin-Web: Server-side data fetching for `/activity`

```typescript
// src/app/activity/page.tsx
import { adminFirestore } from '@/lib/firebaseAdmin';

async function loadEvents() {
  const snap = await adminFirestore
    .collection('events')
    .orderBy('timestamp', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export const revalidate = 30;
export default async function ActivityPage() {
  const events = await loadEvents();
  // ... render <ActivityFeed events={events} />
}
```

---

## Dependencies / Sequencing

- **Hard dependency on Story 18.1:** auth gate, theme, i18n, layout shell must already be in place.
- **Mobile-app changes can be released independently** before the admin-web changes — the `events/` collection will simply accumulate before the admin can read it. No backwards-incompat risk.
- **Order of work:**
  1. Mobile app: ship `eventLog.ts` + Firestore rules + instrumentation in a single mobile-app PR
  2. Admin web: build `/users` page (does not depend on events)
  3. Admin web: build `/activity` page (depends on events flowing from #1)

---

## Done Definition

- [ ] All Acceptance Criteria pass
- [ ] Mobile-app PR merged and rolled out to production via OTA update or new build
- [ ] Within 24 hours of mobile-app rollout, the activity feed shows real events
- [ ] User list shows all 3 production users with accurate data
- [ ] Locale toggle works on both pages (he ↔ en) without layout glitches
- [ ] Tested with empty events collection (graceful empty state)
- [ ] No user-data leakage to client bundle (verify that `users/` and `events/` Firestore data is only fetched server-side)
