import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { auth, db } from './firebase';
import i18n from './i18n';
import { useAuthStore } from '@/stores/authStore';
import { propagateDisplayNameChange } from './userProfile';
import type { User } from '@/types/userTypes';

function generateNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = Crypto.getRandomValues(new Uint8Array(length));
  for (const byte of bytes) result += chars[byte % chars.length];
  return result;
}

async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

// ---------------------------------------------------------------------------
// Native modules — loaded lazily so Expo Go doesn't crash on import
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _GoogleSignin: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _statusCodes: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _AppleAuthentication: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-google-signin/google-signin');
  _GoogleSignin = mod.GoogleSignin;
  _statusCodes = mod.statusCodes;
} catch {
  // Not available in Expo Go — Google Sign-In button will show an alert
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _AppleAuthentication = require('expo-apple-authentication');
} catch {
  // Not available in Expo Go
}

// ---------------------------------------------------------------------------
// Google Sign-In — configure once at app startup
// ---------------------------------------------------------------------------

export function configureGoogleSignIn() {
  if (!_GoogleSignin) return; // Expo Go: skip
  _GoogleSignin.configure({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId as string,
  });
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

export function mapFirebaseAuthError(code: string): string {
  const t = i18n.t.bind(i18n);
  switch (code) {
    case 'auth/email-already-in-use':
      return t('auth.errors.emailAlreadyInUse');
    case 'auth/invalid-email':
      return t('auth.errors.invalidEmail');
    case 'auth/weak-password':
      return t('auth.errors.weakPassword');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('auth.errors.invalidCredential');
    case 'auth/too-many-requests':
      return t('auth.errors.tooManyRequests');
    case 'auth/network-request-failed':
      return t('auth.errors.networkError');
    default:
      return t('auth.errors.unexpected');
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
  password: string,
  displayName: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  await updateProfile(credential.user, { displayName });

  const userRecord: User = {
    uid,
    email: credential.user.email ?? undefined,
    displayName,
    photoURL: undefined,
  };

  await upsertUserDocument(uid, {
    email: userRecord.email,
    displayName: userRecord.displayName,
    photoURL: userRecord.photoURL,
  });

  // onAuthStateChanged fires immediately after createUserWithEmailAndPassword,
  // before updateProfile completes — so the store would otherwise hold the user
  // without displayName until the next app launch. Sync it here.
  useAuthStore.getState().setCurrentUser(userRecord);

  return userRecord;
}

export function isEmailUser(): boolean {
  return auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false;
}

export async function updateDisplayName(newName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await updateProfile(user, { displayName: newName });
  await setDoc(doc(db, 'users', user.uid), { displayName: newName }, { merge: true });
  await propagateDisplayNameChange(user.uid, newName);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not authenticated');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
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
 * Returns null with an alert in Expo Go (native module not available).
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!_GoogleSignin) {
    throw new Error('Google Sign-In is not available in Expo Go. Use email/password instead.');
  }

  await _GoogleSignin.hasPlayServices();
  const response = await _GoogleSignin.signIn();

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

export const isAppleAuthAvailable = Platform.OS === 'ios' && !!_AppleAuthentication;

/**
 * Returns null if the user cancelled, throws for other errors.
 */
export async function signInWithApple(): Promise<User | null> {
  if (!_AppleAuthentication) {
    throw new Error('Apple Sign-In is not available in Expo Go. Use email/password instead.');
  }

  try {
    const rawNonce = generateNonce();
    const hashedNonce = await sha256(rawNonce);

    const credential = await _AppleAuthentication.signInAsync({
      requestedScopes: [
        _AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        _AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { identityToken, fullName } = credential;
    if (!identityToken) throw new Error('Apple Sign-In: missing identity token');

    const provider = new OAuthProvider('apple.com');
    const appleCredential = provider.credential({ idToken: identityToken, rawNonce });
    const firebaseCredential = await signInWithCredential(auth, appleCredential);

    const { uid } = firebaseCredential.user;
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
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'ERR_CANCELED') return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(email: string): Promise<void> {
  await firebaseSendPasswordResetEmail(auth, email);
}

// ---------------------------------------------------------------------------
// Account deletion
// ---------------------------------------------------------------------------

/**
 * Step 1: Reauthenticate the current user before account deletion.
 * Throws auth/wrong-password / auth/invalid-credential if the password is wrong.
 * Call this BEFORE deleting any user data.
 */
export async function reauthenticateForDeletion(currentPassword?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const emailProvider = user.providerData.find((p) => p.providerId === 'password');

  if (emailProvider && currentPassword) {
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
  } else if (!emailProvider) {
    // Google — trigger re-sign-in to get a fresh credential
    if (_GoogleSignin) {
      await _GoogleSignin.hasPlayServices();
      const response = await _GoogleSignin.signIn();
      if (response.type !== 'cancelled') {
        const { idToken } = response.data;
        const googleCredential = GoogleAuthProvider.credential(idToken);
        await reauthenticateWithCredential(user, googleCredential);
      }
    }
    // Apple: if session is recent enough Firebase will allow deletion without explicit reauth
  }
}

/**
 * Step 2: Delete the Firebase Auth user + their /users/{uid} Firestore document.
 * Call this only AFTER reauthenticateForDeletion() succeeded and all user data was deleted.
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
