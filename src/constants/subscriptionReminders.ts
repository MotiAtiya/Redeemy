export interface SubscriptionReminderPreset {
  days: number;
  labelKey: string;
}

/**
 * Reminder presets for subscriptions — different from credit reminders (1, 7, 30, 90).
 * Subscription reminders are earlier since billing dates are known in advance.
 */
export const SUBSCRIPTION_REMINDER_PRESETS: SubscriptionReminderPreset[] = [
  { days: 0,  labelKey: 'notificationSettings.none'        },
  { days: 3,  labelKey: 'addSubscription.reminder.3days'  },
  { days: 7,  labelKey: 'addSubscription.reminder.1week'  },
  { days: 14, labelKey: 'addSubscription.reminder.2weeks' },
  { days: 30, labelKey: 'addSubscription.reminder.1month' },
];
