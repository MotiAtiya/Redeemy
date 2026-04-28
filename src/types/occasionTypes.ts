import type { Timestamp } from 'firebase/firestore';

export type OccasionType = 'birthday' | 'anniversary' | 'yahrzeit' | 'other';

export interface Occasion {
  id: string;
  userId: string;
  familyId?: string;
  createdBy?: string;
  createdByName?: string;
  type: OccasionType;
  /** Person or entity name (e.g. "אמא", "אמא ואבא") */
  name: string;
  /** Custom event label for type === 'other' (e.g. "יום העלייה לארץ") */
  customLabel?: string;
  /** Full Gregorian date of the original event */
  eventDate: Date | Timestamp;
  /** Whether the event occurred after sunset (shifts Hebrew date by +1) */
  afterSunset: boolean;
  /** Whether to remind on the Hebrew calendar anniversary each year */
  useHebrewDate: boolean;
  /** Pre-computed Hebrew date display string (e.g. "14 בניסן 5784") */
  hebrewDateStr?: string;
  /** Hebrew day component (1-30), stored for annual recalculation */
  hebrewDay?: number;
  /** Hebrew month component (1-13), stored for annual recalculation */
  hebrewMonth?: number;
  /** Optional clarifier to distinguish people with the same name (e.g. "של מרגלית") */
  nameNote?: string;
  /** Free-text notes */
  notes?: string;
  /** expo-notifications IDs — scheduled for next N years */
  notificationIds?: string[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}
