# Story 12.1: Navigation Refactor & Subscription Data Model

**Epic:** 12 — Subscription Management
**Story Key:** 12-1-navigation-refactor-and-subscription-data-model
**Author:** Moti
**Date:** 2026-04-21
**Status:** review

---

## User Story

As a developer,
I want the navigation restructured to accommodate subscriptions and the full data model scaffolded,
So that all subsequent subscription stories have a consistent foundation.

---

## Background & Context

Redeemy currently has 5 tabs: Credits · Stores · Warranties · History · More (set up in Story 11.1). This story introduces a 6th conceptual item — Subscriptions — but keeps the tab count at 5 by removing Stores from the tab bar and making it accessible via a header icon button in the Credits tab instead. The data model for subscriptions is scaffolded here (types, store, constants, Zod schema, Firestore rules, i18n keys) so that all downstream stories (12.2–12.6) can build on a solid foundation without conflicts.

**What this story does NOT implement:**
- The Add Subscription flow (Story 12.2)
- The subscription list/card UI (Story 12.3)
- Any subscription Firestore read/write logic (Story 12.3+)
- Reminder notifications for subscriptions (Story 12.5)
- Family sharing for subscriptions (Story 12.6)

---

## Acceptance Criteria

### Tab Bar Restructure

**Given** the app launches after this story
**When** the tab bar is visible
**Then**:
- Tab order (left to right): **זיכויים** (wallet-outline) | **אחריויות** (shield-checkmark-outline) | **מנויים** (repeat-outline) | **היסטוריה** (time-outline) | **עוד** (ellipsis-horizontal-outline)
- `src/app/(tabs)/stores.tsx` is NO LONGER a tab — removed from `_layout.tsx` tab list entirely
- `src/app/(tabs)/subscriptions.tsx` exists and is wired as the 3rd tab (between Warranties and History)
- The placeholder subscriptions screen shows a centered "מנויים" title text (to be replaced in Story 12.3)

### Credits Tab — Stores Access Icon

**Given** the user is on the Credits tab (`src/app/(tabs)/index.tsx`)
**When** the header renders
**Then**:
- A storefront icon button (`storefront-outline`) appears in the top-right area of the header, alongside the existing sort button
- Tapping it navigates to `(tabs)/stores` via `router.push('/(tabs)/stores')` or `router.navigate`
- The stores screen remains intact and functional — only removed from the tab bar, not deleted

### Subscriptions Tab Placeholder

**Given** the user taps the Subscriptions tab
**When** `src/app/(tabs)/subscriptions.tsx` renders
**Then**:
- The screen shows the title "מנויים" (or uses `t('subscriptions.title')`)
- A FAB `+` button is visible (same style as Credits/Warranties FAB) — does nothing in this story (will be wired in Story 12.2)
- This is a placeholder screen — full implementation is Story 12.3

### Data Model Scaffolded

**Given** the data model files are created
**Then**:
- `src/types/subscriptionTypes.ts` defines all enums and the `Subscription` interface (see Technical Notes)
- `src/stores/subscriptionsStore.ts` follows the exact Zustand pattern of `warrantiesStore.ts`
- `src/constants/subscriptionCategories.ts` defines 10 categories with Ionicons names
- `src/constants/subscriptionIntents.ts` defines 4 intent options with labels and icons
- `SubscriptionSchema` added to `src/lib/validation.ts`
- Firestore rules updated for `/subscriptions/{subscriptionId}`
- Firestore composite indexes added for subscriptions
- i18n keys added to both `src/locales/en.json` and `src/locales/he.json`

**And** TypeScript compiles with zero errors (`npx tsc --noEmit`)

### History Tab — ItemType Extended

**Given** the History tab renders
**When** the filter chips row is visible
**Then**:
- A third filter option `'subscriptions'` exists in the `ItemType` union type: `'all' | 'credits' | 'warranties' | 'subscriptions'`
- The "מנויים" chip is visible in the filter row
- Tapping it shows an empty state or the existing layout (content not wired until Story 12.6)
- Existing "זיכויים" and "אחריויות" sections are completely unaffected

---

## Technical Notes

