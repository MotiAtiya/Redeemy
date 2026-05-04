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

| Epic | Title | Stories | Status |
|------|-------|---------|--------|
| Epic 1 | Foundation & Project Setup | 4 stories | ✅ done |
| Epic 2 | User Authentication | 4 stories | ✅ done |
| Epic 3 | Credit Management (Core) | 6 stories | ✅ done |
| Epic 4 | Stores & Discovery | 2 stories | ✅ done |
| Epic 5 | Reminders & Notifications | 3 stories | ✅ done |
| Epic 6 | Redeem & History | 3 stories | ✅ done |
| Epic 7 | Offline Support | 2 stories | ✅ done |
| Epic 9 | Theme & Appearance (dark mode) | 2 stories | ✅ done |
| Epic 10 | Family Sharing | 3 stories | ✅ done |
| Epic 11 | Warranty Management | 1 story | ✅ done |
| Epic 12 | Subscription Management | 6 stories | ✅ done |
| Epic 13 | Onboarding Flow | 3 stories | ✅ done |
| Epic 14 | Warranties (full rewrite with multi-image) | 1 story | ✅ done |
| Epic 15 | Occasions (birthdays, anniversaries, yahrzeit) | 2 stories | ✅ done |
| Epic 16 | Documents (ID, license, passport, insurance) | 1 story | ✅ done |
| Epic 18 | Admin Dashboard (web, V1 MVP) | 4 stories | ✅ done |
| Epic 19 | Admin Dashboard — V1.5 quick wins | 3 stories | 📝 planned |

> **Note:** Epics 9–16 were added after initial planning. Epics 14–16 are new features not in the original product brief. Epic 18 is a separate web application (not part of the mobile app codebase).

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

## Epic 10: Family Sharing

**Goal:** Users can create a named family group (up to 6 members) and share all credits in real time — every credit added, edited, or redeemed by any member is instantly visible to all. A secure invite-code flow handles onboarding, and a clean leave flow handles data separation.

**User value:** Couples and households manage store credits together — no credit falls through the cracks because only one person knew about it.

---

### Story 10.1: Create Family & Invite Code

As a user,
I want to create a named family group and get an invite code to share with my family members,
So that I can start sharing credits with them.

**Acceptance Criteria:**

**Given** the user is in the More tab with no family
**When** they tap "Create Family"
**Then** `src/app/family/create.tsx` opens with a name field ("Family Name", e.g. "אטיה Family") and a Confirm button

**Given** the user submits a valid name (1–40 chars)
**When** the family is created
**Then**:
- A `/families/{familyId}` document is created in Firestore with: `name`, `adminId` (current user), `members: { [userId]: { displayName, photoURL?, joinedAt } }`, `inviteCode` (6-char uppercase alphanumeric, no ambiguous chars), `inviteCodeExpiresAt` (now + 30 minutes), `maxMembers: 6`, `createdAt`, `updatedAt`
- `familyStore.setFamily(family)` is called immediately
- User is navigated to `family/[id].tsx` showing the family management screen

**Given** the family management screen is open
**When** the invite code section is shown
**Then**:
- The 6-char code is displayed in large monospace text, in LTR direction (regardless of device locale)
- A countdown shows time remaining: "Expires in 28:42" (live countdown, updates every second)
- A copy-to-clipboard button is shown next to the code
- A "Regenerate Code" button is shown — tapping it generates a new code with a fresh 30-min TTL
- When the code expires (countdown hits 0:00), it shows "Code expired — tap to regenerate" with no active code visible

**Given** the user taps "Copy"
**When** the code is copied to clipboard
**Then** a toast appears: "Invite code copied" (auto-dismisses in 2 seconds)

**And** the More tab shows the family name and member count instead of "Create Family" once a family exists

**Prerequisites:** Stories 1.4, 2.4

**Technical Notes:**
- New file: `src/types/familyTypes.ts` — `Family`, `FamilyMember`, `FamilyRole` enum (`ADMIN`, `MEMBER`)
- New file: `src/lib/firestoreFamilies.ts` — `createFamily()`, `generateInviteCode()`, `subscribeToFamily()`
- New file: `src/stores/familyStore.ts` — shape: `{ family, isLoading, error, setFamily, setLoading, setError }`
- New screens: `src/app/family/create.tsx`, `src/app/family/[id].tsx`
- New hook: `src/hooks/useFamilyListener.ts` — `onSnapshot` on `/families/{familyId}` → `familyStore`
- Invite code charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous: 0, O, 1, I)
- Update `firebase/firestore.rules` — new `/families/{familyId}` rules + updated `/credits/{creditId}` rules (see Story Technical section)
- Update `more.tsx` — add Family section
- Add i18n strings to `he.json` and `en.json`

---

### Story 10.2: Join Family & Shared Credits

As a user,
I want to enter a family invite code to join an existing family and see all shared credits,
So that my partner and I manage credits from the same pool.

**Acceptance Criteria:**

**Given** the user has no family and taps "Join Family"
**When** `src/app/family/join.tsx` opens
**Then** a 6-char code input field is shown (auto-uppercase, auto-advance, LTR direction), plus a "Join" button

