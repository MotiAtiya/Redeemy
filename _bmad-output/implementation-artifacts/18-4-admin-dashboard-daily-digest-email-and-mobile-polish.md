# Story 18.4: Admin Dashboard — Daily Digest Email & Mobile Polish

**Epic:** 18 — Admin Dashboard
**Story Key:** 18-4-admin-dashboard-daily-digest-email-and-mobile-polish
**Author:** Moti
**Date:** 2026-05-03
**Status:** planned

---

## User Story

As Moti who only opens the admin dashboard every few days,
I want a daily digest email that arrives every morning summarizing yesterday's activity, plus the dashboard fully usable on my phone,
So that the dashboard reaches me proactively (push, not pull) and is glanceable from anywhere — not only at my desk.

---

## Background & Context

This is the **final story of Epic 18 V1**. It closes the loop on two key promises from brainstorming:

1. **Push, don't pull.** A solo founder won't always remember to check the dashboard. The Daily Digest Email arrives every morning with yesterday's signups, items created, errors, and cost delta. After this, even on quiet days when Moti doesn't open the dashboard, he stays informed.
2. **Mobile-friendly.** The dashboard must be usable on an iPhone-sized viewport so Moti can do a quick check from a coffee shop, a bus, etc.

The story also includes final V1 polish: empty states, error boundaries, performance tuning, and a Crashlytics/Sentry-style cron-failure alert so a silently failing digest doesn't go unnoticed.

**What this story does NOT implement:**
- Anomaly alert emails (V2)
- Push notifications to phone (V3)
- Dark mode (V2)
- Story Mode / investor view (V3)
- Public stats page (V3)

---

## Acceptance Criteria

### Daily Digest Email — Cron Trigger

**Given** the admin app is deployed to Vercel
**When** the cron schedule is configured
**Then**:
- `vercel.json` includes a Vercel Cron entry: `{ "path": "/api/cron/daily-digest", "schedule": "0 5 * * *" }` (05:00 UTC = 08:00 IST during Israeli winter; 07:00 IST during summer — see note below on DST)
- The cron endpoint requires a Vercel-issued `CRON_SECRET` header — requests without the header return 401
- The endpoint is exported from `src/app/api/cron/daily-digest/route.ts`

**Note on DST:** Vercel Cron runs in UTC. Israeli summer time (IDT, UTC+3) means 08:00 IST = 05:00 UTC; Israeli standard time (IST, UTC+2) means 08:00 IST = 06:00 UTC. For V1, accept that the digest arrives at either 7 AM or 8 AM Israel time depending on DST. (Documenting this in the README is enough; auto-DST handling is out of scope for V1.)

### Daily Digest Email — Content

**Given** the cron fires
**When** the endpoint runs
**Then**:
- It computes "yesterday" = previous calendar day in Israel timezone (Asia/Jerusalem)
- It assembles a digest with these sections:
  1. **Hero summary line:** "Yesterday: X new users, Y items created, Z errors. Spend MTD: $W."
  2. **New users (if any):** list of name/email/locale for each user who signed up yesterday
  3. **Items created (if any):** count per category (credits/warranties/subscriptions/occasions/documents)
  4. **Errors (if any):** count of `auth_failed`, `firestore_write_failed`, `image_upload_failed` events from yesterday + top crash signature if Crashlytics surfaces a new one
  5. **Cost note:** current MTD spend; flag if pace exceeds last month
  6. **Footer:** "Sent automatically by Redeemy Admin. View dashboard."
- The email is sent in **Hebrew** (RTL HTML email template) by default; if `ADMIN_EMAILS` extends to multiple emails in the future, each recipient's preferred locale is respected — for V1 it's just Moti, Hebrew

**And** if **all** of the following are true: zero new users, zero items created, zero errors → the email is still sent with a short "Quiet day yesterday" message (this is intentional — the absence of an email could itself signal a cron failure; sending always confirms cron health)

### Daily Digest Email — Sending

**Given** the digest content has been computed
**When** the email is sent
**Then**:
- Resend is used (`@resend/node` SDK)
- `RESEND_API_KEY` env var is set in Vercel
- `from`: `Redeemy Admin <admin@redeemy.app>` (domain verification required) **OR** for V1 fallback `onboarding@resend.dev` if domain not yet verified
- `to`: every email in `ADMIN_EMAILS`
- Subject: `[Redeemy] דוח יומי — {date}` (Hebrew) — date formatted `D בMMMM YYYY` ("3 במאי 2026")
- HTML and plaintext bodies both included
- Email template uses inline CSS (since email clients strip <style>)
- RTL: `<html dir="rtl" lang="he">` + `text-align: right` on all text containers
- On Resend API failure: retry once after 30 seconds; if still fails, log error to console and write a record to Firestore `admin_settings/digest_failures` with timestamp and error message (so a future health-banner improvement can surface the failure)

