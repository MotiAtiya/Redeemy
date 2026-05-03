# Admin Dashboard — Tech Spec

**Author:** Moti
**Date:** 2026-05-03
**Status:** draft → ready for implementation
**Epic:** 18 (proposed)
**Source:** `_bmad-output/brainstorming/brainstorming-session-2026-05-03-1345.md`
**Type:** Quick-flow tech spec (no PRD required)

---

## 1. Overview

A separate **web application** (`admin.redeemy.app` or local dev) that gives Moti — Redeemy's solo founder and only admin user — a real-time picture of the Redeemy app's state, users, and operational health.

**The core insight that shapes V1:** Redeemy is currently at ~3 users (pre-launch). At this scale, aggregate metrics (DAU/MAU, retention curves, cohort analysis) are statistical noise. The dashboard's first job is to make every individual user, every event, and every error **directly visible** — not to crunch averages. Aggregate analytics are deferred to V2 (50–500 users) and V3 (500+).

**What V1 (this tech spec) delivers:**

1. Login (Firebase Auth, single-email allowlist gate)
2. Live User List — every registered user with all their attributes and per-feature item counts
3. Recent Activity Feed — live event stream (signed in, item created, family joined, etc.)
4. Health Status Banner — Crashlytics + auth/Firestore errors
5. Cost Widget — current month Firebase spend
6. Daily Digest Email — auto-sent every morning at 8am (Israel time)
7. Hebrew/English locale toggle with RTL/LTR
8. Visual identity matching Redeemy app (Sage teal, Wallet-card style)
9. Mobile-responsive (desktop primary, phone usable)

**What V1 does NOT include** (deferred to V2 / V3):

- Aggregate metrics: DAU/WAU/MAU, retention, activation funnel
- Charts of any kind (sparklines, line charts, heatmaps)
- Feature Adoption Map / Cold-Hot lists
- Anomaly detection / push alerts
- Cohort analysis, channel attribution
- Story Mode (investor pitch view)
- Public stats page
- Natural-language query interface
- A/B test results

---

## 2. Audience & Usage Model

| Attribute | Value |
|---|---|
| Users | 1 (Moti only — `a.moti96@gmail.com`) |
| Frequency | Every few days |
| Surfaces | (a) Web dashboard, (b) Daily digest email |
| Primary device | Desktop (laptop) |
| Secondary device | Mobile phone (responsive web) |
| Locales | Hebrew (default, RTL), English (LTR toggle) |
| Auth model | Firebase Auth + email allowlist (no role/permission system) |

**Usage modes** (mapped to the 4 stated goal priorities from brainstorming):

1. **PM Moti** — "What should I build next?" → V1 supports anecdotally via per-feature item counts; deeper Feature Adoption Map deferred to V2.
2. **Growth Moti** — "Are we growing?" → V1 supports via raw user count + signups today/week; deeper retention/funnel deferred to V2.
3. **On-Call Moti** — "Is anything broken?" → V1 fully supports via Health Banner + crash list.
4. **Pitch Moti** — "Tell the story." → Deferred entirely to V3 (Story Mode).

V1 is heavily skewed toward **On-Call Moti and PM Moti's anecdotal needs**, which is the right balance for a 3-user pre-launch product.

---

## 3. Technical Architecture

### 3.1 Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | First-class TypeScript, server components, fastest path to a styled web app |
| Language | TypeScript (strict) | Matches the Redeemy app codebase |
| Styling | Tailwind CSS + shadcn/ui | Match Sage-teal palette via Tailwind tokens; shadcn provides accessible primitives |
| Backend reads | Firebase Admin SDK (server-side) | Same Firestore, Auth, Storage; bypasses client security rules with service account |
| Auth | Firebase Auth (web SDK) + email allowlist | Reuses existing user identity; single-email gate suffices |
| i18n | `next-intl` | RTL/LTR direction switching, Hebrew/English bundles |
| Charts (V2) | Recharts or Tremor | Not needed in V1 |
| Email sending | Resend (preferred) or SendGrid | Resend has best DX for transactional emails |
| Cron / scheduling | Vercel Cron (preferred) or Firebase Scheduled Functions | Triggers daily digest email |
| Hosting | Vercel | Free tier sufficient; edge functions for digest cron |
| Domain | `admin.redeemy.app` (subdomain) or initially `redeemy-admin.vercel.app` | TBD |
| Repository | Separate repo `redeemy-admin` (preferred) **or** `apps/admin/` monorepo path | TBD — see decision below |

