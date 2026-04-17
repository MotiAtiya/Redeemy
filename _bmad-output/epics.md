# Redeemy - Epic Breakdown

**Author:** Moti
**Date:** 2026-04-16
**Project Level:** MVP
**Target Scale:** Consumer mobile app (iOS-first, Android secondary)

---

## Overview

This document provides the complete epic and story breakdown for Redeemy, decomposing requirements from the Product Brief into implementable stories enriched with UX interaction patterns and architectural technical decisions.

**Living Document Notice:** This document incorporates context from Product Brief + UX Design Specification + Architecture Decision Document.

### Epic Summary

| Epic | Title | Stories |
|------|-------|---------|
| Epic 1 | Foundation & Project Setup | 4 stories |
| Epic 2 | User Authentication | 4 stories |
| Epic 3 | Credit Management (Core) | 6 stories |
| Epic 4 | Stores & Discovery | 2 stories |
| Epic 5 | Reminders & Notifications | 3 stories |
| Epic 6 | Redeem & History | 3 stories |
| Epic 7 | Offline Support | 2 stories |

---

## Functional Requirements Inventory

| # | Functional Requirement |
|---|------------------------|
| FR1 | User account creation (email, Google, Apple Sign-In) |
| FR2 | User authentication & session persistence |
| FR3 | Add new credit (photo + store name + amount + category + expiration + reminder + notes) |
| FR4 | Active credits list view (cards, sort, filter, search) |
| FR5 | Credit details view (full info, edit, delete, mark redeemed) |
| FR6 | Stores list (auto-populated, searchable, tap to see all credits per store) |
| FR7 | Reminders & push notifications (local scheduled + in-app badge) |
| FR8 | Redeem credit (mark as redeemed, move to archive) |
| FR9 | Redeemed credits archive (history view, search, filter) |
| FR10 | Cloud sync (automatic, real-time, cross-device) |
| FR11 | Image pipeline (capture/gallery, compress, thumbnail, cloud storage) |
| FR12 | Offline support (read/browse works offline) |

---

## FR Coverage Map

| FR | Epic | Stories |
|----|------|---------|
| FR1 | Epic 2 | 2.1, 2.2, 2.3 |
| FR2 | Epic 2 | 2.4 |
| FR3 | Epic 3 | 3.2, 3.3, 3.4 |
| FR4 | Epic 3 | 3.5 |
| FR5 | Epic 3 | 3.6 |
| FR6 | Epic 4 | 4.1, 4.2 |
| FR7 | Epic 5 | 5.1, 5.2, 5.3 |
| FR8 | Epic 6 | 6.1 |
| FR9 | Epic 6 | 6.2, 6.3 |
| FR10 | Epic 3 | 3.3 |
| FR11 | Epic 3 | 3.1 |
| FR12 | Epic 7 | 7.1, 7.2 |
| Infrastructure | Epic 1 | 1.1, 1.2, 1.3, 1.4 |

---

## Epic 1: Foundation & Project Setup

**Goal:** Bootstrap a working Expo app with correct folder structure, Firebase connection, Gluestack UI theme, Zustand stores, and tab navigation — so every subsequent story has a solid, consistent foundation to build on.

**User value:** The app runs on device/simulator with the correct Sage teal theme, empty tab bar, and authenticated Firebase connection.

---

### Story 1.1: Initialize Expo Project & Repository Structure

As a developer,
I want a properly initialized Expo SDK 55 project with TypeScript and the correct directory structure,
So that all subsequent stories follow consistent conventions from day one.

**Acceptance Criteria:**

**Given** a clean working directory
**When** the project is initialized
**Then** the following is true:
- `npx create-expo-app@latest Redeemy --template default@sdk-55` has been run
- TypeScript is configured: all source files use `.tsx`/`.ts`, `tsconfig.json` has `strict: true`
- Directory structure matches architecture spec exactly:
  - `src/app/`, `src/components/redeemy/`, `src/components/ui/`, `src/stores/`, `src/lib/`, `src/hooks/`, `src/types/`, `src/constants/`
- `src/app/_layout.tsx` exists as root layout
- `src/app/(tabs)/` group exists with `_layout.tsx`
- `.env.example` committed with all required Firebase variable names (values empty)
- `.gitignore` excludes `.env.development`, `.env.production`, `google-services.json`, `GoogleService-Info.plist`
- `eas.json` configured with `development`, `preview`, `production` profiles
- `jest.config.js` configured with `jest-expo` preset
- `README.md` documents setup instructions

**And** `npx expo start` runs without errors on iOS simulator

**Prerequisites:** None

**Technical Notes:**
- Use Expo Router v3 (file-based routing) — comes with `create-expo-app` default template
- Continuous Native Generation (CNG): do NOT commit `ios/` or `android/` directories
- Metro bundler — no custom config needed for MVP
- Add `"baseUrl": "."` to `tsconfig.json` for clean imports

