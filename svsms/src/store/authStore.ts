import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  syncProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setLoading: (loading) => set({ isLoading: loading }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      syncProfile: async () => {
        try {
          const res = await apiClient.get('/api/auth/me');
          set({ user: res.user, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to sync profile', error);
          set({ user: null, isAuthenticated: false, token: null });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          set({ token });
          await get().syncProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const token = await userCredential.user.getIdToken();
          set({ token });
          // Assuming backend handles Firebase user creation via some hook or we call an endpoint
          // For now, syncProfile will fetch the user if the backend creates it
          await get().syncProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await signOut(auth);
          set({ user: null, token: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'svsms-auth',
    }
  )
);
