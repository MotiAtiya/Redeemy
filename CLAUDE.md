# Redeemy — Claude Instructions

## App Overview

Redeemy is a Hebrew-first (RTL) iOS/Android app for managing personal financial records. It has **5 core features**, each with its own Firestore collection, Zustand store, onSnapshot listener, full CRUD screens, local notifications, multi-image support, and family sharing.

| Feature | Hebrew | Tab | Add Screen | Detail Screen |
|---------|--------|-----|-----------|---------------|
| Credits (store vouchers / gift cards) | זיכויים | `(tabs)/index.tsx` | `add-credit.tsx` | `credit/[id].tsx` |
| Warranties | אחריויות | `(tabs)/warranties.tsx` | `add-warranty.tsx` | `warranty/[id].tsx` |
| Subscriptions | מנויים | `(tabs)/subscriptions.tsx` | `add-subscription.tsx` | `subscription/[id].tsx` |
| Occasions (birthdays, anniversaries, yahrzeit) | אירועים | `(tabs)/occasions.tsx` | `add-occasion.tsx` | `occasion/[id].tsx` |
| Documents (ID, license, passport, insurance) | מסמכים | `(tabs)/documents.tsx` | `add-document.tsx` | `document/[id].tsx` |

Additional screens: `history.tsx` (redeemed/expired credits), `more.tsx` (settings, family, account), `stores.tsx` (derived credit view), `notification-settings.tsx`, `onboarding.tsx`, `family/create|join|[id].tsx`, `account.tsx`.

---

## Tech Stack

- **React Native + Expo Router v3** (file-based routing under `src/app/`)
- **Firebase**: Firestore (optimistic updates + onSnapshot), Auth, Storage
- **Zustand v5** stores: `authStore`, `creditsStore`, `warrantiesStore`, `subscriptionsStore`, `occasionsStore`, `documentsStore`, `familyStore`, `settingsStore` (persisted via AsyncStorage), `uiStore`
- **expo-notifications** — all notification logic in `src/lib/notifications.ts` and `src/lib/subscriptionNotifications.ts` and `src/lib/occasionNotifications.ts`
- **react-i18next** — `he.json` + `en.json` under `src/locales/`
- **TypeScript strict mode**
- **Colors**: always via `useAppTheme()` hook (supports dark mode). Never hardcode colors.
- All async data operations live in `src/lib/` (e.g. `firestoreCredits.ts`, `firestoreSubscriptions.ts`). Screens never import Firebase SDK directly.

---

## Universal Patterns (apply to all 5 features)

- **Amounts** stored as integer **agorot** (× 100). `formatCurrency(agorot)` for display only. Never store decimals.
- **Images**: up to 3 per item. Stored as `images: string[]` (download URLs) + `thumbnails: string[]`. Old single-image fields (`imageUrl`, `thumbnailUrl`) kept for credit backward compat.
- **Family sharing**: every item has optional `familyId`, `createdBy` (userId), `createdByName`. When user is in a family, all queries switch from `userId ==` to `familyId ==`.
- **Optimistic UI**: Zustand store updated immediately, Firestore write in background.
- **Multi-step forms**: `StepFormScreen` component + `StepProgressBar`. Each add screen has a typed `StepId` union and a `getSteps()` function. Steps animate with slide transitions. All values preserved on back navigation.
- **Notifications**: old notification IDs are always cancelled before scheduling new ones. All `expo-notifications` calls are isolated in `src/lib/`.
- **Status enums**: each feature has its own `*Status` enum. Never use raw strings.

---

## Subscription Data Model — Key Concepts

The subscription model is more complex than the others. Key fields:

```
isFree: boolean                           → free vs paid
renewalType: 'auto' | 'manual'            → auto-renews or requires user action
billingCycle: MONTHLY | ANNUAL
billingDayOfMonth: number (1–28)          → MONTHLY only; capped at 28
registrationDate: Date                    → anchor for billing calculations
nextBillingDate: Date                     → ANNUAL only; computed for MONTHLY

specialPeriodType: 'trial' | 'discounted' → free trial or promotional price
specialPeriodMonths / specialPeriodDays   → duration
specialPeriodPriceAgorot                  → price during special period
priceAfterTrialAgorot                     → paid price after trial ends
trialEndsDate                             → computed from registrationDate + period

hasFixedPeriod: boolean                   → e.g. 12-month commitment
commitmentMonths: number
commitmentEndDate: Date

freeReviewReminderMonths: number          → for free subs: remind every N months to review
notificationIds: string[]                 → array (up to 2: week + day before)
renewalNotificationId: string             → on-day "did it renew?" notification
specialPeriodNotificationId: string       → reminder before trial/discount ends
```

`subscriptionUtils.ts` has all date/billing logic: `getNextBillingDate()`, `daysUntilBilling()`, `getNextReminderInfo()` (returns `ReminderType`: `'trial' | 'discounted' | 'review' | 'renews' | 'expires'`), `normalizeToMonthlyAgorot()`, `computeMonthlyTotal()`, `advanceBillingCycle()`, `endFreeTrialIfDue()`.

### Subscription Notification Logic

All scheduling is in `subscriptionNotifications.ts`. The anchor date used for scheduling depends on the subscription type:

| Type | Notification trigger |
|------|---------------------|
| `isFree` | Review reminder every `freeReviewReminderMonths` months from `registrationDate` |
| `MONTHLY` + `hasFixedPeriod: false` | Same as free — periodic review reminder only |
| `MONTHLY` + `hasFixedPeriod: true` | N days before **`commitmentEndDate`** (never before intermediate billing days) |
| `ANNUAL` | N days before **`nextBillingDate`** (end of current annual term) |