---

### Story 1.2: Firebase Project & SDK Integration

As a developer,
I want Firebase initialized and connected to the app with auth, Firestore, and Storage configured,
So that all data operations have a working backend from the start.

**Acceptance Criteria:**

**Given** the Expo project from Story 1.1
**When** Firebase setup is complete
**Then**:
- `firebase@^12.0.0` and `@react-native-async-storage/async-storage` installed
- `src/lib/firebase.ts` is the ONLY file importing from `firebase/*` packages
- Firebase Auth initialized with `getReactNativePersistence(AsyncStorage)` so auth tokens survive app restarts
- Firestore initialized with `persistentLocalCache()` for offline reads
- Firebase Storage initialized
- `app.config.ts` reads all Firebase credentials from `process.env` (never hardcoded)
- `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/firestore.indexes.json`, `firebase/firebase.json` all exist (committed)
- Two Firebase environments configured: `redeemy-dev` (Spark plan) and `redeemy-prod` (Blaze plan)
- `google-services.json` and `GoogleService-Info.plist` documented in README as required but gitignored

**And** a smoke test: `firebase.ts` exports `{ app, auth, db, storage }` without runtime errors

**Prerequisites:** Story 1.1

**Technical Notes:**
- Firebase JS SDK v12 — fully compatible with Expo Go (no native modules required)
- `src/lib/firebase.ts` exports: `export const app`, `export const auth`, `export const db`, `export const storage`
- All other lib files import these exports: `import { db } from './firebase'`
- Gap fix from Architecture doc: AsyncStorage adapter required for BOTH Auth persistence AND Firestore offline persistence

---

### Story 1.3: Gluestack UI Theme & Navigation Shell

As a user,
I want to see the Redeemy app open to a Sage teal-themed tab bar with four tabs,
So that the visual identity and navigation structure are established.

**Acceptance Criteria:**

**Given** the app launches
**When** the user is on the home screen (unauthenticated redirect handled in Story 2.4)
**Then**:
- Gluestack UI installed: `@gluestack-ui/themed @gluestack-style/react`
- `src/components/ui/GluestackProvider.tsx` wraps entire app in `src/app/_layout.tsx`
- `src/components/ui/theme.ts` defines Sage teal token overrides:
  - Primary color: `#5F9E8F` (Sage teal)
  - Active tab indicator uses primary color
  - Typography uses system font with proper scale
- Four tabs defined in `src/app/(tabs)/_layout.tsx`:
  - **Credits** (home, wallet icon)
  - **Stores** (store icon)
  - **History** (clock icon)
  - **More** (menu/dots icon)
- Each tab screen renders a placeholder `<Text>` with tab name
- Tab bar uses Sage teal for active tab icon and label
- Safe area insets handled via `SafeAreaView` on all screens

**And** the app compiles and renders correctly on both iOS 15+ simulator and Android 8.0+ emulator

**Prerequisites:** Stories 1.1, 1.2

**Technical Notes:**
- Follow UX spec: Sage teal `#5F9E8F`, card-based layout, bottom tab navigation
- Gluestack UI theme tokens in `theme.ts` — not inline styles
- `src/app/_layout.tsx` is the root — GluestackProvider + auth gate goes here
- Tab icons: use `@expo/vector-icons` (included with Expo)

---

### Story 1.4: Zustand Stores & Core Types

As a developer,
I want the Zustand stores, TypeScript types, and constants scaffolded,
So that all subsequent stories can import consistent types and state management without conflicts.

**Acceptance Criteria:**

**Given** the project from Story 1.3
**When** the scaffolding is complete
**Then**:
- `zustand@5.0.12` and `zod@^3.25` installed
- `src/types/creditTypes.ts` defines:
  - `Credit` interface with all Firestore fields (amounts as `number` integers = agot)
  - `CreditStatus` enum: `ACTIVE = 'active'`, `REDEEMED = 'redeemed'`
  - `CreditFormData` type for Add Credit form
- `src/types/userTypes.ts` defines: `User`, `AuthStatus` enum (`LOADING | AUTHENTICATED | UNAUTHENTICATED`)
- `src/stores/authStore.ts` — shape: `{ currentUser, authStatus, setCurrentUser, setAuthStatus }`
- `src/stores/creditsStore.ts` — shape: `{ credits[], isLoading, error, searchQuery, setCredits, setLoading, setError, setSearchQuery, addCredit, removeCredit }`
- `src/stores/uiStore.ts` — shape: `{ activeTab, offlineMode, setActiveTab, setOfflineMode }`
- `src/lib/validation.ts` — Zod schemas: `CreditSchema`, `UserSchema`
- `src/constants/categories.ts` — 9 default categories with names and icons
- `src/constants/currencies.ts` — `₪` as default currency
- `src/constants/reminders.ts` — 4 preset options (1 day, 1 week, 1 month, 3 months)
- All Zustand stores follow the pattern: state + sync actions only; NO async logic inside stores