### Daily Digest Email — Template

**Given** the email is rendered
**Then**:
- Visual identity matches Redeemy app: Sage-teal primary (e.g., header band), Heebo not used (web-safe fallback to Tahoma/Arial in email — Hebrew compatibility), generous padding, rounded "card" sections (CSS-only, no images)
- Mobile-readable: max-width 600px, fluid layout, font sizes ≥14px
- All text strings come from `messages/he.json` under `digest.*` namespace (and `messages/en.json` for English in case future admins added)
- The "View dashboard" footer link goes to the admin app URL (env var `NEXT_PUBLIC_ADMIN_URL`)

### Mobile-Responsive Polish

**Given** Moti opens the admin app on his iPhone
**When** he visits any V1 page (`/`, `/users`, `/activity`)
**Then**:
- No horizontal scroll on a 375px-wide viewport
- Top bar collapses: app name shrinks to logo only; user dropdown becomes a hamburger menu containing locale toggle + sign-out
- `/users` table converts to a card list on viewports <768px:
  - Each user becomes a wallet-style card showing avatar, name, email, signup date, and per-category counts in a compact 2-column inner grid
  - Sortable column headers replaced by a single sort dropdown above the list
- `/activity` feed remains a vertical list (already mobile-friendly), but reduces metadata row to a single line on phones
- Cost widget and health banner stack vertically below summary cards on mobile
- All interactive targets are ≥44×44px (iOS HIG)

### Error Boundaries & Empty States

**Given** any page might fail to load data (Firebase auth issue, network)
**Then**:
- Each page has a Next.js `error.tsx` that shows a friendly Hebrew error message + retry button
- A root `app/error.tsx` catches anything else
- Empty states:
  - `/users` with zero users: "אין משתמשים עדיין" + illustration placeholder
  - `/activity` with zero events: "עוד אין פעילות. אירועים יופיעו כאן ברגע שהאפליקציה נפתחת." + Hebrew explanation
  - Cost widget with no data set: "לחץ להזנת עלות החודש"

### Performance

**Given** Moti loads `/`, `/users`, or `/activity` from a fresh session
**When** the page is measured
**Then**:
- Time to first byte < 800ms on Vercel production
- Largest Contentful Paint < 2.0s on Vercel production with broadband
- Server-component data fetching uses `Promise.all` for parallel queries (no waterfall)
- The user-list page imposes a hard limit of 1000 users (V1 paginates beyond)

### Locale Strings

- All new strings under `digest.*`, `errors.*`, `mobile.*` namespaces, in both `he.json` and `en.json`

### Quality

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Manual cron invocation works in production: visit `/api/cron/daily-digest?secret={CRON_SECRET}` and verify a real email arrives at `a.moti96@gmail.com`
- [ ] Mobile responsive verified on real iPhone (Safari) AND desktop Chrome at 375px viewport
- [ ] Resend dashboard shows successful delivery
- [ ] No regression on Stories 18.1, 18.2, 18.3 (auth, user list, activity, banner, cost)

---

