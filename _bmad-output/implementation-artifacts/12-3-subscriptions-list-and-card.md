# Story 12.3: Subscriptions List & Card

**Epic:** 12 — Subscription Management
**Story Key:** 12-3-subscriptions-list-and-card
**Author:** Moti
**Date:** 2026-04-21
**Status:** review

---

## User Story

As a user,
I want to see all my active subscriptions in a clean list with a monthly total at the top,
So that I instantly understand my recurring financial commitments.

---

## Background & Context

This story transforms the placeholder `src/app/(tabs)/subscriptions.tsx` into the full Subscriptions tab screen. Story 12.1 scaffolded the data model and store; Story 12.2 built the add flow and `firestoreSubscriptions.ts`. This story wires up the real-time listener, builds the `SubscriptionCard` component, and writes the `subscriptionUtils.ts` utility library that all future stories (12.4–12.6) depend on.

**What this story does NOT cover:**
- Subscription detail/edit/cancel (Story 12.4)
- Reminder notification scheduling (Story 12.5)
- History sub-tabs for cancelled subscriptions (Story 12.6)

---

## Acceptance Criteria

### Main List Screen

**Given** the user taps the Subscriptions tab
**When** `src/app/(tabs)/subscriptions.tsx` renders
**Then**:
- A summary header shows: `₪X/חודש` — sum of ALL active paid subscriptions normalized to monthly:
  - MONTHLY: `amountAgorot` as-is
  - ANNUAL: `Math.round(amountAgorot / 12)`
  - Free subscriptions (`isFree = true`) excluded from the total
- Below the total: `X מנויים פעילים` (count of ACTIVE subscriptions including free)
- List shows `SubscriptionCard` in a `FlatList`, sorted by **days until next billing (ascending)** — soonest first
- FAB (+) always visible bottom-right; taps → `router.push('/add-subscription')`

### Subscription Card

**Given** a subscription card renders
**Then** it shows:

```
[ category icon (32px) ]  [ service name (bold 18px) ]        [ intent badge ]
                           [ amount + cycle line       ]
                           [ urgency badge + renewal line ]
```

**Amount + cycle line:**
- If `isFree`: `חינמי` (gray)
- If `isFreeTrial && trialEndsDate`: `ניסיון חינמי — מסתיים בעוד X ימים` (amber color, see below)
- If `MONTHLY && !isFree && !isFreeTrial`: `₪X/חודש` (formatted with `formatCurrency`)
- If `ANNUAL && !isFree`: `₪X/שנה (₪Y/חודש)` — Y = `Math.round(amountAgorot / 12)` formatted

**Renewal line** (below amount):
- MONTHLY: `מתחדש ב-{{day}} לכל חודש — בעוד X ימים`
- ANNUAL: `מתחדש בעוד X ימים — {{formattedDate}}`
- If `daysUntilBilling(sub) === 0`: `מתחדש היום`
- If `daysUntilBilling(sub) === 1`: `מתחדש מחר`

**Urgency badge** (inline on renewal line, right of text):
- `days < 7`: red (`urgencyRed` text, `urgencyRedSurface` background)
- `7 ≤ days ≤ 30`: amber (`urgencyAmber` / `urgencyAmberSurface`)
- `days > 30`: green (`urgencyGreen` / `urgencyGreenSurface`)
- If `isFreeTrial && trialEndsDate`: use days until trial ends instead, always show amber

**Intent badge** (top-right of card):
- Small pill badge: icon (12px) + short label
- RENEW: `refresh-outline` + `לחדש` — green surface
- CANCEL: `close-circle-outline` + `לבטל` — red surface
- MODIFY: `create-outline` + `לשנות` — amber surface
- CHECK: `eye-outline` + `לבדוק` — gray surface

**Family member avatar:**
- If `familyId` is set AND `createdBy !== currentUser.uid`:
  show a small circular avatar overlay (bottom-end of icon area) with member initials — same pattern as WarrantyCard

### Empty State

**Given** no ACTIVE subscriptions exist
**Then**:
- Icon: `repeat-outline` (56px, `textTertiary`)
- Title: `t('subscriptions.empty.title')` → "אין מנויים עדיין"
- Subtitle: `t('subscriptions.empty.subtitle')`
- CTA button: `t('subscriptions.empty.action')` → "הוסף מנוי" → `router.push('/add-subscription')`

### Card Tap

