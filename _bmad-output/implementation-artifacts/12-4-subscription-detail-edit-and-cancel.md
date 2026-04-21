# Story 12.4: Subscription Detail, Edit & Cancel

**Epic:** 12 — Subscription Management
**Story Key:** 12-4-subscription-detail-edit-and-cancel
**Story ID:** 12.4
**Author:** Moti
**Date:** 2026-04-21
**Status:** review

---

## User Story

As a user,
I want to tap a subscription and see its full details, edit any field, or cancel it,
So that I can keep my subscriptions accurate and act when needed.

---

## Background & Context

Story 12.3 created a placeholder `src/app/subscription/[id].tsx` (just enough to satisfy Expo Router typed routes). This story fully implements that screen. The edit flow and `updateSubscription` Firestore function already exist from Story 12.2. The cancel pattern mirrors `handleMarkClosed` in `src/app/warranty/[id].tsx`.

**What this story does NOT cover:**
- Re-scheduling reminder notifications after edit (Story 12.5 — just cancel old ones, `notificationIds: []` on save)
- History sub-tab display of cancelled subscriptions (Story 12.6)

---

## Acceptance Criteria

### Detail Screen Opens

**Given** the user taps a `SubscriptionCard`
**When** `src/app/subscription/[id].tsx` opens
**Then**:
- Header: back arrow (`arrow-back` / `arrow-forward` for RTL) + subscription name + `⋮` (ellipsis-horizontal) action menu button
- Screen shows the subscription's full details (see below)
- If subscription not found in store: show "לא נמצא" not-found state with back button

### Detail Content Layout

```
[ Hero card ]
  - Large category icon (64px circle, primarySurface bg)
  - Service name (26px bold, textPrimary)
  - Intent badge (full: icon + label, same colors as SubscriptionCard)

[ Details card — rows with separator lines ]
  - 💳 Billing: "חודשי" or "שנתי" + amount
      MONTHLY: "₪X/חודש"
      ANNUAL:  "₪X/שנה  (₪Y/חודש)"  — Y = Math.round(amountAgorot / 12)
      Free:    "חינמי"
  - 📅 Next billing / renewal:
      MONTHLY: "ב-{{day}} לכל חודש — בעוד {{days}} ימים"
      ANNUAL:  formatted date (formatDate) + " — בעוד {{days}} ימים"
  - 🆓 Free trial (only if isFreeTrial):
      "ניסיון חינמי — מסתיים ב-{{date}}, לאחר מכן ₪X/חודש"
  - 🎯 Category: icon + label (subscriptions.category.X)
  - 🎯 Intent: icon + label (subscriptions.intent.X)
  - 🔔 Reminder: "{{reminderDays}} ימים לפני"
  - 🌐 Website (only if websiteUrl set): tappable link → Linking.openURL(websiteUrl)
  - 📝 Notes (only if notes set): plain text
  - 🕐 Added: formatDate(createdAt, dateFormat)
```

### Edit Action

**Given** the user taps "ערוך" in the action sheet
**When** the action sheet dismisses
**Then** `router.push('/add-subscription?subscriptionId=' + sub.id)` navigates to `add-subscription.tsx` in edit mode
(Story 12.2 already handles `?subscriptionId=X` pre-fill and `updateSubscription` save)

### Cancel Subscription

**Given** the user taps "בטל מנוי" in the footer (only shown when `status === ACTIVE`)
**When** the confirmation bottom sheet appears
**Then**:
- Sheet title: `t('subscription.cancel.title')` → "בטל מנוי"
- Sheet body: `t('subscription.cancel.message', { name: sub.serviceName })` → "לבטל את Spotify? המנוי יועבר לארכיון."
- Confirm button: `t('subscription.cancel.confirm')` → "בטל מנוי" (danger color)
- Cancel button: `t('common.cancel')` → "ביטול"

**When** the user confirms cancellation
**Then** (in this order):
1. Offline check: if `useUIStore.getState().offlineMode` → `Alert.alert` and abort
2. Cancel notifications: loop `for (const nid of sub.notificationIds) { await cancelNotification(nid); }` + `await cancelNotification(sub.renewalNotificationId)` — (12.5 will set these; for now arrays are empty, calls are safe)
3. Optimistic store update: `subscriptionsStore.updateSubscription(sub.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() })`
4. Firestore write: `updateSubscription(sub.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() })`
5. Show toast: `t('subscription.cancel.toast', { name: sub.serviceName })` → "Spotify בוטל ועבר לארכיון"
6. After 500ms: `router.back()`

**On Firestore failure:**
- Roll back: `subscriptionsStore.updateSubscription(sub.id, { status: SubscriptionStatus.ACTIVE, cancelledAt: undefined })`
- `Alert.alert(t('common.error'), t('subscription.cancel.error'))`

