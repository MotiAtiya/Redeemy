export interface ReminderPreset {
  /** Days before expiration to fire the notification */
  days: number;
  label: string;
}

/** 4 preset reminder options shown as chips in the Add Credit form */
export const REMINDER_PRESETS: ReminderPreset[] = [
  { days: 0,  label: 'None'     },
  { days: 1,  label: '1 Day'    },
  { days: 7,  label: '1 Week'   },
  { days: 30, label: '1 Month'  },
  { days: 90, label: '3 Months' },
];

/** Default reminder applied automatically when an expiration date is set */
export const DEFAULT_REMINDER_DAYS = 7;