**Given** the user taps a subscription card
**Then** `router.push({ pathname: '/subscription/[id]', params: { id: item.id } })` is called
(Story 12.4 creates this screen; the push will silently fail until then — no error in 12.3)

### Real-Time Listener

**Given** the screen mounts
**When** user is authenticated
**Then** `useSubscriptionsListener(userId, familyId)` starts an `onSnapshot` listener
- Data flows: `firestoreSubscriptions.subscribeToSubscriptions` → `subscriptionsStore.setSubscriptions`
- Listener tears down on unmount (return unsubscribe)
- Listener is re-established when `userId` or `familyId` changes

---

## Technical Notes

### File Structure

```
src/lib/subscriptionUtils.ts                    ← NEW: utility functions
src/hooks/useSubscriptionsListener.ts           ← NEW: real-time listener hook
src/components/redeemy/SubscriptionCard.tsx     ← NEW: card component
src/app/(tabs)/subscriptions.tsx                ← MODIFY: full rewrite (was placeholder)
src/locales/en.json                             ← MODIFY: add subscriptionCard.* keys
src/locales/he.json                             ← MODIFY: add subscriptionCard.* keys
```

### `src/lib/subscriptionUtils.ts` — NEW

```typescript
import { SubscriptionBillingCycle, SubscriptionStatus, type Subscription } from '@/types/subscriptionTypes';

/**
 * Computes the next billing date for a subscription.
 * ANNUAL: returns nextBillingDate directly.
 * MONTHLY: finds the next occurrence of billingDayOfMonth from today.
 */
export function getNextBillingDate(sub: Subscription): Date {
  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    return sub.nextBillingDate ?? new Date();
  }
  // MONTHLY: find next occurrence of billingDayOfMonth
  const today = new Date();
  const day = sub.billingDayOfMonth ?? 1;
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate <= today) {
    // Billing day already passed this month — use next month
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

/**
 * Returns days until next billing event (rounded up).
 * Returns 0 if billing is today or in the past.
 */
export function daysUntilBilling(sub: Subscription): number {
  const next = getNextBillingDate(sub);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / msPerDay));
}

/**
 * Normalizes subscription amount to monthly agorot.
 * Free subscriptions return 0.
 */
export function normalizeToMonthlyAgorot(sub: Subscription): number {
  if (sub.isFree) return 0;
  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    return Math.round(sub.amountAgorot / 12);
  }
  return sub.amountAgorot;
}

/**
 * Sums all active non-free subscriptions normalized to monthly agorot.
 */
export function computeMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.status === SubscriptionStatus.ACTIVE && !s.isFree)
    .reduce((acc, s) => acc + normalizeToMonthlyAgorot(s), 0);
}
```

### `src/hooks/useSubscriptionsListener.ts` — NEW

Mirror `useWarrantiesListener.ts` exactly — swap `subscribeToWarranties` → `subscribeToSubscriptions`, `useWarrantiesStore` → `useSubscriptionsStore`:

```typescript
import { useEffect } from 'react';
import { subscribeToSubscriptions } from '@/lib/firestoreSubscriptions';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';

export function useSubscriptionsListener(
  userId: string | null,
  familyId: string | null | undefined
): void {
  const setLoading = useSubscriptionsStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsubscribe = subscribeToSubscriptions(userId, familyId);
    return unsubscribe;
  }, [userId, familyId, setLoading]);
}
```

### `src/components/redeemy/SubscriptionCard.tsx` — NEW

Props:
```typescript
interface Props {
  subscription: Subscription;
  onPress: () => void;
}
```

Structure mirrors `WarrantyCard.tsx`:
- `makeStyles(colors: AppColors)` function (RTL-aware only if needed — use `marginStart`/`marginEnd` for directional spacing)
- `useMemo` for styles
- `useTranslation`, `useAppTheme`, `useAuthStore` for member avatar

**Left icon column** (fixed width ~52px):
```
[ category icon circle (48×48, primarySurface bg) ]
[ member avatar overlay if family ]
```

**Right content column** (flex: 1):
- Row 1: `serviceName` (bold 17px) + `IntentBadge` (right-aligned, inline)
- Row 2: amount/cycle text (15px, textSecondary for free/amber for trial)
- Row 3: renewal line (13px, textTertiary) + urgency chip (inline, right)

