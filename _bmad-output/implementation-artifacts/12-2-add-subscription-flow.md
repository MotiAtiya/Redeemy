# Story 12.2: Add Subscription Flow

**Epic:** 12 — Subscription Management
**Story Key:** 12-2-add-subscription-flow
**Author:** Moti
**Date:** 2026-04-21
**Status:** done

---

## User Story

As a user,
I want to add a new subscription through a guided step-by-step flow,
So that all details are captured correctly without being overwhelmed.

---

## Background & Context

This story implements the full 9-step guided flow for adding a subscription, mirroring `add-credit.tsx` in structure and UX pattern. The scaffolding from Story 12.1 (types, store, constants) is now available. This story creates the route `src/app/add-subscription.tsx` which the Subscriptions tab FAB will navigate to.

**What this story does NOT cover:**
- Reminder notification scheduling (Story 12.5 — `notificationIds: []` on create)
- Auto-renewal logic (Story 12.5)
- The Subscriptions list/card display (Story 12.3)
- Family sharing migration functions (Story 12.6)

**Key UX decisions:**
- Step flow mirrors `add-credit.tsx` exactly: same `Animated` slide transitions, `StepProgressBar`, keyboard-aware footer, header with back/close button
- All step titles are in Hebrew via i18n (app is Hebrew-first)
- Back navigation preserves all previously entered values
- Edit mode: same screen via `?subscriptionId=X` param — pre-fills all steps

---

## Acceptance Criteria

### Flow Opens

**Given** the user taps the FAB (+) in the Subscriptions tab
**When** `src/app/add-subscription.tsx` opens as a full-screen modal
**Then**:
- Header shows static title: `t('addSubscription.title')` → "הוספת מנוי"
- `StepProgressBar` shows progress in the footer
- First step (`billingType`) renders immediately

### Step 1 — Billing Type (`billingType`)

**Given** step 1 renders
**Then**:
- Step title: `t('addSubscription.step.billingType')` → "איך מחויב המנוי?"
- Two large tappable cards: `חודשי` (repeat-outline icon) and `שנתי` (calendar-outline icon)
- The selected card has Sage teal border and background tint
- `canContinue` = billing type is selected (neither is pre-selected by default; first tap required)
- Tapping a card selects it AND auto-advances to the next step (no Continue button needed for this step)

### Step 2 — Service Name (`serviceName`)

**Given** step 2 renders
**Then**:
- Step title: `t('addSubscription.step.serviceName')` → "שם השירות?"
- `ServiceAutocomplete` component with `autoFocus`
- Autocomplete suggests from existing `subscriptionsStore.subscriptions` service names
- `canContinue` = `serviceName.trim().length > 0`

### Step 3 — Amount (`amount`)

**Given** step 3 renders
**Then**:
- Step title: `t('addSubscription.step.amount')` → "כמה אתה משלם?"
- Numeric `₪` input (same style as add-credit amount step) for `amountAgorot`
- Toggle row: "מנוי חינמי" (`isFree`) — when ON: amount input hidden, `amountAgorot = 0`
- **MONTHLY only:** Secondary toggle: "תקופת ניסיון חינמי" (`isFreeTrial`) — visible only when `billingCycle === MONTHLY && !isFree`
  - When `isFreeTrial` ON: shows "כמה חודשים חינם?" number input (1–24) + "מחיר חודשי לאחר הניסיון:" numeric `₪` input
- **ANNUAL only:** When amount > 0 and not free: shows `(₪X/חודש)` in gray below the amount input (`amountAgorot ÷ 12`, formatted with `formatCurrency`)
- `canContinue`:
  - If `isFree = true`: always `true`
  - If `isFree = false && isFreeTrial = false`: `amountInput.trim().length > 0 && parsedAgorot > 0`
  - If `isFree = false && isFreeTrial = true` (MONTHLY only): `freeTrialMonths >= 1 && priceAfterTrialInput.trim().length > 0 && parsedPriceAfterTrial > 0`

### Step 4 — Billing Date (`billingDate`)

**Given** step 4 renders
**When** `billingCycle === MONTHLY`
**Then**:
- Step title: `t('addSubscription.step.billingDateMonthly')` → "באיזה יום בחודש?"
- A number input pre-filled with `15` (sensible default)
- Valid range: 1–31 (show validation error for out-of-range: `t('addSubscription.validation.invalidDay')`)
- `canContinue` = `billingDayOfMonth >= 1 && billingDayOfMonth <= 31`

**When** `billingCycle === ANNUAL`
**Then**:
- Step title: `t('addSubscription.step.billingDateAnnual')` → "מתי תאריך החידוש הבא?"
- Same DateTimePicker as add-credit expiry date step, but without "No Expiry" toggle
- `minimumDate = today`
- `canContinue` = `nextBillingDate !== null`