### 3.2 Repository Decision

**Recommendation: separate repository (`redeemy-admin`).**

**Why:**
- Different runtime (Next.js vs. Expo/React Native) — different `package.json`, different build tooling.
- Separate deploy target (Vercel vs. EAS / app stores).
- Avoids dragging mobile dependencies into the dashboard's CI.
- Cleanest separation of secrets — admin only needs Firebase service account; mobile app must NOT have it.
- Trade-off: types like `Subscription`, `Credit`, etc. are duplicated. **Mitigation:** copy-paste types into `admin/src/types/` initially; later, extract a shared `@redeemy/types` package if it pays off.

**Alternative (monorepo) would only be worth it** if you anticipate 3+ shared packages. For V1, separate repo is faster.

### 3.3 Data Access Pattern

```
┌──────────────────────┐        ┌──────────────────────┐
│  Next.js Server      │  ─→    │  Firestore (prod)    │
│  Components / RSC    │        │  via Admin SDK       │
│  + Server Actions    │        │  (service account)   │
└──────────────────────┘        └──────────────────────┘
        ↓                                ↑
┌──────────────────────┐                 │
│  Browser (Client)    │                 │
│  - Auth state only   │                 │
│  - No direct FS read │                 │
└──────────────────────┘                 │
                                          │
┌──────────────────────┐                  │
│  Vercel Cron (daily) │ ─────────────────┘
│  → /api/cron/digest  │   reads, sends email via Resend
└──────────────────────┘
```

- **All Firestore reads happen server-side** via Firebase Admin SDK with the service account. The browser never touches Firestore directly.
- **Auth flows client-side** (Firebase Auth web SDK) for the login screen, then the client passes the ID token to the server, which verifies it and checks the email allowlist.
- **Server components** read aggregate counts and lists; **server actions** fetch per-user details on demand.
- This pattern keeps the client lean and avoids exposing Firestore data via overly-permissive security rules.

### 3.4 Auth Gate

1. User visits `/`. Middleware checks for a valid session cookie.
2. If no session → redirect to `/login` (Firebase Auth UI: email + password OR Google sign-in).
3. On successful Firebase login, server verifies the ID token AND checks `email === ADMIN_EMAIL_ALLOWLIST`. If not in allowlist → sign out + display "Access denied."
4. If allowed → set HTTP-only session cookie (signed JWT, 7-day expiry) → redirect to `/`.
5. All subsequent pages check the session cookie via Next.js middleware.

**Allowlist** is a single env var `ADMIN_EMAILS` (comma-separated) — start with `a.moti96@gmail.com`.

### 3.5 Data Sources

| Data | Source | Read pattern |
|---|---|---|
| Users | Firebase Auth `listUsers()` + `users/{uid}` Firestore docs | Full list on dashboard load (ok at <1000 users) |
| Items per category | Firestore: count by `userId` for `credits`, `warranties`, `subscriptions`, `occasions`, `documents` | Server-side count aggregations |
| Recent activity | New collection `events/` (write side: see §3.6) | Last 200 events, ordered by timestamp desc |
| Crashes / errors | Firebase Crashlytics REST API | Top crash signatures, last 7d |
| Auth failures | Firebase Auth audit logs (if available) OR custom-tracked `events/` of type `auth_failed` | Last 24h count |
| Storage usage | Firebase Storage admin SDK (`getFiles()` with metadata) — sample-based estimate | Cached, refresh on demand |
| Firestore reads/writes | GCP Cloud Monitoring API | Cached daily |
| Firebase cost | GCP Billing API or scrape from console | Manual entry fallback if API access not set up in V1 |
| Family info | Firestore `families/` | Joined to user list |
| Crash-free user % | Crashlytics REST API | Banner widget |

### 3.6 Event Logging (NEW — required for V1)

The Redeemy mobile app does NOT currently write a unified event log. To power the **Recent Activity Feed**, we add lightweight event logging.

**New Firestore collection:** `events/{eventId}`