**Intent badge** — inline pill component (defined inside SubscriptionCard.tsx, not a separate file):
```typescript
function IntentBadge({ intent }: { intent: SubscriptionIntent }) {
  // Map intent → { icon, labelKey, color, surface }
  // RENEW: green, CANCEL: red, MODIFY: amber, CHECK: gray (textSecondary / separator)
}
```

**Urgency** — use `daysUntilBilling(sub)` for the color; if `isFreeTrial && trialEndsDate`, compute days until `trialEndsDate` instead:
```typescript
const daysForUrgency = (() => {
  if (sub.isFreeTrial && sub.trialEndsDate) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.ceil((sub.trialEndsDate.getTime() - Date.now()) / msPerDay));
  }
  return daysUntilBilling(sub);
})();
```

### `src/app/(tabs)/subscriptions.tsx` — Full Rewrite

Replace the placeholder with the real screen. Key structure:

```typescript
export default function SubscriptionsScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);

  // Wire listener
  useSubscriptionsListener(currentUser?.uid ?? null, familyId);

  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);
  const isLoading = useSubscriptionsStore((s) => s.isLoading);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE),
    [subscriptions]
  );

  const sorted = useMemo(
    () => [...activeSubscriptions].sort((a, b) => daysUntilBilling(a) - daysUntilBilling(b)),
    [activeSubscriptions]
  );

  const monthlyTotal = useMemo(() => computeMonthlyTotal(activeSubscriptions), [activeSubscriptions]);

  // ... render
}
```

**Header:**
```
₪X/חודש       ← large (28px bold, colors.primary)
X מנויים פעילים ← smaller (14px, colors.textSecondary)
```

Only show header if `activeSubscriptions.length > 0` OR `isLoading` (hide during empty state).

**List:** `FlatList` with:
- `data={sorted}`
- `keyExtractor={(item) => item.id}`
- `renderItem={({ item }) => <SubscriptionCard subscription={item} onPress={() => router.push({...})} />}`
- `ListEmptyComponent={renderEmpty}` (only when `!isLoading`)
- `contentContainerStyle` flex: 1 when empty
- `showsVerticalScrollIndicator={false}`
- `ListHeaderComponent` = the total/count header (when `activeSubscriptions.length > 0`)

**FAB:** same as Story 12.1 placeholder — `router.push('/add-subscription')`

### Intent Badge Color Map

| Intent | Icon | Label key | Text color | Background |
|--------|------|-----------|------------|------------|
| RENEW | `refresh-outline` | `subscriptions.intent.renew` | `urgencyGreen` | `urgencyGreenSurface` |
| CANCEL | `close-circle-outline` | `subscriptions.intent.cancel` | `urgencyRed` | `urgencyRedSurface` |
| MODIFY | `create-outline` | `subscriptions.intent.modify` | `urgencyAmber` | `urgencyAmberSurface` |
| CHECK | `eye-outline` | `subscriptions.intent.check` | `textSecondary` | `separator` |

### i18n Keys — `src/locales/en.json` — Add to `subscriptions`

Add these keys **inside the existing `"subscriptions"` block** (not a new top-level key):

```json
"monthlyTotal": "₪{{amount}}/month",
"activeCount_one": "{{count}} active subscription",
"activeCount_other": "{{count}} active subscriptions"
```

Add a new top-level block `"subscriptionCard"`:

```json
"subscriptionCard": {
  "free": "Free",
  "freeTrial": "Free trial — ends in {{days}} days",
  "freeTrialEndsToday": "Free trial — ends today",
  "monthlyAmount": "₪{{amount}}/month",
  "annualAmount": "₪{{amount}}/year (₪{{monthly}}/month)",
  "renewsToday": "Renews today",
  "renewsTomorrow": "Renews tomorrow",
  "renewsInDays": "Renews in {{days}} days",
  "renewsOnDay": "Renews on the {{day}}th each month",
  "renewsOnDaySoon": "Renews on the {{day}}th — in {{days}} days",
  "renewsOnDate": "Renews in {{days}} days — {{date}}"
}
```

### i18n Keys — `src/locales/he.json` — Add to `subscriptions`

Add inside existing `"subscriptions"`:
```json
"monthlyTotal": "₪{{amount}}/חודש",
"activeCount_one": "מנוי פעיל אחד",
"activeCount_other": "{{count}} מנויים פעילים"
```

