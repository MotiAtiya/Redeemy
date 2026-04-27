# Story 11.1: Warranty Management

**Epic:** 11 — Warranty Management
**Story Key:** 11-1-warranty-management
**Author:** Moti
**Date:** 2026-04-20
**Status:** done

---

## User Story

As a user,
I want to save product warranties alongside my store credits,
So that I never miss a warranty expiry and always have my receipts available digitally.

---

## Background & Context

Redeemy currently manages store credits. This story introduces a parallel **Warranty** feature — users can photograph a purchase receipt and log the product name, store, category, expiry date, and reminder. A new 5th tab (between Stores and History) shows all active warranties. Expired and manually closed warranties appear in the History tab alongside redeemed credits, separated into sections.

**Key design decisions:**
- Warranties live in a separate Firestore collection: `/warranties/{warrantyId}`
- A warranty has a product name instead of an amount — same form flow as Add Credit otherwise
- Warranty tab is the 5th tab: Credits · Stores · **Warranties** · History · More
- History tab splits into two sections: "Redeemed Credits" + "Expired / Closed Warranties"
- Auto-expiry is client-side: if `status === ACTIVE && expirationDate < today`, the warranty is shown in History, not in the active list
- Warranties are shared in family mode (same `familyId` pattern as credits)
- Add Credit header title is fixed as "הוספת זיכוי" / "Add Credit" — no longer changes per step
- Add Warranty header title is fixed as "הוספת אחריות" / "Add Warranty"

**What this story does NOT cover:**
- Separate push notifications for warranties (can be added later — same `notifications.ts` pattern)
- Warranty search in the Stores tab (Stores tab intentionally shows only credits)

---

## Acceptance Criteria

### Add Warranty Flow

**Given** the user taps the `+` FAB button in the Warranties tab
**When** `src/app/add-warranty.tsx` opens
**Then**:
- The header title is always "הוספת אחריות" / "Add Warranty" — static, never changes per step
- The step flow mirrors Add Credit exactly:
  1. **Store Name** — autocomplete (same `StoreAutocomplete` component)
  2. **Category** — same 15-category grid
  3. **Product Name** — text input (e.g. "תנור אפייה Bosch") — replaces the Amount step
  4. **Expiry Date** — date picker + "No Expiry" toggle (same as Add Credit)
  5. **Reminder** — same 4 preset chips (1 Day, 1 Week, 1 Month, 3 Months)
  6. **Photo** — camera / gallery (same `openCamera`/`openGallery` from `imageUpload.ts`)
  7. **Notes Question** — "Add notes?" Yes/No
  8. **Notes Input** — if Yes (same multi-line input)
  9. **Summary** — shows store, product name, category, expiry, reminder, photo, notes

**Given** the user reaches the Product Name step
**When** the input renders
**Then**:
- `autoFocus` is set
- `autoCapitalize="sentences"`, `autoCorrect={false}`, `spellCheck={false}`
- Placeholder: `t('addWarranty.productNamePlaceholder')` → "Product name" / "שם המוצר"
- Continue button disabled until `productName.trim().length > 0`

**Given** the user taps Save on the Summary step
**When** the save executes
**Then**:
- Optimistic update: `warrantiesStore.addWarranty(newWarranty)` fires immediately
- `addDoc(warrantiesCollection, warrantyData)` writes to Firestore `/warranties/{auto-id}`
- Image upload runs (same `uploadCreditImage` pattern, storing in `warranties/{warrantyId}/`)
- Reminder notification scheduled via `scheduleReminderNotification` (same function, same payload shape)
- Toast: "Warranty saved" (2 seconds)
- Navigator returns to the Warranties tab

**Given** a save fails (network error)
**When** the Firestore write fails
**Then** toast: "Couldn't save — try again"; form stays open; all fields preserved

### Warranties Tab (Active List)