### Tab Layout Change — `src/app/(tabs)/_layout.tsx`

**Current order (5 tabs):** Credits · Stores · Warranties · History · More

**New order (5 tabs):** Credits · Warranties · Subscriptions · History · More

Change: Remove `<Tabs.Screen name="stores" .../>`, add `<Tabs.Screen name="subscriptions" .../>` between warranties and history.

```typescript
// REMOVE this block entirely:
<Tabs.Screen
  name="stores"
  options={{
    title: t('tabs.stores'),
    tabBarIcon: tabIcon('storefront-outline'),
  }}
/>

// ADD between warranties and history:
<Tabs.Screen
  name="subscriptions"
  options={{
    title: t('tabs.subscriptions'),
    tabBarIcon: tabIcon('repeat-outline'),
  }}
/>
```

The `stores.tsx` file is NOT deleted. It remains as a navigable screen accessible from the Credits tab header.

### Credits Tab Header — `src/app/(tabs)/index.tsx`

Add a storefront icon button to the header. The current header has a sort button (right side). Add the storefront icon button next to it:

```typescript
// In the header row, add alongside the sort button:
<TouchableOpacity onPress={() => router.push('/(tabs)/stores')} style={styles.iconBtn}>
  <Ionicons name="storefront-outline" size={24} color={colors.textPrimary} />
</TouchableOpacity>
```

The `router.push('/(tabs)/stores')` navigates to the existing stores screen even though it's no longer a tab.

### `src/types/subscriptionTypes.ts` — Full Interface

```typescript
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export enum SubscriptionBillingCycle {
  MONTHLY = 'monthly',
  ANNUAL  = 'annual',
}

export enum SubscriptionIntent {
  RENEW  = 'renew',
  CANCEL = 'cancel',
  MODIFY = 'modify',
  CHECK  = 'check',
}

export enum SubscriptionStatus {
  ACTIVE    = 'active',
  CANCELLED = 'cancelled',
}

export interface Subscription {
  id: string;
  userId: string;
  serviceName: string;
  billingCycle: SubscriptionBillingCycle;
  amountAgorot: number;           // integer agorot (₪ × 100), 0 for free
  isFree: boolean;                // true → amountAgorot = 0, excluded from monthly total
  // Monthly-specific
  billingDayOfMonth?: number;     // 1–31, only for MONTHLY
  // Annual-specific
  nextBillingDate?: Date;         // full date, only for ANNUAL
  // Free trial (MONTHLY only)
  isFreeTrial: boolean;
  freeTrialMonths?: number;
  priceAfterTrialAgorot?: number; // required if isFreeTrial === true
  trialEndsDate?: Date;           // computed: createdAt + freeTrialMonths
  // Classification
  category: string;               // matches subscriptionCategories id
  intent: SubscriptionIntent;
  status: SubscriptionStatus;
  // Reminders
  reminderDays: number;
  notificationIds: string[];      // up to 2 (week + day before for CANCEL/MODIFY)
  renewalNotificationId?: string; // on-day notification for RENEW intent
  // Optional
  websiteUrl?: string;
  notes?: string;
  // Family sharing
  familyId?: string;
  createdBy?: string;
  createdByName?: string;
  // Lifecycle
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### `src/stores/subscriptionsStore.ts` — Exact Zustand Pattern

Mirror `warrantiesStore.ts` exactly. Pattern:

```typescript
import { create } from 'zustand';
import type { Subscription } from '@/types/subscriptionTypes';

