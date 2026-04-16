import type { Timestamp } from 'firebase/firestore';

export enum AuthStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
}

export interface User {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: Date | Timestamp;
}
