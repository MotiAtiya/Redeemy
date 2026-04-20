import type { Timestamp } from 'firebase/firestore';

export enum FamilyRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

/** Raw Firestore member data stored in the members map */
export interface FamilyMemberData {
  displayName: string;
  photoURL?: string;
  joinedAt: Timestamp | Date;
}

/** App-side representation of a family member (Timestamps converted to Date) */
export interface FamilyMember {
  userId: string;
  displayName: string;
  photoURL?: string;
  joinedAt: Date;
  role: FamilyRole; // derived: adminId === userId ? ADMIN : MEMBER
}

/** App-side representation of a family document */
export interface Family {
  id: string;
  name: string;
  adminId: string;
  maxMembers: number;
  inviteCode: string;
  inviteCodeExpiresAt: Date; // converted from Timestamp on read
  members: Record<string, FamilyMemberData>;
  memberList: FamilyMember[]; // derived sorted list (admin first)
  createdAt: Date;
  updatedAt: Date;
}