**Given** the user submits a valid, non-expired code
**When** the join completes
**Then**:
- User is added to `family.members` map via Firestore transaction (atomic — prevents race conditions with concurrent joins)
- All existing user credits are batch-updated: `familyId` field set to `familyId` on all credits where `userId == currentUser.uid`
- `subscribeToCredits` listener switches from `userId` query to `familyId` query — all family credits appear
- `familyStore.setFamily(family)` is called
- User is navigated to the Credits tab with all family credits visible
- Toast: "You joined [Family Name]!"

**Given** the invite code is expired or does not exist
**Then** inline error: "Invalid or expired code — ask your family member to generate a new one"

**Given** the family already has 6 members
**Then** inline error: "This family is full (6/6 members)"

**Given** the user is already in a family
**Then** inline error: "You're already in a family. Leave it first to join another."

**And** `CreditCard.tsx` shows a small initials circle (first letter of `displayName`, Sage teal background) on credits NOT created by the current user

**Prerequisites:** Story 10.1

**Technical Notes:**
- Add `familyId?: string` and `createdBy?: string` (userId) and `createdByName?: string` to `Credit` type in `creditTypes.ts`
- `subscribeToCredits` in `firestoreCredits.ts`: if `familyId` exists, query `where('familyId', '==', familyId)` instead of `where('userId', '==', userId)`
- Join transaction: `runTransaction` — check memberCount < 6, check code valid + not expired, add member atomically
- Batch migration: `writeBatch` — update all user's credits with `{ familyId, createdBy: userId, createdByName: displayName }`
- New `createCredit()` calls: always include `createdBy` + `familyId` (if in family) in the document
- Composite Firestore index needed: `familyId ASC` on `credits` collection
- Update Security Rules: credits readable/writable by family members (see Story 10.1 technical notes)

---

### Story 10.3: Leave Family & Family Management

As a user,
I want to leave my family if needed, and as an admin I want to manage the family,
So that the data always reflects the real household situation.

**Acceptance Criteria:**

**Given** the user is in `family/[id].tsx`
**When** they tap "Leave Family"
**Then** a confirmation bottom sheet appears: "Leave [Family Name]? Your credits will stay with you." with Leave and Cancel buttons

**Given** the user confirms leaving
**When** the leave executes
**Then**:
- All credits where `createdBy == currentUser.uid` are batch-updated: `familyId` set to `null` / deleted
- User is removed from `family.members` map
- If this was the last member (family now empty): the `/families/{familyId}` document is deleted
- `familyStore.setFamily(null)`
- `subscribeToCredits` switches back to `userId` query
- User is navigated to Credits tab (shows only their own credits now)
- Toast: "You left [Family Name]. Your credits are still here."

**Given** the user is the admin and taps "Remove Member"
**When** the remove completes
**Then**:
- The removed member's credits have `familyId` set to `null` (they keep their credits personally)
- Member is removed from the `members` map
- Removed member's listener detects the change and switches back to personal credits automatically

**Given** the admin taps "Rename Family"
**Then** an inline text field replaces the family name, with Save and Cancel actions

**Given** the admin taps "Transfer Admin"
**Then** a member picker bottom sheet appears; selecting a member updates `adminId` on the family document

**Prerequisites:** Story 10.2

**Technical Notes:**
- Leave batch: `writeBatch` — null out `familyId` + `createdBy` on all credits where `createdBy == uid`, then `updateDoc` family to remove member from map
- `useFamilyListener` detects when current user is no longer in `family.members` → auto-triggers leave cleanup on the listener side
- Family dissolution check: after removing member from map, if `Object.keys(members).length === 0` → `deleteDoc(familyRef)`
- Rename: `updateDoc(familyRef, { name: newName, updatedAt: serverTimestamp() })`
- Admin transfer: `updateDoc(familyRef, { adminId: newAdminId, updatedAt: serverTimestamp() })`
- No FCM push notifications for management actions (join/leave) in this story — low priority

---

---

## Epic 12: Subscription Management

**Goal:** Users can track all their recurring subscriptions (monthly, annual, free trials, loyalty clubs) in a dedicated tab — with intent-based reminders that fire before auto-renewal so no unwanted charge ever slips through.

**User value:** Never get surprised by a subscription charge you forgot about. Know exactly what you're paying monthly, and get the right nudge at the right time to renew, cancel, or modify each subscription.

---

### Story 12.1: Navigation Refactor & Subscription Data Model

As a developer,
I want the navigation restructured to accommodate subscriptions and the full data model scaffolded,
So that all subsequent subscription stories have a consistent foundation.

**Acceptance Criteria:**

**Given** the app launches after this story
**When** the tab bar is visible
**Then**:
- Tab order is: **זיכויים** (wallet-outline) | **אחריויות** (shield-checkmark-outline) | **מנויים** (repeat-outline) | **היסטוריה** (time-outline) | **עוד** (ellipsis-horizontal-outline)
- `src/app/(tabs)/subscriptions.tsx` exists (fully implemented in Story 12.3)
- `stores` tab is **removed** from the tab bar via `href: null` — `src/app/(tabs)/stores.tsx` is kept as a navigable route; **stores screen gains its own back-arrow header** (matching `account.tsx` pattern) so users can return to Credits
- Credits tab header (`index.tsx`) gains a [🏪] icon button (storefront-outline) in the top-right area alongside the existing sort button — tapping it navigates to `(tabs)/stores`
- History tab filter gains `'subscriptions'` as a third `ItemType` option alongside `'credits'` and `'warranties'` (UI placeholder — wired in Story 12.6)