### Step 5 — Category (`category`)

**Given** step 5 renders
**Then**:
- Step title: `t('addSubscription.step.category')` → "באיזה קטגוריה?"
- Same 3-column grid as add-credit category step, but using `SUBSCRIPTION_CATEGORIES` (10 items)
- Default selection: `'other'`
- i18n key: `t('subscriptions.category.' + category.id)`
- `canContinue` = always `true` (default selected)

### Step 6 — Intent (`intent`)

**Given** step 6 renders
**Then**:
- Step title: `t('addSubscription.step.intent')` → "מה הכוונה שלך?"
- 4 large option cards using `SUBSCRIPTION_INTENTS` constants:
  - 🔄 לחדש / ❌ לבטל / ✏️ לשנות / 👀 לבדוק
  - Each card: icon (left), label (bold), one-line description below label
  - Selected card: Sage teal border + background tint
- Default: no selection (user must tap)
- Tapping a card selects it but does NOT auto-advance (user taps Continue)
- `canContinue` = intent is selected

### Step 7 — Reminder (`reminder`)

**Given** step 7 renders
**Then**:
- Step title: `t('addSubscription.step.reminder')` → "מתי להזכיר לך?"
- 4 preset chips: **3 ימים** (3) / **שבוע** (7) / **שבועיים** (14) / **חודש** (30)
- Plus a "מותאם אישית" custom option — when tapped: shows a number input for custom days
- Default selection: 7 days
- For `CANCEL` or `MODIFY` intent: show note: `t('addSubscription.reminder.cancelModifyNote')` → "תקבל שני תזכורות — שבוע לפני ויום לפני."
- `canContinue` = always `true` (has default)

### Step 8 — Website (`website`)

**Given** step 8 renders
**Then**:
- Step title: `t('addSubscription.step.website')` → "יש אתר או אפליקציה?"
- URL text input (keyboard type: `url`), placeholder: "https://..."
- "דלג" skip link below the input (skips to summary without setting websiteUrl)
- URL validated only if non-empty: must start with `http://` or `https://`
- `canContinue` = `websiteUrl.trim() === ''` OR `isValidUrl(websiteUrl)`

### Step 9 — Summary (`summary`)

**Given** the user reaches the summary step
**Then**:
- Step title: `t('addSubscription.step.summary')` → "הכל נראה טוב?"
- Shows all entered data in a summary card:
  - שם השירות / billing cycle / amount (or "חינמי" if free) / billing date / category (icon + label) / intent (icon + label) / reminder / website (if set)
- Primary button: `t('addSubscription.save')` → "שמור מנוי"
- Footer button is "שמור מנוי" (not "המשך") — triggers `handleSave()`

### Save Flow

**Given** the user taps "שמור מנוי"
**When** the device is online
**Then**:
1. Check offline: `useUIStore.getState().offlineMode` — if true, show `Alert.alert(t('offline.title'), t('addSubscription.offline.adding'))` and abort
2. Optimistic update: construct `tempId = 'temp-' + Date.now()`, build optimistic `Subscription` object, call `subscriptionsStore.addSubscription(optimisticSub)`
3. Firestore write: `createSubscription({...data})` → returns `subscriptionId`
4. Remove optimistic: `subscriptionsStore.removeSubscription(tempId)`
5. Write notification IDs placeholder: `notificationIds: []` — no notifications yet (Story 12.5)
6. Show toast: "המנוי נשמר ✓" (2 seconds, same `useToast()` pattern as `src/app/family/[id].tsx`)
7. After toast delay (or immediately): `router.back()`

**Given** the save fails (network error)
**Then** `subscriptionsStore.removeSubscription(tempId)` (rollback optimistic), `Alert.alert(t('addSubscription.error.save'), t('addSubscription.error.saveMessage'))`

### Edit Mode

**Given** the screen opens with `?subscriptionId=X` param
**When** the subscription is found in `subscriptionsStore`
**Then**:
- Header title: `t('addSubscription.titleEdit')` → "עריכת מנוי"
- All form fields pre-filled from existing subscription data
- Save calls `updateSubscription(subscriptionId, changes)` instead of `createSubscription`
- No optimistic update needed for edit (just update in store directly then Firestore)

### Subscriptions Tab FAB — Updated

**Given** Story 12.1 left the FAB with an empty `onPress`
**When** `src/app/(tabs)/subscriptions.tsx` is updated in this story
**Then** `onPress` navigates to `router.push('/add-subscription')`

---

## Technical Notes

### File Structure

