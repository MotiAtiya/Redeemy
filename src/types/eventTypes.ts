// Lightweight event-log types shared between the mobile app and the admin
// dashboard. The mobile app writes to the `events/` Firestore collection via
// fire-and-forget `logEvent()` (src/lib/eventLog.ts). The admin dashboard
// reads these events server-side via the Firebase Admin SDK.
//
// See: _bmad-output/implementation-artifacts/18-2-admin-dashboard-user-list-and-activity-feed.md

export type EventType =
  // Auth (success path; auth_failed deferred to Story 18.3)
  | 'sign_in'
  | 'sign_up'
  | 'sign_out'
  // Item lifecycle
  | 'item_created'
  | 'item_updated'
  | 'item_deleted'
  // Item status changes (semantic, more useful than generic item_updated)
  | 'credit_redeemed'
  | 'credit_unredeemed'
  | 'credit_expired'
  | 'subscription_cancelled'
  | 'subscription_renewed'
  | 'subscription_expired'
  | 'warranty_closed'
  | 'warranty_expired'
  // Family
  | 'family_created'
  | 'family_joined'
  | 'family_left'
  // Failures (powering the admin Health Banner — Story 18.3)
  | 'firestore_write_failed'
  | 'image_upload_failed'
  // Lifecycle
  | 'app_opened';

export type ItemCategory =
  | 'credit'
  | 'warranty'
  | 'subscription'
  | 'occasion'
  | 'document';

export interface EventMetadata {
  itemCategory?: ItemCategory;
  itemId?: string;
  metadata?: Record<string, string | number | boolean>;
}
