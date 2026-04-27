# Story 9.1: Dark Mode Support

**Epic:** 9 — Theme & Appearance
**Author:** Mary (Business Analyst)
**Date:** 2026-04-17
**Status:** done

---

## User Story

As a user,
I want the app to respect my device's dark/light mode preference and let me override it in Settings,
So that Redeemy is comfortable to use in any lighting condition without straining my eyes.

---

## Background & Context

The existing Redeemy theme is Sage teal (primary `#5F9E8F`) designed for light mode. All screens currently use hardcoded light-mode colors in `StyleSheet.create()`. This story introduces a full dark palette derived from the same Sage teal hue, a `settingsStore` for persisting the user's preference locally, and wires every screen to consume a dynamic color token hook instead of hardcoded values.

The More screen (`src/app/(tabs)/more.tsx`) will expose the theme selector to the user. No Firestore sync — preference is device-local only.

---

## Acceptance Criteria

### AC1 — Dark palette defined

**Given** the project color system
**When** dark mode is active
**Then** the following token mapping is used everywhere in the app (no exceptions):

| Token name | Light value | Dark value |
|---|---|---|
| `background` | `#F0FDFA` | `#0D1F1E` |
| `surface` | `#FFFFFF` | `#172928` |
| `surfaceElevated` | `#FFFFFF` | `#1E3432` |
| `textPrimary` | `#0F172A` | `#F0FDFA` |
| `textSecondary` | `#757575` | `#94A3B8` |
| `textTertiary` | `#9E9E9E` | `#64748B` |
| `separator` | `#F5F5F5` | `#243432` |
| `primary` | `#5F9E8F` | `#6FAEA4` |
| `primarySurface` | `#CCFBF1` | `#1A3A38` |
| `iconInactive` | `#9E9E9E` | `#64748B` |
| `iconActive` | `#5F9E8F` | `#6FAEA4` |
| `danger` | `#D32F2F` | `#EF5350` |
| `urgencyRed` | `#B91C1C` | `#EF5350` |
| `urgencyAmber` | `#B45309` | `#F59E0B` |
| `urgencyGreen` | `#166534` | `#4ADE80` |
| `urgencyRedSurface` | `#FEE2E2` | `#3B1212` |
| `urgencyAmberSurface` | `#FEF3C7` | `#3B2A0A` |
| `urgencyGreenSurface` | `#DCFCE7` | `#0D2B1A` |

All WCAG AA contrast ratios must be maintained in dark mode:
- `textPrimary` on `background`: ≥ 4.5:1
- `primary` on `surface`: ≥ 3:1

### AC2 — Settings store created

**Given** the app initializes
**When** `settingsStore` is loaded
**Then**:
- `src/stores/settingsStore.ts` exports `useSettingsStore` with shape:
  ```typescript
  {
    themeMode: 'light' | 'dark' | 'system';
    setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  }
  ```
- On first launch `themeMode` defaults to `'system'`
- `themeMode` is persisted to AsyncStorage under key `@redeemy/theme_mode` via Zustand `persist` middleware
- Store is rehydrated before any screen renders (handled in root `_layout.tsx`)

### AC3 — `useAppTheme()` hook

**Given** any screen or component in the app
**When** it calls `useAppTheme()`
**Then**:
- Hook lives at `src/hooks/useAppTheme.ts`
- Reads `settingsStore.themeMode` and `useColorScheme()` from React Native
- Returns the correct `AppColors` object based on resolved theme:
  - `'system'` → uses `useColorScheme()` result
  - `'light'` → always returns light tokens
  - `'dark'` → always returns dark tokens
- Return type is `AppColors` (exported from `src/constants/colors.ts`)

### AC4 — Color constants file

**Given** the token table in AC1
**When** the app compiles
**Then**:
- `src/constants/colors.ts` exports:
  - `lightColors: AppColors`
  - `darkColors: AppColors`
  - `AppColors` interface with all token names typed as `string`
- `SAGE_TEAL` stays in `src/components/ui/theme.ts` for backward compatibility only; no new code may import it — new code uses `useAppTheme().primary` instead

### AC5 — Gluestack UI color mode

**Given** the root `GluestackUIProvider` in `src/components/ui/GluestackProvider.tsx`
**When** the resolved theme changes
**Then** the `colorMode` prop on `GluestackUIProvider` is set to `'light'` or `'dark'` based on the resolved theme, so Gluestack UI components adapt automatically.