**Given** the data model is scaffolded
**Then**:
- `src/types/subscriptionTypes.ts` defines:
  - `SubscriptionBillingCycle` enum: `MONTHLY = 'monthly'`, `ANNUAL = 'annual'`
  - `SubscriptionIntent` enum: `RENEW = 'renew'`, `CANCEL = 'cancel'`, `MODIFY = 'modify'`, `CHECK = 'check'`
  - `SubscriptionStatus` enum: `ACTIVE = 'active'`, `CANCELLED = 'cancelled'`
  - `Subscription` interface with all fields (see Technical Notes)
- `src/stores/subscriptionsStore.ts` — shape: `{ subscriptions[], isLoading, error, setSubscriptions, setLoading, setError, addSubscription, updateSubscription, removeSubscription }`
- `src/constants/subscriptionCategories.ts` — 10 categories with names and Ionicons icon names
- `src/constants/subscriptionIntents.ts` — 4 intent options with labels and icons
- `firebase/firestore.rules` updated with `/subscriptions/{subscriptionId}` rules (user or family member read/write)
- `firebase/firestore.indexes.json` updated with composite index: `userId ASC + nextBillingDate ASC` and `familyId ASC + nextBillingDate ASC`
- Zod schema `SubscriptionSchema` in `src/lib/validation.ts`
- i18n strings added to `he.json` and `en.json`: all subscription-related keys (`tabs.subscriptions`, `subscriptions.*`)

**And** TypeScript compiles with zero errors

**Prerequisites:** Story 1.4, Story 10.1 (for family pattern reference)

**Technical Notes:**

`Subscription` interface fields:
```typescript
{
  id: string
  userId: string
  serviceName: string                    // e.g. "Spotify Premium"
  billingCycle: SubscriptionBillingCycle // MONTHLY | ANNUAL
  amountAgorot: number                   // integer agorot (×100), 0 for free
  isFree: boolean                        // true → amountAgorot = 0, excluded from total
  // Monthly-specific
  billingDayOfMonth?: number             // 1–31, only for MONTHLY
  // Annual-specific
  nextBillingDate?: Date                 // full date, only for ANNUAL
  // Free trial (MONTHLY only)
  isFreeTrial: boolean
  freeTrialMonths?: number               // how many months free
  priceAfterTrialAgorot?: number         // price once trial ends (required if isFreeTrial)
  trialEndsDate?: Date                   // calculated: createdAt + freeTrialMonths
  // Classification
  category: string
  intent: SubscriptionIntent
  status: SubscriptionStatus
  // Reminders
  reminderDays: number                   // days before next billing to fire reminder
  notificationIds: string[]              // array: can have up to 2 (week + day before)
  renewalNotificationId?: string         // for "did it renew?" on-day notification
  // Optional
  websiteUrl?: string
  notes?: string
  // Family sharing
  familyId?: string
  createdBy?: string
  createdByName?: string
  // Lifecycle
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
}
```
- Amounts in agorot (×100) — same pattern as credits
- `nextBillingDate` for MONTHLY is computed from `billingDayOfMonth` each cycle
- All Firestore writes via `src/lib/firestoreSubscriptions.ts` (new file)

---

### Story 12.2: Add Subscription Flow

As a user,
I want to add a new subscription through a guided step-by-step flow,
So that all details are captured correctly without being overwhelmed.

**Acceptance Criteria:**

**Given** the user is on the Subscriptions tab
**When** they tap the FAB (+) button
**Then** `src/app/add-subscription.tsx` opens as a full-screen modal with a step progress bar

**Given** the flow opens
**When** each step renders
**Then** the steps in order are:

1. **serviceName** — "שם השירות" — text input with autocomplete chips from existing subscriptions (`ServiceAutocomplete` component, mirrors `StoreAutocomplete`) — autocomplete sourced from `subscriptionsStore.subscriptions`
2. **billingType** — "סוג המנוי" — two large cards: `חודשי` / `שנתי`; auto-advances on selection (no Continue button)
3. **amount** — "סכום המנוי" — numeric input `₪` + toggle "מנוי חינמי" (hides amount input when ON); if MONTHLY: secondary toggle "תקופת ניסיון חינמי" → when ON shows: "כמה חודשים חינם?" (number picker 1–24) + "מחיר חודשי לאחר הניסיון" (required numeric field); if ANNUAL: shows `(₪X/חודש)` in gray below the amount input (amountAgorot ÷ 12, formatted)
4. **billingDate** — MONTHLY: "יום חיוב" — **scroll-wheel spinner** (1–31, snaps to item, defaults to current day of month, clamps to last valid day of month on save); ANNUAL: "תאריך החידוש הבא" — date picker DD/MM/YYYY
5. **category** — "קטגוריה" — horizontal chip selector: 📱 תקשורת | 🎬 בידור | 💪 כושר | 💻 תוכנה | 🎓 חינוך | 💝 תרומות | 🏠 בית | 🚗 רכב | 🏷️ חבר מועדון | 📦 אחר
6. **intent** — "כוונה" — four large option cards: 🔄 לחדש / ❌ לבטל / ✏️ לשנות / 👀 לבדוק — each with a one-line description
7. **reminder** — "תזכורת" — preset chips: 3 ימים / שבוע / שבועיים / חודש לפני + "מותאם אישית" (free number entry); note shown: for CANCEL/MODIFY intent, two reminders fire (week before + day before minimum)
8. **website** (optional) — "אתר או אפליקציה" — URL text input with "דלג" skip button; validates URL format
9. **summary** — "הכל נראה טוב?" — shows all entered data; "שמור מנוי" primary button