interface SubscriptionsState {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionsActions {
  setSubscriptions: (subscriptions: Subscription[]) => void;
  addSubscription: (subscription: Subscription) => void;
  updateSubscription: (id: string, changes: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSubscriptionsStore = create<SubscriptionsState & SubscriptionsActions>()((set) => ({
  subscriptions: [],
  isLoading: false,
  error: null,
  setSubscriptions: (subscriptions) => set({ subscriptions }),
  addSubscription: (subscription) => set((s) => ({ subscriptions: [subscription, ...s.subscriptions] })),
  updateSubscription: (id, changes) => set((s) => ({
    subscriptions: s.subscriptions.map((sub) => sub.id === id ? { ...sub, ...changes } : sub),
  })),
  removeSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
```

**Rules:** Store actions are synchronous setters ONLY. No async logic. No Firestore calls. Same rule as `warrantiesStore` and `creditsStore`.

### `src/constants/subscriptionCategories.ts`

```typescript
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface SubscriptionCategory {
  id: string;
  label: string;         // English label (i18n key: `category.subscription.${id}`)
  icon: IoniconsName;
}

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [
  { id: 'communication', label: 'Communication',  icon: 'phone-portrait-outline' },
  { id: 'entertainment', label: 'Entertainment',  icon: 'film-outline'           },
  { id: 'fitness',       label: 'Fitness',        icon: 'barbell-outline'        },
  { id: 'software',      label: 'Software',       icon: 'laptop-outline'         },
  { id: 'education',     label: 'Education',      icon: 'school-outline'         },
  { id: 'charity',       label: 'Charity',        icon: 'heart-outline'          },
  { id: 'home',          label: 'Home',           icon: 'home-outline'           },
  { id: 'automotive',    label: 'Automotive',     icon: 'car-outline'            },
  { id: 'loyalty',       label: 'Loyalty Club',   icon: 'pricetag-outline'       },
  { id: 'other',         label: 'Other',          icon: 'grid-outline'           },
];
```

### `src/constants/subscriptionIntents.ts`

```typescript
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionIntent } from '@/types/subscriptionTypes';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface IntentOption {
  intent: SubscriptionIntent;
  labelKey: string;        // i18n key
  descriptionKey: string;  // i18n key for one-line description
  icon: IoniconsName;
}

export const SUBSCRIPTION_INTENTS: IntentOption[] = [
  {
    intent: SubscriptionIntent.RENEW,
    labelKey: 'subscriptions.intent.renew',
    descriptionKey: 'subscriptions.intent.renewDesc',
    icon: 'refresh-outline',
  },
  {
    intent: SubscriptionIntent.CANCEL,
    labelKey: 'subscriptions.intent.cancel',
    descriptionKey: 'subscriptions.intent.cancelDesc',
    icon: 'close-circle-outline',
  },
  {
    intent: SubscriptionIntent.MODIFY,
    labelKey: 'subscriptions.intent.modify',
    descriptionKey: 'subscriptions.intent.modifyDesc',
    icon: 'create-outline',
  },
  {
    intent: SubscriptionIntent.CHECK,
    labelKey: 'subscriptions.intent.check',
    descriptionKey: 'subscriptions.intent.checkDesc',
    icon: 'eye-outline',
  },
];
```

### `src/lib/validation.ts` — Add SubscriptionSchema

Append to the existing file (do NOT replace `CreditSchema` or `UserSchema`):

```typescript
import { SubscriptionBillingCycle, SubscriptionIntent, SubscriptionStatus } from '@/types/subscriptionTypes';

export const SubscriptionSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),

  billingCycle: z.nativeEnum(SubscriptionBillingCycle),

  amountAgorot: z.number().int().min(0),

  isFree: z.boolean(),

  billingDayOfMonth: z.number().int().min(1).max(31).optional(),

  nextBillingDate: z.date().optional(),

  isFreeTrial: z.boolean(),

  freeTrialMonths: z.number().int().positive().optional(),

  priceAfterTrialAgorot: z.number().int().min(0).optional(),

  category: z.string().min(1, 'Category is required'),

  intent: z.nativeEnum(SubscriptionIntent),

  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),

  reminderDays: z.number().int().positive(),

  websiteUrl: z.string().url().optional().or(z.literal('')),

  notes: z.string().optional().default(''),
}).refine(
  (data) => !data.isFreeTrial || (data.priceAfterTrialAgorot !== undefined && data.priceAfterTrialAgorot > 0),
  { message: 'Price after trial is required when free trial is enabled' }
);

export type SubscriptionSchemaInput = z.input<typeof SubscriptionSchema>;
export type SubscriptionSchemaOutput = z.output<typeof SubscriptionSchema>;
```

Also re-export the new enums at the bottom:
```typescript
export { SubscriptionBillingCycle, SubscriptionIntent, SubscriptionStatus };
```

### `firebase/firestore.rules` — Add Subscriptions

Append to the existing rules file (after the `warranties` match block):

```
// Subscriptions — owner OR family member can read/write
match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    isFamilyMember(resource.data.familyId)
  );

  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid;

  allow update: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    isFamilyMember(resource.data.familyId)
  );

  allow delete: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    isFamilyAdmin(resource.data.familyId)
  );
}
```

The `isFamilyMember` and `isFamilyAdmin` helpers already exist — do NOT duplicate them.

### `firebase/firestore.indexes.json` — Add Subscription Indexes

Add to the `indexes` array (alongside existing credit and warranty indexes):

```json
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "nextBillingDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "familyId", "order": "ASCENDING" },
    { "fieldPath": "nextBillingDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "nextBillingDate", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "familyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "nextBillingDate", "order": "ASCENDING" }
  ]
}
```

### `src/app/(tabs)/subscriptions.tsx` — Placeholder Screen

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function SubscriptionsScreen() {
  const { t } = useTranslation();
  const colors = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('subscriptions.title')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
});
```