```typescript
interface AppEvent {
  id: string;
  type: 'sign_in' | 'sign_up' | 'sign_out' |
        'item_created' | 'item_updated' | 'item_deleted' |
        'family_created' | 'family_joined' | 'family_left' |
        'auth_failed' | 'image_upload_failed' | 'firestore_write_failed' |
        'app_opened';
  userId: string;
  userName?: string;
  // Item-event specific:
  itemCategory?: 'credit' | 'warranty' | 'subscription' | 'occasion' | 'document';
  itemId?: string;
  // Optional metadata:
  metadata?: Record<string, string | number | boolean>;
  // Required:
  timestamp: Timestamp;
  appVersion: string;
  platform: 'ios' | 'android';
  locale: 'he' | 'en';
}
```

**Write side (mobile app changes):**

- Add `src/lib/eventLog.ts` with a single function: `logEvent(type, payload?)`.
- Write to `events/` is **fire-and-forget** — never block the user-facing operation.
- Instrument these call sites in the app:
  - Auth: `signIn`, `signUp`, `signOut`, sign-in errors → `auth_failed`
  - Each `firestore*.ts` file: on successful create/update/delete → `item_created`/`item_updated`/`item_deleted` with `itemCategory`
  - `familyStore` or `familyService`: create/join/leave → respective events
  - Image upload error path → `image_upload_failed`
  - App startup hook → `app_opened`

**Retention policy:** Cloud Function deletes events older than 90 days. Configurable via env var.

**Firestore security rules:** `events/` is **write-only for authenticated users; read only via Admin SDK** (no client read access).

**This is the only mobile-app change required by Epic 18.** Story 18.1 includes it.

### 3.7 i18n & RTL/LTR

- Default locale: `he` (Hebrew, RTL).
- Available locales: `he`, `en`.
- Locale persisted in cookie `NEXT_LOCALE`.
- Top-bar language toggle pill, identical pattern to Redeemy app.
- Tailwind logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) used throughout — never `ml-*`/`mr-*`/`pl-*`/`pr-*`.
- `<html dir="rtl"|"ltr">` set per request based on locale.
- All user-facing strings in `messages/he.json` and `messages/en.json`.

### 3.8 Visual Identity

Match Redeemy mobile app:

- **Primary color:** Sage teal (exact hex from `src/theme/colors.ts` in mobile repo)
- **Cards:** Wallet-style — rounded corners (12px), soft shadow, subtle border
- **Typography:** Heebo (Hebrew/English unified) — same as mobile app
- **Light mode** in V1 (dark mode V2)
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 — match mobile

Tailwind tokens to add to `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      sage: { /* paste from mobile colors.ts */ },
      // ...other named tokens from mobile
    },
    boxShadow: {
      wallet: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    },
    fontFamily: {
      sans: ['Heebo', 'system-ui', 'sans-serif'],
    },
  },
},
```

---

## 4. Functional Requirements

| # | Requirement | Story |
|---|---|---|
| ADM-FR1 | Single-user login via Firebase Auth gated by email allowlist | 18.1 |
| ADM-FR2 | i18n (Hebrew RTL default, English LTR toggle) | 18.1 |
| ADM-FR3 | Theme matching Redeemy mobile (Sage teal, Wallet-card style) | 18.1 |
| ADM-FR4 | Live User List showing every user with name, email, signup, last active, locale, platform, family, items per category | 18.2 |
| ADM-FR5 | Recent Activity Feed (last 200 events, auto-refresh every 30s) | 18.2 |
| ADM-FR6 | Mobile-app-side event logging (`events/` collection + `logEvent` helper) | 18.2 |
| ADM-FR7 | Health Status Banner (✅ / 🟠 / 🔴) — crash-free %, top crashes, auth failures, failed writes | 18.3 |
| ADM-FR8 | Cost Widget — current month Firebase spend, cost-per-active-user, projected at 10× | 18.3 |
| ADM-FR9 | Daily Digest Email at 08:00 IST — yesterday's signups, items created, errors, cost delta | 18.4 |
| ADM-FR10 | Mobile-responsive layout — single-column on phones, two-column on desktop | 18.4 |

---

## 5. Story Breakdown (Epic 18)