> **Implementation note:** Step order places **serviceName before billingType** (deviates from original spec which had billingType first). This improves UX flow: name the service before selecting its billing cadence. All step titles use concise noun-form (e.g. "סכום המנוי") rather than question-form, consistent with add-credit and add-warranty screens.

**Given** the user taps "שמור מנוי" on summary
**When** all mandatory fields are valid
**Then**:
- `subscriptionsStore.addSubscription(newSubscription)` fires immediately (optimistic)
- `addDoc(subscriptionsCollection, subscriptionData)` writes to Firestore `/subscriptions/{auto-id}`
- Reminder notifications scheduled (see Story 12.5 for full logic)
- Toast: "המנוי נשמר ✓" (auto-dismisses 2 seconds)
- Modal closes, user lands on Subscriptions tab with new card visible

**And** each step validates before Continue is enabled — mandatory fields listed:
- billingType: always required
- serviceName: min 1 char
- amount: > 0 OR isFree toggle ON; if isFreeTrial: priceAfterTrialAgorot required and > 0
- billingDate: valid day (1–31) for monthly; valid future date for annual
- category: required
- intent: required
- reminder: required

**And** back navigation between steps preserves all previously entered values

**Prerequisites:** Story 12.1

**Technical Notes:**
- Step engine follows exact same pattern as `add-credit.tsx` — `StepId` union type, `getSteps()` function, `Animated` slide transitions, `StepProgressBar` component reused
- New screen: `src/app/add-subscription.tsx`
- New component: `src/components/redeemy/ServiceAutocomplete.tsx` (mirrors `StoreAutocomplete`)
- New component: `src/components/redeemy/IntentSelector.tsx` — four large option cards
- New component (inline in add-subscription): `DayWheelPicker` — `ScrollView` with `snapToInterval` + `decelerationRate="fast"` for haptic-style scroll wheel; no extra dependency
- `billingDayOfMonth` defaults to current day of month (`new Date().getDate()`)
- Day overflow clamped via `Math.min(day, new Date(year, month+1, 0).getDate())` in `subscriptionUtils.ts` — e.g. billing day 31 → Feb 28/29
- Free trial: `trialEndsDate` computed as `createdAt + freeTrialMonths months` and stored
- Edit mode: same screen launched with `?subscriptionId=X` param — pre-fills all steps
- All Firestore logic in `src/lib/firestoreSubscriptions.ts`
- **Firestore security rules** for `/subscriptions/{id}` were deployed via `firebase deploy --only firestore:rules` (required to enable creates/reads)

---

### Story 12.3: Subscriptions List & Card

As a user,
I want to see all my active subscriptions in a clean list with a monthly total at the top,
So that I instantly understand my recurring financial commitments.

**Acceptance Criteria:**

**Given** the user taps the Subscriptions tab
**When** `(tabs)/subscriptions.tsx` renders
**Then**:
- A summary header shows: `₪X/חודש` — sum of all active paid subscriptions, normalized: MONTHLY `amountAgorot`, ANNUAL `amountAgorot ÷ 12` — free subscriptions excluded
- Below the total: `X מנויים פעילים` (count of ACTIVE, including free)
- Subscriptions displayed as `SubscriptionCard` components in a `FlatList`, sorted by nearest `nextBillingDate` / nearest billing day
- A FAB (+) button always visible bottom-right: "הוסף מנוי"

**Given** a subscription card renders
**Then** it shows:
- Category icon (left) + service name (bold, large) + intent badge (right): 🔄 / ❌ / ✏️ / 👀 with label
- Amount + cycle: `₪19.90/חודש` or `₪1,200/שנה (₪100/חודש)` or `חינמי`
- Renewal line: `מתחדש בעוד 12 יום — 3 במאי` (or `מתחדש ב-15 לכל חודש — בעוד 12 יום`)
- For free trial: `ניסיון חינמי — מסתיים בעוד 18 יום` in amber
- Urgency color stripe or badge (same thresholds as credits): green >30 days | amber 7–30 | red <7

**Given** no subscriptions exist
**Then** empty state: "עדיין אין מנויים — הוסף מנוי ראשון ואל תפספס שוב חיוב" with FAB CTA

**And** tapping a card navigates to the subscription detail screen (Story 12.4)

**Prerequisites:** Story 12.2