**Note:** This placeholder is intentionally minimal. Story 12.3 replaces this entirely with the full subscriptions list UI.

### History Tab — `src/app/(tabs)/history.tsx`

Add `'subscriptions'` to the `ItemType` union and render a filter chip for it. The existing two-section rendering (credits + warranties) is unchanged. When `'subscriptions'` is selected, show empty content or a placeholder:

```typescript
// Extend the type:
type ItemType = 'all' | 'credits' | 'warranties' | 'subscriptions';
```

Add a "מנויים" / "Subscriptions" chip to the filter row. When selected, show nothing or a simple empty state message. No subscription data is read here yet (that comes in Story 12.6). The goal is just that the type exists and the chip is visible.

### i18n Keys — `src/locales/en.json`

Add to the existing JSON (merge, do NOT replace):

```json
"tabs": {
  "subscriptions": "Subscriptions"
},
"subscriptions": {
  "title": "Subscriptions",
  "empty": {
    "title": "No subscriptions yet",
    "subtitle": "Add your first subscription to track recurring payments",
    "action": "Add Subscription"
  },
  "intent": {
    "renew": "Renew",
    "renewDesc": "I plan to keep this subscription",
    "cancel": "Cancel",
    "cancelDesc": "I want to cancel before renewal",
    "modify": "Modify",
    "modifyDesc": "I want to change the plan",
    "check": "Check",
    "checkDesc": "Remind me to evaluate this"
  },
  "billingCycle": {
    "monthly": "Monthly",
    "annual": "Annual"
  },
  "category": {
    "communication": "Communication",
    "entertainment": "Entertainment",
    "fitness": "Fitness",
    "software": "Software",
    "education": "Education",
    "charity": "Charity",
    "home": "Home",
    "automotive": "Automotive",
    "loyalty": "Loyalty Club",
    "other": "Other"
  }
}
```

### i18n Keys — `src/locales/he.json`

```json
"tabs": {
  "subscriptions": "מנויים"
},
"subscriptions": {
  "title": "מנויים",
  "empty": {
    "title": "אין מנויים עדיין",
    "subtitle": "הוסף את המנוי הראשון שלך ועקוב אחרי תשלומים חוזרים",
    "action": "הוסף מנוי"
  },
  "intent": {
    "renew": "לחדש",
    "renewDesc": "אני מתכוון להמשיך את המנוי",
    "cancel": "לבטל",
    "cancelDesc": "אני רוצה לבטל לפני החידוש",
    "modify": "לשנות",
    "modifyDesc": "אני רוצה לשנות מסלול",
    "check": "לבדוק",
    "checkDesc": "הזכר לי לבדוק אם זה משתלם"
  },
  "billingCycle": {
    "monthly": "חודשי",
    "annual": "שנתי"
  },
  "category": {
    "communication": "תקשורת",
    "entertainment": "בידור",
    "fitness": "כושר",
    "software": "תוכנה",
    "education": "חינוך",
    "charity": "תרומות",
    "home": "בית",
    "automotive": "רכב",
    "loyalty": "חבר מועדון",
    "other": "אחר"
  }
}
```