**Given** the subscription is already CANCELLED
**Then**:
- Footer shows: `t('subscription.cancelledBanner', { date: formatDate(sub.cancelledAt, dateFormat) })` → "בוטל ב-12/05/2026"
- "בטל מנוי" button is NOT shown
- "ערוך" in action sheet is NOT shown (cannot edit cancelled subscription)

### Delete (Permanent)

**Given** the user opens ⋮ action sheet
**When** `canDelete = sub.userId === currentUid || familyAdminId === currentUid`
**Then** "מחק לצמיתות" option appears (danger red)

**When** confirmed via `Alert.alert`:
1. Cancel all notifications (same as cancel flow)
2. `subscriptionsStore.removeSubscription(sub.id)`
3. `deleteSubscription(sub.id)` from `firestoreSubscriptions`
4. `router.back()`

### Offline Guard

- Cancel and Delete operations: show `Alert.alert(t('offline.title'), t('subscription.cancel.offlineMessage'))` and abort if `offlineMode`

---

## Technical Notes

### File

Only one file to fully implement (placeholder exists): `src/app/subscription/[id].tsx`

### Screen Layout — same structure as `warranty/[id].tsx`

```typescript
export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isRTL = I18nManager.isRTL;
  const colors = useAppTheme();
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const sub = useSubscriptionsStore((s) => s.subscriptions.find((s) => s.id === id));
  const updateSubInStore = useSubscriptionsStore((s) => s.updateSubscription);
  const removeSubFromStore = useSubscriptionsStore((s) => s.removeSubscription);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = sub
    ? sub.userId === currentUid || familyAdminId === currentUid
    : false;

  const { toastMessage, showToast } = useToast();  // same pattern as family/[id].tsx

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);
  // ...
}
```

### `useToast()` — Copy from `src/app/family/[id].tsx`

```typescript
function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), 2000);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { toastMessage: message, showToast: show };
}
```

### Cancel Bottom Sheet — `showCancelSheet` Modal (NOT Alert)

The epic specifies a "confirmation bottom sheet", not an Alert. Use the same `Modal` + overlay pattern as the action sheet in `warranty/[id].tsx`:

```tsx
<Modal visible={showCancelSheet} transparent animationType="slide" ...>
  <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCancelSheet(false)} />
  <View style={styles.cancelSheet}>
    <View style={styles.actionSheetHandle} />
    <Text style={styles.cancelSheetTitle}>{t('subscription.cancel.title')}</Text>
    <Text style={styles.cancelSheetMessage}>{t('subscription.cancel.message', { name: sub.serviceName })}</Text>
    <TouchableOpacity style={styles.dangerButton} onPress={handleCancelConfirm} disabled={loading}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dangerButtonText}>{t('subscription.cancel.confirm')}</Text>}
    </TouchableOpacity>
    <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCancelSheet(false)}>
      <Text style={styles.cancelText}>{t('common.cancel')}</Text>
    </TouchableOpacity>
  </View>
</Modal>
```

### Edit navigation — after action sheet dismisses

Same `afterDismissRef` pattern from `warranty/[id].tsx`:
```typescript
function handleEdit() {
  afterDismissRef.current = () => {
    router.push(`/add-subscription?subscriptionId=${sub!.id}`);
  };
  setShowActionSheet(false);
}
```

The `onDismiss` callback on the action sheet Modal fires the ref.

### `cancelNotification` — array loop

```typescript
// Cancel all scheduled notifications for this subscription
for (const nid of sub.notificationIds) {
  await cancelNotification(nid);
}
await cancelNotification(sub.renewalNotificationId);
```

`cancelNotification(undefined)` is safe (returns immediately).

### Import list

```typescript
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, I18nManager, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { updateSubscription, deleteSubscription } from '@/lib/firestoreSubscriptions';
import { cancelNotification } from '@/lib/notifications';
import { formatCurrency } from '@/constants/currencies';
import { formatDate } from '@/lib/formatDate';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SubscriptionBillingCycle, SubscriptionIntent, SubscriptionStatus } from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import { SUBSCRIPTION_INTENTS } from '@/constants/subscriptionIntents';
import { getNextBillingDate, daysUntilBilling, normalizeToMonthlyAgorot } from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';
```

### Intent badge — inline helper using `SUBSCRIPTION_INTENTS`

```typescript
const INTENT_CONFIG = Object.fromEntries(
  SUBSCRIPTION_INTENTS.map((o) => [o.intent, o])
) as Record<SubscriptionIntent, typeof SUBSCRIPTION_INTENTS[0]>;
```

### i18n Keys — `src/locales/en.json` — Add top-level `"subscription"` block