```
src/app/add-subscription.tsx              ← NEW: main screen (mirrors add-credit.tsx)
src/components/redeemy/ServiceAutocomplete.tsx  ← NEW: mirrors StoreAutocomplete
src/components/redeemy/IntentSelector.tsx       ← NEW: 4 large option cards
src/lib/firestoreSubscriptions.ts              ← NEW: Firestore CRUD
src/constants/subscriptionReminders.ts         ← NEW: reminder presets for subscriptions
src/app/(tabs)/subscriptions.tsx               ← MODIFY: wire FAB
src/locales/en.json                            ← MODIFY: addSubscription keys
src/locales/he.json                            ← MODIFY: addSubscription keys
```

### Step Type and `getSteps()` — `src/app/add-subscription.tsx`

```typescript
type StepId =
  | 'billingType'
  | 'serviceName'
  | 'amount'
  | 'billingDate'
  | 'category'
  | 'intent'
  | 'reminder'
  | 'website'
  | 'summary';

function getSteps(): StepId[] {
  return ['billingType', 'serviceName', 'amount', 'billingDate', 'category', 'intent', 'reminder', 'website', 'summary'];
}
```

All 9 steps are always present (no conditional removal). The `website` step has a skip button inline — it never skips the step itself.

### Form State Variables

```typescript
// Billing cycle
const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle | null>(null);

// Service name
const [serviceName, setServiceName] = useState('');

// Amount
const [amountInput, setAmountInput] = useState('');     // raw string for numeric input
const [isFree, setIsFree] = useState(false);
const [isFreeTrial, setIsFreeTrial] = useState(false);  // MONTHLY only
const [freeTrialMonths, setFreeTrialMonths] = useState('');     // string for input
const [priceAfterTrialInput, setPriceAfterTrialInput] = useState(''); // string for input

// Billing date
const [billingDayOfMonth, setBillingDayOfMonth] = useState('15'); // string for input, MONTHLY
const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null); // ANNUAL

// Category
const [category, setCategory] = useState('other');

// Intent
const [intent, setIntent] = useState<SubscriptionIntent | null>(null);

// Reminder
const [reminderDays, setReminderDays] = useState(7); // default 7 days
const [customReminderInput, setCustomReminderInput] = useState('');
const [showCustomReminder, setShowCustomReminder] = useState(false);

// Website
const [websiteUrl, setWebsiteUrl] = useState('');

// Step navigation (mirrors add-credit)
const [currentStepId, setCurrentStepId] = useState<StepId>('billingType');
const fadeAnim = useRef(new Animated.Value(1)).current;
const slideAnim = useRef(new Animated.Value(0)).current;
const keyboardPadding = useRef(new Animated.Value(0)).current;

// UI state
const [saving, setSaving] = useState(false);
const [billingDayError, setBillingDayError] = useState('');
const [dateError, setDateError] = useState('');
const [amountError, setAmountError] = useState('');
```

### `canContinue` Logic

```typescript
const canContinue = useMemo(() => {
  switch (currentStepId) {
    case 'billingType':    return billingCycle !== null;
    case 'serviceName':    return serviceName.trim().length > 0;
    case 'amount': {
      if (isFree) return true;
      if (isFreeTrial && billingCycle === SubscriptionBillingCycle.MONTHLY) {
        const months = parseInt(freeTrialMonths, 10);
        const price = parseAmountToAgot(priceAfterTrialInput);
        return months >= 1 && months <= 24 && !isNaN(price) && price > 0;
      }
      const agot = parseAmountToAgot(amountInput);
      return amountInput.trim().length > 0 && !isNaN(agot) && agot > 0;
    }
    case 'billingDate': {
      if (billingCycle === SubscriptionBillingCycle.MONTHLY) {
        const day = parseInt(billingDayOfMonth, 10);
        return !isNaN(day) && day >= 1 && day <= 31;
      }
      return nextBillingDate !== null;
    }
    case 'category':   return true;  // always has default
    case 'intent':     return intent !== null;
    case 'reminder':   return true;  // always has default
    case 'website':    return websiteUrl.trim() === '' || isValidUrl(websiteUrl);
    case 'summary':    return false; // summary uses Save button, not Continue
    default:           return false;
  }
}, [currentStepId, billingCycle, serviceName, isFree, isFreeTrial, amountInput,
    freeTrialMonths, priceAfterTrialInput, billingDayOfMonth, nextBillingDate,
    category, intent, reminderDays, websiteUrl]);
```

URL validation helper:
```typescript
function isValidUrl(url: string): boolean {
  try { return url.startsWith('http://') || url.startsWith('https://'); } catch { return false; }
}
```

### `billingType` Step — Auto-Advance on Select

