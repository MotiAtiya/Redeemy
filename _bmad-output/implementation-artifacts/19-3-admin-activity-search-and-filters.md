# Story 19.3: Admin — Activity feed search & filters

**Epic:** 19 — Admin Dashboard V1.5 quick wins
**Story Key:** 19-3-admin-activity-search-and-filters
**Author:** Moti
**Date:** 2026-05-04
**Status:** done

---

## User Story

As Moti scrolling the activity feed at `/activity`,
I want to search by user name/email and filter by event type and date range,
So that as the feed grows past a few dozen events I can still find the moment I'm looking for.

---

## Background & Context

V1's `/activity` shows the last 200 events as a flat reverse-chronological list. There's already an "errors only" toggle. This story adds three more controls: free-text search (matches user name + email), event-type filter (multi-select), and a simple date-range filter (today / this week / this month / custom).

Implementation approach: do the filtering **client-side**, since 200 events is small. If we ever raise the limit, we'll switch to server-side filters later.

**What this story does NOT do:**
- Server-side pagination (still 200 events server-side)
- Saved filter presets
- Export to CSV (deferred)
- Filter by item-category — covered loosely by event-type filter for now

---

## Acceptance Criteria

### Search box

**Given** I type in the search box at the top of `/activity`
**When** my query is non-empty
**Then** the visible event list narrows to events whose `userName` OR `userId` contains the query (case-insensitive).

**And** an "X clear" button appears in the box; clicking it clears the search.

### Event-type filter

**Given** an event-type dropdown / multi-select control sits next to the search box
**When** I check one or more event types
**Then** only events of those types are shown.

**And** the event types in the dropdown are:
- All (default — clears the filter)
- Sign in / Sign up / Sign out
- App opened
- Item created / updated / deleted
- Status change (group: credit_redeemed/unredeemed/expired, subscription_cancelled, warranty_closed)
- Family events (created/joined/left)
- Errors (firestore_write_failed + image_upload_failed)

**And** the existing "All events / Errors only" toggle is replaced by this dropdown (Errors becomes a preset within it).

### Date-range filter

**Given** a date-range control next to the type filter
**When** I select one of the presets:
- All time (default)
- Last hour
- Today (Israel calendar)
- Last 24 hours
- This week
- Custom (from / to date pickers)
**Then** the visible event list is constrained.

### URL state

**Given** I apply filters
**Then** the URL updates with query params (e.g. `?q=moti&types=item_created,item_updated&range=today`).

**And** if I share the URL or refresh, the filters are restored.

### Empty state

**Given** filters yield zero matches
**Then** a friendly "No events match your filters" message appears with a "Clear filters" button.

### Result count

**Given** filters are applied
**Then** the existing "X events" subtitle updates to "Y of X events" reflecting the current filter.

### Mobile

**Given** I'm on a mobile viewport
**Then** the controls collapse into a single "Filters" button that opens a bottom sheet with the same controls.

### Quality

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Verified end-to-end: searched a username, filtered to errors, picked "Today" — list narrowed correctly

---

## Technical Notes

### Files

```
src/app/(app)/activity/page.tsx              # UPDATE — add controls; pass events to client filter
src/app/(app)/activity/ActivityList.tsx      # NEW — client component, hosts filter state + filtering logic
src/app/(app)/activity/ActivityFilters.tsx   # NEW — search box, type select, date-range select
messages/{he,en}.json                        # UPDATE — activity.filters.*
```

### Approach

- The page itself stays a server component — fetches `loadEvents(200)` as today.
- Renders `<ActivityList events={events} />` (client component).
- `<ActivityList />`:
  - Reads filter state from URL search params via `useSearchParams`.
  - Filters in-memory.
  - Renders `<ActivityFilters />` for the controls + the event row component (extracted from the existing inline render).
- Updating filters: write back to URL via `router.replace(…?q=…&types=…&range=…)`.

### Date-range conversion

Map preset → `{ start, end }` ms timestamps in IL timezone. Reuse the helper from `digest.ts` if practical (or extract to a shared lib).

### Avoid scope creep

Do NOT add server-side filtering (Firestore where clauses + indexes) for now — 200 events is fine to filter in memory. Revisit if/when we raise the limit.

### i18n strings

```
activity.filters.searchPlaceholder: "חיפוש לפי שם משתמש..."
activity.filters.typeLabel: "סוג אירוע"
activity.filters.typeAll: "כל האירועים"
activity.filters.typeAuth / typeItems / typeStatus / typeFamily / typeErrors / typeLifecycle
activity.filters.rangeLabel: "טווח זמנים"
activity.filters.rangeAll / rangeLastHour / rangeToday / rangeLast24h / rangeThisWeek / rangeCustom
activity.filters.clear: "נקה סינון"
activity.empty.filtered: "אין אירועים שתואמים את הסינון"
activity.subtitleFiltered: "{filtered} מתוך {total} אירועים"
```

---

## Dependencies / Sequencing

- No mobile-app changes.
- No Firestore-rule changes.
- No new env vars.
- Independent of Stories 19.1 and 19.2 — can be done in any order.

---

## Done Definition

- [ ] All AC pass
- [ ] Deployed to Vercel
- [ ] Tested with real production data
- [ ] URL-sharing of filter state verified
