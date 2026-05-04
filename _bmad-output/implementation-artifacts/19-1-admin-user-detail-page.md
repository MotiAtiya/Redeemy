# Story 19.1: Admin — User Detail Page

**Epic:** 19 — Admin Dashboard V1.5 quick wins
**Story Key:** 19-1-admin-user-detail-page
**Author:** Moti
**Date:** 2026-05-04
**Status:** done

---

## User Story

As Moti looking at the admin dashboard,
I want to click any row in `/users` and land on a per-user detail page that shows everything about that user in one place,
So that at the current small scale I can do hands-on diagnostic / curiosity drilling without having to bounce between Firebase Console, Firestore, and the activity feed.

---

## Background & Context

V1 gives a flat list of users with counts. To dig into "what is this user actually doing?" you currently need to cross-reference the activity feed manually. This story adds a dedicated detail page that gathers everything for a single uid: Auth metadata, Firestore profile fields, family membership, items per category (with item titles), recent events, simple activity pattern.

**What this story does NOT do:**
- Charts (line/bar/heatmap) — deferred to V2
- Editing user fields (rename, disable account, force sign-out) — admin actions deferred
- Push notifications to that user — deferred
- Cross-user comparisons (cohort) — deferred

---

## Acceptance Criteria

### Routing

**Given** Moti is on `/users`
**When** he clicks any row
**Then** the browser navigates to `/users/{uid}` and the detail page renders.

**Given** he visits `/users/{uid}` with a uid that doesn't exist
**Then** the page shows an empty-state "User not found" with a back link.

### Page sections

The page renders these sections, top-to-bottom:

1. **Header** — avatar (using existing `<Avatar />` component); displayName; email (LTR); copy-uid button; "Back to /users" link.
2. **Profile card** — signup date (with relative + absolute), last sign-in, locale (most recent from events), platform, app version (most recent), photoURL preview.
3. **Family card** — if user is in a family: family name, role (admin/member), other members' avatars + names; if not in a family: "Not in a family".
4. **Items grid** — 5 cards, one per category (credits/warranties/subscriptions/occasions/documents). Each card shows: total count, active count (where applicable), and the 5 most-recent items by `createdAt` desc with title + relative time.
5. **Activity timeline** — last 50 events for this user, ordered by timestamp desc. Reuses the existing `(app)/activity/page.tsx` row renderer if practical, otherwise inlines a simpler version.
6. **Cost contribution** — small text-only card showing approximate cost contribution (`MTD spend / activeUsers` simplified). Optional, only if `getCostSnapshot()` returns a value.

### Data fetching

**Given** the page loads
**When** server-side data is fetched
**Then** the following are fetched in parallel:
- Firebase Auth user record (`adminAuth.getUser(uid)`)
- Firestore `users/{uid}` document
- All items for this user across the 5 categories (latest-5 each), filtered by `where('userId', '==', uid)`
- Family lookup (if `familyId` exists)
- Last 50 events for this user (`where('userId', '==', uid).orderBy('timestamp', 'desc').limit(50)`)
- Last single event per platform/locale/version (latest known values)

**And** the page uses `revalidate = 60`.

### UX

- **Mobile-responsive** — same breakpoint behavior as `/users` table → cards.
- **Hebrew + English** — all strings under `messages/{he,en}.json` namespace `userDetail.*`.
- **Avatar** uses the existing `<Avatar />` component.

### Navigation

- The `<Link>` wrapping each row in `/users` (table desktop view AND mobile card view) goes to `/users/{uid}`.
- Existing TopBar nav stays untouched.

### Quality

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Tested locally with the 3 production users — page loads correctly for each
- [ ] Tested with non-existent uid — graceful empty state

---

## Technical Notes

### File layout (new)

```
src/app/(app)/users/[uid]/page.tsx       # the detail page (server component)
src/lib/userDetail.ts                    # loadUserDetail(uid) helper
```

### `loadUserDetail(uid)` shape

```typescript
interface UserDetail {
  auth: { uid; email; displayName; photoURL; creationTime; lastSignInTime; ... };
  firestoreDoc: Record<string, unknown> | null;
  family: FamilyDoc | null;
  itemsByCategory: Record<ItemCategory, { totalCount; activeCount; recent: Array<{ id; title; createdAt }> }>;
  events: AppEvent[]; // last 50
  latestPlatform / latestLocale / latestAppVersion: derived from events
}
```

Pull a "title" per item category from the doc:
- credit: `storeName` + ` ` + `formatAgorot(amount)`
- warranty: `storeName` + ` ` + `productType`
- subscription: `serviceName`
- occasion: `label` + ` ` + `name`
- document: `type` + ` ` + `ownerName`

### Linking from `/users`

In `src/app/(app)/users/page.tsx`:
- Wrap the table `<tr>` in `<Link href={\`/users/\${u.uid}\`}>` (or use `next/link` with `legacyBehavior` if needed for `<tr>`)
- For mobile `UserCard`, wrap the `<article>` in `<Link>`

### i18n strings (initial set)

- `userDetail.title` — "פרופיל משתמש" / "User profile"
- `userDetail.backToList` — "חזרה לרשימה" / "Back to users"
- `userDetail.notFound` — "המשתמש לא נמצא" / "User not found"
- `userDetail.copyUid` — "העתק UID" / "Copy UID"
- `userDetail.sections.profile` / `.family` / `.items` / `.activity` / `.cost`
- per-section labels — signed up, last active, platform, locale, app version, family role, etc.

---

## Dependencies / Sequencing

- No mobile-app changes.
- No Firestore-rule changes.
- No new env vars.

---

## Done Definition

- [ ] All AC pass
- [ ] Deployed to Vercel; visited `/users/{your-own-uid}` and looked good
- [ ] Verified clicking a row navigates correctly
- [ ] Locale toggle still works on the detail page