**And** TypeScript compiles with `strict: true` and zero errors

**Prerequisites:** Stories 1.1, 1.2

**Technical Notes:**
- Amounts stored as integers (agot = ₪ × 100) — enforced in `CreditSchema`
- Zustand stores use `create<StoreInterface>()` pattern — actions are synchronous setters
- Async logic lives in `src/lib/` service files only
- `CreditStatus` enum values used everywhere — never raw strings `'active'`/`'redeemed'`

---

## Epic 2: User Authentication

**Goal:** Users can create an account (email, Google, Apple), sign in, and stay authenticated across app restarts — with a protected route system that gates all content screens.

**User value:** User can register and log in securely; their data is tied to their identity.

---

### Story 2.1: Email Registration & Sign-In Screen

As a new user,
I want to register with my email and password,
So that I have a personal account to store my credits.

**Acceptance Criteria:**

**Given** the app launches and the user is unauthenticated
**When** `authStatus === UNAUTHENTICATED`
**Then** the app redirects to `src/app/auth/sign-in.tsx`

**Given** the sign-in screen is visible
**When** the user taps "Create Account"
**Then** `src/app/auth/sign-up.tsx` opens with: email field (RFC 5322 validation), password field (8+ chars, 1 uppercase, 1 number, 1 special char) with visibility toggle, confirm password field, "Create Account" primary button

**Given** the user submits the registration form
**When** all fields are valid
**Then** Firebase `createUserWithEmailAndPassword()` is called, `authStore.currentUser` is set, user is redirected to `(tabs)/index`

**And** inline validation errors appear below each field in red — never a blocking modal

**And** password strength indicator shows weak/medium/strong feedback visually

**Prerequisites:** Story 1.4

**Technical Notes:**
- Firebase Auth via `src/lib/firebase.ts` — never import firebase/auth directly in screens
- `src/hooks/useAuthState.ts` listens to `onAuthStateChanged` and writes to `authStore`
- All async auth logic in `src/lib/` — screens call lib functions, never Firebase SDK directly
- Map Firebase error codes to user-friendly messages: `auth/email-already-in-use` → "An account with this email already exists"

---

### Story 2.2: Google Sign-In

As a user,
I want to sign in with my Google account,
So that I don't need to create and remember a new password.

**Acceptance Criteria:**

**Given** the sign-in screen
**When** the user taps "Continue with Google"
**Then** the native Google OAuth consent screen opens

**Given** the user completes Google auth
**When** the OAuth flow succeeds
**Then** `signInWithCredential(auth, googleCredential)` is called, `authStore.currentUser` is set, user lands on `(tabs)/index`

**And** first-time Google sign-in creates a new Firestore `/users/{userId}` document

**And** the Google button follows iOS/Android design guidelines (Google branding, correct colors)

**Prerequisites:** Story 2.1

**Technical Notes:**
- Use `@react-native-google-signin/google-signin` package
- Configure `webClientId` from Firebase console in `app.config.ts`
- Handle `SIGN_IN_CANCELLED` gracefully (no error shown, just returns to sign-in screen)

---

### Story 2.3: Apple Sign-In (iOS)

As an iOS user,
I want to sign in with Apple,
So that I can use my existing Apple ID without sharing my email.

**Acceptance Criteria:**

**Given** the app runs on iOS
**When** the sign-in screen is shown
**Then** an "Sign in with Apple" button is visible (Apple HIG compliant — black button, Apple logo)

**Given** the user taps "Sign in with Apple"
**When** the Apple authentication sheet appears and the user authenticates
**Then** `signInWithCredential(auth, appleCredential)` is called, `authStore.currentUser` is set, user lands on `(tabs)/index`

**And** Apple Sign-In button is NOT shown on Android

**Prerequisites:** Story 2.1

**Technical Notes:**
- Use `expo-apple-authentication` package
- Apple Sign-In is required by App Store guidelines if any other social login exists on iOS
- Configure Apple Sign-In in EAS build config and Apple Developer Console
- Handle `ERR_CANCELED` gracefully

---

### Story 2.4: Auth Gate, Session Persistence & Sign-Out

As a returning user,
I want to open the app and be already signed in,
So that I don't have to re-authenticate every time.

**Acceptance Criteria:**

**Given** a previously authenticated user reopens the app
**When** `useAuthState` hook fires on app start
**Then** `authStatus === LOADING` shows a splash/loading state, then resolves to `AUTHENTICATED` and lands on `(tabs)/index` without any sign-in screen

**Given** any protected screen is accessed
**When** `authStatus === UNAUTHENTICATED`
**Then** the router redirects to `auth/sign-in` — no protected content is visible