For the last two cases, N = `subscriptionReminderDays` from settings (default: 7). A second notification fires 1 day before if the user has enabled `subscriptionLastDayAlert` (auto) or always (manual).

**Special period** (`trial` / `discounted`): if `reminderSpecialPeriodEnabled`, fires before `trialEndsDate`:
- Period in months → 7 days before
- Period in days → `min(floor(duration/2), 3)` days before, minimum 1

**Critical rule:** A monthly subscription with `hasFixedPeriod: true` must NEVER fire notifications before individual billing cycles — only before `commitmentEndDate`. Use `commitmentEndDate` as the anchor, not `getNextBillingDate()`.

---

## Occasions — Key Concepts

Occasions support both **Gregorian and Hebrew calendar** dates. Key fields:

```
type: 'birthday' | 'anniversary' | 'yahrzeit' | 'other'
date: Date                   → Gregorian date
useHebrewDate: boolean        → if true, anniversary fires on Hebrew calendar date each year
hebrewDay / hebrewMonth       → stored Hebrew date components
label: string                 → custom name (for 'other' type)
notificationIds: string[]
```

Hebrew date logic is in `src/lib/hebrewDate.ts`.

---

## RTL / Hebrew Layout Rules

The app runs in Hebrew (RTL) mode via `I18nManager.forceRTL(true)`. When `I18nManager.isRTL === true`, React Native's Yoga layout engine automatically mirrors flex layouts — `flexDirection: 'row'` flows right-to-left, and `flex-start` on the cross axis of a column container is the **right** side.

### Rule 1 — Free-standing text (labels, card titles, descriptions)

Use `alignSelf: 'flex-start'`. In RTL, `flex-start` = right. The text element positions itself at the right edge with its natural width, and multi-line text wraps within the parent container.

```javascript
choiceCardTitle: { alignSelf: 'flex-start' },
choiceCardDesc:  { alignSelf: 'flex-start' },
subLabel:        { alignSelf: 'flex-start' },
amountError:     { alignSelf: 'flex-start' },
```

**Do NOT use `textAlign: 'right'` for these** — if the Text element doesn't fill its parent's width (which is the default for free-standing text), `textAlign` has no visible effect.

### Rule 2 — Text inside a `flex: 1` or stretched container

Use `textAlign: isRTL ? 'right' : 'left'`. These elements already fill their allocated space (via `flex: 1` or `alignSelf: 'stretch'`), so you need to align the text content within that space.

```javascript
dateButtonText:  { flex: 1, textAlign: isRTL ? 'right' : 'left' },
reminderNoteText:{ textAlign: isRTL ? 'right' : 'left' },
summaryLabel:    { width: 90, textAlign: isRTL ? 'right' : 'left' },
```

### Rule 5 — Toggle row labels (label + Switch side by side)

**Do NOT put `flex: 1` directly on the `<Text>` label.** Even with `textAlign: 'right'`, a `flex: 1` Text in an RTL row does not reliably right-align its content. Instead, wrap the label in a `<View style={{ flex: 1 }}>` and use `alignSelf: 'flex-start'` on the Text itself (Rule 1). This is the proven pattern used in `notification-settings.tsx`.

```jsx
// ✅ Correct
<View style={styles.toggleRow}>
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' }}>
      {label}
    </Text>
  </View>
  <Switch ... />
</View>

// ❌ Wrong — text appears left-aligned in RTL despite textAlign: 'right'
<View style={styles.toggleRow}>
  <Text style={{ flex: 1, textAlign: 'right' }}>{label}</Text>
  <Switch ... />
</View>
```

### Rule 3 — Row direction for icon+text pairs

Use `flexDirection: isRTL ? 'row-reverse' : 'row'` so that icon and text swap sides correctly (icon stays visually at the start of the text in RTL).

```javascript
dateButton: { flexDirection: isRTL ? 'row-reverse' : 'row' },
summaryRow: { flexDirection: isRTL ? 'row-reverse' : 'row' },
```

### Rule 4 — Already-working patterns (do not change)

- `flexDirection: 'row'` without conditional — automatically RTL when `I18nManager.isRTL = true` (no override needed unless a parent has `direction: 'ltr'`).
- `textAlign: 'center'` — direction-neutral, always fine.

### Rule 6 — Multi-line text alignment in RTL

React Native with `I18nManager.forceRTL(true)` treats `textAlign` **logically** (not physically):
- `textAlign: 'left'` in RTL → visual **RIGHT** ✓ (logical start in RTL)
- `textAlign: 'right'` in RTL → visual **LEFT** ❌ (logical end in RTL)

This is counterintuitive but confirmed by testing.

**Single-line free-standing text**: use `alignSelf: 'flex-start'` (Rule 1). No `textAlign` needed — the element is positioned at the right edge with its natural width.

**Multi-line wrapping text** (title/subtitle that wraps to 2+ lines): the element fills its container width, so `alignSelf` alone is not enough. Use `textAlign: 'left'` to get visual-right alignment in RTL.

```jsx
// shared style for step titles (works for single-line)
stepTitle: { fontSize: 26, fontWeight: '700', alignSelf: 'flex-start' },

// override for a specific title that wraps to 2 lines
<Text style={[styles.stepTitle, { textAlign: 'left' }]}>…</Text>

// for stepSub that wraps:
<Text style={[styles.stepSub, { textAlign: 'left' }]}>…</Text>
```

**Never use `textAlign: 'right'`** for right-alignment in this RTL app — it produces visual-left.

### Canonical RTL pattern

`subscription/[id].tsx` uses `alignSelf: 'flex-start'` on `detailLabel` and `detailValue` — this is the reference RTL pattern for the app.