**Technical Notes:**
- New screen: `src/app/(tabs)/subscriptions.tsx`
- New component: `src/components/redeemy/SubscriptionCard.tsx`
- New hook: `src/hooks/useSubscriptions.ts` — `onSnapshot` on `/subscriptions` query (userId or familyId) → `subscriptionsStore`
- `nextBillingDate` computation for MONTHLY: find next occurrence of `billingDayOfMonth` from today using `src/lib/subscriptionUtils.ts`
- `src/lib/subscriptionUtils.ts`: `getNextBillingDate(sub)`, `daysUntilBilling(sub)`, `normalizeToMonthlyAgorot(sub)`, `computeMonthlyTotal(subscriptions[])`
- Filter: only `status === SubscriptionStatus.ACTIVE` shown on main list
- `FlatList` with `keyExtractor` and `getItemLayout` for performance

---

### Story 12.4: Subscription Detail, Edit & Cancel

As a user,
I want to tap a subscription and see its full details, edit any field, or cancel it,
So that I can keep my subscriptions accurate and act when needed.

**Acceptance Criteria:**

**Given** the user taps a subscription card
**When** `src/app/subscription/[id].tsx` opens
**Then** the detail screen shows:
- Service name (large, bold) + category icon
- Billing: amount + cycle + (monthly breakdown if annual)
- Next billing date (computed)
- Intent badge (full label + icon)
- Reminder: X days before
- Free trial indicator (if applicable): "ניסיון חינמי — מסתיים ב-[date], לאחר מכן ₪X/חודש"
- Website link (if set) — tapping opens in system browser via `Linking.openURL()`
- Notes (if set)
- Date added

**Given** the user taps "ערוך"
**When** the edit flow opens
**Then** `add-subscription.tsx` launches in edit mode (pre-filled), same step flow — Save updates Firestore with `updatedAt: serverTimestamp()`, cancels old notifications, schedules new ones

**Given** the user taps "בטל מנוי"
**When** the confirmation bottom sheet appears
**Then** sheet text: "לבטל את [שם השירות]? המנוי יועבר לארכיון."
**And** on confirm:
- `updateDoc(subscriptionRef, { status: SubscriptionStatus.CANCELLED, cancelledAt: serverTimestamp() })`
- All scheduled `notificationIds` cancelled
- `subscriptionsStore.updateSubscription(...)` reflects new status
- User navigated back to Subscriptions tab
- Toast: "[שם השירות] בוטל ועבר לארכיון"

**And** cancelled subscription appears in History → מנויים sub-tab (Story 12.6)

**Prerequisites:** Story 12.3

**Technical Notes:**
- New screen: `src/app/subscription/[id].tsx`
- Cancel flow: iterate `subscription.notificationIds` → `cancelScheduledNotificationAsync` for each
- Bottom sheet for destructive action — same pattern as credit/warranty delete
- Website: `Linking.openURL(websiteUrl)` with `canOpenURL` check

---

### Story 12.5: Reminder Notifications & Auto-Renewal

As a user,
I want smart reminders based on my intent, and my subscription dates to advance automatically after renewal,
So that I never miss a window to act and never need to update dates manually.

**Acceptance Criteria:**

**Given** a subscription is saved with intent and reminder settings
**When** `firestoreSubscriptions.ts` schedules notifications
**Then** the correct notifications fire based on intent:

| Intent | Notifications scheduled | Text |
|--------|------------------------|------|
| 🔄 לחדש | 1 — on billing day | "המנוי שלך ל-[X] התחדש ✓ — האם הסכום השתנה?" |
| ❌ לבטל | 2 — reminderDays before + 1 day before | "המנוי שלך ל-[X] מתחדש בעוד [N] ימים — זכרת לבטל?" |
| ✏️ לשנות | 2 — reminderDays before + 1 day before | "המנוי שלך ל-[X] מתחדש בעוד [N] ימים — האם תרצה לשנות מסלול?" |
| 👀 לבדוק | 1 — reminderDays before | "המנוי שלך ל-[X] מתחדש בעוד [N] ימים — כדאי לבדוק אם עדיין משתלם" |

**And** notification payload includes `data: { subscriptionId, type: 'subscription' }` for deep-link to `subscription/[id].tsx`

**Given** a "לחדש" intent notification fires on billing day and user taps "הסכום השתנה"
**When** the app opens from the notification
**Then** `subscription/[id].tsx` opens directly with an inline "עדכן סכום" prompt visible at the top

**Given** a "לחדש" intent notification fires and user does NOT respond within 24 hours
**When** background processing runs (next app open)
**Then** `nextBillingDate` advances one cycle (month or year) automatically, new notifications scheduled, old `notificationIds` cancelled

**Given** any intent: user does not act before billing date
**When** billing date passes (detected on next app open)
**Then** `nextBillingDate` advances one cycle automatically — subscription remains ACTIVE with same intent

**Given** a free trial subscription reaches its `trialEndsDate`
**When** detected on next app open (compare today ≥ trialEndsDate)
**Then**:
- `isFree` and `isFreeTrial` set to false; `amountAgorot` set to `priceAfterTrialAgorot`
- `nextBillingDate` advances one month from `trialEndsDate`
- New notifications scheduled based on intent
- Toast on next app open: "הניסיון החינמי של [X] הסתיים — החיוב החודשי ₪[price] החל"

