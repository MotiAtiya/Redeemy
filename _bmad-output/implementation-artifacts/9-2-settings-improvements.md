# Story 9.2: Settings Screen Improvements

**Epic:** 9 — Theme & Appearance
**Author:** Mary (Business Analyst)
**Date:** 2026-04-17
**Status:** done

---

## User Story

As a user,
I want my Settings screen to show my real account details (with an editable username) and let me control whether the app sends me reminders,
So that I can personalize the app and manage notification preferences without leaving the app.

---

## Background & Context

The current More screen (`src/app/(tabs)/more.tsx`) has two placeholder settings rows ("Notifications" and "Privacy") that do nothing when tapped. The account section displays only the Firebase Auth display name and email.

This story does three things:
1. **Username field** — a required, app-specific display name stored in Firestore `/users/{uid}`, completely independent of Firebase Auth. Auto-populated from Google/Apple sign-in as a starting value, but always editable.
2. **Notifications toggle** — a single master switch that controls whether credit expiry reminders are sent. Stored locally in AsyncStorage.
3. **Security row** — removed/hidden for now (deferred per product decision; do not implement).

> **Dependency:** Story 9.1 must be completed first, as this story assumes `useAppTheme()` and `settingsStore` already exist. All new UI in this story uses `colors.*` tokens — no hardcoded hex values.

---

## Part 1: Username

### Background

- Username is Redeemy's human-readable display name for the user, used across the app (avatar initials, future group credits attribution).
- It is stored in Firestore at `/users/{uid}` as the `username` field.
- It is **not** tied to Firebase Auth's `displayName`. The two are independent.
- On first Google/Apple sign-in, the system pre-fills the username from the provider's display name, but the user must confirm or edit it before proceeding.
- On email registration, the username setup screen is always blank (user must type one).
- Username is **required** — users cannot skip it or leave it empty.

### AC1 — `username` field in Firestore user document

**Given** a user document exists at `/users/{uid}`
**When** username is set
**Then**:
- The document contains a `username` field (string, trimmed, 2–30 characters)
- `src/types/userTypes.ts` `User` interface gains a `username?: string` field
- `src/lib/firestoreUsers.ts` (new file) handles all reads/writes to `/users/{uid}`:
  - `getUserProfile(uid: string): Promise<User | null>`
  - `setUsername(uid: string, username: string): Promise<void>` — uses `setDoc` with `{ merge: true }`
- No other file writes to `/users/{uid}` directly

### AC2 — Firestore Security Rules for `/users/{uid}`

**Given** Security Rules for the `/users/{uid}` collection
**When** a read or write is attempted
**Then**:
- `read`: allowed only if `request.auth.uid == userId`
- `write`: allowed only if `request.auth.uid == userId` AND `request.resource.data.username` is a string of length 2–30

### AC3 — Username setup screen shown after sign-up / first Google/Apple login

**Given** a user has just completed registration (any method) and has no `username` in Firestore
**When** the auth gate in `_layout.tsx` checks the user's profile
**Then**:
- The user is redirected to `src/app/auth/username-setup.tsx` instead of `(tabs)/index`
- This redirect blocks access to all tab screens until a username is saved

**Given** the username-setup screen is open
**When** it renders
**Then**:
- A single text input: "Choose a display name" with placeholder "e.g. Moti"
- For Google/Apple sign-in: the input is pre-filled with the provider's display name (trimmed to 30 chars if needed), but the user may edit it freely
- For email sign-up: the input is blank
- A "Continue" primary button (Sage teal, full width)
- No "Skip" or "Back" option — username is mandatory

**Given** the user taps "Continue"
**When** validation passes (2–30 characters, not blank after trim)
**Then**:
- `firestoreUsers.setUsername(uid, username)` is called
- `authStore.currentUser` is updated with the new `username` value
- User is navigated to `(tabs)/index`

