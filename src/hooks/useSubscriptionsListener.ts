import { useEffect } from 'react';
import { subscribeToSubscriptions, updateSubscription } from '@/lib/firestoreSubscriptions';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { SubscriptionStatus, type Subscription } from '@/types/subscriptionTypes';
import { advanceBillingCycle, endFreeTrialIfDue } from '@/lib/subscriptionUtils';
import {
  scheduleSubscriptionNotifications,
  cancelSubscriptionNotifications,
} from '@/lib/subscriptionNotifications';

// Track which subscriptions we already processed this app session so we don't
// re-enter the advance path while Firestore propagates our write.
const processedThisSession = new Set<string>();

async function maybeAdvance(sub: Subscription): Promise<void> {
  if (sub.status !== SubscriptionStatus.ACTIVE) return;
  if (processedThisSession.has(sub.id)) return;

  const trialPatch = endFreeTrialIfDue(sub);
  const cyclePatch = trialPatch ? null : advanceBillingCycle(sub);
  const patch = trialPatch ?? cyclePatch;
  if (!patch) return;

  processedThisSession.add(sub.id);
  try {
    await cancelSubscriptionNotifications(sub);
    const merged: Subscription = { ...sub, ...patch };
    const scheduled = await scheduleSubscriptionNotifications(merged);
    await updateSubscription(sub.id, {
      ...patch,
      notificationIds: scheduled.notificationIds,
      renewalNotificationId: scheduled.renewalNotificationId,
    });
  } catch {
    // Best-effort: let next snapshot retry.
    processedThisSession.delete(sub.id);
  }
}

/**
 * Sets up an onSnapshot listener for subscriptions.
 * Also runs an auto-advance check: when a subscription's nextBillingDate has passed
 * (or its free trial has ended), we advance the billing cycle and re-schedule
 * notifications. Tears down and re-subscribes when userId or familyId changes.
 */
export function useSubscriptionsListener(
  userId: string | null,
  familyId: string | null | undefined
): void {
  const setLoading = useSubscriptionsStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    processedThisSession.clear();
    const unsubscribe = subscribeToSubscriptions(userId, familyId);

    // Run the auto-advance check whenever the store updates.
    const storeUnsub = useSubscriptionsStore.subscribe((state, prev) => {
      if (state.subscriptions === prev.subscriptions) return;
      for (const sub of state.subscriptions) {
        void maybeAdvance(sub);
      }
    });

    return () => {
      unsubscribe();
      storeUnsub();
    };
  }, [userId, familyId, setLoading]);
}