**Prerequisites:** Story 12.2

**Technical Notes:**
- All notification logic in `src/lib/subscriptionNotifications.ts` (new file, mirrors `notifications.ts` pattern)
- `scheduleSubscriptionNotifications(subscription)` → returns `{ notificationIds: string[], renewalNotificationId?: string }`
- Auto-advance logic in `src/lib/subscriptionUtils.ts`: `advanceBillingCycle(sub): Partial<Subscription>`
- Cycle check runs in `useSubscriptions` hook on each `onSnapshot` event — compare `nextBillingDate < today`
- Edit flow: always cancel all existing `notificationIds` + `renewalNotificationId`, then reschedule
- For MONTHLY with `billingDayOfMonth`: `nextBillingDate` = next occurrence of that day-of-month from today
- All `expo-notifications` calls exclusively in `subscriptionNotifications.ts` — no screen imports the package

---

### Story 12.6: History Sub-Tabs, Cancelled Archive & Family Sharing

As a user,
I want to see my cancelled subscriptions in the History tab, view all three types of history together, and have subscriptions shared with my family,
So that my full history is in one place and my household sees the same subscriptions.

**Acceptance Criteria:**

**Given** the user taps the History tab
**When** it renders
**Then** three filter chips/segments appear at the top: `זיכויים` | `אחריויות` | `מנויים`

**Given** the user selects "מנויים"
**When** the subscriptions history renders
**Then**:
- All subscriptions where `status === SubscriptionStatus.CANCELLED` are shown
- Each card shows: service name, amount + cycle, cancellation date (`cancelledAt`), category icon — muted/dimmed style
- Default sort: most recently cancelled first
- Tapping a card opens `subscription/[id].tsx` in read-only mode: "בוטל ב-[date]" instead of action buttons

**Given** no subscriptions have been cancelled
**Then** empty state: "אין מנויים בארכיון — מנויים שבוטלו יופיעו כאן"

**Given** the user is part of a family
**When** subscriptions are loaded
**Then**:
- `subscribeToSubscriptions` in `firestoreSubscriptions.ts` queries `where('familyId', '==', familyId)` when family exists, otherwise `where('userId', '==', userId)`
- New subscription documents always include `familyId`, `createdBy`, `createdByName` when user is in family
- `SubscriptionCard` shows initials circle (Sage teal background) on subscriptions created by other family members — same pattern as `CreditCard`

**And** existing family join/leave logic (Story 10.2, 10.3) batch-updates `familyId` on subscriptions — `firestoreSubscriptions.ts` exports `migrateSubscriptionsToFamily(userId, familyId)` and `migrateSubscriptionsFromFamily(userId)` called from the existing join/leave flows

**Prerequisites:** Stories 12.4, 12.5

**Technical Notes:**
- History tab `ItemType` extended: `'all' | 'credits' | 'warranties' | 'subscriptions'`
- `useSubscriptions` hook already loaded in root — cancelled subscriptions already in `subscriptionsStore`
- Read-only detail: `subscription/[id].tsx` detects `status === CANCELLED` → hides Edit/Cancel buttons, shows cancellation date banner
- `SubscriptionCard` accepts `variant="cancelled"` prop for muted style (no urgency badge color, gray intent badge)
- Story 10.2 join flow: add `await migrateSubscriptionsToFamily(userId, familyId)` to the batch
- Story 10.3 leave flow: add `await migrateSubscriptionsFromFamily(userId)` to the batch

---

---

## Epic 13: Onboarding Flow

**Goal:** New users see a beautiful first-run experience that introduces all three core features (credits, warranties, subscriptions), family sharing, and requests notification permission in context — eliminating the "empty screen" drop-off and increasing retention.

**User value:** The user immediately understands what Redeemy does and is guided to their first action. No confusion, no cold start.

---

### Story 13.1: Onboarding Infrastructure & Navigation Gate

As a new user,
I want to be guided through the app after signing up,
So that I understand all features before I start using it.

**Acceptance Criteria:**

**Given** a user signs up or signs in for the first time on this device
**When** authentication succeeds
**Then** the app routes to `/onboarding` instead of `/(tabs)`

**Given** a returning user opens the app (already authenticated, `hasOnboarded = true`)
**When** the app starts
**Then** the onboarding screen is skipped and the user lands on `/(tabs)` normally

**And** `hasOnboarded: boolean` (default `false`) is added to `settingsStore` and persisted via AsyncStorage

**And** `src/app/onboarding.tsx` is a Stack screen registered in `_layout.tsx` with `headerShown: false`

**Prerequisites:** Story 1.4, Story 2.4

**Technical Notes:**
- Auth gate in `_layout.tsx`: when `AUTHENTICATED && inAuthGroup && !hasOnboarded` → `router.replace('/onboarding')`
- `hasOnboarded` default `false` — only affects users coming from auth screens (new/re-login), not existing authenticated users
- Existing authenticated users (segments not in auth group) are never redirected to onboarding

---

### Story 13.2: Feature Slides & Content