| Story | Title | Scope | Effort |
|---|---|---|---|
| 18.1 | Admin Dashboard — Foundation, Auth & Theme | Next.js scaffold, Firebase Admin, auth gate, allowlist, i18n, RTL/LTR, Sage-teal theme, layout shell | M |
| 18.2 | Admin Dashboard — User List & Activity Feed | User list page, item-count joins, event logging in mobile app, activity feed page | L |
| 18.3 | Admin Dashboard — Health Banner & Cost Widget | Crashlytics integration, error counters, Firebase cost lookup, status banner component, cost card | M |
| 18.4 | Admin Dashboard — Daily Digest Email & Mobile Polish | Vercel Cron, Resend integration, email template (he+en), responsive polish for phones | M |

**Total: 4 stories.** Falls within BMAD tech-spec scope guidance (2–5 stories).

---

## 6. Non-Functional Requirements

- **Performance:** Page load < 2s on broadband; data refresh < 1s.
- **Security:** Firebase service account key never in client bundle; admin email allowlist as the only auth gate; HTTP-only session cookies.
- **Reliability:** Daily digest email must succeed > 99% of days (retry once on Resend failure; alert via Sentry on cron failure).
- **Cost:** All hosting on free tiers (Vercel free, Resend free 3k/month, Firebase same project as mobile app). Target $0/month incremental cost.
- **Privacy:** Admin can see all user data (this is the point); the dashboard itself is not exposed publicly. No analytics tracking on the admin app.
- **Build time:** V1 should be achievable in 1–2 focused weekends.

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Firebase Admin service account leak | Low | Critical | Store only in Vercel env vars; rotate immediately if exposed; never commit to git |
| Admin email allowlist bypass | Low | Critical | Server-side check in middleware (defense in depth) — never trust client claim |
| Crashlytics REST API rate limits | Medium | Low | Cache last fetch for 5 min server-side |
| GCP billing API access too cumbersome to set up | Medium | Low | Fallback: manual cost entry in env var; revisit in V2 |
| Event logging adds noticeable latency to mobile app saves | Low | Medium | `logEvent` is fire-and-forget; never await; failures silently ignored |
| Duplication of types (Credit, Subscription, etc.) | High | Low | Accept duplication for V1; extract `@redeemy/types` later if pay-off |

---

## 8. Out of Scope (V1)

Explicitly NOT in this tech spec — deferred to V2/V3 stories:

- Aggregate metrics (DAU/WAU/MAU, retention curves, funnels)
- Charts and visualizations of any kind
- Feature Adoption Map / Cold-Hot lists
- Anomaly detection
- Push alerts to phone
- Cohort analysis
- Channel attribution
- Story Mode / investor view
- Public stats page (anonymized)
- Founder's journal export
- Natural-language query interface
- A/B test dashboards
- Dark mode (V2 — light mode only in V1)
- Multi-admin support / role system

---

## 9. Acceptance Criteria for Epic 18 (V1 done = all true)

- [ ] Moti can log in at `admin.redeemy.app` (or Vercel preview URL) with his email + password
- [ ] No other email can log in (allowlist enforced server-side)
- [ ] Hebrew (RTL) is default; English toggle works and persists
- [ ] User list shows every user in production Firestore with all attributes correct
- [ ] Activity feed shows the last 200 events across all users, auto-refreshing
- [ ] Mobile app writes events to Firestore on auth/item/family operations
- [ ] Health banner shows green/orange/red correctly based on actual Crashlytics data
- [ ] Cost widget shows current month Firebase spend (within ±10% of console)
- [ ] Daily digest email arrives at `a.moti96@gmail.com` at 08:00 IST every day
- [ ] Dashboard is usable on iPhone-sized viewport (single column, no horizontal scroll)
- [ ] Visual style is recognizably Redeemy (Sage teal, Wallet cards, Heebo font)
- [ ] Total monthly cost increase from this dashboard: $0

---

## 10. Open Questions (track in Story 18.1 if not resolved before kickoff)

1. **Domain:** Use `admin.redeemy.app` subdomain (requires DNS) or stick with `redeemy-admin.vercel.app` for V1?
2. **Email cost lookup:** Set up GCP Billing API export to BigQuery, or use manual env-var fallback for V1?
3. **Mobile-app event logging:** Should this be a separate sub-PR/story before 18.2, or bundled into 18.2?
4. **Repo structure:** Confirmed separate repo `redeemy-admin`?

**Recommended defaults if not answered:** (1) Vercel subdomain, (2) manual fallback, (3) bundled into 18.2, (4) separate repo.
