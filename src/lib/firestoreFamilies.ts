import {
  collection,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  query,
  where,
  getDocs,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { FamilyRole, type Family, type FamilyMember } from '@/types/familyTypes';
import { useFamilyStore } from '@/stores/familyStore';
import type { User } from '@/types/userTypes';

const FAMILIES_COLLECTION = 'families';

const INVITE_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Excludes: 0 (zero), O (letter O), 1 (one), I (letter I) — visually ambiguous

const INVITE_CODE_TTL_MINUTES = 5;

function generateCode(): string {
  return Array.from({ length: 6 }, () =>
    INVITE_CODE_CHARSET[Math.floor(Math.random() * INVITE_CODE_CHARSET.length)]
  ).join('');
}

function mapFirebaseError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return "You don't have permission to access this family.";
  if (code === 'not-found') return 'Family not found.';
  if (code.includes('network') || code === 'unavailable') return 'Check your connection and try again.';
  return 'Check your connection and try again.';
}

/**
 * Creates a new family document in Firestore.
 * Returns the new family ID.
 */
export async function createFamily(name: string, user: User): Promise<string> {
  try {
    const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_MINUTES * 60 * 1000);
    const inviteCode = generateCode();
    const colRef = collection(db, FAMILIES_COLLECTION);

    const memberEntry = {
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Member',
      ...(user.photoURL ? { photoURL: user.photoURL } : {}),
      joinedAt: serverTimestamp(),
    };

    const docRef = await addDoc(colRef, {
      name,
      adminId: user.uid,
      maxMembers: 6,
      inviteCode,
      inviteCodeExpiresAt: Timestamp.fromDate(expiresAt),
      members: { [user.uid]: memberEntry },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Write the auto-generated ID back into the document
    await updateDoc(docRef, { id: docRef.id });

    // Persist familyId on the user document so it can be rehydrated on sign-in
    // if local AsyncStorage was cleared (e.g. after sign-out).
    await setDoc(doc(db, 'users', user.uid), { familyId: docRef.id }, { merge: true });

    return docRef.id;
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

/**
 * Generates a fresh invite code for an existing family.
 * Updates Firestore and returns the new code and expiry.
 */
export async function generateInviteCode(familyId: string): Promise<{ code: string; expiresAt: Date }> {
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_MINUTES * 60 * 1000);
    const docRef = doc(db, FAMILIES_COLLECTION, familyId);

    await updateDoc(docRef, {
      inviteCode: code,
      inviteCodeExpiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: serverTimestamp(),
    });

    return { code, expiresAt };
  } catch (error) {
    throw new Error(mapFirebaseError(error));
  }
}

/**
 * Sets up a real-time onSnapshot listener for a family document.
 * Converts Timestamps to JS Dates and writes to familyStore.
 * Calls onUserRemoved when the current user transitions from member to non-member
 * (kicked by admin or family dissolved) — caller should clear familyId.
 *
 * The kick callback only fires after we've confirmed membership at least once
 * in this listener's lifetime. This avoids a false positive on the very first
 * snapshot — e.g. just after joining, where a transient stale read could
 * otherwise wipe out a valid membership.
 *
 * Returns unsubscribe function — call on cleanup.
 */
export function subscribeToFamily(
  familyId: string,
  currentUid?: string,
  onUserRemoved?: () => void,
): Unsubscribe {
  const docRef = doc(db, FAMILIES_COLLECTION, familyId);
  let seenAsMember = false;
  let backfilledUserDoc = false;

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        useFamilyStore.getState().setFamily(null);
        if (seenAsMember) onUserRemoved?.();
        return;
      }

      const rawData = snapshot.data();
      const isMember = !currentUid || currentUid in (rawData.members ?? {});
      if (!isMember) {
        useFamilyStore.getState().setFamily(null);
        if (seenAsMember) onUserRemoved?.();
        return;
      }
      seenAsMember = true;

      // Self-heal: once we've confirmed membership, persist familyId on the
      // user doc so a future sign-in (with cleared AsyncStorage) can rehydrate
      // it. Best-effort, fire-and-forget — failure must not break the listener.
      if (currentUid && !backfilledUserDoc) {
        backfilledUserDoc = true;
        setDoc(doc(db, 'users', currentUid), { familyId }, { merge: true })
          .catch(() => { backfilledUserDoc = false; });
      }

      const data = rawData;
      const adminId: string = data.adminId;

      const members: Family['members'] = data.members ?? {};
      const memberList: FamilyMember[] = Object.entries(members)
        .map(([userId, memberData]) => ({
          userId,
          displayName: memberData.displayName,
          ...(memberData.photoURL ? { photoURL: memberData.photoURL } : {}),
          joinedAt: memberData.joinedAt instanceof Timestamp
            ? memberData.joinedAt.toDate()
            : new Date(memberData.joinedAt as Date),
          role: userId === adminId ? FamilyRole.ADMIN : FamilyRole.MEMBER,
        }))
        .sort((a, b) => {
          // Admin first
          if (a.role === FamilyRole.ADMIN) return -1;
          if (b.role === FamilyRole.ADMIN) return 1;
          return a.displayName.localeCompare(b.displayName);
        });

      const family: Family = {
        id: snapshot.id,
        name: data.name,
        adminId,
        maxMembers: data.maxMembers ?? 6,
        inviteCode: data.inviteCode,
        inviteCodeExpiresAt: data.inviteCodeExpiresAt instanceof Timestamp
          ? data.inviteCodeExpiresAt.toDate()
          : new Date(data.inviteCodeExpiresAt),
        members,
        memberList,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt),
      };

      useFamilyStore.getState().setFamily(family);
    },
    (_error) => {
      useFamilyStore.getState().setError('Could not load family. Check your connection.');
    }
  );
}

