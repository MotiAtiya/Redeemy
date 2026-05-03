import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { AuthStatus } from '@/types/userTypes';

/**
 * Listens to Firebase onAuthStateChanged and keeps authStore in sync.
 * Call once at the root layout — never in leaf screens.
 *
 * Sign-up race: on first email sign-up, Firebase fires onAuthStateChanged
 * before updateProfile() has propagated the displayName onto the local User
 * object, so firebaseUser.displayName is null. We resolve this by:
 *   1. Merging with the existing store entry (set by registerWithEmail) so
 *      we don't clobber a freshly-set name with a stale null.
 *   2. Falling back to the Firestore /users/{uid} doc — the source of truth
 *      written during sign-up — when displayName is still missing.
 */
export function useAuthState() {
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const setAuthStatus = useAuthStore((s) => s.setAuthStatus);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      const existing = useAuthStore.getState().currentUser;
      const sameUser = existing?.uid === firebaseUser.uid;

      // Set immediately with whatever we have so AuthGate can redirect
      // without waiting on a Firestore round-trip.
      setCurrentUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? (sameUser ? existing?.email : undefined),
        displayName: firebaseUser.displayName ?? (sameUser ? existing?.displayName : undefined),
        photoURL: firebaseUser.photoURL ?? (sameUser ? existing?.photoURL : undefined),
      });
      setAuthStatus(AuthStatus.AUTHENTICATED);

      // Source-of-truth backfill: if displayName is still missing (sign-up race
      // where this listener landed last), pull it from /users/{uid}.
      const cur = useAuthStore.getState().currentUser;
      if (cur?.uid === firebaseUser.uid && !cur.displayName) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = snap.exists() ? snap.data() : null;
          if (data?.displayName) {
            const latest = useAuthStore.getState().currentUser;
            if (latest?.uid === firebaseUser.uid && !latest.displayName) {
              setCurrentUser({
                ...latest,
                displayName: data.displayName,
                photoURL: latest.photoURL ?? data.photoURL,
              });
            }
          }
        } catch {
          // Ignore — next sign-in or app launch will retry.
        }
      }
    });

    return unsubscribe;
  }, [setCurrentUser, setAuthStatus]);
}
