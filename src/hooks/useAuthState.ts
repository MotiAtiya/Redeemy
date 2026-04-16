import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { AuthStatus } from '@/types/userTypes';

/**
 * Listens to Firebase onAuthStateChanged and keeps authStore in sync.
 * Call once at the root layout — never in leaf screens.
 */
export function useAuthState() {
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const setAuthStatus = useAuthStore((s) => s.setAuthStatus);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? undefined,
          displayName: firebaseUser.displayName ?? undefined,
          photoURL: firebaseUser.photoURL ?? undefined,
        });
        setAuthStatus(AuthStatus.AUTHENTICATED);
      } else {
        setCurrentUser(null);
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
      }
    });

    return unsubscribe;
  }, [setCurrentUser, setAuthStatus]);
}