**Given** the user taps "Sign Out" in the More tab settings
**When** `signOut(auth)` succeeds
**Then** `authStore` is cleared, Zustand stores are reset, user is redirected to `auth/sign-in`

**And** sign-out clears local Zustand state (no credit data remains in memory after sign-out)

**Prerequisites:** Stories 2.1, 2.2, 2.3

**Technical Notes:**
- Auth gate lives in `src/app/_layout.tsx` — reads `authStore.authStatus`
- `initializeAuth` with `getReactNativePersistence(AsyncStorage)` ensures token survives restart
- `useAuthState` hook sets up `onAuthStateChanged` listener once in root layout
- On sign-out: call `useCreditsStore.getState().setCredits([])` and reset all stores

---

## Epic 3: Credit Management (Core)

**Goal:** Users can add a credit (photo + fields), see all their active credits in a sorted list, and view/edit/delete any credit. This is the core value loop of the entire app.

**User value:** The wallet is functional — users can capture and retrieve all their store credits.

---

### Story 3.1: Image Pipeline — Capture, Compress & Upload

As a user,
I want to photograph my store credit and have the image stored reliably,
So that I always have a visual copy of the credit available.

**Acceptance Criteria:**

**Given** the Add Credit screen opens
**When** the image step is reached
**Then** `expo-image-picker` opens the camera full-screen immediately (no intermediate screen)

**And** a "Choose from Gallery" option is available as a secondary action

**Given** the user captures or selects a photo
**When** the image is confirmed
**Then**:
- `expo-image-manipulator` resizes to max 1024px on the long edge, JPEG quality 0.7 → `full.jpg`
- A thumbnail is generated: max 256px, JPEG quality 0.6 → `thumb.jpg`
- Both are uploaded to Firebase Storage: `credits/{creditId}/full.jpg` and `credits/{creditId}/thumb.jpg`
- `imageUrl` and `thumbnailUrl` (Firebase Storage download URLs) are written to the Firestore credit document

**And** raw camera output is NEVER uploaded directly — always compressed first

**And** upload failure shows a toast: "Photo upload failed — try again" and keeps the form open

**Prerequisites:** Stories 1.2, 2.4

**Technical Notes:**
- All image logic in `src/lib/imageUpload.ts` — signature: `uploadCreditImage(localUri: string, creditId: string): Promise<{ imageUrl: string, thumbnailUrl: string }>`
- No component imports `expo-image-picker` or `expo-image-manipulator` directly
- Use `expo-image` (not `<Image>` from React Native) for display with `blurhash` placeholder
- Camera permission handling: show explanation screen on first request, handle `DENIED` with Settings deep-link

---

### Story 3.2: Add Credit Form — Fields & Validation

As a user,
I want to fill in the credit details after taking a photo,
So that the credit is fully described and searchable.

**Acceptance Criteria:**

**Given** a photo has been captured (Story 3.1)
**When** the form renders in `src/app/add-credit.tsx`
**Then** the following fields are shown with the photo thumbnail at the top:
- **Store Name** — text input, auto-complete from existing stores (chips below field), mandatory
- **Amount** — numeric input with `₪` prefix, decimal support, stored as integer agot (×100), mandatory
- **Category** — horizontal chip selector (`CategoryChipSelector.tsx`) with 9 default categories + "Add New", mandatory
- **Expiration Date** — iOS native date picker (DD/MM/YYYY), mandatory
- **Reminder** — preset chips: 1 Day / 1 Week / 1 Month / 3 Months + Custom option; defaults to **1 Week** automatically when expiration date is set
- **Notes** — multi-line optional text field, collapsed by default, expands on tap

**Given** the user taps Save with missing mandatory fields
**Then** each empty mandatory field shows a red underline + helper text below — no modal alert

**And** the form validates with Zod `CreditSchema` before any Firestore write

**Prerequisites:** Story 3.1

**Technical Notes:**
- Amount display: `₪50.00` → stored as `5000` (agot) — `formatCurrency(5000)` → `"₪50.00"` in display components only
- `StoreAutocomplete.tsx` queries `creditsStore.credits` for existing store names — purely local, no network call
- `CategoryChipSelector.tsx` — horizontal `FlatList` of chips, Sage teal for selected state
- Zod schema enforces: `amount > 0`, `expirationDate > today`, `storeName.length >= 1`

---

### Story 3.3: Save Credit to Firestore

As a user,
I want my credit to be saved immediately and appear in my list,
So that I can trust the app has captured my credit.

**Acceptance Criteria:**

**Given** all mandatory fields are filled and the user taps Save
**When** the save operation executes
**Then**:
- Optimistic update: `creditsStore.addCredit(newCredit)` fires immediately — the card animates into the credits list at the top
- `addDoc(creditsCollection, creditData)` writes to Firestore `/credits/{auto-id}`
- `imageUpload.ts` uploads both images and updates the document with `imageUrl` + `thumbnailUrl`
- `notifications.ts` schedules the local reminder notification; `notificationId` is written back to the document
- A toast appears: "Credit saved · Reminder set for [date]" (auto-dismisses in 2 seconds)
- The Add Credit modal closes and the user lands on the home screen with the new credit visible