As a new user,
I want to swipe through illustrated slides explaining the app's features,
So that I know what credits, warranties, subscriptions, and family sharing are before I start.

**Acceptance Criteria:**

**Given** the onboarding screen is open
**When** the user progresses through slides
**Then** 6 slides appear in order:
1. Welcome — "ברוך הבא ל-Redeemy"
2. Credits — "זיכויים שלא ייעלמו"
3. Warranties — "אחריויות במקום אחד"
4. Subscriptions — "מנויים תחת שליטה"
5. Family — "שתף עם המשפחה"
6. Notifications — "תזכורות שמגיעות בזמן" (with permission request)

**And** each slide has: large emoji in a teal circle, bold title, descriptive subtitle, progress dots (active dot wider), Continue button

**And** a Skip button in the top corner exits onboarding immediately (`hasOnboarded = true` → `/(tabs)`)

**And** transitions use fade animation (150ms out, 220ms in) with no external animation library

**And** when viewed again from Settings (`hasOnboarded` already `true`): a close (✕) button replaces Skip, and completion routes back with `router.back()`

**Prerequisites:** Story 13.1

**Technical Notes:**
- Single file: `src/app/onboarding.tsx` — no external swiper library
- `Animated.Value` for fade; `useState` for current slide index
- All strings in `he.json` and `en.json` under `onboarding.*`
- RTL: skip/close button positioned with `isRTL ? { left: 16 } : { right: 16 }`

---

### Story 13.3: Notifications Permission & Completion

As a new user,
I want to grant notification permission in context and then be guided to my first action,
So that reminders work from day one and I know how to get started.

**Acceptance Criteria:**

**Given** the user reaches the Notifications slide
**When** they tap "אפשר התראות"
**Then** `Notifications.requestPermissionsAsync()` is called, then the completion screen appears

**Given** the user taps "אחר כך"
**Then** the completion screen appears without requesting permission

**Given** the completion screen appears (first time)
**Then** three action buttons are shown:
- Primary: "הוסף זיכוי ראשון" → `router.replace('/(tabs)')` + `router.push('/add-credit')`
- Secondary: "הוסף אחריות" → `/(tabs)` + `/add-warranty`
- Secondary: "הוסף מנוי" → `/(tabs)` + `/add-subscription`
- Text link: "כניסה לאפליקציה" → `/(tabs)` only

**And** `setHasOnboarded(true)` is called on any completion action

**And** "צפה בהדרכה מחדש" row added to Settings section in `(tabs)/more.tsx` → `router.push('/onboarding')`

**Prerequisites:** Stories 13.1, 13.2

**Technical Notes:**
- `isViewingAgain = useSettingsStore(s => s.hasOnboarded)` — detected at screen entry
- Completion when viewing again: single "חזרה לאפליקציה" button → `router.back()`
- Modal routing: `requestAnimationFrame` double-wrap after `router.replace('/(tabs)')` before pushing modal to allow tabs to mount

---

---

## Epic 14: Warranties Management

**Goal:** Users can track product warranties with photos, expiration dates, and reminders — never miss a warranty claim window.

**Status:** ✅ Done (implemented as part of expanded MVP)

**Features delivered:**
- Full CRUD: add warranty (multi-step form with up to 3 photos), view detail, edit, delete
- Fields: product name, store name, purchase date, expiration date (or "no expiry" toggle), category, reminder, notes
- Notifications: reminder N days before expiration; on-day expiration alert
- Family sharing: familyId, createdBy, createdByName
- Real-time Firestore listener (`useWarrantiesListener`)
- Store: `warrantiesStore.ts`
- Types: `warrantyTypes.ts`

---

## Epic 15: Occasions

**Goal:** Users can track recurring annual occasions (birthdays, anniversaries, yahrzeit) with both Gregorian and Hebrew calendar support.

**Status:** ✅ Done (new feature, not in original product brief)

**Features delivered:**
- Full CRUD: add occasion (multi-step form), view detail, edit, delete
- Types: `birthday | anniversary | yahrzeit | other` (custom label for 'other')
- Hebrew calendar support: `useHebrewDate` toggle stores Hebrew day/month; anniversary fires on the correct Hebrew calendar day each year (`src/lib/hebrewDate.ts`)
- Notifications: configurable reminder days before the annual occurrence; `notificationIds[]` array
- Family sharing support
- Tabs screen: `(tabs)/occasions.tsx`; detail screen: `occasion/[id].tsx`
- Store: `occasionsStore.ts`; Types: `occasionTypes.ts`
- Notification settings: dedicated section in `notification-settings.tsx`

---

## Epic 16: Documents