export type JoinFamilyError =
  | 'invalid-code'
  | 'expired-code'
  | 'family-full'
  | 'network-error';

/**
 * Joins a family using an invite code.
 * Uses a Firestore transaction to atomically add the user to the family.
 * Returns the familyId on success.
 * Throws a JoinFamilyError string on validation failure.
 */
export async function joinFamily(
  inviteCode: string,
  user: User
): Promise<string> {
  // Step 1: Find the family with this invite code
  const familiesRef = collection(db, FAMILIES_COLLECTION);
  const q = query(familiesRef, where('inviteCode', '==', inviteCode.toUpperCase()));
  const snapshot = await getDocs(q).catch(() => {
    throw 'network-error' as JoinFamilyError;
  });

  if (snapshot.empty) throw 'invalid-code' as JoinFamilyError;

  const familyDoc = snapshot.docs[0];
  const familyId = familyDoc.id;
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId);

  // Step 2: Atomic transaction
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(familyRef);
    if (!snap.exists()) throw 'invalid-code' as JoinFamilyError;

    const data = snap.data();
    const members: Record<string, unknown> = data.members ?? {};
    const alreadyMember = user.uid in members;

    // Expiry / capacity validation only applies to a fresh join.
    // An already-member who reaches this path is rehydrating after lost local
    // state — they should not be blocked by an expired code or full capacity.
    if (!alreadyMember) {
      const expiresAt: Date = data.inviteCodeExpiresAt instanceof Timestamp
        ? data.inviteCodeExpiresAt.toDate()
        : new Date(data.inviteCodeExpiresAt);
      if (expiresAt < new Date()) throw 'expired-code' as JoinFamilyError;
      if (Object.keys(members).length >= (data.maxMembers ?? 6)) throw 'family-full' as JoinFamilyError;

      const memberEntry = {
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Member',
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        joinedAt: serverTimestamp(),
      };

      transaction.update(familyRef, {
        [`members.${user.uid}`]: memberEntry,
        updatedAt: serverTimestamp(),
      });
    }

    // Persist familyId on the user doc — runs for both fresh joins and
    // already-member rehydration so that sign-in can restore familyId
    // even after local AsyncStorage was cleared.
    transaction.set(doc(db, 'users', user.uid), { familyId }, { merge: true });
  }).catch((err) => {
    // Re-throw JoinFamilyError strings as-is; wrap anything else
    if (typeof err === 'string') throw err;
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'permission-denied') throw 'invalid-code' as JoinFamilyError;
    throw 'network-error' as JoinFamilyError;
  });

  return familyId;
}

/**
 * Removes a user from a family.
 * If the leaving user is admin and others remain, auto-transfers to first member.
 * If no members remain after leaving, the family document is deleted.
 * Note: caller is responsible for migrating credits (migrateCreditsFromFamily).
 */
export async function leaveFamily(familyId: string, userId: string): Promise<void> {
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(familyRef);
    if (!snap.exists()) {
      // Family doc gone but the user doc may still carry a stale pointer — clear it.
      transaction.set(userRef, { familyId: deleteField() }, { merge: true });
      return;
    }

    const data = snap.data();
    const remainingMembers = Object.keys(data.members ?? {}).filter((uid) => uid !== userId);

    if (remainingMembers.length === 0) {
      transaction.delete(familyRef);
    } else {
      const updates: Record<string, unknown> = {
        [`members.${userId}`]: deleteField(),
        updatedAt: serverTimestamp(),
      };
      // If admin is leaving, auto-transfer to first remaining member
      if (data.adminId === userId) {
        updates.adminId = remainingMembers[0];
      }
      transaction.update(familyRef, updates);
    }

    // Clear familyId pointer on the leaving user's doc so a future sign-in
    // doesn't rehydrate them into a family they no longer belong to.
    transaction.set(userRef, { familyId: deleteField() }, { merge: true });
  });
}

/**
 * Admin removes a member from the family.
 * Caller is responsible for migrating that member's credits (migrateCreditsFromFamily).
 */
export async function removeMember(familyId: string, targetUid: string): Promise<void> {
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
  await updateDoc(familyRef, {
    [`members.${targetUid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Renames a family (admin only).
 */
export async function renameFamily(familyId: string, newName: string): Promise<void> {
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
  await updateDoc(familyRef, {
    name: newName.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Transfers admin role to another member (current admin only).
 */
export async function transferAdmin(familyId: string, newAdminId: string): Promise<void> {
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
  await updateDoc(familyRef, {
    adminId: newAdminId,
    updatedAt: serverTimestamp(),
  });
}