### AC6 — All existing screens updated

**Given** dark mode is active
**When** any of the following screens is open
**Then** it renders correctly with dark tokens (zero hardcoded light-mode hex values remain):

- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/stores.tsx`
- `src/app/(tabs)/history.tsx`
- `src/app/(tabs)/more.tsx`
- `src/app/credit/[id].tsx`
- `src/app/add-credit.tsx`
- `src/app/auth/sign-in.tsx`
- `src/app/auth/sign-up.tsx`
- `src/components/redeemy/CreditCard.tsx`
- `src/components/redeemy/ExpirationBadge.tsx`
- `src/components/redeemy/StoreAutocomplete.tsx`
- `src/components/redeemy/CategoryChipSelector.tsx`

**Rule:** Every screen/component calls `const colors = useAppTheme()` and references `colors.*` tokens. `StyleSheet.create()` must be called inside the component function (not at module scope) to access the dynamic colors object.

### AC7 — Theme selector in Settings

**Given** the user opens the More tab → Settings section
**When** they tap the new "Appearance" row
**Then**:
- A bottom sheet opens with three radio-style rows:
  - ☀️ **Light** — Always use light mode
  - 🌙 **Dark** — Always use dark mode
  - 📱 **System** — Follow device setting *(default)*
- Tapping a row calls `settingsStore.setThemeMode(...)`, the sheet closes, and the entire app immediately re-renders in the selected theme
- The active selection is indicated by a teal checkmark (Ionicons `checkmark`)
- The "Appearance" row in the Settings card shows the current mode as a subtitle (e.g., "System")

### AC8 — Reacts to system theme changes in real time

**Given** `themeMode === 'system'`
**When** the user changes their device theme while Redeemy is backgrounded and returns to the app
**Then** the app has updated to the new system theme without a manual reload.

### AC9 — Tab bar adapts to dark mode

**Given** dark mode is active
**When** the bottom tab bar renders
**Then**:
- Background: `colors.surface`
- Active icon + label: `colors.primary`
- Inactive icon + label: `colors.iconInactive`
- iOS status bar style: `'light-content'` in dark, `'dark-content'` in light (via `expo-status-bar`)

---

## Technical Notes

### New files

| File | Purpose |
|---|---|
| `src/constants/colors.ts` | `lightColors`, `darkColors`, `AppColors` interface |
| `src/hooks/useAppTheme.ts` | Resolves themeMode → returns `AppColors` |
| `src/stores/settingsStore.ts` | Zustand store with `themeMode`, persisted to AsyncStorage |

### Key files to modify

| File | Change |
|---|---|
| `src/components/ui/GluestackProvider.tsx` | Wire `colorMode` prop |
| `src/app/_layout.tsx` | Await `settingsStore` rehydration before rendering |
| `src/app/(tabs)/more.tsx` | Add "Appearance" row + bottom sheet |
| All screens in AC6 | Replace hardcoded hex with `useAppTheme()` tokens |

### Zustand persist pattern

```typescript
// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
    }),
    {
      name: '@redeemy/theme_mode',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### useAppTheme hook

```typescript
// src/hooks/useAppTheme.ts
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { lightColors, darkColors } from '@/constants/colors';

export function useAppTheme() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const resolved = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  return resolved === 'dark' ? darkColors : lightColors;
}
```

### Preventing flash of wrong theme on startup

- Zustand `persist` rehydrates asynchronously on first render
- In `_layout.tsx`, use `useSettingsStore.persist.hasHydrated()` to gate rendering
- Show a transparent/blank splash while rehydrating to prevent a flash of light mode before the saved dark preference loads

### Anti-patterns

- ❌ Hardcoded hex values in any `.tsx` file
- ❌ Calling `useColorScheme()` directly in screens — only `useAppTheme()` is allowed
- ❌ `StyleSheet.create()` at module scope for dynamic color styles
- ❌ Importing `SAGE_TEAL` from `theme.ts` in new code

---

## Prerequisites

- Story 1.3 (Gluestack UI theme & navigation shell) ✅
- Story 1.4 (Zustand stores & core types) ✅
- `@react-native-async-storage/async-storage` already installed (Story 1.2) ✅

## Out of Scope

- Per-user theme sync to Firestore
- High-contrast or custom color themes
- Security settings screen (deferred per user decision)
