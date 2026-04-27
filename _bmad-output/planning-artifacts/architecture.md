---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-16'
inputDocuments:
  - docs/product-brief.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
project_name: 'Redeemy'
user_name: 'Moti'
date: '2026-04-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

8 feature groups covering the full credit lifecycle:

1. **Credit Management** — Create (photo + 6 fields), Read (list with sort/filter/search), Update (edit any field), Delete, Archive to History
2. **Stores List** — auto-populated derived view, searchable, tap to see all credits for a store
3. **Reminders & Notifications** — local scheduled push (per-credit, user-configurable timing), in-app badge for <7 day credits
4. **Redemption & Archive** — mark as redeemed (full/partial), move to History, record-keeping view
5. **Family/Group Sharing** — create groups, invite via email/phone, real-time shared credit pool, per-credit attribution, any member can add/edit/redeem
6. **User Accounts & Cloud Sync** — email + Google + Apple auth, automatic cloud sync, offline reading, conflict resolution (last-write-wins)
7. **Image Pipeline** — camera capture or gallery import, compression, thumbnail, full-res cloud storage
8. **Web Companion** — missed credits view only (read-only, authenticated, reactive to user's credit history)

**Non-Functional Requirements:**

| NFR | Target | Architectural Impact |
|---|---|---|
| Offline support | Read/browse works offline; add requires internet | Local-first data layer with sync queue |
| Real-time sync | Family group changes propagate instantly | WebSocket or Firestore real-time listeners |
| Image storage | Compress before upload, CDN delivery | Three-tier image pipeline (local → cloud → CDN) |
| Push notifications | Local scheduled + cloud-triggered | Two notification channels (local + FCM/APNs) |
| Performance | Add Credit < 45 seconds end-to-end | Optimistic UI, background sync, fast camera open |
| Reliability | Crash rate < 1%, sync success rate monitored | Error boundaries, retry logic, offline indicators |
| Accessibility | WCAG 2.1 Level AA | Component API design (VoiceOver, Dynamic Type, Reduced Motion) |
| Security | HTTPS only, encrypted at rest, no biometric lock | Standard auth tokens, cloud-provider encryption |
| Compliance | GDPR (if applicable) | Data deletion policy, export capability |
| Platform | iOS 15+ primary, Android 8.0+ secondary | SafeAreaView, iOS-native APIs (date picker, share sheet, haptics) |

**Scale & Complexity:**

- Primary domain: Mobile-first consumer app (iOS/Android) + lightweight web companion
- Complexity level: **Medium** — CRUD core is straightforward; real-time multi-user sync, image pipeline, and dual notification channels elevate complexity
- Estimated architectural components: 6 major layers (auth, data/sync, image pipeline, notifications, sharing/realtime, web companion)

### Technical Constraints & Dependencies

- **Framework:** React Native + Expo (locked in from UX decision)
- **Design system:** Gluestack UI with custom Sage teal token set
- **Auth providers:** Apple Sign-In, Google OAuth, email/password — three flows required at launch
- **Local storage:** SQLite or Realm for offline credit data
- **Cloud backend:** BaaS preferred (Firebase/Supabase/Amplify) — avoids custom server infrastructure for MVP
- **Image storage:** Cloud object storage with CDN (Firebase Storage or S3 + CloudFront)
- **Notifications:** APNs (iOS) + FCM (Android) — managed by Expo Notifications or direct integration
- **Web companion:** Must share auth session with mobile app; needs read access to user's credits
- **Currency:** ₪ (Israeli Shekel) default; multi-currency not in MVP
- **No OCR, no GPS, no barcode scanning** — manual entry only for MVP

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — Single auth identity spans mobile app, family groups (permission model: member vs. admin), and web companion. Group membership gates which credits are visible.
2. **Offline-first data management** — Local cache is source of truth for reads; write queue for adds/edits when offline; sync engine reconciles with cloud on reconnect.
3. **Image lifecycle** — Every credit carries 3 image representations: camera source (discarded after upload), compressed thumbnail (local + CDN), full-res original (CDN only). Cache invalidation and storage costs need policy.
4. **Push notification scheduling** — Local notifications handle reminder timing (no backend round-trip needed); cloud messaging handles family sharing events. Two systems must coexist without duplicate alerts.
5. **Real-time sync architecture** — Family group credits require live listeners; solo-user credits can use polling or background sync. Real-time scope must be defined to avoid over-engineering.
6. **Error handling & optimistic UI** — Add Credit and Redeem actions update UI immediately, sync in background. Network failure recovery must return user to correct state without data loss.
7. **Accessibility throughout** — WCAG 2.1 AA affects every custom component's API: `accessibilityLabel` contracts, Dynamic Type compliance, Reduced Motion hooks, and color-never-alone enforcement for urgency states.

## Starter Template Evaluation

### Primary Technology Domain

React Native mobile app (iOS-first, Android secondary) + lightweight web companion view.
Framework locked from UX decision: **React Native + Expo + Gluestack UI**.

### Starter Options Considered

| Option | Notes | Decision |
|---|---|---|
| `gluestack/expo-head-starter-kit` | Official Gluestack+Expo starter — archived Sept 2024, read-only | ❌ Abandoned |
| `gluestack/gluestack-ui-starter-kits` | Uses NativeWind (Tailwind CSS) styling layer — contradicts Gluestack theme-token approach | ❌ Misaligned |
| `npx create-expo-app@latest` (default) | Expo SDK 55, React 19.2, Expo Router v3 (file-based), maintained by Expo team | ✅ Selected |

### Selected Starter: Expo SDK 55 Default Template

**Rationale:** The default `create-expo-app` template is the most actively maintained starting point and matches every constraint: Expo SDK 55, React 19.2, React Native 0.83.2, iOS 15.1+ (matches our iOS 15 target), and Expo Router v3 for file-based navigation. Gluestack UI is added as a deliberate layer on top rather than bundled in an archived starter.

**Initialization Command:**

```bash
npx create-expo-app@latest Redeemy --template default@sdk-55
cd Redeemy
```

**Gluestack UI Installation (after project creation):**

```bash
npx expo install @gluestack-ui/themed @gluestack-style/react
```

Follow the Gluestack UI Expo installation guide for provider setup and custom theme tokens.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- JavaScript by default — TypeScript must be added manually (rename files to `.tsx`, add `tsconfig.json`)
- React 19.2 + React Native 0.83.2 + Expo SDK 55
- Minimum supported: iOS 15.1+, Android 7.0+

**Routing & Navigation:**
- Expo Router v3 (file-based routing) — routes defined in `src/app/` directory
- `_layout.tsx` files for screen initialization and nested navigators
- Tab bar navigation via Expo Router's built-in tab support
- Deep linking from push notifications supported natively

**Build Tooling:**
- Metro bundler (React Native standard)
- Continuous Native Generation (CNG) — no `ios/` or `android/` directories committed
- EAS Build for CI/CD and App Store submission

**Testing Framework:**
- Jest with `jest-expo` preset (add manually post-init)
- React Native Testing Library recommended

**Code Organization:**
- `src/app/` — Expo Router file-based routes
- `src/components/` — reusable UI components
- `src/components/redeemy/` — custom Redeemy components (CreditCard, ExpirationBadge, etc.)
- `assets/` — fonts, images

**Development Experience:**
- Expo Go for rapid iteration (no build needed)
- Expo Dev Client for native module testing
- Hot reloading via Metro Fast Refresh

**Note:** Project initialization using the above command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Backend provider: Firebase (Firestore + Auth + Storage)
- Offline strategy: Firestore built-in offline persistence
- State management: Zustand
- Push notifications: Expo Notifications
- Camera access: expo-image-picker

**Important Decisions (Shape Architecture):**
- No custom API server — BaaS-only, Firebase Security Rules handle authorization
- Image compression on-device before upload (expo-image-manipulator)
- Conflict resolution: last-write-wins with server timestamps

**Deferred Decisions (Post-MVP):**
- Web companion (missed credits view) — deferred entirely; adds development overhead with no impact on core mobile value proposition
- OCR / auto-extraction from credit photos
- Analytics dashboard

---

### Data Architecture

**Cloud Database: Firebase Firestore**
- Version: Firebase JS SDK `firebase@^12.0.0`
- Document/collection model maps directly to data model (Users, Credits, Groups, GroupMembers, Categories)
- Real-time listeners power family group sync — credits added by any member propagate instantly to all
- Firebase Security Rules enforce group membership authorization at the database level (no custom backend needed)

**Offline Strategy: Firestore Offline Persistence**
- Enable via `initializeFirestore(app, { localCache: persistentLocalCache() })`
- Credits list reads and browsing work fully offline — Firestore serves from local cache automatically
- Write operations (Add Credit) require internet — consistent with UX spec requirement
- Conflict resolution: last-write-wins using Firestore server timestamps (`serverTimestamp()`) on every write
- No separate SQLite, Realm, or WatermelonDB — Firestore persistence covers MVP offline needs entirely

**Data Model (Firestore collections):**

```
/users/{userId}
  - email, name, createdAt

/credits/{creditId}
  - userId, groupId (nullable), storeName, amount, currency
  - category, expirationDate, reminderDays, notes
  - imageUrl, thumbnailUrl, status (active/redeemed)
  - redeemedAt (nullable), createdAt, updatedAt (serverTimestamp)

/groups/{groupId}
  - groupName, createdBy, createdAt

/groups/{groupId}/members/{userId}
  - role (admin/member), joinedAt

/users/{userId}/categories/{categoryId}
  - name, isDefault, createdAt
```

**Data Validation: Zod**
- Schema validation at the app boundary (form submission, Firestore writes)
- Shared schemas between Add Credit form validation and Firestore document shape

---

### Authentication & Security

**Auth Provider: Firebase Auth**
- Three sign-in methods: Email/Password, Google Sign-In, Apple Sign-In (iOS required)
- Firebase handles JWT token lifecycle automatically
- Auth state persists across app restarts via AsyncStorage

**Authorization: Firebase Security Rules**
- Credits readable/writable only by owning user OR group members
- Group membership verified server-side in Security Rules — no custom middleware
- Example rule: `allow read: if request.auth.uid == resource.data.userId || isGroupMember(resource.data.groupId)`

**Security posture:**
- HTTPS only (Firebase enforced)
- Images stored in Firebase Storage with Security Rules (authenticated access only)
- No biometric/PIN lock (out of scope per product brief)
- No sensitive financial data (no card numbers, bank details)

---

### API & Communication Patterns

**Pattern: BaaS-only — no custom API server**
- All data operations go directly to Firestore via Firebase JS SDK
- All auth operations go directly to Firebase Auth
- All image operations go directly to Firebase Storage
- Firebase Security Rules are the API authorization layer

**Real-time Sync (Family Groups):**
- Firestore `onSnapshot()` listeners on the group's credits collection
- Listener established when user joins/is in a group; torn down on leave
- UI updates optimistically (local write first, Firestore syncs in background)

**Push Notifications:**
- Local scheduled notifications: `expo-notifications` (`^55.0.0`) — handles reminder scheduling entirely on-device, no backend round-trip
- Remote push (family sharing events): Firebase Cloud Messaging (FCM) via `expo-notifications` remote push — triggers when a group member adds/redeems a credit
- Single notification API handles both channels; APNs (iOS) and FCM (Android) configured via EAS build config

---

### Frontend Architecture

**State Management: Zustand `v5.0.12`**
- Auth store: current user, auth state (loading/authenticated/unauthenticated)
- Credits store: active credits list, search/filter state, sync status
- UI store: modal state, active tab, offline indicator
- Firestore `onSnapshot()` listeners write directly into Zustand stores
- No Redux, no Context API for global state — Zustand's simplicity fits MVP scale

**Component Architecture:**
- `src/app/` — Expo Router file-based screens (tabs, modals, detail views)
- `src/components/redeemy/` — custom components: CreditCard, ExpirationBadge, StoreAutocomplete, CategoryChipSelector, RedemptionConfirmation
- `src/components/ui/` — Gluestack UI theme wrappers and token overrides
- `src/stores/` — Zustand store definitions
- `src/lib/firebase.ts` — Firebase app initialization and exports
- `src/lib/notifications.ts` — Expo Notifications setup and scheduling helpers

**Image Pipeline:**
- Capture/select: `expo-image-picker` (`^55.0.0`) — camera + gallery, works with Expo Go
- Compression: `expo-image-manipulator` — resize + compress before upload (target: <500KB)
- Upload: Firebase Storage — two files per credit: `credits/{creditId}/full.jpg` + `credits/{creditId}/thumb.jpg`
- Display: Firebase Storage download URLs cached in Firestore document (`imageUrl`, `thumbnailUrl`)

**Performance:**
- Optimistic UI on Add Credit and Redeem — local Zustand update first, Firestore write in background
- FlatList with `keyExtractor` and `getItemLayout` for credits list performance
- Image lazy loading via `expo-image` with blurhash placeholders

---

### Infrastructure & Deployment

**Mobile Builds: EAS (Expo Application Services)**
- `eas build` for iOS/Android production builds
- `eas submit` for App Store and Play Store submission
- Development: Expo Go for JS-only iteration; Expo Dev Client for native module testing
- Environment config: `app.config.ts` with `process.env` for Firebase credentials per environment (dev/prod)

**Firebase Project:**
- Single Firebase project with two environments: `redeemy-dev` and `redeemy-prod`
- Spark (free) plan sufficient for development; upgrade to Blaze (pay-as-you-go) before launch for Storage and Cloud Messaging

**Error Monitoring:** Sentry — deferred post-MVP

**Web Companion:** DEFERRED — not built for MVP; when implemented: Next.js page reading from Firestore with Firebase Auth session sharing

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 areas where AI agents could diverge without explicit rules:
Firestore field naming · File/folder naming · Date/currency storage formats ·
Zustand store shape · Firestore listener lifecycle · Error handling routing ·
Image upload pipeline · Notification deduplication

---

### Naming Patterns

**Firestore Field Naming: camelCase**
- All Firestore document fields use camelCase — no transformation layer needed between JS and DB
- ✅ `storeName`, `expirationDate`, `imageUrl`, `createdAt`
- ❌ `store_name`, `expiration_date`, `image_url`

**File Naming:**

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `CreditCard.tsx`, `ExpirationBadge.tsx` |
| Expo Router screens | kebab-case | `credit-detail.tsx`, `add-credit.tsx` |
| Hooks | camelCase with `use` prefix | `useCredits.ts`, `useAuth.ts` |
| Zustand stores | camelCase with `Store` suffix | `creditsStore.ts`, `authStore.ts` |
| Firebase helpers | camelCase | `firebase.ts`, `firestoreCredits.ts` |
| Type definitions | camelCase | `creditTypes.ts`, `groupTypes.ts` |
| Test files | co-located, `.test.tsx` suffix | `CreditCard.test.tsx` |

**TypeScript Naming:**
- Types and interfaces: PascalCase — `Credit`, `Group`, `GroupMember`
- Enums: PascalCase, values UPPER_SNAKE — `CreditStatus.ACTIVE`, `CreditStatus.REDEEMED`
- Zustand store hooks: `use${Name}Store` — `useCreditsStore()`, `useAuthStore()`
- Props types: `${ComponentName}Props` — `CreditCardProps`

---

### Structure Patterns

**Directory Layout (enforced):**

```
src/
  app/                      # Expo Router screens (file-based routes)
    (tabs)/                 # Tab group
      index.tsx             # Credits tab (home)
      stores.tsx            # Stores tab
      history.tsx           # History tab
    credit/
      [id].tsx              # Credit detail
    add-credit.tsx          # Add Credit modal
    auth/
      sign-in.tsx
  components/
    redeemy/                # Custom Redeemy components
      CreditCard.tsx
      ExpirationBadge.tsx
      StoreAutocomplete.tsx
      CategoryChipSelector.tsx
      RedemptionConfirmation.tsx
    ui/                     # Gluestack UI theme wrappers
  stores/                   # Zustand stores
    creditsStore.ts
    authStore.ts
    uiStore.ts
  lib/                      # Firebase + service helpers
    firebase.ts             # Firebase app init + exports
    firestoreCredits.ts     # Firestore CRUD for credits
    firestoreGroups.ts      # Firestore CRUD for groups
    notifications.ts        # Expo Notifications helpers
    imageUpload.ts          # Compress + upload pipeline
  hooks/                    # Custom React hooks
  types/                    # TypeScript type definitions
  constants/                # App-wide constants (categories, currencies)
```

**Test co-location:** Tests live next to source files, never in a separate `__tests__/` root folder.

```
src/components/redeemy/CreditCard.tsx
src/components/redeemy/CreditCard.test.tsx   ← co-located
```

---

### Format Patterns

**Dates:**
- **Store in Firestore:** `serverTimestamp()` for write time; `Timestamp` type for expiration dates
- **In app (TypeScript):** Convert to JS `Date` immediately on read from Firestore — never pass raw Firestore `Timestamp` objects to components
- **Display:** Format in component using `Intl.DateTimeFormat` — never store formatted strings
- ✅ `expirationDate: Timestamp` in Firestore → `expirationDate: Date` in TypeScript type

**Currency/Amounts:**
- **Store in Firestore:** Integer agot (אגורות) — multiply by 100 on save, divide on display. No floating point arithmetic.
- **Display:** Format with `Intl.NumberFormat` in component — never in store or service layer
- ✅ `₪50.00` stored as `amount: 5000` (agot), displayed as `formatCurrency(5000)` → `"₪50.00"`

**Credit Status:**

```typescript
export enum CreditStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',
}
```

- Never use raw strings `'active'`/`'redeemed'` in code — always `CreditStatus.ACTIVE`

**Firestore Document IDs:**
- Always auto-generated via `addDoc()` — never manually specify IDs
- Store the generated ID back onto the document as `id` field after creation

---

### Communication Patterns

**Zustand Store Shape — one consistent pattern:**

```typescript
interface CreditsStore {
  // State
  credits: Credit[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  setCredits: (credits: Credit[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  addCredit: (credit: Credit) => void;        // optimistic add
  removeCredit: (creditId: string) => void;   // optimistic remove
}
```

- State and actions in the same store slice — never split
- Actions are synchronous Zustand setters — async logic lives in `src/lib/` service files
- Optimistic update pattern: call Zustand action first, then Firestore write; revert on error

**Firestore Listener Lifecycle:**

```typescript
// ✅ Correct — listener set up in useEffect, torn down on cleanup
useEffect(() => {
  const unsubscribe = onSnapshot(creditsQuery, (snapshot) => {
    useCreditsStore.getState().setCredits(snapshot.docs.map(toCredit));
  });
  return unsubscribe;   // Always return unsubscribe for cleanup
}, [userId]);
```

- Never set up Firestore listeners outside of `useEffect` or a dedicated hook
- Always return the `unsubscribe` function from `useEffect` cleanup
- Listener hooks live in `src/hooks/` — e.g. `useCreditsListener.ts`

---

### Process Patterns

**Error Handling Routing:**

| Error Type | Where It Surfaces | UI Pattern |
|---|---|---|
| Validation (empty field, invalid date) | Inline on field | Red underline + helper text |
| Network failure on save | Toast (non-blocking) | "Couldn't save — tap to retry" |
| Auth error | Redirect to sign-in screen | — |
| Image upload failure | Toast + keep form open | "Photo upload failed — try again" |
| Firestore permission denied | Toast | "Something went wrong" (generic) |

- **Never show raw error messages from Firebase/Firestore to users** — map to user-friendly strings in service layer
- All `try/catch` blocks in `src/lib/` service files — screens/components never catch raw Firebase errors directly

**Image Upload Pipeline — enforced sequence:**

```
expo-image-picker (capture/select)
  → expo-image-manipulator (resize to max 1024px, compress JPEG quality 0.7)
  → Firebase Storage upload → credits/{creditId}/full.jpg
  → Generate thumbnail (max 256px, quality 0.6) → credits/{creditId}/thumb.jpg
  → Write imageUrl + thumbnailUrl to Firestore document
```

- Never upload uncompressed camera images
- Always upload thumbnail alongside full image — never derive thumbnail URL from full URL

**Notification Deduplication:**

```typescript
// Always cancel existing notification before scheduling new one
await Notifications.cancelScheduledNotificationAsync(credit.notificationId);
const id = await Notifications.scheduleNotificationAsync(...);
await updateDoc(creditRef, { notificationId: id });
```

- `notificationId` stored on every Credit document in Firestore
- On expiration date edit: cancel old → schedule new → update Firestore
- On redeem/delete: cancel notification immediately

**TypeScript:**
- `strict: true` in `tsconfig.json` — no implicit `any`, no `!` non-null assertions
- Zod schemas in `src/lib/validation.ts` validate all Firestore reads and form submissions
- No `as any` casts — if Firestore data shape is uncertain, validate with Zod first

---

### Enforcement Guidelines

**All AI Agents MUST:**
- Use camelCase for all Firestore field names — never snake_case
- Store amounts as integer agot (×100), format only at display time
- Convert Firestore Timestamps to JS `Date` immediately on read — never pass Timestamps to components
- Use `CreditStatus` enum — never raw `'active'`/`'redeemed'` strings
- Co-locate tests with source files
- Return Firestore `unsubscribe` from every `useEffect` that opens a listener
- Compress images before upload — never upload raw camera output
- Cancel existing notification before scheduling a replacement

**Anti-Patterns:**
- ❌ `amount: 49.99` in Firestore → ✅ `amount: 4999`
- ❌ `status: 'active'` in code → ✅ `status: CreditStatus.ACTIVE`
- ❌ Raw Firebase error string in Toast → ✅ mapped user-friendly message
- ❌ `const unsub = onSnapshot(...)` without `return unsub` in useEffect
- ❌ Async logic inside Zustand actions → ✅ async logic in `src/lib/`, actions are sync setters

## Project Structure & Boundaries

### Complete Project Directory Structure

```
Redeemy/
├── app.config.ts               # Expo config — Firebase env vars per environment
├── package.json
├── tsconfig.json               # strict: true
├── babel.config.js
├── eas.json                    # EAS Build profiles (development/preview/production)
├── jest.config.js
├── .env.development            # Firebase dev project credentials
├── .env.production             # Firebase prod project credentials
├── .env.example                # Committed — template with empty values
├── .gitignore
│
├── firebase/                   # Firebase project config (committed)
│   ├── firestore.rules         # Security Rules — group membership auth
│   ├── firestore.indexes.json  # Composite indexes for credits queries
│   ├── storage.rules           # Storage Rules — authenticated access only
│   └── firebase.json
│
├── assets/
│   ├── icon.png
│   ├── splash.png
│   ├── adaptive-icon.png
│   └── images/
│
└── src/
    ├── app/                            # Expo Router screens
    │   ├── _layout.tsx                 # Root layout — auth gate, Firebase init
    │   ├── (tabs)/                     # Tab group
    │   │   ├── _layout.tsx             # Tab bar: Credits · Stores · History · More
    │   │   ├── index.tsx               # Credits tab — home screen, search bar, credit list
    │   │   ├── stores.tsx              # Stores tab — derived store list, search
    │   │   ├── history.tsx             # History tab — redeemed credits archive
    │   │   └── more.tsx                # More tab — settings, family groups, account
    │   ├── credit/
    │   │   └── [id].tsx                # Credit detail — full info, redeem, edit, delete
    │   ├── add-credit.tsx              # Add Credit modal — camera, form, save
    │   ├── auth/
    │   │   ├── _layout.tsx
    │   │   ├── sign-in.tsx             # Email + Google + Apple sign-in
    │   │   └── sign-up.tsx             # Email registration
    │   └── group/
    │       ├── [id].tsx                # Family group detail — member list, shared credits
    │       └── create.tsx              # Create group — name + invite members
    │
    ├── components/
    │   ├── redeemy/                    # Custom Redeemy components
    │   │   ├── CreditCard.tsx          # Primary visual unit — used on every list screen
    │   │   ├── CreditCard.test.tsx
    │   │   ├── ExpirationBadge.tsx     # Urgency color + label from expirationDate prop
    │   │   ├── ExpirationBadge.test.tsx
    │   │   ├── StoreAutocomplete.tsx   # Store name input with chip suggestions
    │   │   ├── StoreAutocomplete.test.tsx
    │   │   ├── CategoryChipSelector.tsx
    │   │   ├── RedemptionConfirmation.tsx
    │   │   ├── EmptyState.tsx          # Configurable empty state with CTA
    │   │   └── SyncIndicator.tsx       # Teal dot — syncing/synced/offline
    │   └── ui/
    │       ├── GluestackProvider.tsx   # Theme provider — wraps entire app
    │       └── theme.ts                # Sage teal token overrides for Gluestack
    │
    ├── stores/                         # Zustand stores
    │   ├── authStore.ts                # currentUser, authStatus (loading/authed/unauthed)
    │   ├── creditsStore.ts             # credits[], isLoading, error, searchQuery
    │   └── uiStore.ts                  # activeTab, offlineMode, modal state
    │
    ├── lib/                            # Service layer — all async/Firebase logic
    │   ├── firebase.ts                 # Firebase app init — ONLY file importing firebase/app
    │   ├── firestoreCredits.ts         # CRUD for /credits — converts Timestamps → Date on read
    │   ├── firestoreGroups.ts          # CRUD for /groups + /groups/{id}/members
    │   ├── notifications.ts            # Schedule/cancel reminders via expo-notifications
    │   ├── imageUpload.ts              # Compress → upload full + thumbnail → return URLs
    │   └── validation.ts               # Zod schemas: CreditSchema, GroupSchema, UserSchema
    │
    ├── hooks/                          # Custom React hooks
    │   ├── useCreditsListener.ts       # onSnapshot for user's credits → creditsStore
    │   ├── useGroupListener.ts         # onSnapshot for group credits → creditsStore
    │   └── useAuthState.ts             # Firebase Auth state → authStore
    │
    ├── types/                          # TypeScript type definitions
    │   ├── creditTypes.ts              # Credit, CreditStatus enum, CreditFormData
    │   ├── groupTypes.ts               # Group, GroupMember, GroupRole enum
    │   └── userTypes.ts                # User, AuthStatus enum
    │
    └── constants/
        ├── categories.ts               # Default category list + icons
        ├── currencies.ts               # Supported currencies (₪ default)
        └── reminders.ts                # Reminder preset options (1 day, 1 week, 1 month, 3 months)
```

---

### Architectural Boundaries

**Firebase Boundary — single import point:**
- `src/lib/firebase.ts` is the **only** file that imports from `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`
- All other files import the initialized instances from `src/lib/firebase.ts`
- Prevents version conflicts and makes Firebase configuration a single-file concern

**Data Boundary — Timestamp conversion:**
- Firestore `Timestamp` objects are converted to JS `Date` inside `src/lib/firestoreCredits.ts` on every read
- Components and stores always receive `Date` objects — never raw Firestore `Timestamp`
- Amounts are divided by 100 (agot → ₪) only in display components — stored and transported as integers

**Notification Boundary:**
- All `expo-notifications` calls are in `src/lib/notifications.ts` exclusively
- No component or screen imports from `expo-notifications` directly
- `notificationId` is always persisted to Firestore after scheduling

**Image Boundary:**
- All `expo-image-picker` and `expo-image-manipulator` calls are in `src/lib/imageUpload.ts`
- Function signature: `uploadCreditImage(localUri: string, creditId: string): Promise<{ imageUrl: string, thumbnailUrl: string }>`
- Callers receive only the final Storage URLs — never handle raw image manipulation

**Auth Boundary:**
- `src/hooks/useAuthState.ts` listens to Firebase Auth and writes to `authStore`
- Components read auth state from `useAuthStore()` only — never from Firebase Auth directly
- Route protection handled in `src/app/_layout.tsx` via `authStore.authStatus`

---

### Feature → Structure Mapping

| Feature | Screens | Service | Store | Hook |
|---|---|---|---|---|
| Credit Management (CRUD) | `(tabs)/index.tsx`, `credit/[id].tsx`, `add-credit.tsx` | `firestoreCredits.ts` | `creditsStore` | `useCreditsListener.ts` |
| Stores List | `(tabs)/stores.tsx` | `firestoreCredits.ts` (derived query) | `creditsStore` | `useCreditsListener.ts` |
| Reminders | `add-credit.tsx`, `credit/[id].tsx` | `notifications.ts` | — | — |
| Redemption & Archive | `(tabs)/history.tsx`, `credit/[id].tsx` | `firestoreCredits.ts` | `creditsStore` | — |
| Family/Group Sharing | `group/[id].tsx`, `group/create.tsx`, `more.tsx` | `firestoreGroups.ts` | `creditsStore` | `useGroupListener.ts` |
| Auth & Cloud Sync | `auth/sign-in.tsx`, `auth/sign-up.tsx` | `firebase.ts` | `authStore` | `useAuthState.ts` |
| Image Pipeline | `add-credit.tsx` | `imageUpload.ts` | — | — |
| Settings | `(tabs)/more.tsx` | `firestoreGroups.ts` | `authStore` | — |

---

### Data Flow

```
User action (tap Save)
  → Component calls src/lib/firestoreCredits.ts
  → Optimistic: creditsStore.addCredit(newCredit)    ← UI updates instantly
  → async: addDoc(creditsCollection, ...)            ← Firestore write
  → imageUpload.ts: compress → upload → get URLs
  → notifications.ts: scheduleNotificationAsync()
  → updateDoc(creditRef, { imageUrl, thumbnailUrl, notificationId })
  → onSnapshot fires → useCreditsListener → creditsStore.setCredits()
  → Component re-renders with final server state
```

```
App launch
  → _layout.tsx: useAuthState hook starts Firebase Auth listener
  → authStore.authStatus === 'loading' → show splash
  → Auth resolves → 'authenticated' → redirect to tabs
  → useCreditsListener starts onSnapshot for user's credits
  → creditsStore populated → Credits tab renders
```

---

### Integration Points

**External Services:**

| Service | SDK | Initialized In | Used In |
|---|---|---|---|
| Firebase Firestore | `firebase@^12` | `src/lib/firebase.ts` | `firestoreCredits.ts`, `firestoreGroups.ts` |
| Firebase Auth | `firebase@^12` | `src/lib/firebase.ts` | `hooks/useAuthState.ts` |
| Firebase Storage | `firebase@^12` | `src/lib/firebase.ts` | `lib/imageUpload.ts` |
| Expo Notifications | `expo-notifications@^55` | `src/lib/notifications.ts` | `lib/notifications.ts` only |
| Expo Image Picker | `expo-image-picker@^55` | — | `lib/imageUpload.ts` only |
| Expo Image Manipulator | `expo-image-manipulator@^55` | — | `lib/imageUpload.ts` only |

**Environment Config (`app.config.ts`):**

```typescript
// All Firebase credentials injected via process.env — never hardcoded
extra: {
  firebaseApiKey: process.env.FIREBASE_API_KEY,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  // ...
}
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and form a coherent stack:
- Expo SDK 55 + Expo Router v3 — Expo Router is the default in SDK 55; no additional setup
- Firebase JS SDK v12 + Expo managed workflow — JS SDK works with Expo Go; no native modules required for core features
- Gluestack UI — designed for React Native; zero conflicts with Expo
- Zustand v5 + React 19 — compatible; Zustand v5 uses React's `useSyncExternalStore`
- expo-notifications ^55 + EAS — standard configuration, APNs/FCM configured via EAS build config
- Firestore offline persistence — consistent with UX spec requirement (read offline, add requires internet)

**Pattern Consistency:**
- camelCase Firestore fields + TypeScript camelCase → no transformation layer needed
- Zod validation at service boundaries + TypeScript strict mode → consistent defensive approach
- Optimistic UI (Zustand update first) + Firestore real-time listeners → established, well-documented pattern
- Co-located tests + jest-expo preset → correct for Expo project structure

**Structure Alignment:**
- `src/app/` for Expo Router file-based routes → correct SDK 55 convention
- `src/lib/` as service layer with single Firebase import point → clean, enforced boundary
- `firebase/` folder for Security Rules → deployable with `firebase-tools`
- `google-services.json` / `GoogleService-Info.plist` in project root → EAS picks these up at build time

---

### Requirements Coverage Validation ✅

**Feature Coverage (all 8 features supported):**

| Feature | Architectural Support | Status |
|---|---|---|
| Credit Management (CRUD) | `firestoreCredits.ts` + `CreditCard` + `add-credit.tsx` + `credit/[id].tsx` | ✅ |
| Stores List | Derived Firestore query in `stores.tsx` via `firestoreCredits.ts` | ✅ |
| Reminders & Notifications | `notifications.ts` + `notificationId` field on Credit | ✅ |
| Redemption & Archive | `history.tsx` + `RedemptionConfirmation` + `CreditStatus.REDEEMED` | ✅ |
| Family/Group Sharing | `firestoreGroups.ts` + `group/` screens + `useGroupListener` + Security Rules | ✅ |
| Auth & Cloud Sync | Firebase Auth + `useAuthState` + `authStore` + auth route protection | ✅ |
| Image Pipeline | `imageUpload.ts` (compress → upload → thumbnail → Storage URLs) | ✅ |
| Web Companion | Explicitly deferred post-MVP | ✅ deferred |

**Non-Functional Requirements Coverage:**

| NFR | Architectural Support | Status |
|---|---|---|
| Offline support (read) | Firestore `persistentLocalCache()` | ✅ |
| Real-time sync (family groups) | Firestore `onSnapshot()` in `useGroupListener` | ✅ |
| Push notifications | `expo-notifications` — local (reminders) + FCM (family events) | ✅ |
| Image compression + CDN | `expo-image-manipulator` + Firebase Storage + download URLs | ✅ |
| WCAG 2.1 AA | Enforced in custom component API contracts (`accessibilityLabel`, Dynamic Type, Reduced Motion) | ✅ |
| Firebase Security Rules | Group membership auth at DB level, no custom API server needed | ✅ |
| iOS 15.1+ / Android 7.0+ | Expo SDK 55 minimum targets | ✅ |
| Crash rate < 1% | EAS crash reports; Sentry deferred post-MVP | ✅ |
| GDPR (if applicable) | Firebase data deletion + user account delete flow in `more.tsx` settings | ✅ |

---

### Gap Analysis Results

**Minor Gaps (non-blocking, resolved below):**

**Gap 1 — Firebase Auth persistence dependency:**
Firebase JS SDK v12 requires `@react-native-async-storage/async-storage` for auth token persistence in React Native. Without it, users are signed out on every app restart.
Resolution — initialize Firebase Auth with the RN AsyncStorage adapter:
```typescript
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
```

**Gap 2 — Firestore offline persistence AsyncStorage adapter:**
`persistentLocalCache()` in React Native also requires the AsyncStorage adapter. Same dependency resolves both gaps.

**Gap 3 — Native Firebase config files:**
`google-services.json` (Android) and `GoogleService-Info.plist` (iOS) must exist in the project root for EAS builds. Both are gitignored (contain API keys) and managed via EAS Secrets in CI:
```
Redeemy/
├── google-services.json        # gitignored — Android FCM config
├── GoogleService-Info.plist    # gitignored — iOS APNs + Firebase config
```

**Gap 4 — Zod version:**
Pinned to `zod@^3.25` (current stable). Added to installation command below.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (8 feature groups, 10 NFRs)
- [x] Scale and complexity assessed (Medium)
- [x] Technical constraints identified (Expo managed, BaaS-only, iOS-first)
- [x] Cross-cutting concerns mapped (auth, offline, image lifecycle, notifications, real-time, accessibility)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (Firebase v12, Zustand v5, Expo SDK 55, Zod v3.25)
- [x] Technology stack fully specified
- [x] Integration patterns defined (BaaS-only, no custom API server)
- [x] Performance considerations addressed (optimistic UI, FlatList optimization, image compression)
- [x] Web companion explicitly deferred with rationale

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined (co-located tests, single Firebase import, service layer boundaries)
- [x] Communication patterns specified (Zustand store shape, Firestore listener lifecycle)
- [x] Process patterns documented (error routing, image pipeline, notification deduplication)
- [x] Anti-patterns documented with examples

**✅ Project Structure**
- [x] Complete directory structure defined (all files named)
- [x] Component boundaries established
- [x] Integration points mapped (feature → screen → service → store → hook table)
- [x] Data flow documented

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- BaaS-only approach eliminates custom server infrastructure entirely for MVP
- Firestore offline persistence + real-time listeners solves both offline and family sync in one decision
- Single Firebase import boundary (`src/lib/firebase.ts`) prevents fragmentation across codebase
- Explicit optimistic UI pattern prevents perceived latency on Add Credit (the highest-stakes flow)
- Currency stored as integers prevents floating-point bugs before they happen
- Notification deduplication pattern prevents duplicate reminder alerts

**Post-MVP Enhancements:**
- Web companion — Next.js + Firebase Auth session sharing
- Sentry error monitoring
- OCR for automatic credit field extraction
- Analytics (credits saved vs expired ratio)
- Partial redemption tracking

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Respect the 8 enforcement rules in Implementation Patterns (camelCase fields, integer amounts, Timestamp→Date conversion, CreditStatus enum, co-located tests, listener cleanup, image compression, notification cancel-before-reschedule)
- Never import from `firebase/*` packages outside of `src/lib/firebase.ts`
- Never expose raw Firebase error messages to the user — map to friendly strings in service layer

**First Implementation Story — project initialization:**
```bash
npx create-expo-app@latest Redeemy --template default@sdk-55
cd Redeemy
npx expo install firebase @react-native-async-storage/async-storage
npx expo install zustand zod
npx expo install expo-notifications expo-image-picker expo-image-manipulator expo-image
npx expo install @gluestack-ui/themed @gluestack-style/react
```

---

## As-Built Update — 2026-04-27

> This section documents how the architecture evolved beyond the original MVP plan. The original document above remains accurate as a foundation; the additions below reflect the actual implementation.

### Expanded Feature Set

The original architecture planned 1 core feature (Credits). The actual implementation grew to **5 parallel features**, each following the same architectural pattern:

| Feature | Firestore Collection | Store | Listener Hook | Lib Service |
|---------|---------------------|-------|--------------|-------------|
| Credits | `/credits` | `creditsStore` | `useCreditsListener` | `firestoreCredits.ts` |
| Warranties | `/warranties` | `warrantiesStore` | `useWarrantiesListener` | `firestoreWarranties.ts` |
| Subscriptions | `/subscriptions` | `subscriptionsStore` | `useSubscriptionsListener` | `firestoreSubscriptions.ts` |
| Occasions | `/occasions` | `occasionsStore` | (inline in hook) | `firestoreOccasions.ts` |
| Documents | `/documents` | `documentsStore` | `useDocumentsListener` | `firestoreDocuments.ts` |

All 5 features follow the same pattern: optimistic Zustand update → Firestore write → onSnapshot confirms.

### Actual Stores (9 total)

`authStore`, `creditsStore`, `warrantiesStore`, `subscriptionsStore`, `occasionsStore`, `documentsStore`, `familyStore`, `uiStore`, `settingsStore` (persisted with Zustand `persist` middleware + AsyncStorage).

### Actual Tab Navigation (7 tabs)

Credits · Warranties · Subscriptions · Occasions · Documents · History · More

### Multi-Image Support

All 5 features support up to **3 images per item**. Storage paths follow: `{feature}/{itemId}/image_0.jpg`, `image_1.jpg`, `image_2.jpg`. Items have `images: string[]` and `thumbnails: string[]` fields. Credits keep backward-compat `imageUrl`/`thumbnailUrl` single-image fields.

`src/lib/imageUpload.ts` exports `uploadItemImages(localUris: string[], itemId: string, prefix: string)` and `deleteItemImages(itemId: string, prefix: string)`.

### Subscription Data Model — Evolved Design

The subscription model grew significantly beyond the original epics spec:

```typescript
interface Subscription {
  // Billing
  billingCycle: 'monthly' | 'annual'
  billingDayOfMonth?: number      // MONTHLY: 1–28 (capped, not 1-31)
  registrationDate: Date          // anchor for all date calculations
  nextBillingDate?: Date          // ANNUAL only; derived for MONTHLY
  renewalType: 'auto' | 'manual'  // determines notification strategy

  // Access / pricing
  isFree: boolean
  amountAgorot: number            // 0 if isFree
  currency: string

  // Special periods (trial or discounted)
  specialPeriodType?: 'trial' | 'discounted'
  specialPeriodMonths?: number
  specialPeriodDays?: number
  specialPeriodPriceAgorot?: number
  priceAfterTrialAgorot?: number
  trialEndsDate?: Date
  reminderSpecialPeriodEnabled: boolean

  // Commitment (fixed-term subscriptions)
  hasFixedPeriod: boolean
  commitmentMonths?: number
  commitmentEndDate?: Date

  // Review reminders (free subs only)
  freeReviewReminderMonths?: number

  // Notifications (up to 3 active IDs)
  notificationIds: string[]
  renewalNotificationId?: string
  specialPeriodNotificationId?: string

  // Family sharing
  familyId?: string
  createdBy?: string
  createdByName?: string
}
```

**Key utility functions** (`src/lib/subscriptionUtils.ts`):
- `getNextBillingDate(sub)` — handles MONTHLY day-clamping and ANNUAL year-advance
- `daysUntilBilling(sub)` — days until next billing event (rounds up)
- `getNextReminderInfo(sub)` — returns `ReminderType: 'trial' | 'discounted' | 'review' | 'renews' | 'expires'`
- `normalizeToMonthlyAgorot(sub)` — annual ÷ 12 for total calculation
- `computeMonthlyTotal(subs)` / `computeMonthlyTotalByCurrency(subs)` — multi-currency support
- `advanceBillingCycle(sub)` — moves billing date forward one cycle
- `endFreeTrialIfDue(sub)` — converts trial → paid when `trialEndsDate` has passed

**Notification strategy** (`src/lib/subscriptionNotifications.ts`):
- Free subs → periodic review reminder every N months from `registrationDate`
- Paid auto-renewal → reminder N days before + on-day "did it renew?" alert
- Paid manual renewal → reminder N days before + 1 day before
- Special period → optional advance reminder before trial/discount ends

### Occasions — Hebrew Calendar

Occasions (`occasionTypes.ts`) include Hebrew calendar support:
- `useHebrewDate: boolean` — if true, reminder fires on Hebrew calendar anniversary each year
- `hebrewDay / hebrewMonth` — stored Hebrew date components
- `src/lib/hebrewDate.ts` — Gregorian↔Hebrew conversion and next-occurrence calculation

### Notification Architecture (Expanded)

Three notification service files:
- `src/lib/notifications.ts` — credits, warranties, documents (generic reminder + on-day alert pattern)
- `src/lib/subscriptionNotifications.ts` — subscriptions (complex multi-notification strategy)
- `src/lib/occasionNotifications.ts` — occasions (annual recurrence with Hebrew calendar)

Each item stores its notification IDs for deduplication (cancel-before-reschedule pattern unchanged).

Unified notification settings UI: `src/app/notification-settings.tsx` — controls reminder timing for all 5 features.

### Additional Lib Files

| File | Purpose |
|------|---------|
| `src/lib/creditUtils.ts` | Sort/filter logic for home and history screens |
| `src/lib/formatCurrency.ts` | agot → display string with currency symbol |
| `src/lib/formatDate.ts` | Date formatting utilities |
| `src/lib/hebrewDate.ts` | Hebrew calendar conversion |
| `src/lib/i18n.ts` | i18n setup (he + en) |
| `src/lib/auth.ts` | Full auth service (email, Google, Apple, phone, account deletion) |

### Additional Data Files

- `src/data/subscriptionServices.ts` — 150+ popular subscription services with auto-categorization
- `src/data/israeliStores.ts` — common Israeli store names for autocomplete

### Deferred (still deferred)

- Web companion
- Sentry error monitoring
- OCR field extraction
- Analytics dashboard