```typescript
function handleSelectBillingType(type: SubscriptionBillingCycle) {
  setBillingCycle(type);
  // Reset free trial state if switching to ANNUAL (no free trial for annual)
  if (type === SubscriptionBillingCycle.ANNUAL) setIsFreeTrial(false);
  animateTransition('forward', () => setCurrentStepId('serviceName'));
}
```

The billingType step does NOT show the footer Continue button — the tap on the card itself advances.

### `amount` Step — `parseAmountToAgot`

Reuse `parseAmountToAgot` from `@/constants/currencies` (same as add-credit).

```typescript
// Monthly breakdown display for ANNUAL
const monthlyBreakdown = useMemo(() => {
  if (billingCycle !== SubscriptionBillingCycle.ANNUAL || isFree) return null;
  const agot = parseAmountToAgot(amountInput);
  if (isNaN(agot) || agot <= 0) return null;
  return formatCurrency(Math.round(agot / 12));
}, [billingCycle, amountInput, isFree]);
```

### `ServiceAutocomplete.tsx` — `src/components/redeemy/ServiceAutocomplete.tsx`

Exact mirror of `StoreAutocomplete.tsx` with these differences:
- Reads from `useSubscriptionsStore((s) => s.subscriptions)` instead of `useCreditsStore`
- Suggestions derived from `subscriptions.map((s) => s.serviceName)` (deduplicated)
- No store-category mapping (no static service list — only user's existing subscriptions)
- Placeholder: `t('addSubscription.serviceNamePlaceholder')` → "לדוגמה: Spotify, Netflix"
- Icon for each suggestion: `repeat-outline` (generic subscription icon)

Props:
```typescript
interface Props {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}
```

### `IntentSelector.tsx` — `src/components/redeemy/IntentSelector.tsx`

New component. Renders 4 large tappable cards, one per intent:

```typescript
interface Props {
  selected: SubscriptionIntent | null;
  onSelect: (intent: SubscriptionIntent) => void;
}
```

Layout per card (vertical full-width):
```
[ icon (32px) ]
[ label (17px bold) ]
[ description (13px, textSecondary) ]
```

Selected state: `borderColor: colors.primary`, `backgroundColor: colors.primarySurface`
Unselected: `borderColor: colors.separator`, `backgroundColor: colors.background`

Uses `SUBSCRIPTION_INTENTS` from `@/constants/subscriptionIntents`.
Icon: `Ionicons` with the `icon` field from the intent option.
Label: `t(option.labelKey)`
Description: `t(option.descriptionKey)`

### `src/constants/subscriptionReminders.ts` — NEW

```typescript
export interface SubscriptionReminderPreset {
  days: number;
  labelKey: string;
}

export const SUBSCRIPTION_REMINDER_PRESETS: SubscriptionReminderPreset[] = [
  { days: 3,  labelKey: 'addSubscription.reminder.3days'   },
  { days: 7,  labelKey: 'addSubscription.reminder.1week'   },
  { days: 14, labelKey: 'addSubscription.reminder.2weeks'  },
  { days: 30, labelKey: 'addSubscription.reminder.1month'  },
];
```

Note: These are DIFFERENT from `REMINDER_PRESETS` in `@/constants/reminders` (which are 1, 7, 30, 90 days for credits). Do NOT reuse the credit presets.

### `firestoreSubscriptions.ts` — `src/lib/firestoreSubscriptions.ts`

Mirror `firestoreWarranties.ts` exactly. Required exports:

```typescript
// Timestamp → Date conversion (internal)
function docToSubscription(d: DocumentSnapshot): Subscription

// Real-time listener — by familyId or userId
// Writes to subscriptionsStore.setSubscriptions() + setLoading(false)
// Returns Unsubscribe
export function subscribeToSubscriptions(userId: string, familyId?: string | null): Unsubscribe

// Create — returns auto-generated subscriptionId
export async function createSubscription(
  data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string>

// Update
export async function updateSubscription(
  subscriptionId: string,
  changes: Partial<Subscription>
): Promise<void>

// Delete
export async function deleteSubscription(subscriptionId: string): Promise<void>
```

**Timestamp conversion** (all Date fields):
```typescript
function docToSubscription(d: DocumentSnapshot): Subscription {
  const data = d.data()!;
  return {
    ...(data as Omit<Subscription, 'id' | 'nextBillingDate' | 'trialEndsDate' | 'cancelledAt' | 'createdAt' | 'updatedAt'>),
    id: d.id,
    nextBillingDate:  data.nextBillingDate?.toDate?.() ?? undefined,
    trialEndsDate:    data.trialEndsDate?.toDate?.() ?? undefined,
    cancelledAt:      data.cancelledAt?.toDate?.() ?? undefined,
    createdAt:        data.createdAt?.toDate?.() ?? new Date(),
    updatedAt:        data.updatedAt?.toDate?.() ?? new Date(),
  } as Subscription;
}
```

**Query** (same pattern as warranties):
```typescript
const q = familyId
  ? query(collection(db, SUBSCRIPTIONS_COLLECTION), where('familyId', '==', familyId))
  : query(collection(db, SUBSCRIPTIONS_COLLECTION), where('userId', '==', userId));
```

### `handleSave()` — Save Logic

```typescript
async function handleSave() {
  if (!currentUser) return;
  if (useUIStore.getState().offlineMode) {
    Alert.alert(t('offline.title'), t('addSubscription.offline.adding'));
    return;
  }

  const amountAgorot = isFree ? 0 : parseAmountToAgot(amountInput);
  const priceAfterAgorot = isFreeTrial ? parseAmountToAgot(priceAfterTrialInput) : undefined;
  const freeMonths = isFreeTrial ? parseInt(freeTrialMonths, 10) : undefined;

  // Compute trialEndsDate: only for free trial
  const now = new Date();
  const trialEndsDate = (isFreeTrial && freeMonths)
    ? new Date(now.getFullYear(), now.getMonth() + freeMonths, now.getDate())
    : undefined;

  const subscriptionData = {
    userId: currentUser.uid,
    serviceName: serviceName.trim(),
    billingCycle: billingCycle!,
    amountAgorot,
    isFree,
    isFreeTrial,
    billingDayOfMonth: billingCycle === SubscriptionBillingCycle.MONTHLY ? parseInt(billingDayOfMonth, 10) : undefined,
    nextBillingDate: billingCycle === SubscriptionBillingCycle.ANNUAL ? nextBillingDate! : undefined,
    freeTrialMonths: freeMonths,
    priceAfterTrialAgorot: priceAfterAgorot,
    trialEndsDate,
    category,
    intent: intent!,
    status: SubscriptionStatus.ACTIVE,
    reminderDays,
    notificationIds: [],  // Story 12.5 will populate
    websiteUrl: websiteUrl.trim() || undefined,
    notes: '',
    ...(familyId ? { familyId, createdBy: currentUser.uid, createdByName: currentUser.displayName ?? '' } : {}),
  };

  setSaving(true);
  const tempId = `temp-${Date.now()}`;
  const optimistic: Subscription = {
    ...subscriptionData,
    id: tempId,
    createdAt: now,
    updatedAt: now,
  } as Subscription;

  subscriptionsStore.addSubscription(optimistic);

  try {
    const newId = await createSubscription(subscriptionData);
    subscriptionsStore.removeSubscription(tempId);
    // The onSnapshot listener will re-add the real document automatically
    showToast(t('addSubscription.savedToast'));
    setTimeout(() => router.back(), 300);
  } catch (e) {
    subscriptionsStore.removeSubscription(tempId);
    setSaving(false);
    Alert.alert(t('addSubscription.error.save'), t('addSubscription.error.saveMessage'));
  }
}
```

Note: `useToast()` local hook from `src/app/family/[id].tsx` pattern — copy the exact same hook implementation into `add-subscription.tsx`.

### `renderFooterButton()` — Override for `billingType`

The `billingType` step selects AND auto-advances without a Continue button. Return `null` for footer button when `currentStepId === 'billingType'`.

The `website` step: show Continue button as normal (user can leave input empty to skip, OR tap "דלג" link which calls `goNext()` directly).

The `summary` step: button text = `t('addSubscription.save')` → "שמור מנוי", calls `handleSave()`.

### Update `src/app/(tabs)/subscriptions.tsx`

Change the FAB `onPress` from an empty function to:
```typescript
onPress={() => router.push('/add-subscription')}
```

Also import `useRouter` at the top.

### i18n Keys — `src/locales/en.json` — Add `addSubscription`

```json
"addSubscription": {
  "title": "Add Subscription",
  "titleEdit": "Edit Subscription",
  "save": "Save Subscription",
  "savedToast": "Subscription saved ✓",
  "serviceNamePlaceholder": "e.g. Spotify, Netflix",
  "step": {
    "billingType": "How is this subscription billed?",
    "serviceName": "What's the service name?",
    "amount": "How much do you pay?",
    "billingDateMonthly": "Which day of the month?",
    "billingDateAnnual": "When is the next renewal date?",
    "category": "Which category?",
    "intent": "What's your intention?",
    "reminder": "When should we remind you?",
    "website": "Any website or app?",
    "summary": "Looking good?"
  },
  "billingType": {
    "monthly": "Monthly",
    "annual": "Annual"
  },
  "amount": {
    "freeToggle": "Free subscription",
    "freeTrialToggle": "Free trial period",
    "freeTrialMonths": "How many months free?",
    "priceAfterTrial": "Monthly price after trial:",
    "monthlyBreakdown": "({{amount}}/month)"
  },
  "reminder": {
    "3days": "3 Days",
    "1week": "1 Week",
    "2weeks": "2 Weeks",
    "1month": "1 Month",
    "custom": "Custom",
    "customPlaceholder": "Days before",
    "cancelModifyNote": "You'll get two reminders — a week before and a day before."
  },
  "website": {
    "placeholder": "https://...",
    "skip": "Skip"
  },
  "summary": {
    "service": "Service",
    "billing": "Billing",
    "amount": "Amount",
    "billingDay": "Billing Day",
    "renewalDate": "Renewal Date",
    "category": "Category",
    "intent": "Intent",
    "reminder": "Reminder",
    "website": "Website",
    "free": "Free",
    "freeTrial": "Free trial ({{months}} months, then {{price}}/month)",
    "monthly": "Monthly",
    "annual": "Annual",
    "dayOfMonth": "{{day}}th of each month",
    "reminderDays_one": "{{count}} day before",
    "reminderDays_other": "{{count}} days before"
  },
  "offline": {
    "adding": "Adding subscriptions requires an internet connection.",
    "editing": "Editing subscriptions requires an internet connection."
  },
  "error": {
    "save": "Couldn't save",
    "saveMessage": "Check your connection and try again."
  },
  "validation": {
    "amountRequired": "Amount is required",
    "amountInvalid": "Enter a valid positive amount",
    "invalidDay": "Enter a valid day (1–31)",
    "invalidDate": "Select a valid future date",
    "invalidUrl": "Enter a valid URL starting with http:// or https://",
    "priceAfterTrialRequired": "Enter the price after the trial period",
    "freeTrialMonthsRequired": "Enter the number of free months"
  }
}
```

### i18n Keys — `src/locales/he.json` — Add `addSubscription`

```json
"addSubscription": {
  "title": "הוספת מנוי",
  "titleEdit": "עריכת מנוי",
  "save": "שמור מנוי",
  "savedToast": "המנוי נשמר ✓",
  "serviceNamePlaceholder": "לדוגמה: Spotify, Netflix",
  "step": {
    "billingType": "איך מחויב המנוי?",
    "serviceName": "שם השירות?",
    "amount": "כמה אתה משלם?",
    "billingDateMonthly": "באיזה יום בחודש?",
    "billingDateAnnual": "מתי תאריך החידוש הבא?",
    "category": "באיזה קטגוריה?",
    "intent": "מה הכוונה שלך?",
    "reminder": "מתי להזכיר לך?",
    "website": "יש אתר או אפליקציה?",
    "summary": "הכל נראה טוב?"
  },
  "billingType": {
    "monthly": "חודשי",
    "annual": "שנתי"
  },
  "amount": {
    "freeToggle": "מנוי חינמי",
    "freeTrialToggle": "תקופת ניסיון חינמי",
    "freeTrialMonths": "כמה חודשים חינם?",
    "priceAfterTrial": "מחיר חודשי לאחר הניסיון:",
    "monthlyBreakdown": "({{amount}}/חודש)"
  },
  "reminder": {
    "3days": "3 ימים",
    "1week": "שבוע",
    "2weeks": "שבועיים",
    "1month": "חודש",
    "custom": "מותאם אישית",
    "customPlaceholder": "ימים לפני",
    "cancelModifyNote": "תקבל שני תזכורות — שבוע לפני ויום לפני."
  },
  "website": {
    "placeholder": "https://...",
    "skip": "דלג"
  },
  "summary": {
    "service": "שירות",
    "billing": "חיוב",
    "amount": "סכום",
    "billingDay": "יום חיוב",
    "renewalDate": "תאריך חידוש",
    "category": "קטגוריה",
    "intent": "כוונה",
    "reminder": "תזכורת",
    "website": "אתר",
    "free": "חינמי",
    "freeTrial": "ניסיון חינמי ({{months}} חודשים, לאחר מכן {{price}}/חודש)",
    "monthly": "חודשי",
    "annual": "שנתי",
    "dayOfMonth": "{{day}} לכל חודש",
    "reminderDays_one": "יום {{count}} לפני",
    "reminderDays_other": "{{count}} ימים לפני"
  },
  "offline": {
    "adding": "הוספת מנויים דורשת חיבור לאינטרנט.",
    "editing": "עריכת מנויים דורשת חיבור לאינטרנט."
  },
  "error": {
    "save": "לא ניתן לשמור",
    "saveMessage": "בדוק את החיבור ונסה שנית."
  },
  "validation": {
    "amountRequired": "נדרש סכום",
    "amountInvalid": "הכנס סכום חיובי תקין",
    "invalidDay": "הכנס יום תקין (1–31)",
    "invalidDate": "בחר תאריך עתידי תקין",
    "invalidUrl": "הכנס כתובת URL תקינה שמתחילה ב-http:// או https://",
    "priceAfterTrialRequired": "הכנס את המחיר לאחר תקופת הניסיון",
    "freeTrialMonthsRequired": "הכנס את מספר חודשי הניסיון החינמיים"
  }
}
```

---

## Previous Story Intelligence (Story 12.1)

**Established patterns:**
- `SubscriptionBillingCycle`, `SubscriptionIntent`, `SubscriptionStatus` enums from `@/types/subscriptionTypes`
- `useSubscriptionsStore` from `@/stores/subscriptionsStore` — `addSubscription`, `removeSubscription`, `updateSubscription` actions
- `SUBSCRIPTION_CATEGORIES` from `@/constants/subscriptionCategories`
- `SUBSCRIPTION_INTENTS` from `@/constants/subscriptionIntents`
- `SubscriptionSchema` from `@/lib/validation` (for reference; can use directly or validate manually)
- `settingsStore.familyId` is the source of `familyId` for family sharing

**From Story 11.1 (add-warranty.tsx pattern):**
- `useToast()` hook: copy from `src/app/family/[id].tsx` (45–60 lines) — same 2-second auto-dismiss
- The `animateTransition()` function is copied verbatim from `add-credit.tsx`
- `keyboardPadding` tracking for keyboard-aware footer — exact same `useEffect` pattern
- Header: back button (`chevron-back`/`chevron-forward` for RTL) or `close` on first step

**Git context (recent commits):**
- `80be630 fix(ts): resolve all TypeScript errors` — TypeScript is strict, zero errors required
- `e84b12d fix(i18n): use correct Hebrew plural 'אחריויות'` — be careful with Hebrew plurals in i18n keys

**Do NOT:**
- Import `expo-notifications` (Story 12.5 only)
- Call `scheduleReminderNotification` or `scheduleSubscriptionNotifications`
- Use `REMINDER_PRESETS` from `@/constants/reminders` (those are credit presets — subscription has different presets)

---

## Architecture Compliance Checklist

- [ ] `firestoreSubscriptions.ts` is the ONLY file importing from `firebase/firestore` for the subscriptions collection
- [ ] All Firestore Timestamps converted to JS Date inside `docToSubscription()` — never stored as Timestamps in Zustand
- [ ] `subscriptionsStore` actions are synchronous setters only — async logic in `firestoreSubscriptions.ts`
- [ ] Amounts stored as integer agorot (`parseAmountToAgot()` from `@/constants/currencies`)
- [ ] `formatCurrency()` used for display only — never stored as formatted strings
- [ ] No `scheduleReminderNotification` or notification imports — notifications are Story 12.5
- [ ] `websiteUrl` stored as empty string or valid URL — never `undefined` in Firestore (use `|| undefined` pattern to omit if empty)
- [ ] `ServiceAutocomplete` reads from `subscriptionsStore` — NOT from `creditsStore`
- [ ] `subscriptions.tsx` FAB updated to navigate to `/add-subscription`
- [ ] All new UI text in both `en.json` AND `he.json`
- [ ] No directional styles: use `marginStart`/`marginEnd`, `textAlign: isRTL ? 'right' : 'left'`
- [ ] `npx tsc --noEmit` passes with zero errors

---

## Anti-Patterns to Avoid

- ❌ Do NOT import `expo-notifications` — no notifications in this story
- ❌ Do NOT reuse `REMINDER_PRESETS` from `@/constants/reminders` — wrong values for subscriptions
- ❌ Do NOT hardcode step titles in the component — always use `t('addSubscription.step.X')`
- ❌ Do NOT store formatted strings in Firestore — always store agorot integers
- ❌ Do NOT skip the optimistic update — the user should see the subscription immediately
- ❌ Do NOT create a `subscriptions` Firestore collection read in `add-subscription.tsx` — use `subscriptionsStore` (listener set up in Story 12.3)
- ❌ Do NOT use `StoreAutocomplete` for service name — create `ServiceAutocomplete` (reads from a different store)
- ❌ Do NOT implement the subscription list/card display here — that is Story 12.3

---

## Files Summary

| Action | File |
|--------|------|
| **CREATE** | `src/app/add-subscription.tsx` |
| **CREATE** | `src/components/redeemy/ServiceAutocomplete.tsx` |
| **CREATE** | `src/components/redeemy/IntentSelector.tsx` |
| **CREATE** | `src/lib/firestoreSubscriptions.ts` |
| **CREATE** | `src/constants/subscriptionReminders.ts` |
| **MODIFY** | `src/app/(tabs)/subscriptions.tsx` — wire FAB `onPress` |
| **MODIFY** | `src/locales/en.json` — add `addSubscription.*` keys |
| **MODIFY** | `src/locales/he.json` — add `addSubscription.*` keys |

---

## Definition of Done

- [x] `src/app/add-subscription.tsx` exists with all 9 steps implemented
- [x] Step 1 (billingType): two large cards, auto-advances on tap
- [x] Step 2 (serviceName): `ServiceAutocomplete` with autoFocus, canContinue requires input
- [x] Step 3 (amount): numeric input + isFree toggle + isFreeTrial (MONTHLY only) + monthly breakdown (ANNUAL)
- [x] Step 4 (billingDate): day picker (MONTHLY) or DateTimePicker (ANNUAL)
- [x] Step 5 (category): 10-category grid using `SUBSCRIPTION_CATEGORIES`
- [x] Step 6 (intent): 4 large option cards using `IntentSelector`
- [x] Step 7 (reminder): 4 preset chips + custom input, default 7 days
- [x] Step 8 (website): URL input with "דלג" skip link
- [x] Step 9 (summary): all data displayed, "שמור מנוי" button
- [x] Save: optimistic update → Firestore write → rollback on failure → toast "המנוי נשמר ✓" → navigate back
- [x] Offline check: `Alert.alert` if `offlineMode === true` before saving
- [x] Edit mode: `?subscriptionId=X` param pre-fills all steps, saves via `updateSubscription`
- [x] `ServiceAutocomplete.tsx` reads from `subscriptionsStore`
- [x] `IntentSelector.tsx` renders 4 large option cards
- [x] `firestoreSubscriptions.ts` exports `createSubscription`, `updateSubscription`, `deleteSubscription`, `subscribeToSubscriptions`
- [x] `subscriptionReminders.ts` defines 4 presets (3, 7, 14, 30 days)
- [x] `subscriptions.tsx` FAB navigates to `/add-subscription`
- [x] `en.json` and `he.json` have all `addSubscription.*` keys
- [x] Back navigation preserves form state across all steps
- [x] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No runtime errors on iOS simulator

---

## Dev Agent Record

### Implementation Notes

**Date:** 2026-04-21  
**Implemented by:** Claude Sonnet 4.6 (dev-story workflow)

#### Files Created

- `src/constants/subscriptionReminders.ts` — 4 subscription-specific reminder presets (3, 7, 14, 30 days)
- `src/lib/firestoreSubscriptions.ts` — Firestore CRUD: `subscribeToSubscriptions`, `createSubscription`, `updateSubscription`, `deleteSubscription`, `deleteAllUserSubscriptions`
- `src/components/redeemy/ServiceAutocomplete.tsx` — mirrors StoreAutocomplete; reads deduplicated service names from `subscriptionsStore`; `repeat-outline` icon per suggestion
- `src/components/redeemy/IntentSelector.tsx` — 4 large full-width tappable cards; reads from `SUBSCRIPTION_INTENTS`; selected state with Sage teal border + `primarySurface` background
- `src/app/add-subscription.tsx` — 9-step guided flow; `Animated` fade+slide transitions; keyboard-aware footer; `useToast()` local hook; optimistic save; edit mode via `?subscriptionId=X`; `SUBSCRIPTION_INTENTS_MAP` const for O(1) intent lookup in summary

#### Files Modified

- `src/app/(tabs)/subscriptions.tsx` — FAB `onPress` wired to `router.push('/add-subscription')`; added `useRouter` import
- `src/locales/en.json` — Added full `addSubscription.*` key tree (step titles, billingType, amount, reminder, website, summary, offline, error, validation)
- `src/locales/he.json` — Added full Hebrew `addSubscription.*` key tree

#### Key Decisions

- Imports for `SUBSCRIPTION_INTENTS` and `ComponentProps` moved to top of `add-subscription.tsx` (not at bottom) to follow ES module conventions
- `SUBSCRIPTION_INTENTS_MAP` defined as module-level const for clean O(1) lookup in `renderSummaryStep`
- `billingType` step has no Continue button — tap on card auto-advances via `handleSelectBillingType`
- Edit mode for subscriptions does NOT use optimistic update pattern — it directly updates store then Firestore (simpler since no temp ID needed)
- `website` step: "דלג" skip link calls `goNext()` directly; Continue button also works (url validation is permissive if empty)
- Free trial sub-fields (months + price after trial) are gated on `billingCycle === MONTHLY && !isFree && isFreeTrial`

#### Validation

- `npx tsc --noEmit` → EXIT: 0 (zero TypeScript errors)
