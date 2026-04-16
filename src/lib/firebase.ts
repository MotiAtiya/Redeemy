import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// getReactNativePersistence is only exported from the react-native entry point
// of @firebase/auth, not from the firebase/auth wrapper package
import { getReactNativePersistence } from '@firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

const {
  firebaseApiKey,
  firebaseAuthDomain,
  firebaseProjectId,
  firebaseStorageBucket,
  firebaseMessagingSenderId,
  firebaseAppId,
} = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: firebaseApiKey as string,
  authDomain: firebaseAuthDomain as string,
  projectId: firebaseProjectId as string,
  storageBucket: firebaseStorageBucket as string,
  messagingSenderId: firebaseMessagingSenderId as string,
  appId: firebaseAppId as string,
};

// Guard against re-initialization on Expo hot reload
const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Auth — persist tokens across app restarts via AsyncStorage
const auth = isFirstInit
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

// Firestore — enable offline reads via persistent local cache
const db = isFirstInit
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app);

const storage = getStorage(app);

export { app, auth, db, storage };
