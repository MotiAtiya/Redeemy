# Redeemy — Claude Instructions

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
toggleLabel:     { flex: 1, textAlign: isRTL ? 'right' : 'left' },
dateButtonText:  { flex: 1, textAlign: isRTL ? 'right' : 'left' },
reminderNoteText:{ textAlign: isRTL ? 'right' : 'left' },
summaryLabel:    { width: 90, textAlign: isRTL ? 'right' : 'left' },
```

### Rule 3 — Row direction for icon+text pairs

Use `flexDirection: isRTL ? 'row-reverse' : 'row'` so that icon and text swap sides correctly (icon stays visually at the start of the text in RTL).

```javascript
dateButton: { flexDirection: isRTL ? 'row-reverse' : 'row' },
summaryRow: { flexDirection: isRTL ? 'row-reverse' : 'row' },
```

### Rule 4 — Already-working patterns (do not change)

- `alignSelf: 'flex-start'` on `stepTitle` / `stepSub` — works correctly; `flex-start` = right in RTL column containers.
- `flexDirection: 'row'` without conditional — automatically RTL when `I18nManager.isRTL = true` (no override needed unless a parent has `direction: 'ltr'`).
- `textAlign: 'center'` — direction-neutral, always fine.

### Pattern used in the rest of the app

`subscription/[id].tsx` uses `alignSelf: 'flex-start'` on `detailLabel` and `detailValue` — this is the canonical RTL pattern for the app.

---

## Tech Stack

- React Native + Expo Router
- Firebase Firestore (optimistic updates + onSnapshot)
- Zustand stores (`useSubscriptionsStore`, `useSettingsStore`, `useAuthStore`)
- expo-notifications for local notifications
- react-i18next with `he.json` + `en.json`
- TypeScript strict mode