## Technical Notes

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 5 * * *"
    }
  ]
}
```

### `/api/cron/daily-digest/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { buildDigest } from '@/lib/digest';
import { renderDigestHtml, renderDigestText } from '@/lib/digestTemplate';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(req: Request) {
  // Vercel Cron sends a header: 'Authorization: Bearer ${CRON_SECRET}'
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const digest = await buildDigest();
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim());
    await resend.emails.send({
      from: process.env.DIGEST_FROM_EMAIL ?? 'Redeemy Admin <onboarding@resend.dev>',
      to: adminEmails,
      subject: `[Redeemy] דוח יומי — ${digest.dateLabel}`,
      html: renderDigestHtml(digest),
      text: renderDigestText(digest),
    });
    return NextResponse.json({ ok: true, sent: digest.dateLabel });
  } catch (err) {
    // Single retry after 30s, then log + persist failure
    await adminFirestore.collection('admin_settings').doc('digest_failures').set(
      {
        lastFailureAt: new Date(),
        lastFailureMessage: String(err),
      },
      { merge: true },
    );
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

### `src/lib/digest.ts`

```typescript
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin';

interface Digest {
  dateLabel: string;        // e.g. "3 במאי 2026"
  dateISO: string;          // YYYY-MM-DD
  newUsers: Array<{ name: string; email: string; locale: string }>;
  itemsCreated: Record<'credit' | 'warranty' | 'subscription' | 'occasion' | 'document', number>;
  errors: { authFailed: number; firestoreWriteFailed: number; imageUploadFailed: number };
  costMTD: number | null;
  topCrashSignature: string | null;
}

export async function buildDigest(): Promise<Digest> {
  // Compute "yesterday" in Asia/Jerusalem timezone
  const tz = 'Asia/Jerusalem';
  const yesterday = computeYesterdayInTz(tz);
  // Fetch in parallel:
  const [newUsers, itemsCreated, errors, costMTD, topCrash] = await Promise.all([
    fetchNewUsersBetween(yesterday.startUtc, yesterday.endUtc),
    countItemsCreatedBetween(yesterday.startUtc, yesterday.endUtc),
    countErrorEventsBetween(yesterday.startUtc, yesterday.endUtc),
    fetchCostMTD(),
    fetchTopCrashIfNew(),
  ]);
  return {
    dateLabel: formatHebrewDate(yesterday.date),
    dateISO: yesterday.date.toISOString().slice(0, 10),
    newUsers,
    itemsCreated,
    errors,
    costMTD,
    topCrashSignature: topCrash,
  };
}
```

### `src/lib/digestTemplate.ts`

Inline-CSS HTML email template. RTL by default. Sections:

```html
<table dir="rtl" lang="he" style="max-width: 600px; margin: 0 auto; font-family: Tahoma, Arial, sans-serif; background: #F2F7F5; padding: 24px;">
  <tr>
    <td style="background: #4A8A6E; color: #fff; padding: 16px 24px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">Redeemy — דוח יומי</h1>
      <p style="margin: 4px 0 0; opacity: 0.85;">{{dateLabel}}</p>
    </td>
  </tr>
  <tr>
    <td style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px;">
      <p style="font-size: 16px; margin: 0 0 16px;">{{heroLine}}</p>
      <!-- New users section -->
      <!-- Items created section -->
      <!-- Errors section (red-tinted if non-zero) -->
      <!-- Cost note -->
      <!-- Footer with View dashboard link -->
    </td>
  </tr>
</table>
```

The English template (`renderDigestHtmlEn`) is symmetric but `dir="ltr" lang="en"` and uses Latin formatting.

### Mobile Polish — `/users` Card View

```typescript
// In src/app/users/page.tsx, conditionally render based on viewport.
// Use a ResponsiveTable component that switches at md breakpoint:

function UsersList({ users }: { users: UserRow[] }) {
  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block">
        <UsersTable users={users} />
      </div>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <UserCard key={u.uid} user={u} />
        ))}
      </div>
    </>
  );
}
```

### Resend Domain Verification (optional for V1)

If using a custom `from:` domain like `admin@redeemy.app`, follow Resend's DNS verification steps. Otherwise, use `onboarding@resend.dev` for V1 — emails will still arrive but display a "via resend.dev" footer in some clients. Domain verification can happen anytime post-launch.

### `error.tsx` (root)

```typescript
'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-sage-50">
          <h1 className="text-2xl font-bold text-sage-900 mb-4">משהו השתבש</h1>
          <p className="text-sage-700 mb-6 text-center max-w-md">
            התרחשה שגיאה בטעינת הדף. נסה שוב או חזור לעמוד הבית.
          </p>
          <button onClick={reset} className="px-4 py-2 bg-sage-500 text-white rounded-lg">
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
```

---

## Dependencies / Sequencing

- **Hard dependency on Stories 18.1, 18.2, 18.3:** auth, theme, user list, activity feed, health banner, cost widget must all be merged.
- **Order of work within this story:**
  1. Build `/api/cron/daily-digest` + `digest.ts` + email template (test via manual GET first)
  2. Verify Resend integration end-to-end with a manual call
  3. Wire up Vercel Cron via `vercel.json`
  4. Mobile responsive polish across all V1 pages
  5. Empty states + error boundaries
  6. Final QA on real iPhone

---

## Done Definition

- [ ] All Acceptance Criteria pass
- [ ] First daily digest email arrives at `a.moti96@gmail.com` the morning after deployment
- [ ] All V1 pages usable on iPhone Safari without horizontal scroll, layout glitches, or unreachable taps
- [ ] Empty states render correctly when relevant
- [ ] Error boundaries verified by deliberately throwing in a server component
- [ ] V1 Epic 18 acceptance criteria from the tech spec all pass (see `_bmad-output/planning-artifacts/admin-dashboard-tech-spec.md` §9)
- [ ] Tech spec status updated to `done` and Epic 18 in `epics.md` updated to `✅ done`