---

## Previous Story Intelligence (Story 11.1)

**Patterns established that apply here:**

- **Tab layout:** `src/app/(tabs)/_layout.tsx` uses `tabIcon()` helper function — reuse exactly for `repeat-outline`
- **Zustand store pattern:** `create<State & Actions>()((set) => ...)` — actions are synchronous setters only
- **Constants pattern:** Use `ComponentProps<typeof Ionicons>['name']` for icon types (see `categories.ts`)
- **Family sharing:** The `settingsStore.familyId` is used to pass `familyId` to listeners (NOT `familyStore`)
- **Zod schema pattern:** Append to `validation.ts`, do not replace existing schemas
- **i18n:** `useTranslation()` from `react-i18next` — keys in both `en.json` and `he.json`
- **SafeAreaView:** All screens use `react-native-safe-area-context` `SafeAreaView`
- **RTL:** No hardcoded `left`/`right` directional styles — use `marginStart`/`marginEnd`/`flexStart`

**Key corrections from Story 11.1 implementation:**
- Hebrew plural for "אחריויות" (warranties tab label) — confirmed correct spelling
- History tab section headers must use `alignSelf: 'flex-start'` for RTL alignment
- Badge text i18n: "מומשה" / "פגה" — singular forms for badges on cards

---

## Architecture Compliance Checklist

- [ ] `subscriptionsStore` actions are synchronous setters only — no async logic
- [ ] `src/types/subscriptionTypes.ts` exports all enums: `SubscriptionBillingCycle`, `SubscriptionIntent`, `SubscriptionStatus`, `Subscription`
- [ ] `SubscriptionSchema` in `validation.ts` appended — does NOT replace existing schemas
- [ ] `firebase/firestore.rules` — `subscriptions` rules use existing `isFamilyMember`/`isFamilyAdmin` helpers (no duplication)
- [ ] `firebase/firestore.indexes.json` — new indexes appended to `indexes` array (do NOT replace existing)
- [ ] `src/app/(tabs)/_layout.tsx` — `stores` tab removed; `subscriptions` tab added between `warranties` and `history`
- [ ] `src/app/(tabs)/stores.tsx` file is NOT deleted — remains accessible via Credits header icon
- [ ] Credits tab header (`index.tsx`) has `storefront-outline` icon button that navigates to stores screen
- [ ] `src/app/(tabs)/subscriptions.tsx` is a minimal placeholder (full UI in Story 12.3)
- [ ] History tab `ItemType` includes `'subscriptions'` — existing sections unaffected
- [ ] All new text in both `en.json` AND `he.json`
- [ ] `npx tsc --noEmit` passes with zero errors

---

## Anti-Patterns to Avoid

- ❌ Do NOT delete `src/app/(tabs)/stores.tsx` — only removed from tab bar, not from filesystem
- ❌ Do NOT implement full subscriptions list/card UI here — that is Story 12.3
- ❌ Do NOT add async Firestore logic to `subscriptionsStore` — store actions are synchronous setters only
- ❌ Do NOT replace existing Zod schemas when adding `SubscriptionSchema` — append to the file
- ❌ Do NOT replace existing Firestore rules when adding subscription rules — append the new `match` block
- ❌ Do NOT replace existing Firestore indexes when adding subscription indexes — append to the array
- ❌ Do NOT use hardcoded directional styles (`marginLeft`, `paddingRight`) — use `marginStart`/`marginEnd`
- ❌ Do NOT introduce a `subscriptions` Firestore listener in this story — that is Story 12.3

---

## Files Summary

