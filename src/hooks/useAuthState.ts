import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AuthStatus } from '@/types/userTypes';

/**
 * Listens to Firebase onAuthStateChanged and keeps authStore in sync.
 * Call once at the root layout — never in leaf screens.
 *
 * Onboarding is resolved server-side from /users/{uid}.hasOnboarded so the
 * flag is per-user, not per-device — sign-in on a new device for a returning
 * user skips onboarding, and a brand-new OAuth account on a device that has
 * leftover hasOnboarded=true from a previous user still gets onboarding shown.
 *
 * The Firestore read happens BEFORE setAuthStatus(AUTHENTICATED) so AuthGate
 * always reads the correct hasOnboarded value when it decides where to redirect.
 */
export function useAuthState() {
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const setAuthStatus = useAuthStore((s) => s.setAuthStatus);
  const setHasOnboarded = useSettingsStore((s) => s.setHasOnboarded);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      // Resolve onboarding + displayName from /users/{uid} BEFORE flipping
      // authStatus, so AuthGate runs once with consistent values.
      type UserDoc = { hasOnboarded?: boolean; displayName?: string; photoURL?: string };
      let docData: UserDoc | null = null;
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) docData = snap.data() as UserDoc;
      } catch {
        // Network/permission error — fall through with null docData; user
        // will be treated as not onboarded (safer than skipping onboarding).
      }

      setHasOnboarded(!!docData?.hasOnboarded);

      const existing = useAuthStore.getState().currentUser;
      const sameUser = existing?.uid === firebaseUser.uid;
      setCurrentUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? (sameUser ? existing?.email : undefined),
        displayName:
          firebaseUser.displayName ??
          docData?.displayName ??
          (sameUser ? existing?.displayName : undefined),
        photoURL:
          firebaseUser.photoURL ??
          docData?.photoURL ??
          (sameUser ? existing?.photoURL : undefined),
      });
      setAuthStatus(AuthStatus.AUTHENTICATED);
    });

    return unsubscribe;
  }, [setCurrentUser, setAuthStatus, setHasOnboarded]);
}