**Given** the user taps the Warranties tab
**When** `src/app/(tabs)/warranties.tsx` renders
**Then**:
- All warranties where `status === ACTIVE` AND `expirationDate > today` (or `noExpiry === true`) are shown
- Each row uses `WarrantyCard.tsx` component (see below)
- Default sort: soonest expiry first
- Sort options via sort button (same UX as Credits tab):
  - Soonest Expiry (default)
  - Product Name (A–Z)
  - Store Name (A–Z)
  - Recently Added
- A `+` FAB button (bottom-right, same style as Credits tab) navigates to `add-warranty`
- No search bar in MVP (can be added later)

**Given** no active warranties exist
**Then** empty state: store icon + "No warranties yet" + "Add your first warranty" button linking to `add-warranty`

**Given** a warranty's `expirationDate` is in the past AND `status === ACTIVE`
**When** the list renders
**Then** that warranty is NOT shown in the active list — it is treated as expired and shown in History

### WarrantyCard Component

Each warranty card (`src/components/redeemy/WarrantyCard.tsx`) displays:
- **Photo thumbnail** (72×72, same as `CreditCard`) — or placeholder icon if no photo
- **Store name** (15px, bold)
- **Product name** (22px, bold, hero text — same visual weight as amount in CreditCard)
- **ExpirationBadge** (same component, same color thresholds: green/amber/red)
- **Category icon + label** (same meta row as CreditCard)
- **Family member avatar** — initials circle if credit belongs to another family member (same `memberAvatar` logic as CreditCard)

Tapping a card opens `src/app/warranty/[id].tsx`.

### Warranty Detail Screen

**Given** the user taps a warranty card
**When** `src/app/warranty/[id].tsx` opens
**Then**:
- Full-size photo (same as `credit/[id].tsx`)
- All fields: store name, product name, category, expiry date, reminder, notes, date added
- `ExpirationBadge` with days remaining
- Primary action button: **Mark as Closed** (Sage teal, full width) — triggers confirmation bottom sheet
- Secondary actions: **Edit**, **Delete** — in bottom action sheet

**Given** the user taps "Mark as Closed"
**When** confirmed in the bottom sheet: "Close warranty? It will move to your history."
**Then**:
- Optimistic update: warranty removed from active list in `warrantiesStore`
- `updateDoc(warrantyRef, { status: WarrantyStatus.CLOSED, closedAt: serverTimestamp() })`
- Reminder notification cancelled: `cancelScheduledNotificationAsync(warranty.notificationId)`
- Toast: "Warranty closed"
- User navigated back to Warranties tab

**Given** the user taps Edit
**When** the edit form opens
**Then** the same Add Warranty form pre-fills all existing values; Save updates the Firestore document with `updatedAt: serverTimestamp()`; if expiry date changed, old notification is cancelled and new one scheduled

**Given** the user taps Delete and confirms
**When** delete executes
**Then** `deleteDoc(warrantyRef)`, notification cancelled, warranty removed from store, user navigated back with toast "Warranty deleted"

### History Tab (Updated — Two Sections)

**Given** the user opens the History tab
**When** `src/app/(tabs)/history.tsx` renders
**Then** the list is divided into two clearly labeled sections:

**Section 1 — "Redeemed Credits"** (`t('history.sectionCredits')`)
- All credits where `status === REDEEMED` (existing logic, unchanged)
- Uses `CreditCard` with `variant="redeemed"`

**Section 2 — "Expired & Closed Warranties"** (`t('history.sectionWarranties')`)
- All warranties where `status === CLOSED`, PLUS all warranties where `status === ACTIVE && expirationDate < today`
- Uses `WarrantyCard` with a dimmed variant

