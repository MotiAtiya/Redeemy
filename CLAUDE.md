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
dateButtonText:  { flex: 1, textAlign: isRTL ? 'right' : 'left' },
reminderNoteText:{ textAlign: isRTL ? 'right' : 'left' },
summaryLabel:    { width: 90, textAlign: isRTL ? 'right' : 'left' },
```

### Rule 5 — Toggle row labels (label + Switch side by side)

**Do NOT put `flex: 1` directly on the `<Text>` label.** Even with `textAlign: 'right'`, a `flex: 1` Text in an RTL row does not reliably right-align its content. Instead, wrap the label in a `<View style={{ flex: 1 }}>` and use `alignSelf: 'flex-start'` on the Text itself (Rule 1). This is the proven pattern used in `notification-settings.tsx`.

```jsx
// ✅ Correct
<View style={styles.toggleRow}>
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' }}>
      {label}
    </Text>
  </View>
  <Switch ... />
</View>

// ❌ Wrong — text appears left-aligned in RTL despite textAlign: 'right'
<View style={styles.toggleRow}>
  <Text style={{ flex: 1, textAlign: 'right' }}>{label}</Text>
  <Switch ... />
</View>
```

### Rule 3 — Row direction for icon+text pairs

Use `flexDirection: isRTL ? 'row-reverse' : 'row'` so that icon and text swap sides correctly (icon stays visually at the start of the text in RTL).

```javascript
dateButton: { flexDirection: isRTL ? 'row-reverse' : 'row' },
summaryRow: { flexDirection: isRTL ? 'row-reverse' : 'row' },
```

### Rule 4 — Already-working patterns (do not change)

- `flexDirection: 'row'` without conditional — automatically RTL when `I18nManager.isRTL = true` (no override needed unless a parent has `direction: 'ltr'`).
- `textAlign: 'center'` — direction-neutral, always fine.

### Rule 6 — Multi-line text alignment in RTL

React Native with `I18nManager.forceRTL(true)` treats `textAlign` **logically** (not physically):
- `textAlign: 'left'` in RTL → visual **RIGHT** ✓ (logical start in RTL)
- `textAlign: 'right'` in RTL → visual **LEFT** ❌ (logical end in RTL)

This is counterintuitive but confirmed by testing.

**Single-line free-standing text**: use `alignSelf: 'flex-start'` (Rule 1). No `textAlign` needed — the element is positioned at the right edge with its natural width.

**Multi-line wrapping text** (title/subtitle that wraps to 2+ lines): the element fills its container width, so `alignSelf` alone is not enough. Use `textAlign: 'left'` to get visual-right alignment in RTL.

```jsx
// shared style for step titles (works for single-line)
stepTitle: { fontSize: 26, fontWeight: '700', alignSelf: 'flex-start' },

// override for a specific title that wraps to 2 lines
<Text style={[styles.stepTitle, { textAlign: 'left' }]}>…</Text>

// for stepSub that wraps:
<Text style={[styles.stepSub, { textAlign: 'left' }]}>…</Text>
```

**Never use `textAlign: 'right'`** for right-alignment in this RTL app — it produces visual-left.

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
