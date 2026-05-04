import { logEvent } from './eventLog';
import type { EventType, ItemCategory } from '@/types/eventTypes';

interface ExpirableItem {
  id: string;
  status: string;
  expirationDate?: Date;
}

interface AutoExpireConfig<T extends ExpirableItem> {
  /** The current snapshot of items in this category. */
  items: T[];
  /** Status string an item must currently be in for auto-expire to apply. */
  activeStatus: string;
  /** Status string to write when an item is expired. */
  expiredStatus: string;
  /** Item category for the lifecycle event payload. */
  itemCategory: ItemCategory;
  /** Lifecycle event type to log when expiring (e.g. 'credit_expired'). */
  eventType: EventType;
  /**
   * Caller-supplied write function that applies the expired status to the
   * underlying Firestore document. Implementations should use the silent
   * option so this auto-tick doesn't masquerade as a user-driven update.
   */
  applyExpire: (id: string, patch: { status: string; expiredAt: Date }) => Promise<void>;
}

/**
 * Walks the current snapshot and auto-expires items whose `expirationDate`
 * is in the past while still in `activeStatus`. Idempotent — items already
 * moved out of `activeStatus` are skipped on re-runs.
 *
 * Designed to be called from `onSnapshot` listeners (firestoreCredits,
 * firestoreWarranties, …) so expiration is enforced exactly once per snapshot,
 * with the latest data, and lifecycle events go straight into the events feed.
 */
export function autoExpireOverdue<T extends ExpirableItem>(
  config: AutoExpireConfig<T>,
): void {
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
