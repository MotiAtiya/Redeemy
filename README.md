# Redeemy

A Hebrew-first (RTL) mobile app for managing your personal financial records — store credits, warranties, subscriptions, occasions, and documents — all in one place, with smart reminders so nothing slips through the cracks.

## Features

| Feature | Hebrew | Description |
|---------|--------|-------------|
| **Credits** | זיכויים | Store vouchers & gift cards — photo, amount, expiry, reminders |
| **Warranties** | אחריויות | Product warranties with receipts — expiry tracking & notifications |
| **Subscriptions** | מנויים | Recurring subscriptions — billing cycle, auto/manual renewal, trial periods |
| **Occasions** | אירועים | Birthdays, anniversaries, yahrzeit — Gregorian & Hebrew calendar support |
| **Documents** | מסמכים | ID, driver's license, passport, insurance — with renewal reminders |

All features support: family sharing, up to 3 photos per item, local push notifications, dark/light mode, and real-time Firestore sync.

## Tech Stack

- **Expo SDK 55** — React Native, Expo Router v3, CNG (no committed `ios/`/`android/`)
- **Firebase JS SDK v12** — Auth (email, Google, Apple), Firestore, Storage
- **Zustand v5** — 9 client-state stores, `settingsStore` persisted via AsyncStorage
- **expo-notifications** — all local push notifications (reminders, renewal alerts)
- **Zod v3** — schema validation at form and Firestore boundaries
- **react-i18next** — Hebrew + English localization
- **TypeScript strict mode**

## Prerequisites

- Node.js 18+
- [EAS CLI](https://docs.expo.dev/eas-update/getting-started/): `npm install -g eas-cli`
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.development
```

Fill in all Firebase values from the Firebase Console (`redeemy-dev` project).

### 3. Add native credential files

These are **gitignored** — you must add them manually:

- **iOS**: Place `GoogleService-Info.plist` in the project root
- **Android**: Place `google-services.json` in the project root

Download from the [Firebase Console](https://console.firebase.google.com) → Project Settings.

### 4. Run the app

```bash
# iOS simulator
npm run ios

# Android emulator
npm run android
```

## Project Structure

```
src/
  app/                    # Expo Router file-based routes
    (tabs)/               # Tab bar: Credits · Warranties · Subscriptions · Occasions · Documents · History · More
    auth/                 # Sign-in, Sign-up, Forgot Password
    credit/[id].tsx       # Credit detail
    warranty/[id].tsx     # Warranty detail
    subscription/[id].tsx # Subscription detail
    occasion/[id].tsx     # Occasion detail
    document/[id].tsx     # Document detail
    family/               # Family group screens
    add-credit.tsx        # Multi-step credit form
    add-warranty.tsx      # Multi-step warranty form
    add-subscription.tsx  # Multi-step subscription form
    add-occasion.tsx      # Multi-step occasion form (Hebrew calendar)
    add-document.tsx      # Multi-step document form
    onboarding.tsx        # First-run feature tour
    notification-settings.tsx
  components/
    redeemy/              # App-specific components (CreditCard, SubscriptionCard, ExpirationBadge, etc.)
  stores/                 # Zustand stores (auth, credits, warranties, subscriptions, occasions, documents, family, settings, ui)
  lib/                    # Firebase services, image upload, notifications, date utilities
    firestoreCredits.ts
    firestoreWarranties.ts
    firestoreSubscriptions.ts
    firestoreOccasions.ts
    firestoreDocuments.ts
    firestoreFamilies.ts
    notifications.ts
    subscriptionNotifications.ts
    occasionNotifications.ts
    subscriptionUtils.ts
    hebrewDate.ts
    imageUpload.ts
  hooks/                  # Custom React hooks (listeners, theme, keyboard, badge)
  types/                  # TypeScript interfaces and enums
  constants/              # Categories, currencies, reminders, subscription services
  data/                   # subscriptionServices.ts (150+ services), israeliStores.ts
  locales/                # he.json, en.json
```

## Key Conventions

- **Amounts** stored as integers in _agorot_ (₪ × 100). Display only via `formatCurrency(agorot)`.
- **Firebase SDK** imported exclusively through `src/lib/firebase.ts` — never directly in screens.
- **Async logic** lives in `src/lib/` — Zustand stores are synchronous setters.
- **Colors** always via `useAppTheme()` hook — never hardcoded.
- **Images** up to 3 per item, stored as `images[]` + `thumbnails[]` in Firestore.
- **Notifications** cancel-before-reschedule — old IDs always cancelled before scheduling new ones.
- **Family sharing** — all Firestore items have optional `familyId`, `createdBy`, `createdByName`. Queries switch from `userId ==` to `familyId ==` when user is in a family.
- **Native directories** (`ios/`, `android/`) are gitignored — generated via EAS CNG.

## Firebase Environments

| Environment | Firebase Project | Plan |
|---|---|---|
| Development | `redeemy-dev` | Spark (free) |
| Production | `redeemy-prod` | Blaze (pay-as-you-go) |

## Running Tests

```bash
npm test
```