**Goal:** Users can store expiring personal documents (ID, driver's license, passport, insurance) with photos and get renewal reminders before they expire.

**Status:** ✅ Done (new feature, not in original product brief)

**Features delivered:**
- Full CRUD: add document (multi-step form), view detail, delete
- Document types: `id_card | license | passport | insurance | other` (custom name for 'other')
- Fields: document type, owner name, expiration date (or "no expiry"), photo (up to 3 images), notes
- Notifications: reminder before expiration
- Family sharing support
- Tabs screen: `(tabs)/documents.tsx`; detail screen: `document/[id].tsx`
- Store: `documentsStore.ts`; Types: `documentTypes.ts`
- Constants: `documentTypeIcons.ts` with DOCUMENT_TYPE_ICONS and DOCUMENT_TYPE_OPTIONS

---

## Epic 18: Admin Dashboard (web, V1 MVP)

**Goal:** A separate web application that gives Moti — Redeemy's solo founder and only admin — a real-time picture of the app's state, users, and operational health, without leaving the Redeemy visual identity.

**Status:** ✅ Done (V1 MVP shipped 2026-05-03 — separate `redeemy-admin` repo)

**Source documents:**
- Brainstorming session: `_bmad-output/brainstorming/brainstorming-session-2026-05-03-1345.md`
- Tech spec: `_bmad-output/planning-artifacts/admin-dashboard-tech-spec.md`

**Critical context:** Redeemy is at ~3 users (pre-launch). At this scale, aggregate metrics (DAU/MAU, retention, cohorts) are noise. V1 makes every individual user, event, and error directly visible. Aggregate analytics deferred to V2 (50–500 users) and V3 (500+).

**Stories:**

| Story | Title | Status |
|-------|-------|--------|
| 18.1 | Admin Dashboard — Foundation, Auth & Theme | ✅ done |
| 18.2 | Admin Dashboard — User List & Activity Feed | ✅ done |
| 18.3 | Admin Dashboard — Health Banner & Cost Widget | ✅ done |
| 18.4 | Admin Dashboard — Daily Digest Email & Mobile Polish | ✅ done |

**Tech stack:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Firebase Admin SDK + Resend (email) + Vercel (hosting + cron). Separate repository (`redeemy-admin`).

**What V1 explicitly does NOT include:** charts, DAU/MAU, retention, funnels, anomaly alerts, Story Mode, public stats, NL query, A/B tests, dark mode. (All deferred to V2/V3.)

**Required mobile-app change:** add `events/` Firestore collection + `logEvent` helper instrumented at auth, item, family, and error sites (covered in Story 18.2).

---

## Epic 19: Admin Dashboard — V1.5 quick wins

**Goal:** Three small-but-useful additions to the Admin Dashboard that pay off at the current 3-user scale (or any scale), without waiting for V2 (50–500 users) features that need more data.

**Status:** 📝 Planned (drafted 2026-05-04)

**Stories:**

| Story | Title | Status |
|-------|-------|--------|
| 19.1 | Admin — User Detail Page (`/users/[uid]`) | ✅ done |
| 19.2 | Admin — Crashlytics via BigQuery integration | 📝 planned |
| 19.3 | Admin — Activity feed search & filters | ✅ done |

All three live in the `redeemy-admin` repo (web). No mobile-app changes required.

---

## Summary

**Total: 17 Epics · 47+ Stories** (16 done, 1 planned)

| Epic | Stories | Delivers |
|------|---------|---------|
| Epic 1: Foundation | 4 | Runnable app skeleton with Firebase, theme, navigation, types |
| Epic 2: Authentication | 4 | User identity — register, sign in, session persistence |
| Epic 3: Credit Management | 6 | Core wallet — add, browse, view, edit, delete credits |
| Epic 4: Stores & Discovery | 2 | Shopping discovery — "do I have a credit here?" |
| Epic 5: Reminders | 3 | The core promise — no credit expires forgotten |
| Epic 6: Redeem & History | 3 | Close the loop — credits are used, history is kept |
| Epic 7: Offline Support | 2 | App works anywhere — no signal, no problem |
| Epic 9: Theme & Appearance | 2 | Dark mode + settings improvements |
| Epic 10: Family Sharing | 3 | Shared credit pool — household management |
| Epic 11: Warranty Management (v1) | 1 | Basic warranty tracking |
| Epic 12: Subscription Management | 6 | Track recurring subscriptions with intent-based reminders |
| Epic 13: Onboarding Flow | 3 | First-run experience — feature tour, notification permission, first action CTA |
| Epic 14: Warranties (full) | 1 | Warranties with multi-image, family sharing, notifications |
| Epic 15: Occasions | 2 | Annual occasions with Hebrew calendar, reminder notifications |
| Epic 16: Documents | 1 | Expiring personal documents with photos and renewal reminders |
| Epic 18: Admin Dashboard | 4 | Web admin for Moti — user list, activity feed, health, cost, daily digest |

**Context incorporated:**
- ✅ Product Brief requirements (all 14 FRs)
- ✅ UX Design Specification (photo-first flow, Sage teal, card metaphor, swipe interactions, empty states, toast patterns, bottom sheets)
- ✅ Architecture decisions (Firebase v12, Zustand v5, Expo SDK 55, Zod v3.25, integer agot amounts, camelCase Firestore fields, single Firebase import boundary, notification deduplication, image compression pipeline)
- ✅ Epic 12: Subscriptions (step-based add flow, intent-based reminders, auto-renewal, family sharing, history archive)
- ✅ Epics 14–16: Warranties, Occasions, Documents — new features added beyond original product brief

---

_For implementation: Use the `dev-story` workflow to implement individual stories, starting with Story 1.1._
