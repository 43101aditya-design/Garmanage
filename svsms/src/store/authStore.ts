import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiClient } from '../api/services/apiClient';

interface User {
  id: string;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'mechanic' | 'customer';
  memberships: Array<{ garage_id: string; role_name: string; membership_id: string }>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  isLoading: boolean;
  googleLogin: () => Promise<void>;
  onboard: (role: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  syncProfile: () => Promise<void>;
}

const provider = new GoogleAuthProvider();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      needsOnboarding: false,
      isLoading: false,

      setLoading: (loading) => set({ isLoading: loading }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      syncProfile: async () => {
        try {
          const res = await apiClient.get('/api/auth/me');
          set({ user: res.user, isAuthenticated: true, needsOnboarding: false });
        } catch (error: any) {
          if (error.response?.data?.requiresOnboarding) {
            set({ needsOnboarding: true, isAuthenticated: false, user: null });
          } else {
            console.error('Failed to sync profile', error);
            set({ user: null, isAuthenticated: false, token: null, needsOnboarding: false });
          }
        }
      },

      googleLogin: async () => {
        set({ isLoading: true });
        try {
          const userCredential = await signInWithPopup(auth, provider);
          const token = await userCredential.user.getIdToken();
          set({ token });
          await get().syncProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      onboard: async (role: string) => {
        set({ isLoading: true });
        try {
          const res = await apiClient.post('/api/auth/onboard', { role });
          set({ user: res.user, isAuthenticated: true, needsOnboarding: false });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await signOut(auth);
          set({ user: null, token: null, isAuthenticated: false, needsOnboarding: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