**Given** a network failure during save
**When** the Firestore write fails
**Then** a toast shows: "Couldn't save — tap to retry"; the form remains open with all fields filled; no data is lost

**And** all Firestore fields use camelCase; `status` is `CreditStatus.ACTIVE`; `createdAt` and `updatedAt` use `serverTimestamp()`

**Prerequisites:** Stories 3.1, 3.2

**Technical Notes:**
- Firestore document ID is auto-generated via `addDoc()` — then stored back as `id` field via `updateDoc()`
- Optimistic UI pattern: Zustand update first, Firestore async second; revert `addCredit` on persistent failure
- Raw Firebase error strings NEVER shown to user — map in `src/lib/firestoreCredits.ts`

---

### Story 3.4: New Store Auto-Registration

As a user,
I want stores I enter to be remembered automatically,
So that future credits auto-complete store names without any extra work.

**Acceptance Criteria:**

**Given** a credit is saved with a store name not previously used
**When** the Firestore write succeeds
**Then** the store name becomes available in `StoreAutocomplete.tsx` for future credits immediately

**And** stores are derived from the `creditsStore.credits` array — no separate Firestore collection needed

**And** auto-complete suggestions appear as horizontal chips below the store name input, filtered by what the user has typed so far (case-insensitive)

**Prerequisites:** Story 3.3

**Technical Notes:**
- Stores List is a derived view — `[...new Set(credits.map(c => c.storeName))]` from `creditsStore`
- No separate `stores` collection in Firestore per architecture decision
- Auto-complete chips show top 5 matches max to avoid overflow

---

### Story 3.5: Active Credits List View

As a user,
I want to see all my active credits in a clean sorted list,
So that I instantly know what store credits I have available.

**Acceptance Criteria:**

**Given** the user is on the Credits tab (`(tabs)/index.tsx`)
**When** credits are loaded
**Then**:
- Credits are displayed as cards (`CreditCard.tsx`) in a `FlatList`
- Default sort: soonest expiration first
- Each card shows: store name (large, bold), amount (XL, hero number), `ExpirationBadge` (green >30 days / amber 7–30 days / red <7 days), category icon, credit photo thumbnail
- A prominent search bar at the top filters by store name or notes (local, instant, no network)
- Sort options available via a sort button: Expiration (default), Amount, Store Name (A-Z), Recently Added
- Filter by Category available via filter chip row below search bar

**Given** no credits exist
**When** the list is empty
**Then** an empty state shows: "Add your first credit and never lose money again" with a prominent `+` FAB button

**And** the `+` FAB button is always visible in the bottom-right corner over the list

**And** `FlatList` uses `keyExtractor` and `getItemLayout` for smooth scrolling performance

**Prerequisites:** Story 3.3

**Technical Notes:**
- `ExpirationBadge.tsx` accepts `expirationDate: Date` prop — calculates days remaining inline
- Color thresholds: green `#4CAF50` (>30), amber `#FF9800` (7–30), red `#F44336` (<7)
- Search filtering runs on `creditsStore.searchQuery` — `uiStore` tracks active filter/sort state
- `expo-image` with `blurhash` for thumbnail lazy loading on the card

---

### Story 3.6: Credit Detail, Edit & Delete

As a user,
I want to tap a credit card and see full details, edit any field, or delete the credit,
So that I can keep my credits up to date.

**Acceptance Criteria:**

**Given** the user taps a credit card
**When** `credit/[id].tsx` opens
**Then** the detail screen shows:
- Full-size credit photo (pinch-to-zoom, `expo-image`)
- All fields: store name, amount (formatted as ₪), category, expiration date, reminder setting, notes (if any), date added
- `ExpirationBadge` with days remaining
- Primary action button: **Mark as Redeemed** (Sage teal, full width, always visible)
- Secondary actions: **Edit**, **Delete** — in a bottom action sheet (not inline)

**Given** the user taps Edit
**When** the edit form opens
**Then** the same form as Add Credit pre-fills all existing values; Save updates the Firestore document with `updatedAt: serverTimestamp()`; if expiration date changed, the old notification is cancelled and a new one is scheduled

**Given** the user taps Delete
**When** the confirmation bottom sheet is shown and confirmed
**Then** `deleteDoc(creditRef)` runs, the `notificationId` notification is cancelled, the credit is removed from `creditsStore`, and the user is navigated back to the list with a toast: "Credit deleted"

**And** swipe-left on a credit card in the list reveals Edit and Delete quick actions (Todoist pattern)

**Prerequisites:** Story 3.5

