# Redeemy

A mobile app for managing store credits — never let a credit expire unnoticed.

## Tech Stack

- **Expo SDK 55** (React Native, Expo Router v3, CNG)
- **Firebase JS SDK v12** (Auth, Firestore, Storage)
- **Zustand v5** — client state management
- **Gluestack UI** — component library (added in Story 1.3)
- **Zod v3** — schema validation

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

Download these from the [Firebase Console](https://console.firebase.google.com) under your project settings.

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
  app/            # Expo Router file-based routes
    (tabs)/       # Bottom tab screens: Credits, Stores, History, More
    auth/         # Sign-in, Sign-up screens (Story 2)
    credit/       # Credit detail & edit screens (Story 3)
  components/
    redeemy/      # App-specific components (CreditCard, ExpirationBadge, etc.)
    ui/           # Gluestack UI theme wrapper and base components
  stores/         # Zustand state stores (auth, credits, ui)
  lib/            # Firebase services, image upload, notifications
  hooks/          # Custom React hooks
  types/          # TypeScript interfaces and enums
  constants/      # Categories, currencies, reminder presets
assets/           # Images, fonts, icons
```

## Key Conventions

- **Amounts** stored as integers in _agot_ (₪ × 100). Display only via `formatCurrency(agot)`.
- **Firebase SDK** imported exclusively through `src/lib/firebase.ts` — never directly in screens or components.
- **Async logic** lives in `src/lib/` service files only — Zustand stores are synchronous setters.
- **Native directories** (`ios/`, `android/`) are gitignored — generated via EAS (Continuous Native Generation).

## Firebase Environments

| Environment | Firebase Project | Plan |
|---|---|---|
| Development | `redeemy-dev` | Spark (free) |
| Production | `redeemy-prod` | Blaze (pay-as-you-go) |

## Running Tests

```bash
npm test
```