Each section shows a section header. If a section has no items, it is hidden (don't show an empty section). If BOTH sections are empty, the existing empty state renders.

Sort and search apply within each section independently (or globally — keep simple: global search by store name / product name; global sort by date).

### Add Credit — Fixed Header Title

**Given** `src/app/add-credit.tsx` is open
**When** any step is active (storeName, category, amount, etc.)
**Then** the header title is always `t('addCredit.title')` → "Add Credit" / "הוספת זיכוי" — **never changes per step**

Remove the `stepTitleKey` map and the per-step header logic. The step name is communicated by the large `stepTitle` text inside the scroll view content — not the header.

### Family Sharing

**Given** the user is in a family
**When** a warranty is created
**Then**:
- `familyId`, `createdBy` (userId), `createdByName` (displayName) are written to the warranty document
- `subscribeToWarranties` queries by `familyId` instead of `userId` (same pattern as credits)

**Given** a warranty was created by another family member
**When** it appears in the Warranties tab
**Then** a small initials avatar appears on the card (same `memberAvatar` style as `CreditCard`)

---

## Data Model

### Firestore Collection: `/warranties/{warrantyId}`

```typescript
// src/types/warrantyTypes.ts

import type { Timestamp } from 'firebase/firestore';

export enum WarrantyStatus {
  ACTIVE  = 'active',
  CLOSED  = 'closed',   // manually closed by user
  EXPIRED = 'expired',  // reserved for future Firestore-side expiry jobs (not used client-side)
}

export interface Warranty {
  id: string;
  userId: string;
  storeName: string;
  productName: string;         // replaces "amount"
  category: string;            // same category IDs as credits
  expirationDate?: Date;       // undefined = no expiry
  noExpiry: boolean;
  reminderDays: number;        // same presets: 1, 7, 30, 90
  notes: string;
  imageUri?: string;           // local uri (optimistic display)
  imageUrl?: string;           // Firebase Storage download URL
  thumbnailUrl?: string;       // Firebase Storage thumbnail URL
  status: WarrantyStatus;
  notificationId?: string;
  expirationNotificationId?: string;
  closedAt?: Date;             // set when status → CLOSED
  // Family sharing
  familyId?: string;
  createdBy?: string;
  createdByName?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Firestore document shape (camelCase, amounts as integers — no amounts here):**
```json
{
  "id": "war_abc123",
  "userId": "uid_moti",
  "storeName": "שופרסל",
  "productName": "תנור אפייה Bosch HBF154ES0",
  "category": "electronics",
  "expirationDate": { "seconds": 1809302400 },
  "noExpiry": false,
  "reminderDays": 30,
  "notes": "",
  "imageUrl": "https://...",
  "thumbnailUrl": "https://...",
  "status": "active",
  "notificationId": "notif_xyz",
  "familyId": null,
  "createdBy": "uid_moti",
  "createdByName": "Moti",
  "createdAt": { "seconds": 1745181000 },
  "updatedAt": { "seconds": 1745181000 }
}
```

---

## New Files to Create

### `src/types/warrantyTypes.ts`
Full content shown in Data Model section above.

### `src/stores/warrantiesStore.ts`

```typescript
import { create } from 'zustand';
import type { Warranty } from '@/types/warrantyTypes';

interface WarrantiesState {
  warranties: Warranty[];
  isLoading: boolean;
  error: string | null;
}

interface WarrantiesActions {
  setWarranties: (warranties: Warranty[]) => void;
  addWarranty: (warranty: Warranty) => void;
  updateWarranty: (id: string, changes: Partial<Warranty>) => void;
  removeWarranty: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWarrantiesStore = create<WarrantiesState & WarrantiesActions>()((set) => ({
  warranties: [],
  isLoading: false,
  error: null,
  setWarranties: (warranties) => set({ warranties }),
  addWarranty: (warranty) => set((s) => ({ warranties: [warranty, ...s.warranties] })),
  updateWarranty: (id, changes) => set((s) => ({
    warranties: s.warranties.map((w) => w.id === id ? { ...w, ...changes } : w),
  })),
  removeWarranty: (id) => set((s) => ({ warranties: s.warranties.filter((w) => w.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
```

### `src/lib/firestoreWarranties.ts`

Mirror the exact structure of `firestoreCredits.ts`. Required exports:

```typescript
// Subscribe to warranties — by familyId if in family, else by userId
// Converts all Timestamps to Date before writing to warrantiesStore
// Returns unsubscribe function
subscribeToWarranties(userId: string, familyId?: string | null): Unsubscribe

// Create a new warranty document
// Returns the new warrantyId
createWarranty(data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>

// Update an existing warranty
updateWarranty(warrantyId: string, changes: Partial<Warranty>): Promise<void>

// Delete a warranty
deleteWarranty(warrantyId: string): Promise<void>
```

**Timestamp conversion** (same pattern as `firestoreCredits.ts`):
```typescript
function docToWarranty(doc: DocumentSnapshot): Warranty {
  const data = doc.data()!;
  return {
    ...data,
    id: doc.id,
    expirationDate: data.expirationDate?.toDate(),
    closedAt: data.closedAt?.toDate(),
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  } as Warranty;
}
```

**Query logic** (same as credits):
```typescript
const q = familyId
  ? query(collection(db, 'warranties'), where('familyId', '==', familyId))
  : query(collection(db, 'warranties'), where('userId', '==', userId));
```

### `src/hooks/useWarrantiesListener.ts`

```typescript
// Sets up onSnapshot listener — tears down and re-subscribes when userId/familyId changes
export function useWarrantiesListener(userId: string | null, familyId: string | null | undefined): void
```

Pattern (identical to credits listener):
```typescript
useEffect(() => {
  if (!userId) return;
  const unsubscribe = subscribeToWarranties(userId, familyId);
  return unsubscribe;
}, [userId, familyId]);
```

Call this hook from `src/app/_layout.tsx` alongside the credits listener.

### `src/components/redeemy/WarrantyCard.tsx`

Props:
```typescript
interface Props {
  warranty: Warranty;
  onPress: () => void;
  variant?: 'active' | 'closed' | 'expired';
}
```

Layout mirrors `CreditCard.tsx` exactly:
- Same card style (border radius 14, shadow, margin)
- **Left content:**
  - Store name (15px bold)
  - Product name (22px bold, hero text — no currency symbol)
  - Meta row: category icon + label + ExpirationBadge
- **Right:** thumbnail (72×72) with optional member avatar overlay

**Key difference from CreditCard:** no decimal split on product name (it's text, not a number).

### `src/app/(tabs)/warranties.tsx`

Structure mirrors `src/app/(tabs)/index.tsx` (Credits tab):

```typescript
// Derived: active warranties only
const activeWarranties = useMemo(() =>
  warranties.filter((w) =>
    w.status === WarrantyStatus.ACTIVE &&
    (w.noExpiry || !w.expirationDate || w.expirationDate > new Date())
  ), [warranties]);

// Sort
const sorted = useMemo(() => {
  return [...activeWarranties].sort((a, b) => {
    switch (sortOption) {
      case 'expiry': // default — soonest first; noExpiry goes to end
        if (a.noExpiry && b.noExpiry) return 0;
        if (a.noExpiry) return 1;
        if (b.noExpiry) return -1;
        return (a.expirationDate!.getTime()) - (b.expirationDate!.getTime());
      case 'productName':
        return a.productName.localeCompare(b.productName, 'he');
      case 'storeName':
        return a.storeName.localeCompare(b.storeName, 'he');
      case 'recent':
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });
}, [activeWarranties, sortOption]);
```

FAB button (same style as Credits tab `+` button).

### `src/app/add-warranty.tsx`

Copy `add-credit.tsx` as the starting point and make these specific changes:
1. Replace `amount` / `amountInput` state → `productName` state (string)
2. Replace the Amount step with a Product Name step (text input, not numeric)
3. Remove `parseAmountToAgot` / `formatCurrency` references
4. Replace all `credit` / `Credit` references with `warranty` / `Warranty`
5. Replace `createCredit` call with `createWarranty`
6. Replace `useCreditsStore` with `useWarrantiesStore`
7. Header title: always `t('addWarranty.title')` — static

**Product Name step render:**
```typescript
function renderProductNameStep() {
  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>{t('addWarranty.step.productName')}</Text>
      <TextInput
        style={styles.productNameInput}
        placeholder={t('addWarranty.productNamePlaceholder')}
        placeholderTextColor={colors.textTertiary}
        value={productName}
        onChangeText={setProductName}
        autoFocus
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="next"
      />
    </ScrollView>
  );
}
```

`canContinue` for productName step: `productName.trim().length > 0`

**Step flow** (replace `'amount'` with `'productName'` in the `StepId` type):
```typescript
type StepId = 'storeName' | 'category' | 'productName' | 'expiryDate' | 'reminder' | 'photo' | 'notesQuestion' | 'notesInput' | 'summary';
```

**Summary step** shows productName where amount was shown (no currency symbol, no decimal formatting).

### `src/app/warranty/[id].tsx`

Mirror `src/app/credit/[id].tsx` with:
- `productName` displayed where amount was shown
- Primary action: "Mark as Closed" → `WarrantyStatus.CLOSED` (instead of "Mark as Redeemed" → `CreditStatus.REDEEMED`)
- `closedAt` instead of `redeemedAt`
- Toast: "Warranty closed" instead of "Redeemed! You saved ₪..."

---

## Files to Modify

### `src/app/(tabs)/_layout.tsx`

Add the Warranties tab as the 3rd tab (index 2), between Stores and History:

```typescript
// Current order: Credits(0) · Stores(1) · History(2) · More(3)
// New order:     Credits(0) · Stores(1) · Warranties(2) · History(3) · More(4)

<Tabs.Screen
  name="warranties"
  options={{
    title: t('tabs.warranties'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="shield-checkmark-outline" size={size} color={color} />
    ),
  }}
/>
```

Icon: `shield-checkmark-outline` (Ionicons) — clearly communicates warranty/protection.

### `src/app/(tabs)/history.tsx`

Replace the flat `FlatList` with two sectioned lists:

```typescript
// Derived: redeemed credits
const redeemedCredits = useMemo(() =>
  credits.filter((c) => c.status === CreditStatus.REDEEMED),
[credits]);

// Derived: closed + auto-expired warranties
const historyWarranties = useMemo(() =>
  warranties.filter((w) =>
    w.status === WarrantyStatus.CLOSED ||
    (w.status === WarrantyStatus.ACTIVE && w.expirationDate && w.expirationDate < new Date())
  ),
[warranties]);
```

Render as:
```
{redeemedCredits.length > 0 && (
  <>
    <SectionHeader title={t('history.sectionCredits')} />
    <FlatList data={redeemedCredits} renderItem={...CreditCard variant="redeemed"} />
  </>
)}
{historyWarranties.length > 0 && (
  <>
    <SectionHeader title={t('history.sectionWarranties')} />
    <FlatList data={historyWarranties} renderItem={...WarrantyCard variant="expired"/"closed"} />
  </>
)}
{redeemedCredits.length === 0 && historyWarranties.length === 0 && renderEmpty()}
```

Import `useWarrantiesStore` and add to the existing store reads.

### `src/app/add-credit.tsx`

**Remove** the `stepTitleKey` record and the per-step header logic:

```typescript
// DELETE this entire block:
const stepTitleKey: Record<StepId, string> = {
  storeName: 'addCredit.step.storeName',
  category: 'addCredit.step.category',
  // ... etc
};
const headerTitle = isEditing ? t('addCredit.titleEdit') : t(stepTitleKey[currentStepId]);
```

**Replace with:**
```typescript
const headerTitle = isEditing ? t('addCredit.titleEdit') : t('addCredit.title');
// where addCredit.title = "Add Credit" / "הוספת זיכוי" — static
```

### `src/app/_layout.tsx`

Add `useWarrantiesListener` call alongside the existing credits listener:

```typescript
useWarrantiesListener(currentUser?.uid ?? null, settingsStore.familyId ?? null);
```

### `firebase/firestore.rules`

Add rules for `/warranties`:

```
match /warranties/{warrantyId} {
  allow read: if request.auth.uid == resource.data.userId ||
    isFamilyMember(resource.data.familyId);
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth.uid == resource.data.userId ||
    isFamilyMember(resource.data.familyId);
}
```

Also add a new Firestore composite index for warranties (same as credits):
- Collection: `warranties` · Field: `familyId` ASC + `createdAt` DESC
- Collection: `warranties` · Field: `userId` ASC + `createdAt` DESC

Add to `firebase/firestore.indexes.json`.

### `src/locales/en.json` — add keys:

```json
"tabs": {
  "warranties": "Warranties"
},
"addWarranty": {
  "title": "Add Warranty",
  "titleEdit": "Edit Warranty",
  "step": {
    "storeName": "Store Name",
    "category": "Category",
    "productName": "Product Name",
    "expiryDate": "Expiry Date",
    "reminder": "Reminder",
    "photo": "Photo",
    "notesQuestion": "Add notes?",
    "notesInput": "Notes",
    "summary": "Summary"
  },
  "productNamePlaceholder": "e.g. Bosch Oven HBF154",
  "noExpiry": "No expiry date",
  "continue": "Continue",
  "save": "Save Warranty",
  "retakePhoto": "Retake Photo",
  "chooseGallery": "Choose from Gallery",
  "takePhoto": "Take Photo",
  "notesYes": "Add Notes",
  "notesNo": "Skip",
  "notesPlaceholder": "Warranty details, serial number...",
  "summary": {
    "store": "Store",
    "product": "Product",
    "category": "Category",
    "expiry": "Expiry",
    "reminder": "Reminder",
    "notes": "Notes",
    "noExpiry": "No expiry"
  },
  "offline": {
    "adding": "Adding warranties requires an internet connection."
  },
  "error": {
    "save": "Couldn't save",
    "saveMessage": "Please try again.",
    "photo": "Photo upload failed — warranty saved without photo."
  },
  "validation": {
    "productNameRequired": "Product name is required"
  }
},
"warranties": {
  "title": "Warranties",
  "empty": {
    "title": "No warranties yet",
    "subtitle": "Add your first warranty to keep track of product guarantees",
    "action": "Add Warranty"
  },
  "sort": {
    "expiry": "Expiry Date",
    "productName": "Product Name",
    "storeName": "Store Name",
    "recent": "Recently Added"
  },
  "markClosed": "Mark as Closed",
  "closedToast": "Warranty closed",
  "deletedToast": "Warranty deleted",
  "closedConfirm": {
    "title": "Close warranty?",
    "message": "It will move to your history.",
    "confirm": "Close",
    "cancel": "Cancel"
  }
},
"history": {
  "sectionCredits": "Redeemed Credits",
  "sectionWarranties": "Expired & Closed Warranties"
},
"addCredit": {
  "title": "Add Credit"
}
```

### `src/locales/he.json` — add keys:

```json
"tabs": {
  "warranties": "אחריות"
},
"addWarranty": {
  "title": "הוספת אחריות",
  "titleEdit": "עריכת אחריות",
  "step": {
    "storeName": "שם החנות",
    "category": "קטגוריה",
    "productName": "שם המוצר",
    "expiryDate": "תאריך תפוגה",
    "reminder": "תזכורת",
    "photo": "תמונה",
    "notesQuestion": "להוסיף הערות?",
    "notesInput": "הערות",
    "summary": "סיכום"
  },
  "productNamePlaceholder": "לדוגמה: תנור אפייה Bosch HBF154",
  "noExpiry": "ללא תאריך תפוגה",
  "continue": "המשך",
  "save": "שמור אחריות",
  "retakePhoto": "צלם מחדש",
  "chooseGallery": "בחר מהגלריה",
  "takePhoto": "צלם תמונה",
  "notesYes": "הוסף הערות",
  "notesNo": "דלג",
  "notesPlaceholder": "פרטי אחריות, מספר סידורי...",
  "summary": {
    "store": "חנות",
    "product": "מוצר",
    "category": "קטגוריה",
    "expiry": "תפוגה",
    "reminder": "תזכורת",
    "notes": "הערות",
    "noExpiry": "ללא תפוגה"
  },
  "offline": {
    "adding": "הוספת אחריות מצריכה חיבור לאינטרנט."
  },
  "error": {
    "save": "לא ניתן לשמור",
    "saveMessage": "אנא נסה שוב.",
    "photo": "העלאת התמונה נכשלה — האחריות נשמרה ללא תמונה."
  },
  "validation": {
    "productNameRequired": "שם המוצר הוא שדה חובה"
  }
},
"warranties": {
  "title": "אחריות",
  "empty": {
    "title": "אין אחריות עדיין",
    "subtitle": "הוסף את האחריות הראשונה שלך ואל תפספס שום תוקף",
    "action": "הוסף אחריות"
  },
  "sort": {
    "expiry": "תאריך תפוגה",
    "productName": "שם מוצר",
    "storeName": "שם חנות",
    "recent": "נוסף לאחרונה"
  },
  "markClosed": "סמן כנסגר",
  "closedToast": "האחריות נסגרה",
  "deletedToast": "האחריות נמחקה",
  "closedConfirm": {
    "title": "לסגור את האחריות?",
    "message": "היא תועבר להיסטוריה.",
    "confirm": "סגור",
    "cancel": "ביטול"
  }
},
"history": {
  "sectionCredits": "זיכויים שנוצלו",
  "sectionWarranties": "אחריות שפגה / נסגרה"
},
"addCredit": {
  "title": "הוספת זיכוי"
}
```

---

## Architecture Compliance Checklist

- [ ] `firestoreWarranties.ts` is the ONLY file importing from `firebase/firestore` for the warranties collection
- [ ] All Firestore Timestamps converted to JS Date inside `firestoreWarranties.ts` — never stored as Timestamps in Zustand
- [ ] `warrantiesStore` actions are synchronous setters — async logic in `firestoreWarranties.ts` only
- [ ] `useWarrantiesListener` returns unsubscribe from `useEffect` cleanup
- [ ] `add-warranty.tsx` uses the same `openCamera`/`openGallery`/`uploadCreditImage` from `imageUpload.ts` — no new image logic
- [ ] `add-warranty.tsx` uses the same `scheduleReminderNotification` from `notifications.ts` — no new notification logic
- [ ] Auto-expiry is client-side only — filter at render time, no Firestore status update on expiry
- [ ] No hardcoded `left`/`right` directional styles — use `marginStart`/`marginEnd`
- [ ] All new UI text in both `en.json` and `he.json`
- [ ] `WarrantyCard` uses `ExpirationBadge` (same component, no duplication)
- [ ] Warranties tab 5th position in `_layout.tsx` (between Stores and History)
- [ ] Stores tab (`stores.tsx`) unchanged — only reads from `creditsStore`, not `warrantiesStore`
- [ ] History tab imports both `useCreditsStore` AND `useWarrantiesStore`
- [ ] `add-credit.tsx` header title is now static (`t('addCredit.title')`) — `stepTitleKey` map removed
- [ ] Firestore Security Rules updated to include `/warranties` collection

---

## Anti-Patterns to Avoid

- ❌ Do NOT copy-paste `CreditCard` and rename — create `WarrantyCard` as a clean component that shares the same styles object pattern
- ❌ Do NOT add warranties to `creditsStore` — they are in a separate `warrantiesStore`
- ❌ Do NOT query warranties in the Stores tab — Stores tab intentionally only aggregates credits
- ❌ Do NOT use raw Firestore Timestamps in components — always convert in `firestoreWarranties.ts`
- ❌ Do NOT show a warranty's `closedAt` timestamp on the card in the active list (it hasn't been closed yet)
- ❌ Do NOT update Firestore status on every render to "expired" — expiry is a client-side display filter only
- ❌ Do NOT forget to cancel the notification when marking a warranty as closed or deleting it
- ❌ Do NOT use `t(stepTitleKey[currentStepId])` in `add-credit.tsx` — that logic has been removed

---

## Files Summary

| Action | File |
|--------|------|
| **CREATE** | `src/types/warrantyTypes.ts` |
| **CREATE** | `src/stores/warrantiesStore.ts` |
| **CREATE** | `src/lib/firestoreWarranties.ts` |
| **CREATE** | `src/hooks/useWarrantiesListener.ts` |
| **CREATE** | `src/components/redeemy/WarrantyCard.tsx` |
| **CREATE** | `src/app/(tabs)/warranties.tsx` |
| **CREATE** | `src/app/add-warranty.tsx` |
| **CREATE** | `src/app/warranty/[id].tsx` |
| **MODIFY** | `src/app/(tabs)/_layout.tsx` — add Warranties tab (5th, between Stores and History) |
| **MODIFY** | `src/app/(tabs)/history.tsx` — two sections (credits + warranties) |
| **MODIFY** | `src/app/add-credit.tsx` — static header title |
| **MODIFY** | `src/app/_layout.tsx` — add `useWarrantiesListener` call |
| **MODIFY** | `firebase/firestore.rules` — add `/warranties` rules |
| **MODIFY** | `firebase/firestore.indexes.json` — add warranty indexes |
| **MODIFY** | `src/locales/en.json` — add `addWarranty`, `warranties`, `history` section keys, `tabs.warranties`, `addCredit.title` |
| **MODIFY** | `src/locales/he.json` — same |

---

## Definition of Done

- [ ] Warranties tab visible as 5th tab with shield icon, between Stores and History
- [ ] `add-warranty.tsx` opens from the `+` FAB with fixed "הוספת אחריות" title
- [ ] Product Name step accepts free text and drives `canContinue`
- [ ] Warranty saved to Firestore with all fields; photo uploaded; reminder scheduled
- [ ] Active warranties list shows only non-expired warranties, sorted by soonest expiry by default
- [ ] All 4 sort options work (expiry, product name, store name, recently added)
- [ ] Tapping a warranty card opens `warranty/[id].tsx` with full details
- [ ] "Mark as Closed" moves warranty to History tab
- [ ] Edit and Delete work correctly from `warranty/[id].tsx`
- [ ] Expired warranties (date passed) appear in History, NOT in active list
- [ ] History tab shows two sections: Redeemed Credits + Expired/Closed Warranties
- [ ] Sections are hidden when empty; full empty state shown when both are empty
- [ ] `add-credit.tsx` header always shows "הוספת זיכוי" — never the step name
- [ ] Stores tab unchanged — no warranties shown
- [ ] Family sharing: warranties include `familyId`, listener switches to `familyId` query
- [ ] Member avatar shown on WarrantyCard for other family members' warranties
- [ ] Firestore rules deployed for `/warranties` collection
- [ ] No TypeScript errors with `strict: true`
- [ ] All text keys in both Hebrew and English

---

## Next Story

**Story 11.2 (optional):** Warranty push notifications — add `scheduleReminderNotification` for warranties with deep-link to `warranty/[id]`, and `updateBadgeCount` to include expiring warranties in the app icon badge count.