**Given** the user taps "Continue" with an invalid input
**Then**:
- If empty or < 2 chars: inline error "Display name must be at least 2 characters"
- If > 30 chars: inline error "Display name must be 30 characters or fewer"
- No modal alerts — errors appear below the input field in red

### AC4 — Auth gate username check

**Given** the auth gate in `src/app/_layout.tsx`
**When** `authStatus === AUTHENTICATED`
**Then** the gate checks `authStore.currentUser.username`:
- If `username` is set → navigate to `(tabs)/index` (normal flow)
- If `username` is not set → navigate to `auth/username-setup`

**Implementation note:** On app start, after `onAuthStateChanged` fires with a user, `useAuthState.ts` must fetch the Firestore user profile (`firestoreUsers.getUserProfile(uid)`) and merge `username` into `authStore.currentUser` before the gate resolves.

### AC5 — Account section in More screen

**Given** the user is on the More tab
**When** they look at the ACCOUNT card
**Then**:
- Avatar shows the first character of `username` (uppercased), not `displayName` or email
- Below the avatar: `username` displayed in bold (primary text)
- Below username: `email` in secondary text (unchanged)
- A **"Edit Profile"** tappable chevron row appears below the account info row

**Given** the user taps "Edit Profile"
**When** `src/app/settings/edit-profile.tsx` opens
**Then**:
- A single editable field: "Display name" pre-filled with current `username`
- A "Save" button (primary, full width)
- Validation same as AC3 (2–30 chars)
- On save: calls `firestoreUsers.setUsername(uid, newUsername)`, updates `authStore.currentUser.username`, navigates back with a toast "Profile updated"
- On invalid: same inline error pattern as AC3

---

## Part 2: Notifications Toggle

### Background

The app already schedules local credit expiry reminders via `src/lib/notifications.ts` (Story 5.1). This feature adds a master on/off switch. When the toggle is off, no new reminders are scheduled when adding/editing credits, and all existing scheduled reminders are cancelled. When turned back on, reminders resume for future credits (existing credits do not retroactively get re-scheduled).

The preference is stored locally in `settingsStore` (introduced in Story 9.1). No Firestore sync needed.

### AC6 — `notificationsEnabled` in `settingsStore`

**Given** `src/stores/settingsStore.ts`
**When** the store is updated
**Then** it gains two new fields:
```typescript
{
  notificationsEnabled: boolean;  // default: true
  setNotificationsEnabled: (enabled: boolean) => void;
}
```
- Persisted to AsyncStorage alongside `themeMode` (same `persist` middleware, same storage key `@redeemy/settings`)
- Rename the AsyncStorage key from `@redeemy/theme_mode` to `@redeemy/settings` to accommodate both fields under one key

### AC7 — Notifications row in Settings card

**Given** the More tab → SETTINGS card
**When** it renders
**Then**:
- The "Notifications" row now contains a `Switch` component on the right side (replacing the chevron)
- Switch is ON (teal) when `notificationsEnabled === true`, OFF (gray) when `false`
- Toggling the switch immediately calls `settingsStore.setNotificationsEnabled(newValue)`
- No navigation — the toggle works inline

**Given** the user turns the toggle OFF
**When** the toggle changes
**Then**:
- `notifications.cancelAllReminders()` is called — cancels all currently scheduled local notifications
- A toast appears: "Reminders turned off — you won't be notified before credits expire"

**Given** the user turns the toggle ON
**When** the toggle changes
**Then**:
- A toast appears: "Reminders turned on — you'll be notified before credits expire"
- No retroactive re-scheduling of past credits; only future Add/Edit operations will schedule reminders

### AC8 — `notifications.ts` respects the toggle

**Given** `notificationsEnabled === false`
**When** `notifications.scheduleReminder(credit)` is called (from add-credit or edit flows)
**Then** the function exits early without scheduling anything — `notificationId` is not written to the credit document

**Given** `notificationsEnabled === true`
**When** `notifications.scheduleReminder(credit)` is called
**Then** behavior is unchanged from Story 5.1 (schedules normally)

