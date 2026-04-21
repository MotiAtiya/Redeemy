import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionIntent } from '@/types/subscriptionTypes';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface IntentOption {
  intent: SubscriptionIntent;
  labelKey: string;
  descriptionKey: string;
  icon: IoniconsName;
}

export const SUBSCRIPTION_INTENTS: IntentOption[] = [
  {
    intent: SubscriptionIntent.RENEW,
    labelKey: 'subscriptions.intent.renew',
    descriptionKey: 'subscriptions.intent.renewDesc',
    icon: 'refresh-outline',
  },
  {
    intent: SubscriptionIntent.CANCEL,
    labelKey: 'subscriptions.intent.cancel',
    descriptionKey: 'subscriptions.intent.cancelDesc',
    icon: 'close-circle-outline',
  },
  {
    intent: SubscriptionIntent.MODIFY,
    labelKey: 'subscriptions.intent.modify',
    descriptionKey: 'subscriptions.intent.modifyDesc',
    icon: 'create-outline',
  },
  {
    intent: SubscriptionIntent.CHECK,
    labelKey: 'subscriptions.intent.check',
    descriptionKey: 'subscriptions.intent.checkDesc',
    icon: 'eye-outline',
  },
];