**Technical Notes:**
- Edit flow: cancel old notification → schedule new → `updateDoc()` with new `notificationId`
- Delete flow: `Notifications.cancelScheduledNotificationAsync(credit.notificationId)` before `deleteDoc()`
- Bottom sheet for destructive actions — never inline confirmation to prevent accidental taps

---

## Epic 4: Stores & Discovery

**Goal:** Users can see all stores where they have active credits and search by store name while shopping — answering "do I have a credit here?" in one tap.

**User value:** The app is useful in the real world — during an actual shopping trip.

---

### Story 4.1: Stores List Tab

As a user,
I want to see a list of all stores where I have active credits,
So that I can quickly see where my credit value is distributed.

**Acceptance Criteria:**

**Given** the user taps the Stores tab
**When** `(tabs)/stores.tsx` renders
**Then**:
- All stores with active credits are shown as a list, sorted alphabetically by default
- Each store row shows: store name, number of active credits, total active credit value (formatted ₪)
- A search bar at the top filters the stores list instantly (local, no network)
- Tapping a store row navigates to a filtered credits view showing all credits (active + redeemed) for that store

**Given** no active credits exist for any store
**Then** an empty state: "No active credits yet — add your first credit to get started" with a `+` CTA

**Prerequisites:** Story 3.5

**Technical Notes:**
- Stores list is derived from `creditsStore.credits` — group by `storeName`, sum `amount` (integer agot), count per store
- `formatCurrency(totalAgot)` used for display only — never store formatted strings
- No separate Firestore query needed — all data already in `creditsStore`

---

### Story 4.2: Store Detail — All Credits for a Store

As a user,
I want to tap a store and see all credits I've ever had there,
So that I can see my full history with that store.

**Acceptance Criteria:**

**Given** the user taps a store in the Stores tab
**When** the filtered view opens
**Then**:
- All credits for that store are shown, grouped: **Active** section first, **Redeemed** section below
- Each section uses the same `CreditCard.tsx` component
- Active credits show `ExpirationBadge` in full color; redeemed credits show neutral gray badge with redemption date
- Tapping any credit navigates to `credit/[id].tsx`
- A back button returns to the Stores list

**And** the screen title shows the store name

**Prerequisites:** Story 4.1

**Technical Notes:**
- Filter `creditsStore.credits` by `storeName === selectedStore` client-side — no new Firestore query
- Reuse `CreditCard.tsx` with an optional `dimmed` prop for redeemed state

---

## Epic 5: Reminders & Notifications

**Goal:** Users receive timely push notifications before credits expire, and the app badge shows how many credits are expiring soon — so no credit expires unnoticed.

**User value:** The core promise of the app is fulfilled: "you will never forget a credit."

---

### Story 5.1: Local Notification Scheduling

As a user,
I want a push notification to fire before my credit expires,
So that I remember to use it before it's too late.

**Acceptance Criteria:**

**Given** a credit is saved with an expiration date and reminder setting
**When** `notifications.ts` schedules the reminder
**Then**:
- `Notifications.scheduleNotificationAsync()` is called with trigger = expiration date minus reminder days, content = `{ title: "Store Credit Expiring Soon!", body: "[Store Name] — ₪[Amount] expires in [X days]" }`
- The returned `notificationId` is stored on the Firestore credit document
- If a `notificationId` already exists on the credit (edit case), the old notification is cancelled first before scheduling a new one

**Given** the notification fires and the user taps it
**When** the app opens from the notification
**Then** the app deep-links directly to `credit/[id].tsx` for that credit (via `data.creditId` in notification payload)

**And** notifications require permission — `Notifications.requestPermissionsAsync()` is called on first Add Credit attempt, with an explanation sheet shown before the system prompt

**Prerequisites:** Story 3.3

**Technical Notes:**
- All `expo-notifications` calls in `src/lib/notifications.ts` exclusively — no screen imports the package directly
- Notification payload must include `data: { creditId: string }` for deep-link routing
- `scheduleNotificationAsync` uses `DateTriggerInput` — calculate trigger date in `notifications.ts`
- APNs and FCM configured via `eas.json` build config

---

### Story 5.2: App Icon Badge for Expiring Credits

As a user,
I want to see a badge on the Redeemy app icon showing how many credits expire within 7 days,
So that I'm aware of urgency without opening the app.

**Acceptance Criteria:**

**Given** the app is running (foreground or background)
**When** `creditsStore.credits` changes
**Then**:
- Count credits where `status === CreditStatus.ACTIVE` AND `expirationDate <= today + 7 days`
- `Notifications.setBadgeCountAsync(count)` is called with that count
- Badge shows `0` (no badge) when no credits are expiring within 7 days

**Given** the user redeems or deletes a credit that was in the expiring count
**When** the `creditsStore` is updated
**Then** the badge count updates immediately