Add new top-level `"subscriptionCard"`:
```json
"subscriptionCard": {
  "free": "חינמי",
  "freeTrial": "ניסיון חינמי — מסתיים בעוד {{days}} ימים",
  "freeTrialEndsToday": "ניסיון חינמי — מסתיים היום",
  "monthlyAmount": "₪{{amount}}/חודש",
  "annualAmount": "₪{{amount}}/שנה (₪{{monthly}}/חודש)",
  "renewsToday": "מתחדש היום",
  "renewsTomorrow": "מתחדש מחר",
  "renewsInDays": "מתחדש בעוד {{days}} ימים",
  "renewsOnDay": "מתחדש ב-{{day}} לכל חודש",
  "renewsOnDayInDays": "מתחדש ב-{{day}} לכל חודש — בעוד {{days}} ימים",
  "renewsOnDate": "מתחדש בעוד {{days}} ימים — {{date}}"
}
```

---

## Previous Story Intelligence (Story 12.2)

**Established patterns:**
- `useSubscriptionsStore` from `@/stores/subscriptionsStore` — `subscriptions`, `isLoading`, `error`
- `subscribeToSubscriptions` from `@/lib/firestoreSubscriptions`
- `SubscriptionBillingCycle`, `SubscriptionIntent`, `SubscriptionStatus` enums from `@/types/subscriptionTypes`
- `SUBSCRIPTION_CATEGORIES` from `@/constants/subscriptionCategories`
- `SUBSCRIPTION_INTENTS` from `@/constants/subscriptionIntents`
- `formatCurrency` from `@/constants/currencies`

**From Story 11.1 (WarrantyCard pattern):**
- `makeStyles(colors: AppColors)` function pattern
- `useMemo` for memoized styles
- Left icon column + right content column card layout
- Member avatar overlay: `createdBy !== currentUid` check → initials from `createdByName`
- Family member display: `familyId && createdBy && createdByName && createdBy !== currentUid`

**From warranties screen pattern:**
- `FlatList` with `ListEmptyComponent`, `ListHeaderComponent`
- `useMemo` for filtered + sorted data
- `contentContainerStyle` flex handling for empty state

**Git context (recent commits):**
- `80be630 fix(ts): resolve all TypeScript errors` — TypeScript strict, zero errors required
- `291b655 perf: cache node_modules in EAS Update workflow` — no CI changes needed

**Colors (from `src/constants/colors.ts`):**
- `urgencyRed: '#B91C1C'` / `urgencyRedSurface: '#FEE2E2'`
- `urgencyAmber: '#B45309'` / `urgencyAmberSurface: '#FEF3C7'`
- `urgencyGreen: '#166534'` / `urgencyGreenSurface: '#DCFCE7'`
- `primary: '#5F9E8F'` (Sage teal) / `primarySurface: '#CCFBF1'`

---

## Architecture Compliance Checklist

- [ ] `useSubscriptionsListener` is the ONLY place that calls `subscribeToSubscriptions` — no direct Firestore calls from screen
- [ ] `subscriptionUtils.ts` contains ALL billing date / total computation logic — no inline calculations in components
- [ ] `useSubscriptionsStore` actions are synchronous setters only
- [ ] All amounts displayed via `formatCurrency()` from `@/constants/currencies`
- [ ] `normalizeToMonthlyAgorot(sub)` used for the monthly total — never `sub.amountAgorot / 12` inline
- [ ] `getNextBillingDate(sub)` used for sorting — never inline date computation
- [ ] RTL: use `marginStart`/`marginEnd` for directional card padding; `I18nManager.isRTL` only where needed
- [ ] `onPress` navigates with `{ pathname: '/subscription/[id]', params: { id: item.id } }` — Story 12.4 creates this screen
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All new UI text in both `en.json` AND `he.json`

---

## Anti-Patterns to Avoid

- ❌ Do NOT read `subscriptions.tsx` from multiple places — only the store, hydrated by the listener
- ❌ Do NOT create a new `subscriptions` screen under `src/app/subscription/` — the list is `(tabs)/subscriptions.tsx`; detail is `subscription/[id].tsx` (Story 12.4)
- ❌ Do NOT compute `amountAgorot / 12` inline — use `normalizeToMonthlyAgorot(sub)` from `subscriptionUtils`
- ❌ Do NOT style intent badges as a separate file — keep them as a local function inside `SubscriptionCard.tsx`
- ❌ Do NOT use `ExpirationBadge` for subscriptions — subscriptions have different urgency semantics (billing days, not warranty expiry)
- ❌ Do NOT set up the listener in every component — only in the screen-level component (`subscriptions.tsx`)
- ❌ Do NOT sort on raw dates without `getNextBillingDate()` — MONTHLY subs have no `nextBillingDate` field