| Action | File |
|--------|------|
| **CREATE** | `src/types/subscriptionTypes.ts` |
| **CREATE** | `src/stores/subscriptionsStore.ts` |
| **CREATE** | `src/constants/subscriptionCategories.ts` |
| **CREATE** | `src/constants/subscriptionIntents.ts` |
| **CREATE** | `src/app/(tabs)/subscriptions.tsx` (placeholder) |
| **MODIFY** | `src/app/(tabs)/_layout.tsx` — remove `stores` tab, add `subscriptions` tab |
| **MODIFY** | `src/app/(tabs)/index.tsx` — add storefront icon button to header |
| **MODIFY** | `src/app/(tabs)/history.tsx` — add `'subscriptions'` to `ItemType`, add filter chip |
| **MODIFY** | `src/lib/validation.ts` — append `SubscriptionSchema` |
| **MODIFY** | `firebase/firestore.rules` — append subscriptions rules block |
| **MODIFY** | `firebase/firestore.indexes.json` — append 4 subscription indexes |
| **MODIFY** | `src/locales/en.json` — add `tabs.subscriptions` + `subscriptions.*` keys |
| **MODIFY** | `src/locales/he.json` — add `tabs.subscriptions` + `subscriptions.*` keys |

---

## Dev Agent Record

**Implementation Date:** 2026-04-21
**Agent:** Claude Sonnet 4.6

### Completion Notes

All acceptance criteria satisfied. TypeScript compiles with zero errors (`npx tsc --noEmit`).

**Files created:**
- `src/types/subscriptionTypes.ts` — `SubscriptionBillingCycle`, `SubscriptionIntent`, `SubscriptionStatus` enums + `Subscription` interface
- `src/stores/subscriptionsStore.ts` — Zustand store following exact `warrantiesStore` pattern
- `src/constants/subscriptionCategories.ts` — 10 categories with Ionicons names
- `src/constants/subscriptionIntents.ts` — 4 intent options with i18n keys and icons
- `src/app/(tabs)/subscriptions.tsx` — minimal placeholder screen with FAB

**Files modified:**
- `src/app/(tabs)/_layout.tsx` — removed `stores` tab; added `subscriptions` tab between `warranties` and `history`
- `src/app/(tabs)/index.tsx` — added `storefront-outline` icon button to header alongside sort button; navigates to `/(tabs)/stores`
- `src/app/(tabs)/history.tsx` — extended `ItemType` to include `'subscriptions'`; added `typeSubscriptions` filter chip option; updated `showCredits`/`showWarranties` flags to exclude subscriptions type
- `src/lib/validation.ts` — appended `SubscriptionSchema` with Zod; re-exported new enums
- `firebase/firestore.rules` — added `/subscriptions/{subscriptionId}` match block
- `firebase/firestore.indexes.json` — added 4 composite indexes for subscriptions
- `src/locales/en.json` — added `tabs.subscriptions` + full `subscriptions.*` key tree + `history.filter.typeSubscriptions`
- `src/locales/he.json` — added `tabs.subscriptions` + full `subscriptions.*` key tree + `history.filter.typeSubscriptions`

**Decisions:**
- FAB in subscriptions.tsx has empty `onPress` (placeholder comment pointing to Story 12.2)
- `SubscriptionSchema` uses `.refine()` to enforce `priceAfterTrialAgorot > 0` when `isFreeTrial` is true

---

## Definition of Done

- [ ] Tab bar shows 5 tabs: Credits · Warranties · Subscriptions · History · More
- [ ] Stores tab removed from tab bar; `stores.tsx` file still exists and is navigable
- [ ] Credits tab header has a storefront icon button that navigates to stores screen
- [ ] Subscriptions tab renders a placeholder screen (title "מנויים" visible)
- [ ] `src/types/subscriptionTypes.ts` exists with all 3 enums and the `Subscription` interface
- [ ] `src/stores/subscriptionsStore.ts` exists following exact Zustand pattern
- [ ] `src/constants/subscriptionCategories.ts` exists with 10 categories
- [ ] `src/constants/subscriptionIntents.ts` exists with 4 intents
- [ ] `SubscriptionSchema` exported from `src/lib/validation.ts`
- [ ] Firestore rules include `/subscriptions/{subscriptionId}` match block
- [ ] Firestore indexes include 4 new subscription compound indexes
- [ ] `en.json` and `he.json` have `tabs.subscriptions` and `subscriptions.*` keys
- [ ] History tab has `'subscriptions'` in `ItemType` and a third filter chip visible
- [ ] Existing Credits/Stores/Warranties/History/More functionality completely unaffected
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] No runtime errors on iOS simulator after changes