**Prerequisites:** Story 5.1

**Technical Notes:**
- Badge update logic in `src/lib/notifications.ts` — `updateBadgeCount(credits: Credit[])` helper
- Called from a `useBadgeUpdater` hook subscribed to `creditsStore`
- Badge count calculation uses JS `Date` objects — never raw Firestore Timestamps

---

### Story 5.3: In-App Expiration Alerts & Reminder Management

As a user,
I want to see a visual alert inside the app when a credit is close to expiring,
And be able to snooze or change a reminder from the credit detail screen.

**Acceptance Criteria:**

**Given** a credit has `expirationDate < today + 7 days` and `status === ACTIVE`
**When** it appears in the credits list
**Then** `ExpirationBadge` shows RED with text "X days left" — highly visible

**Given** the credit detail screen is open
**When** the reminder section is shown
**Then** the user can: change reminder preset (tap new chip → cancel old notification → schedule new), snooze reminder by 1 day / 3 days / 1 week

**And** snooze is available from the notification itself as an action button (iOS notification action)

**Prerequisites:** Stories 5.1, 5.2

**Technical Notes:**
- Reminder edit flow: `cancelScheduledNotificationAsync(old)` → `scheduleNotificationAsync(new)` → `updateDoc` with new `notificationId` and `reminderDays`
- iOS notification actions configured via `setNotificationCategoryAsync` in `notifications.ts`

---

## Epic 6: Redeem & History

**Goal:** Users can mark credits as used and review their complete redemption history — closing the loop and providing a record of savings.

**User value:** The core action — "I used this credit" — feels satisfying and complete; users can see what they've saved over time.

---

### Story 6.1: Mark Credit as Redeemed

As a user,
I want to mark a credit as redeemed after using it in a store,
So that it's removed from my active list and I know my credit has been used.

**Acceptance Criteria:**

**Given** the user is on `credit/[id].tsx`
**When** the user taps "Mark as Redeemed"
**Then** a confirmation bottom sheet appears: "Mark as Redeemed? — This credit will move to your history." with confirm and Cancel buttons

**Given** the user confirms redemption
**When** the action executes
**Then**:
- Optimistic update: credit immediately removed from the active credits list in `creditsStore`
- `updateDoc(creditRef, { status: CreditStatus.REDEEMED, redeemedAt: serverTimestamp() })` writes to Firestore
- The scheduled notification is cancelled: `cancelScheduledNotificationAsync(credit.notificationId)`
- Toast: "Redeemed! You saved ₪[amount]" (calm, auto-dismisses in 2 seconds)
- User is navigated back to the home screen

**And** swipe-right on the credit card in the list also triggers the redemption confirmation (Todoist pattern)

**Prerequisites:** Story 3.6

**Technical Notes:**
- Status: `CreditStatus.ACTIVE` → `CreditStatus.REDEEMED` — always use the enum
- Cancel notification immediately on redemption — never leave a dangling scheduled notification
- "You saved ₪[amount]" uses `formatCurrency(credit.amount)` — amount is in agot

---

### Story 6.2: Redeemed Credits History View

As a user,
I want to see all my previously redeemed credits in a history tab,
So that I have a record of credits I've successfully used.

**Acceptance Criteria:**

**Given** the user taps the History tab
**When** `(tabs)/history.tsx` renders
**Then**:
- All credits where `status === CreditStatus.REDEEMED` are shown
- Each card shows: store name, amount, redemption date (`redeemedAt`), category icon — in neutral/dimmed style
- Default sort: most recently redeemed first
- Search bar filters by store name (local, instant)
- Tapping a card opens `credit/[id].tsx` in read-only mode — "Redeemed on [date]" instead of "Mark as Redeemed"

**Given** no credits have been redeemed yet
**Then** empty state: "No credits redeemed yet — your history will appear here after you use a credit"

**Prerequisites:** Story 6.1

**Technical Notes:**
- `creditsStore.credits.filter(c => c.status === CreditStatus.REDEEMED)` — already in local store
- `CreditCard.tsx` with `variant="redeemed"` prop — muted colors, no urgency badge color

---

### Story 6.3: History Search & Filter

As a user,
I want to search and filter my redemption history,
So that I can find a specific past credit quickly.

**Acceptance Criteria:**

**Given** the History tab has redeemed credits
**When** the user types in the search bar
**Then** results filter instantly by store name or notes (case-insensitive, local)

**Given** the user taps the filter button
**When** the filter sheet opens
**Then** options include: Category (multi-select chips), Date Range (this month / last 3 months / this year / all time)

**And** active filters shown as dismissible chips below the search bar

**And** sort options: Most Recently Redeemed (default), Store Name (A-Z), Amount (high to low)

**Prerequisites:** Story 6.2

**Technical Notes:**
- All filtering/sorting is client-side on `creditsStore.credits` — no additional Firestore queries
- Filter state lives in `uiStore` — cleared when leaving the History tab