**Implementation:** `notifications.ts` reads `useSettingsStore.getState().notificationsEnabled` — it does NOT take a parameter for this; it checks the store directly.

### AC9 — `cancelAllReminders()` helper

**Given** `src/lib/notifications.ts`
**When** `cancelAllReminders()` is called
**Then**:
- `Notifications.cancelAllScheduledNotificationsAsync()` is called
- All scheduled local notifications are cleared
- No Firestore writes are made (the `notificationId` field on credit documents becomes stale but harmless — it will be overwritten if the user later edits that credit with notifications re-enabled)

---

## Part 3: Security Row

### AC10 — Security row removed

**Given** the More screen SETTINGS card
**When** it renders
**Then** there is **no** "Security" or "Privacy" row visible. The card contains only:
1. Notifications (with toggle)
2. Appearance (added by Story 9.1)

Do not leave a placeholder or disabled row. Remove the `SettingsRow` for "shield-checkmark-outline" entirely.

---

## Updated More Screen Layout

After this story + Story 9.1, the More screen structure must be:

```
ACCOUNT
├── [Avatar] [Username]
│             [Email]
└── Edit Profile  >

SETTINGS
├── Notifications    [Toggle]
└── Appearance       System  >

[Sign Out]
```

---

## Technical Notes

### New files

| File | Purpose |
|---|---|
| `src/lib/firestoreUsers.ts` | `getUserProfile`, `setUsername` — all `/users/{uid}` reads/writes |
| `src/app/auth/username-setup.tsx` | Mandatory username collection screen post-signup |
| `src/app/settings/edit-profile.tsx` | Editable username screen from More tab |

### Files to modify

| File | Change |
|---|---|
| `src/types/userTypes.ts` | Add `username?: string` to `User` interface |
| `src/stores/authStore.ts` | No shape change; `currentUser` already accepts `User` — `username` field added to type |
| `src/stores/settingsStore.ts` | Add `notificationsEnabled` + `setNotificationsEnabled`; rename AsyncStorage key to `@redeemy/settings` |
| `src/hooks/useAuthState.ts` | After `onAuthStateChanged`, fetch Firestore profile and merge `username` into `currentUser` |
| `src/app/_layout.tsx` | Add username gate: if authenticated but no `username` → redirect to `auth/username-setup` |
| `src/app/(tabs)/more.tsx` | New account layout (username + Edit Profile), Notifications toggle, remove Security row |
| `src/lib/notifications.ts` | `scheduleReminder` checks `notificationsEnabled`; add `cancelAllReminders()` |
| `firebase/firestore.rules` | Add `/users/{uid}` read/write rules per AC2 |

### Username validation rule (consistent everywhere)

```typescript
// Reuse this — do not duplicate inline
export function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) return 'Display name must be at least 2 characters';
  if (trimmed.length > 30) return 'Display name must be 30 characters or fewer';
  return null; // valid
}
```

Place this in `src/lib/validation.ts` alongside existing Zod schemas.

### Anti-patterns

- ❌ Reading/writing `/users/{uid}` anywhere except `src/lib/firestoreUsers.ts`
- ❌ Using Firebase Auth `displayName` as the username — they are independent
- ❌ Allowing the user to skip the username-setup screen
- ❌ Hardcoded hex values — use `useAppTheme()` colors throughout
- ❌ Re-scheduling notifications for all existing credits when the toggle is turned back on

---

## Prerequisites

- Story 1.2 (Firebase SDK integration) ✅
- Story 1.4 (Zustand stores & core types) ✅
- Story 2.1–2.4 (Authentication) ✅
- Story 5.1 (Local notification scheduling) ✅
- **Story 9.1 (Dark Mode)** — must be completed first (provides `useAppTheme()`, `settingsStore`)

## Out of Scope

- Security settings screen (deferred — no implementation)
- Notification granularity controls (per-credit snooze, quiet hours) — covered by Story 5.3
- Profile photo / avatar image upload
- Username uniqueness enforcement across users
