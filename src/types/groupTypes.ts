import type { Timestamp } from 'firebase/firestore';

export enum GroupRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface GroupMember {
  userId: string;
  role: GroupRole;
  joinedAt: Date | Timestamp;
  /** Display name resolved from user profile */
  displayName?: string;
  photoURL?: string;
}

export interface Group {
  id: string;
  groupName: string;
  /** Firebase Auth UID of the user who created the group */
  createdBy: string;
  createdAt: Date | Timestamp;
  /** Populated client-side after loading the members subcollection */
  members?: GroupMember[];
}
