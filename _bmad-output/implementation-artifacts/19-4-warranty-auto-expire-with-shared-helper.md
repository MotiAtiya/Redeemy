# Story 19.4: Warranty auto-expire (with shared autoExpire helper)

**Epic:** 19 — Admin Dashboard V1.5 quick wins
**Story Key:** 19-4-warranty-auto-expire-with-shared-helper
**Author:** Moti
**Date:** 2026-05-04
**Status:** done

---

## User Story

As a Redeemy user,
I want my warranties to automatically move to History when their expiration date passes,
So that the active Warranties tab stays clean and represents only items I'm currently protected on.

---

## Background & Context

This story closes a gap from the deferred-work list. Credits already auto-expire via `subscribeToCredits` in `firestoreCredits.ts`. Warranties do not — `WarrantyStatus.EXPIRED` exists in the enum but the comment marks it as *"reserved for future Firestore-side expiry jobs (not used client-side)."*

This story:
1. Adds the same client-side auto-expire pattern to `subscribeToWarranties`.
2. **Refactors the shared logic into `src/lib/autoExpire.ts`** so credits + warranties (and any future category) share a single, well-tested helper instead of copy-pasted code.
3. Emits a new `warranty_expired` lifecycle event for the admin activity feed.

Per Moti's product-design discussion: documents and occasions are intentionally NOT part of this story. Documents need a **renewal** flow (Story 19.6, planned separately) — they should NOT silently move to history. Occasions are recurring and never expire. Subscriptions are handled in Story 19.5.

---

## Acceptance Criteria

### Shared `autoExpire` helper

**Given** the new `src/lib/autoExpire.ts`
**Then** it exports a generic `autoExpireOverdue<T>` function that:
- Filters items by `activeStatus` and `expirationDate < today`
- For each: calls a caller-supplied `applyExpire(id, { status, expiredAt })` function (the underlying `updateX` with `silent: true`)
- Calls `logEvent(eventType, { itemCategory, itemId })` for each
- Is idempotent — re-running does nothing when items already moved out of `activeStatus`

### Credits — refactor

**Given** the existing inline auto-expire code in `subscribeToCredits` (firestoreCredits.ts)
**When** the refactor lands
**Then** that block is replaced by a single call to `autoExpireOverdue(...)`.

**And** behavior is unchanged:
- `credit_expired` event still fires for credits whose expirationDate is past
- `updateCredit` is called with `silent: true` (so no phantom `item_updated` event)
- Idempotent on re-runs

### Warranties — new auto-expire

**Given** a warranty with `status === 'active'` and `expirationDate < today`
**When** `subscribeToWarranties` snapshot fires
**Then**:
- `updateWarranty(warrantyId, { status: EXPIRED, expiredAt }, { silent: true })` is called
- `logEvent('warranty_expired', { itemCategory: 'warranty', itemId })` is logged

**And** the warranty disappears from the active Warranties tab and appears in History (under the warranties filter), with no UI changes needed (existing filters already handle status).

### Event types updated

**Given** the new event type
**Then**:
- `EventType` union in `src/types/eventTypes.ts` (mobile) includes `'warranty_expired'`.
- `EventType` union in `redeemy-admin/src/lib/events.ts` includes `'warranty_expired'`.

### Admin dashboard

**Given** a `warranty_expired` event arrives in the events collection
**When** Moti views `/activity` in the admin dashboard
**Then**:
- The event renders with the Hourglass icon (matching credit_expired) and the warranty category icon.
- The description reads "אחריות פגה" (he) or "warranty expired" (en).
- The event-type filter group "Status changes" includes `warranty_expired`, so filtering to that group shows it.

### Quality

- [ ] `npx tsc --noEmit` passes (mobile and admin)
- [ ] Mobile app re-runs auto-expire across an existing warranty whose date is past — verifies move to History
- [ ] Admin activity feed shows the new event correctly

---

## Technical Notes

### `src/lib/autoExpire.ts` (mobile)

```typescript
import { logEvent } from './eventLog';
import type { EventType, ItemCategory } from '@/types/eventTypes';

interface ExpirableItem {
  id: string;
  status: string;
  expirationDate?: Date;
}

interface AutoExpireConfig<T extends ExpirableItem> {
  items: T[];
  activeStatus: string;
  expiredStatus: string;
  itemCategory: ItemCategory;
  eventType: EventType;
  applyExpire: (id: string, patch: { status: string; expiredAt: Date }) => Promise<void>;
}

export function autoExpireOverdue<T extends ExpirableItem>(config: AutoExpireConfig<T>): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = config.items.filter(
    (item) =>
      item.status === config.activeStatus &&
      item.expirationDate &&
      new Date(item.expirationDate) < today,
  );
  for (const item of due) {
    const expiredAt = new Date(item.expirationDate!);
    expiredAt.setHours(23, 59, 59, 999);
    void config.applyExpire(item.id, { status: config.expiredStatus, expiredAt });
    void logEvent(config.eventType, { itemCategory: config.itemCategory, itemId: item.id });
  }
}
```

### `firestoreCredits.ts` — refactor

Replace the inline block in `subscribeToCredits`:
```typescript
autoExpireOverdue({
  items: credits,
  activeStatus: CreditStatus.ACTIVE,
  expiredStatus: CreditStatus.EXPIRED,
  itemCategory: 'credit',
  eventType: 'credit_expired',
  applyExpire: (id, patch) =>
    updateCredit(id, patch as Partial<Credit>, { silent: true }),
});
```

### `firestoreWarranties.ts` — new auto-expire in subscribeToWarranties

```typescript
return onSnapshot(q, (snapshot) => {
  const warranties: Warranty[] = snapshot.docs.map(docToWarranty);
  useWarrantiesStore.getState().setWarranties(warranties);
  useWarrantiesStore.getState().setLoading(false);

  autoExpireOverdue({
    items: warranties,
    activeStatus: WarrantyStatus.ACTIVE,
    expiredStatus: WarrantyStatus.EXPIRED,
    itemCategory: 'warranty',
    eventType: 'warranty_expired',
    applyExpire: (id, patch) =>
      updateWarranty(id, patch as Partial<Warranty>, { silent: true }),
  });
}, ...);
```

### Admin updates

- `redeemy-admin/src/lib/events.ts` EventType union: add `'warranty_expired'`.
- `redeemy-admin/src/app/(app)/activity/ActivityList.tsx`:
  - Add `warranty_expired: Hourglass` to EVENT_ICON map (or pick a different icon if preferred).
  - Add `warranty_expired` to the describeEvent simple-cases switch.
- `redeemy-admin/src/app/(app)/activity/ActivityFilters.tsx`:
  - Add `'warranty_expired'` to `TYPE_GROUPS.status`.
- `redeemy-admin/messages/he.json` + `en.json` activity.events.warranty_expired:
  - he: "אחריות פגה תוקף"
  - en: "warranty expired"

---

## Dependencies / Sequencing

- No Firestore rule changes.
- No new env vars.
- No new Firestore indexes.
- Minor refactor to existing `subscribeToCredits` — behavior unchanged.

---

## Done Definition

- [ ] All AC pass
- [ ] Both repos commit + push
- [ ] BMAD docs: this story → done; epics.md updated; deferred-work.md note about warranty resolved