```json
"subscription": {
  "notFound": "Subscription not found",
  "detail": {
    "billing": "Billing",
    "nextBilling": "Next Billing",
    "category": "Category",
    "intent": "Intent",
    "reminder": "Reminder",
    "website": "Website",
    "notes": "Notes",
    "added": "Added",
    "freeTrial": "Free Trial",
    "monthlyBillingDay": "{{day}}th of each month — in {{days}} days",
    "annualRenewal": "{{date}} — in {{days}} days",
    "renewsToday": "Renews today",
    "freeTrialDetail": "Free trial — ends {{date}}, then ₪{{price}}/month",
    "reminderDays_one": "{{count}} day before",
    "reminderDays_other": "{{count}} days before",
    "free": "Free",
    "monthlyAmount": "₪{{amount}}/month",
    "annualAmount": "₪{{amount}}/year (₪{{monthly}}/month)"
  },
  "action": {
    "edit": "Edit",
    "delete": "Delete permanently"
  },
  "cancel": {
    "title": "Cancel Subscription",
    "message": "Cancel {{name}}? It will be archived.",
    "confirm": "Cancel Subscription",
    "toast": "{{name}} was cancelled and archived",
    "error": "Could not cancel. Check your connection and try again.",
    "offlineMessage": "Cancelling subscriptions requires an internet connection."
  },
  "delete": {
    "title": "Delete permanently?",
    "message": "This will permanently delete {{name}} and cannot be undone.",
    "button": "Delete",
    "error": "Could not delete. Check your connection and try again."
  },
  "cancelledBanner": "Cancelled on {{date}}"
}
```

### i18n Keys — `src/locales/he.json` — Add top-level `"subscription"` block

```json
"subscription": {
  "notFound": "המנוי לא נמצא",
  "detail": {
    "billing": "חיוב",
    "nextBilling": "חיוב הבא",
    "category": "קטגוריה",
    "intent": "כוונה",
    "reminder": "תזכורת",
    "website": "אתר",
    "notes": "הערות",
    "added": "נוסף",
    "freeTrial": "ניסיון חינמי",
    "monthlyBillingDay": "ב-{{day}} לכל חודש — בעוד {{days}} ימים",
    "annualRenewal": "{{date}} — בעוד {{days}} ימים",
    "renewsToday": "מתחדש היום",
    "freeTrialDetail": "ניסיון חינמי — מסתיים ב-{{date}}, לאחר מכן ₪{{price}}/חודש",
    "reminderDays_one": "{{count}} יום לפני",
    "reminderDays_other": "{{count}} ימים לפני",
    "free": "חינמי",
    "monthlyAmount": "₪{{amount}}/חודש",
    "annualAmount": "₪{{amount}}/שנה (₪{{monthly}}/חודש)"
  },
  "action": {
    "edit": "ערוך",
    "delete": "מחק לצמיתות"
  },
  "cancel": {
    "title": "בטל מנוי",
    "message": "לבטל את {{name}}? המנוי יועבר לארכיון.",
    "confirm": "בטל מנוי",
    "toast": "{{name}} בוטל ועבר לארכיון",
    "error": "לא ניתן לבטל. בדוק את החיבור ונסה שנית.",
    "offlineMessage": "ביטול מנויים דורש חיבור לאינטרנט."
  },
  "delete": {
    "title": "למחוק לצמיתות?",
    "message": "הפעולה תמחק את {{name}} לצמיתות ולא ניתן לשחזר.",
    "button": "מחק",
    "error": "לא ניתן למחוק. בדוק את החיבור ונסה שנית."
  },
  "cancelledBanner": "בוטל ב-{{date}}"
}
```

---

## Previous Story Intelligence

**Established patterns (Story 12.3 / 12.2 / 12.1):**
- `useSubscriptionsStore` — `subscriptions`, `updateSubscription`, `removeSubscription`
- `updateSubscription` / `deleteSubscription` from `@/lib/firestoreSubscriptions`
- `getNextBillingDate`, `daysUntilBilling`, `normalizeToMonthlyAgorot` from `@/lib/subscriptionUtils`
- `SUBSCRIPTION_CATEGORIES`, `SUBSCRIPTION_INTENTS`, `SUBSCRIPTION_INTENTS_MAP` pattern
- `SubscriptionStatus.CANCELLED` + `cancelledAt` fields on `Subscription` type
- `src/app/subscription/[id].tsx` is already a placeholder file — this story fully implements it

**From `warranty/[id].tsx` (PRIMARY PATTERN):**
- `makeStyles(colors: AppColors)` + `useMemo` for styles
- Header: back arrow (RTL-aware) + title + ⋮ menu button
- `showActionSheet` state + `Modal` overlay + slide animation
- `afterDismissRef` pattern for navigating after modal dismisses
- `ScrollView` + details card with separator lines between rows
- `SafeAreaView` edges `['top', 'bottom']`
- Footer with primary action button (single button)
- Not-found guard: if `!sub` return early with simple "not found" view