---

## Files Summary

| Action | File |
|--------|------|
| **CREATE** | `src/lib/subscriptionUtils.ts` |
| **CREATE** | `src/hooks/useSubscriptionsListener.ts` |
| **CREATE** | `src/components/redeemy/SubscriptionCard.tsx` |
| **MODIFY** | `src/app/(tabs)/subscriptions.tsx` — full rewrite |
| **MODIFY** | `src/locales/en.json` — add `subscriptions.monthlyTotal/activeCount` + `subscriptionCard.*` |
| **MODIFY** | `src/locales/he.json` — same |

---

## Definition of Done

- [x] `src/lib/subscriptionUtils.ts` exists with `getNextBillingDate`, `daysUntilBilling`, `normalizeToMonthlyAgorot`, `computeMonthlyTotal`
- [x] `src/hooks/useSubscriptionsListener.ts` exists and mirrors `useWarrantiesListener`
- [x] `src/components/redeemy/SubscriptionCard.tsx` renders all card rows
- [x] Card shows: category icon, service name, intent badge, amount/cycle, renewal line, urgency
- [x] Free trial shows amber `ניסיון חינמי — מסתיים בעוד X ימים` text
- [x] Family member avatar shown for shared subscriptions
- [x] `src/app/(tabs)/subscriptions.tsx` shows monthly total header + active count
- [x] FlatList sorted by `daysUntilBilling` ascending
- [x] Empty state with icon, title, subtitle, CTA button
- [x] FAB navigates to `/add-subscription`
- [x] Card tap navigates to `subscription/[id]` (route not yet created — push is wired, no crash)
- [x] `en.json` and `he.json` have all `subscriptionCard.*` and updated `subscriptions.*` keys
- [x] `npx tsc --noEmit` passes with zero errors

---

## Dev Agent Record

### Implementation Notes

**Date:** 2026-04-21
**Implemented by:** Claude Sonnet 4.6 (dev-story workflow)

#### Files Created

- `src/lib/subscriptionUtils.ts` — `getNextBillingDate` (handles MONTHLY/ANNUAL), `daysUntilBilling`, `normalizeToMonthlyAgorot`, `computeMonthlyTotal`
- `src/hooks/useSubscriptionsListener.ts` — mirrors `useWarrantiesListener`; sets up `onSnapshot` listener, tears down on unmount
- `src/components/redeemy/SubscriptionCard.tsx` — category icon circle + member avatar + service name + inline `IntentBadge` (local function, not separate file) + amount/trial text + renewal line + urgency badge
- `src/app/subscription/[id].tsx` — minimal placeholder so `/subscription/[id]` is a valid typed route; prevents TypeScript error for `router.push` in subscriptions.tsx. Story 12.4 will fully implement this screen.

#### Files Modified

- `src/app/(tabs)/subscriptions.tsx` — full rewrite: uses `useSubscriptionsListener`, FlatList with `ListHeaderComponent` (monthly total + count), sorted by `daysUntilBilling`, empty state, FAB
- `src/locales/en.json` — added `subscriptions.monthlyTotal/activeCount` + new top-level `subscriptionCard.*` block
- `src/locales/he.json` — same in Hebrew

#### Key Decisions

- Created `src/app/subscription/[id].tsx` placeholder (Story 12.4 file) to satisfy Expo Router typed routes — without it, `router.push({ pathname: '/subscription/[id]', ... })` fails TypeScript with "not assignable to type" because the file doesn't exist yet
- `IntentBadge` is a local inline render function inside `SubscriptionCard.tsx` (not a separate component) — one usage, no premature abstraction
- `INTENT_CONFIG` map keyed by `SubscriptionIntent` enum for O(1) lookup without repeated array finds
- `daysForUrgency` uses `trialEndsDate` for free-trial subs instead of billing date — keeps urgency semantically correct
- Header is hidden when `activeSubscriptions.length === 0` (title is visible in empty state icon area context)

#### Validation

- `npx tsc --noEmit` → EXIT: 0 (zero TypeScript errors)