---

## Epic 7: Offline Support

**Goal:** Users can browse and search all their credits with no internet connection — the app is useful even in a basement, underground mall, or area with no signal.

**User value:** Redeemy is reliable in the real-world shopping scenarios where internet is not guaranteed.

---

### Story 7.1: Offline Read & Browse

As a user,
I want to browse and search my credits when I have no internet connection,
So that the app is useful even without signal.

**Acceptance Criteria:**

**Given** Firestore offline persistence is enabled via `persistentLocalCache()`
**When** the device has no internet connection
**Then**:
- Credits list loads from local Firestore cache — no loading spinner for cached data
- Search by store name works fully offline
- Credit detail view loads including cached photos (`expo-image` caches Firebase Storage URLs)
- `SyncIndicator` shows the gray "offline" state

**Given** the user attempts to Add a new credit while offline
**When** the save is attempted
**Then** a toast explains: "Adding credits requires an internet connection" — form stays open, no data lost

**And** Stores tab and History tab also work offline with cached data

**Prerequisites:** Stories 1.2, 3.5

**Technical Notes:**
- `persistentLocalCache()` initialized in `src/lib/firebase.ts`
- Network state: `@react-native-community/netinfo` → `uiStore.offlineMode`
- Write operations requiring internet: Add Credit, Edit, Redeem — all use the same offline toast pattern

---

### Story 7.2: Sync Recovery on Reconnect

As a user,
I want any pending changes to sync automatically when I regain internet,
So that I never lose data.

**Acceptance Criteria:**

**Given** Firestore offline persistence is enabled
**When** the device reconnects
**Then**:
- Firestore automatically flushes queued writes
- `SyncIndicator` transitions: offline (gray) → syncing (animated teal) → synced (solid teal)
- No user action required — fully automatic

**Given** a sync conflict occurs (two devices edited the same credit while one was offline)
**When** both writes reach Firestore
**Then** last-write-wins via `serverTimestamp()` on `updatedAt`

**Prerequisites:** Stories 1.2, 7.1

**Technical Notes:**
- Firestore handles offline write queue natively — no custom queue needed
- `onSnapshot` listeners re-fire automatically on reconnect
- `NetInfo.addEventListener` detects reconnect → updates `uiStore.offlineMode`

---

## FR Coverage Matrix

| FR | Epic | Stories |
|----|------|---------|
| FR1 — Account creation (email, Google, Apple) | Epic 2 | 2.1, 2.2, 2.3 |
| FR2 — Auth & session persistence | Epic 2 | 2.4 |
| FR3 — Add credit (photo + 6 fields) | Epic 3 | 3.2, 3.3 |
| FR4 — Active credits list (sort, filter, search) | Epic 3 | 3.5 |
| FR5 — Credit detail (view, edit, delete) | Epic 3 | 3.6 |
| FR6 — Stores list (auto-populated, searchable) | Epic 4 | 4.1, 4.2 |
| FR7 — Reminders & push notifications | Epic 5 | 5.1, 5.2, 5.3 |
| FR8 — Redeem credit | Epic 6 | 6.1 |
| FR9 — Redeemed archive & history | Epic 6 | 6.2, 6.3 |
| FR10 — Cloud sync & real-time | Epic 3 | 3.3 |
| FR11 — Image pipeline | Epic 3 | 3.1 |
| FR12 — Offline support | Epic 7 | 7.1, 7.2 |

✅ All 12 FRs covered across 24 stories.

---

## Summary

**Total: 7 Epics · 24 Stories**

| Epic | Stories | Delivers |
|------|---------|---------|
| Epic 1: Foundation | 4 | Runnable app skeleton with Firebase, theme, navigation, types |
| Epic 2: Authentication | 4 | User identity — register, sign in, session persistence |
| Epic 3: Credit Management | 6 | Core wallet — add, browse, view, edit, delete credits |
| Epic 4: Stores & Discovery | 2 | Shopping discovery — "do I have a credit here?" |
| Epic 5: Reminders | 3 | The core promise — no credit expires forgotten |
| Epic 6: Redeem & History | 3 | Close the loop — credits are used, history is kept |
| Epic 7: Offline Support | 2 | App works anywhere — no signal, no problem |

**Context incorporated:**
- ✅ Product Brief requirements (all 14 FRs)
- ✅ UX Design Specification (photo-first flow, Sage teal, card metaphor, swipe interactions, empty states, toast patterns, bottom sheets)
- ✅ Architecture decisions (Firebase v12, Zustand v5, Expo SDK 55, Zod v3.25, integer agot amounts, camelCase Firestore fields, single Firebase import boundary, notification deduplication, image compression pipeline)

---

_For implementation: Use the `dev-story` workflow to implement individual stories, starting with Story 1.1._