**From `family/[id].tsx`:**
- `useToast()` local hook — copy verbatim

**`cancelNotification` signature:** `(notificationId: string | undefined) => Promise<void>` — safe to call with undefined. For arrays: `for (const nid of sub.notificationIds) { await cancelNotification(nid); }`

**`useFamilyStore((s) => s.family?.adminId)`** — gives family admin UID for delete permission check.

**Git context:**
- `80be630 fix(ts): resolve all TypeScript errors` — TypeScript strict, zero errors required
- `6032f16 fix: warranty card badge` — ExpirationBadge color pattern confirmed working

---

## Architecture Compliance Checklist

- [ ] No direct Firestore imports — use `updateSubscription`/`deleteSubscription` from `@/lib/firestoreSubscriptions`
- [ ] `cancelNotification` looped over `notificationIds` array (not called once with array)
- [ ] Offline check before any write operation
- [ ] Optimistic store update before Firestore write; rollback on failure
- [ ] `Linking.openURL` from `react-native` (not from `expo-linking`)
- [ ] RTL: back arrow uses `isRTL ? 'arrow-forward' : 'arrow-back'`
- [ ] `npx tsc --noEmit` passes with zero errors

---

## Anti-Patterns to Avoid

- ❌ Do NOT use `Alert.alert` for cancel confirmation — use a bottom sheet Modal (epic specifies "bottom sheet")
- ❌ Do NOT import `expo-notifications` directly — only `cancelNotification` from `@/lib/notifications`
- ❌ Do NOT allow editing a cancelled subscription (hide "ערוך" in action sheet when `status === CANCELLED`)
- ❌ Do NOT navigate away immediately after cancel — show toast first, then navigate after 500ms delay
- ❌ Do NOT call `deleteSubscription` without first cancelling notifications
- ❌ Do NOT use `expo-linking` — use `Linking` from `react-native`

---

## Files Summary

| Action | File |
|--------|------|
| **REWRITE** | `src/app/subscription/[id].tsx` — full implementation (placeholder exists) |
| **MODIFY** | `src/locales/en.json` — add `subscription.*` top-level block |
| **MODIFY** | `src/locales/he.json` — add `subscription.*` top-level block |

---

## Definition of Done

- [x] `src/app/subscription/[id].tsx` fully implemented (not just placeholder)
- [x] Detail screen shows: service name, billing, next billing date, intent, reminder, website (if set), notes (if set), date added
- [x] Free trial row shown only when `isFreeTrial === true`
- [x] Category icon shown as large circle in hero area
- [x] Intent badge shown (icon + full label)
- [x] ⋮ action sheet has "ערוך" (when ACTIVE) and "מחק לצמיתות" (when canDelete)
- [x] "ערוך" navigates to `/add-subscription?subscriptionId=X` after sheet dismisses
- [x] Footer shows "בטל מנוי" when ACTIVE, "בוטל ב-[date]" banner when CANCELLED
- [x] Cancel bottom sheet (Modal, not Alert) with confirmation
- [x] Cancel: cancels notifications → optimistic store update → Firestore → toast → router.back()
- [x] Cancel rollback on Firestore failure
- [x] Delete: cancels notifications → store remove → Firestore delete → router.back()
- [x] Offline guard on cancel and delete
- [x] Website URL opens via `Linking.openURL`
- [x] Not-found state if subscription not in store
- [x] `en.json` and `he.json` have all `subscription.*` keys
- [x] `npx tsc --noEmit` passes with zero errors

---

## Dev Agent Record

### Implementation Notes

Full rewrite of `src/app/subscription/[id].tsx` (placeholder from Story 12.3). Pattern based on `warranty/[id].tsx`.

**Key decisions:**
- `const s = sub!` pattern in handlers/helpers (same as `const w = warranty!` in warranty screen) to satisfy TypeScript strict mode — handlers can't be called when `sub` is undefined since the early-return guard prevents rendering the interactive UI
- `useToast()` hook copied verbatim from `family/[id].tsx`
- `INTENT_CONFIG` defined locally (same structure as `SubscriptionCard.tsx`) — `SUBSCRIPTION_INTENTS` import not needed since local config includes color keys
- Cancel sheet is a `Modal` (not `Alert`) per epic spec — uses same slide + overlay pattern as action sheet
- `afterDismissRef` pattern from `warranty/[id].tsx` for edit navigation after action sheet dismisses
- `Linking.openURL` from `react-native` (not `expo-linking`) for website URLs

### File List

- `src/app/subscription/[id].tsx` — full rewrite (was placeholder)
- `src/locales/en.json` — added `subscription.*` top-level block
- `src/locales/he.json` — added `subscription.*` top-level block

### Change Log

- 2026-04-21: Implemented Story 12.4 — Subscription Detail, Edit & Cancel screen
