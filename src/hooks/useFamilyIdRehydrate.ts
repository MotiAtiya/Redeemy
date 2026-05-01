import { useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  limit,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AuthStatus } from '@/types/userTypes';

/**
 * On sign-in, restores familyId when local AsyncStorage is empty
 * (e.g. after a prior sign-out cleared it).
 *
 * Resolution order:
 *   1. users/{uid}.familyId  — primary mirror, written by createFamily /
 *      joinFamily / leaveFamily and self-healed by subscribeToFamily.
 *   2. families where adminId == uid  — recovers admins whose family was
 *      created before the mirror existed (they can never get the mirror
 *      written by another path because nobody else can write their user doc).
 *   3. families where members.{uid}.joinedAt is set  — recovers regular
 *      members in the same situation. Uses Firestore's automatic single-field
 *      indexing on map subfields.
 *
 * Whichever branch wins also writes the result back to users/{uid}.familyId
 * so subsequent sign-ins take the cheap path 1.
 *
 * Call once from root layout.
 */
export function useFamilyIdRehydrate(): void {
  const authStatus = useAuthStore((s) => s.authStatus);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);

  useEffect(() => {
    if (authStatus !== AuthStatus.AUTHENTICATED || !currentUid) return;
    if (useSettingsStore.getState().familyId) return; // already hydrated

    let cancelled = false;

    async function adopt(familyId: string, alreadyOnUserDoc: boolean) {
      if (useSettingsStore.getState().familyId !== familyId) {
        useSettingsStore.getState().setFamilyId(familyId);
      }
      if (!alreadyOnUserDoc && currentUid) {
        await setDoc(
          doc(db, 'users', currentUid),
          { familyId },
          { merge: true },
        ).catch(() => { /* silent */ });
      }
    }

    (async () => {
      try {
        // ---- Path 1: user-doc mirror ------------------------------------
        const userSnap = await getDoc(doc(db, 'users', currentUid));
        if (cancelled) return;

        const mirroredId =
          userSnap.exists() ? (userSnap.data().familyId as string | undefined) : undefined;

        if (mirroredId) {
          const familySnap = await getDoc(doc(db, 'families', mirroredId));
          if (cancelled) return;
          const stillMember =
            familySnap.exists() && currentUid in (familySnap.data().members ?? {});
          if (stillMember) {
            await adopt(mirroredId, true);
            return;
          }
          // Stale pointer — clear and continue to fallbacks.
          await setDoc(
            doc(db, 'users', currentUid),
            { familyId: deleteField() },
            { merge: true },
          ).catch(() => { /* silent */ });
        }

        // ---- Path 2: admin fallback ------------------------------------
        const adminQuery = query(
          collection(db, 'families'),
          where('adminId', '==', currentUid),
          limit(1),
        );
        const adminSnap = await getDocs(adminQuery);
        if (cancelled) return;
        if (!adminSnap.empty) {
          await adopt(adminSnap.docs[0].id, false);
          return;
        }

        // ---- Path 3: regular-member fallback ---------------------------
        const memberQuery = query(
          collection(db, 'families'),
          where(`members.${currentUid}.joinedAt`, '!=', null),
          limit(1),
        );
        const memberSnap = await getDocs(memberQuery);
        if (cancelled) return;
        if (!memberSnap.empty) {
          await adopt(memberSnap.docs[0].id, false);
        }
      } catch {
        // Network / permission / index hiccup — silent. The user can still
        // recover manually by re-entering an invite code, and we'll retry
        // next sign-in.
      }
    })();

    return () => { cancelled = true; };
  }, [authStatus, currentUid]);
}
