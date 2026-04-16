import { create } from 'zustand';
import { AuthStatus, type User } from '@/types/userTypes';

interface AuthState {
  currentUser: User | null;
  authStatus: AuthStatus;
}

interface AuthActions {
  setCurrentUser: (user: User | null) => void;
  setAuthStatus: (status: AuthStatus) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set) => ({
  // State
  currentUser: null,
  authStatus: AuthStatus.LOADING,

  // Actions — synchronous setters only; async auth logic lives in src/lib/
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthStatus: (status) => set({ authStatus: status }),
}));
