import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth, db } from './firebase';
import type { User } from '@/types/userTypes';

// ---------------------------------------------------------------------------
// Google Sign-In — configure once at app startup
// ---------------------------------------------------------------------------

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId as string,
  });
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

export function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    default:
      return 'An unexpected error occurred. Please try again';
  }
}

// ---------------------------------------------------------------------------
// Shared helper — upsert Firestore /users/{uid} document
// ---------------------------------------------------------------------------

async function upsertUserDocument(uid: string, data: Omit<User, 'uid'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid, ...data, createdAt: serverTimestamp() });
  }
}

// ---------------------------------------------------------------------------
// Email / password
// ---------------------------------------------------------------------------

export async function registerWithEmail(
  email: string,
  password: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  const userRecord: User = {
    uid,
    email: credential.user.email ?? undefined,
    displayName: credential.user.displayName ?? undefined,
    photoURL: credential.user.photoURL ?? undefined,
  };

  await upsertUserDocument(uid, {
    email: userRecord.email,
    displayName: userRecord.displayName,
    photoURL: userRecord.photoURL,
  });

  return userRecord;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return {
    uid: credential.user.uid,
    email: credential.user.email ?? undefined,
    displayName: credential.user.displayName ?? undefined,
    photoURL: credential.user.photoURL ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------

/**
 * Returns null if the user cancelled, throws for other errors.
 */
export async function signInWithGoogle(): Promise<User | null> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  // User cancelled
  if (response.type === 'cancelled') return null;

  const { idToken } = response.data;
  const googleCredential = GoogleAuthProvider.credential(idToken);
  const firebaseCredential = await signInWithCredential(auth, googleCredential);

  const { uid } = firebaseCredential.user;
  const userRecord: User = {
    uid,
    email: firebaseCredential.user.email ?? undefined,
    displayName: firebaseCredential.user.displayName ?? undefined,
    photoURL: firebaseCredential.user.photoURL ?? undefined,
  };

  await upsertUserDocument(uid, {
    email: userRecord.email,
    displayName: userRecord.displayName,
    photoURL: userRecord.photoURL,
  });

  return userRecord;
}

// ---------------------------------------------------------------------------
// Apple Sign-In (iOS only)
// ---------------------------------------------------------------------------

export const isAppleAuthAvailable = Platform.OS === 'ios';

/**
 * Returns null if the user cancelled, throws for other errors.
 */
export async function signInWithApple(): Promise<User | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken, fullName } = credential;
    if (!identityToken) throw new Error('Apple Sign-In: missing identity token');

    const provider = new OAuthProvider('apple.com');
    const appleCredential = provider.credential({ idToken: identityToken });
    const firebaseCredential = await signInWithCredential(auth, appleCredential);

    const { uid } = firebaseCredential.user;
    // Apple only shares name on first sign-in; fall back to Firebase display name
    const displayName =
      fullName?.givenName
        ? `${fullName.givenName} ${fullName.familyName ?? ''}`.trim()
        : firebaseCredential.user.displayName ?? undefined;

    const userRecord: User = {
      uid,
      email: firebaseCredential.user.email ?? undefined,
      displayName,
      photoURL: firebaseCredential.user.photoURL ?? undefined,
    };

    await upsertUserDocument(uid, {
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
    });

    return userRecord;
  } catch (err: any) {
    if (err?.code === 'ERR_CANCELED') return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
