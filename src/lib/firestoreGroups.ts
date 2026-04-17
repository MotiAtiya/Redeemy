import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { GroupRole, type Group, type GroupMember } from '@/types/groupTypes';
import { type Credit } from '@/types/creditTypes';

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

function mapDocToCredit(d: { id: string; data: () => Record<string, unknown> }): Credit {
  const data = d.data();
  return {
    ...(data as Omit<Credit, 'id' | 'expirationDate' | 'createdAt' | 'updatedAt'>),
    id: d.id,
    expirationDate: (data.expirationDate as { toDate?: () => Date })?.toDate?.() ?? new Date(data.expirationDate as string),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(data.createdAt as string),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(data.updatedAt as string),
    redeemedAt: (data.redeemedAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? undefined,
  } as Credit;
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 20; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ---------------------------------------------------------------------------
// Group CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new family group and makes the creator the ADMIN.
 * Returns the new groupId.
 *
 * Group doc structure:
 *   /groups/{groupId} = { groupName, createdBy, createdAt, memberIds: [userId] }
 * Member sub-doc:
 *   /groups/{groupId}/members/{userId} = { role, joinedAt, displayName? }
 */
export async function createGroup(
  userId: string,
  groupName: string,
  displayName?: string
): Promise<string> {
  const groupRef = doc(collection(db, 'groups'));
  const groupId = groupRef.id;

  await setDoc(groupRef, {
    groupName: groupName.trim(),
    createdBy: userId,
    createdAt: serverTimestamp(),
    memberIds: [userId], // denormalized for array-contains queries
  });

  await setDoc(doc(db, 'groups', groupId, 'members', userId), {
    role: GroupRole.ADMIN,
    joinedAt: serverTimestamp(),
    ...(displayName ? { displayName } : {}),
  });

  return groupId;
}

/**
 * Loads a group document along with its full members subcollection.
 */
export async function getGroupWithMembers(groupId: string): Promise<Group | null> {
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  if (!groupSnap.exists()) return null;

  const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
  const members: GroupMember[] = membersSnap.docs.map((d) => {
    const data = d.data() as Omit<GroupMember, 'userId'>;
    return { userId: d.id, ...data };
  });

  return {
    id: groupId,
    ...(groupSnap.data() as Omit<Group, 'id' | 'members'>),
    members,
  };
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId));
}

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/**
 * Adds a member to an existing group.
 * Updates both the members subcollection and the denormalized `memberIds` array.
 */
export async function addMember(
  groupId: string,
  userId: string,
  role: GroupRole = GroupRole.MEMBER,
  displayName?: string
): Promise<void> {
  await setDoc(doc(db, 'groups', groupId, 'members', userId), {
    role,
    joinedAt: serverTimestamp(),
    ...(displayName ? { displayName } : {}),
  });
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayUnion(userId),
  });
}

/**
 * Removes a member from a group (admin action).
 */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayRemove(userId),
  });
}

// ---------------------------------------------------------------------------
// Real-time subscription — user's groups
// ---------------------------------------------------------------------------

/**
 * Subscribes to all groups the current user belongs to.
 * Uses the denormalized `memberIds` array for an efficient array-contains query.
 * Loads member sub-docs for each group and fires onChange with the full list.
 */
export function subscribeToUserGroups(
  userId: string,
  onChange: (groups: Group[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('memberIds', 'array-contains', userId)
  );

  return onSnapshot(q, async (snapshot) => {
    const groups: Group[] = await Promise.all(
      snapshot.docs.map(async (d) => {
        const membersSnap = await getDocs(collection(db, 'groups', d.id, 'members'));
        const members: GroupMember[] = membersSnap.docs.map((m) => ({
          userId: m.id,
          ...(m.data() as Omit<GroupMember, 'userId'>),
        }));
        return { id: d.id, ...(d.data() as Omit<Group, 'id' | 'members'>), members };
      })
    );
    onChange(groups);
  });
}

// ---------------------------------------------------------------------------
// Real-time subscription — group credits
// ---------------------------------------------------------------------------

/**
 * Subscribes to all credits that belong to a specific group.
 * Used by useGroupListener to merge other members' credits into creditsStore.
 */
export function subscribeToGroupCredits(
  groupId: string,
  onChange: (credits: Credit[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'credits'),
    where('groupId', '==', groupId)
  );

  return onSnapshot(q, (snapshot) => {
    const credits = snapshot.docs.map((d) =>
      mapDocToCredit({ id: d.id, data: d.data.bind(d) })
    );
    onChange(credits);
  });
}

// ---------------------------------------------------------------------------
// Invite tokens
// ---------------------------------------------------------------------------

/**
 * Creates a 20-character invite token valid for 7 days.
 * Stored at /groups/{groupId}/invites/{token}.
 * Returns the token string and the full deep-link URL.
 */
export async function createInviteToken(
  groupId: string,
  createdBy: string
): Promise<{ token: string; link: string }> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await setDoc(doc(db, 'groups', groupId, 'invites', token), {
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt,
  });

  return {
    token,
    link: `redeemy://group/join/${groupId}?token=${token}`,
  };
}

/**
 * Validates an invite token and adds the user to the group as a MEMBER.
 * Returns true on success, false if token is invalid or expired.
 */
export async function redeemInviteToken(
  groupId: string,
  token: string,
  userId: string,
  displayName?: string
): Promise<boolean> {
  const inviteSnap = await getDoc(doc(db, 'groups', groupId, 'invites', token));
  if (!inviteSnap.exists()) return false;

  const data = inviteSnap.data() as { expiresAt: { toDate: () => Date } };
  const expiresAt = data.expiresAt?.toDate?.();
  if (!expiresAt || expiresAt < new Date()) return false;

  // Check if already a member
  const memberSnap = await getDoc(doc(db, 'groups', groupId, 'members', userId));
  if (!memberSnap.exists()) {
    await addMember(groupId, userId, GroupRole.MEMBER, displayName);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Credit transfer (Story 7.3)
// ---------------------------------------------------------------------------

/**
 * Transfers a credit to a new owner by updating its `userId` field.
 * Security Rules enforce that only the current owner can call this.
 */
export async function transferCredit(
  creditId: string,
  toUserId: string
): Promise<void> {
  await updateDoc(doc(db, 'credits', creditId), {
    userId: toUserId,
    updatedAt: serverTimestamp(),
  });
}
