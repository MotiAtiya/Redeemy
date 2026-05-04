import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  confirmSubscriptionRenewal,
  declineSubscriptionRenewal,
} from '@/lib/firestoreSubscriptions';
import { advanceBillingCycle } from '@/lib/subscriptionUtils';
import {
  cancelSubscriptionNotifications,
  scheduleSubscriptionNotifications,
} from '@/lib/subscriptionNotifications';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Subscription } from '@/types/subscriptionTypes';
import { SubscriptionStatus } from '@/types/subscriptionTypes';

interface Props {
  subscription: Subscription;
  /** Optional callback after a successful action — caller can navigate back, refresh, etc. */
  onResolved?: () => void;
}

/**
 * Renders a prompt asking the user "Did you renew this subscription?" with
 * two CTAs: confirm renewal (advance billing cycle) or decline (mark expired).
 *
 * Visible only when the subscription is annual + manual-renewal + active +
 * past nextBillingDate. The parent screen decides when to mount this.
 */
export function SubscriptionRenewalPrompt({ subscription, onResolved }: Props) {
  const { t } = useTranslation();
  const colors = useAppTheme();
  const updateSubInStore = useSubscriptionsStore((s) => s.updateSubscription);
  const [busy, setBusy] = useState<'confirm' | 'decline' | null>(null);

  async function handleConfirm() {
    // For ANNUAL: advanceBillingCycle returns a patch with the new nextBillingDate.
    // For MONTHLY: advanceBillingCycle returns a notification-reset patch (or null
    // if the billing day hasn't passed yet — but if the prompt is showing, it has).
    // Either way, we always also stamp lastRenewalConfirmedAt so the helper
    // knows the user confirmed for this cycle.
    const advancePatch = advanceBillingCycle(subscription) ?? {};
    setBusy('confirm');
    try {
      await cancelSubscriptionNotifications(subscription);
      const merged: Subscription = { ...subscription, ...advancePatch };
      const scheduled = await scheduleSubscriptionNotifications(merged);
      const fullPatch = {
        ...advancePatch,
        notificationIds: scheduled.notificationIds,
        renewalNotificationId: scheduled.renewalNotificationId,
        lastRenewalConfirmedAt: new Date(),
      };
      updateSubInStore(subscription.id, fullPatch);
      await confirmSubscriptionRenewal(subscription.id, fullPatch);
      onResolved?.();
    } catch (err) {
      // Roll back optimistic store update by writing the original back
      updateSubInStore(subscription.id, subscription);
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert(t('subscription.renewalPrompt.errorTitle'), message);
    } finally {
      setBusy(null);
    }
  }

  function handleDecline() {
    Alert.alert(
      t('subscription.renewalPrompt.confirmDeclineTitle'),
      t('subscription.renewalPrompt.confirmDeclineMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('subscription.renewalPrompt.declineConfirm'),
          style: 'destructive',
          onPress: async () => {
            setBusy('decline');
            try {
              await cancelSubscriptionNotifications(subscription);
              updateSubInStore(subscription.id, {
                status: SubscriptionStatus.EXPIRED,
                expiredAt: new Date(),
              });
              await declineSubscriptionRenewal(subscription.id);
              onResolved?.();
            } catch (err) {
              updateSubInStore(subscription.id, subscription);
              const message = err instanceof Error ? err.message : String(err);
              Alert.alert(t('subscription.renewalPrompt.errorTitle'), message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.urgencyAmberSurface }]}>
      <View style={styles.headerRow}>
        <Ionicons name="alert-circle" size={20} color={colors.urgencyAmber} />
        <Text style={[styles.title, { color: colors.urgencyAmber }]}>
          {t('subscription.renewalPrompt.title')}
        </Text>
      </View>
      <Text style={[styles.body, { color: colors.textPrimary }]}>
        {t('subscription.renewalPrompt.body')}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}
          disabled={busy !== null}
          accessibilityRole="button"
        >
          {busy === 'confirm' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonPrimaryText}>{t('subscription.renewalPrompt.confirm')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, { borderColor: colors.urgencyAmber }]}
          onPress={handleDecline}
          disabled={busy !== null}
          accessibilityRole="button"
        >
          {busy === 'decline' ? (
            <ActivityIndicator color={colors.urgencyAmber} size="small" />
          ) : (
            <Text style={[styles.buttonSecondaryText, { color: colors.urgencyAmber }]}>
              {t('subscription.renewalPrompt.decline')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: '700', alignSelf: 'flex-start' },
  body: { fontSize: 14, lineHeight: 20, alignSelf: 'flex-start' },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonPrimary: {},
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonSecondaryText: { fontSize: 15, fontWeight: '600' },
});
