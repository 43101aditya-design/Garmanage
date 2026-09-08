import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { apiClient } from '../api/services/apiClient';

export interface JoinRequest {
  id: string;
  requested_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  garage_name: string;
}

export interface User {
  id: string;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'mechanic' | 'customer';
  memberships: Array<{ garage_id: string; role_name: string; membership_id: string }>;
  onboarding_state?: 'ACTIVE' | 'PENDING_APPROVAL' | 'ONBOARDING';
  pendingRequests?: JoinRequest[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  onboardingState: 'ACTIVE' | 'PENDING_APPROVAL' | 'ONBOARDING' | null;
  pendingRequests: JoinRequest[];
  selectedGarageId: string | null;
  isLoading: boolean;
  googleLogin: () => Promise<void>;
  handleRedirectResult: () => Promise<void>;
  devLogin: (role: 'owner' | 'manager' | 'mechanic' | 'customer') => void;
  onboard: (role: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedGarage: (garageId: string) => void;
  syncProfile: () => Promise<void>;
}

const provider = new GoogleAuthProvider();

const REAL_GARAGE_ID = 'e110162f-c650-43e1-83cb-0c77c58d0cfa';

const DEV_USERS: Record<string, User> = {
  owner: {
    id: 'admin-uuid-1',
    firebase_uid: 'dev-owner-uid',
    name: 'Dev Owner',
    email: 'admin@svsms.com',
    role: 'owner',
    onboarding_state: 'ACTIVE',
    memberships: [{ garage_id: REAL_GARAGE_ID, role_name: 'owner', membership_id: 'dev-m-owner' }],
  },
  manager: {
    id: '75accc6d-2146-42fe-a1b9-3a744d9c4167',
    firebase_uid: 'dev-manager-uid',
    name: 'Dev Manager',
    email: 'manager@svsms.com',
    role: 'manager',
    onboarding_state: 'ACTIVE',
    memberships: [{ garage_id: REAL_GARAGE_ID, role_name: 'manager', membership_id: 'dev-m-manager' }],
  },
  mechanic: {
    id: 'ef002b07-5614-4ec2-a8fe-9a933e13f6fc',
    firebase_uid: 'dev-mechanic-uid',
    name: 'Dev Mechanic',
    email: 'mechanic@svsms.com',
    role: 'mechanic',
    onboarding_state: 'ACTIVE',
    memberships: [{ garage_id: REAL_GARAGE_ID, role_name: 'mechanic', membership_id: 'dev-m-mechanic' }],
  },
  customer: {
    id: 'dev-customer-1',
    firebase_uid: 'dev-customer-uid',
    name: 'Dev Customer',
    email: 'customer@garmanage.dev',
    role: 'customer',
    onboarding_state: 'ACTIVE',
    memberships: [],
  },
};


const getInitialLoadingState = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.token) {
        // Hydrate svsms_token in localStorage immediately for early apiClient requests
        localStorage.setItem('svsms_token', parsed.state.token);
        return true;
      }
    }
  } catch (e) {
    console.error('[AUTH] Failed to parse auth-storage', e);
  }
  return false;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      needsOnboarding: false,
      onboardingState: null,
      pendingRequests: [],
      selectedGarageId: null,
      isLoading: getInitialLoadingState(),

      setLoading: (loading) => set({ isLoading: loading }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('svsms_token', token);
        } else {
          localStorage.removeItem('svsms_token');
        }
      },
      setSelectedGarage: (garageId) => set({ selectedGarageId: garageId }),

      devLogin: (role) => {
        const mockUser = DEV_USERS[role];
        const devToken = `dev-token-${role}`;
        localStorage.setItem('svsms_token', devToken);
        const garageId = mockUser.memberships[0]?.garage_id || null;
        set({
          user: mockUser,
          isAuthenticated: true,
          token: devToken,
          needsOnboarding: false,
          onboardingState: 'ACTIVE',
          pendingRequests: [],
          selectedGarageId: garageId,
          isLoading: false,
        });
      },

      syncProfile: async () => {
        try {
          const res = await apiClient.get('/api/auth/me');
          // apiClient returns raw JSON — the body is { user: {...} }
          const user: User = res?.user ?? res;
          if (!user || !user.id) {
            // Unexpected response shape — treat as unauthenticated
            console.warn('[syncProfile] Unexpected response shape:', res);
            localStorage.removeItem('svsms_token');
            set({ user: null, isAuthenticated: false, token: null, needsOnboarding: false, onboardingState: null });
            return;
          }
          const onboardingState = user.onboarding_state || 'ACTIVE';
          const pendingRequests: JoinRequest[] = user.pendingRequests || [];
          const selectedGarageId = user.memberships?.length === 1
            ? user.memberships[0].garage_id
            : get().selectedGarageId;
          set({ user, isAuthenticated: true, needsOnboarding: false, onboardingState, pendingRequests, selectedGarageId });
        } catch (error: any) {
          // apiClient now attaches .response.data and .data to all error objects
          const data = error?.response?.data ?? error?.data ?? {};
          if (data.requiresOnboarding) {
            const onboardingState = data.onboarding_state || 'ONBOARDING';
            const pendingRequests: JoinRequest[] = data.pendingRequests || [];
            set({ needsOnboarding: true, isAuthenticated: false, user: null, onboardingState, pendingRequests });
          } else {
            console.error('Failed to sync profile', error);
            localStorage.removeItem('svsms_token');
            set({ user: null, isAuthenticated: false, token: null, needsOnboarding: false, onboardingState: null });
          }
        }
      },



      // Called when user clicks "Continue with Google" — opens a popup for instant login
      googleLogin: async () => {
        if (!isFirebaseConfigured) {
          throw new Error('Google sign-in is not available. Firebase is not configured.');
        }
        set({ isLoading: true });
        try {
          const userCredential = await signInWithPopup(auth, provider);
          const token = await userCredential.user.getIdToken();
          localStorage.setItem('svsms_token', token);
          set({ token });
          await get().syncProfile();
        } catch (error: any) {
          console.error('[AUTH] Google Auth Error:', error);
          let friendlyMessage = 'Google sign-in is currently unavailable. Please try again.';
          if (error.code === 'auth/popup-closed-by-user') {
            friendlyMessage = 'Google login window was closed before completion.';
          } else if (error.code === 'auth/popup-blocked') {
            friendlyMessage = 'Sign-in popup was blocked by your browser. Please allow popups.';
          } else if (error.code === 'auth/unauthorized-domain') {
            friendlyMessage = 'This domain is not authorized in Firebase Console.';
          } else if (error.code === 'auth/operation-not-allowed') {
            friendlyMessage = 'Google Sign-In is not enabled in Firebase Console.';
          } else if (error.message) {
            friendlyMessage = error.message;
          }
          throw new Error(friendlyMessage);
        } finally {
          set({ isLoading: false });
        }
      },

      // Call this on app startup — picks up Google token after redirect returns
      handleRedirectResult: async () => {
        if (!isFirebaseConfigured) return;
        set({ isLoading: true });
        try {
          const result = await getRedirectResult(auth);
          if (result) {
            const token = await result.user.getIdToken();
            localStorage.setItem('svsms_token', token);
            set({ token });
            await get().syncProfile();
          }
        } catch (error: any) {
          console.error('[AUTH] Redirect result error:', error);
          let msg = 'Google sign-in failed after redirect.';
          if (error.code === 'auth/unauthorized-domain') msg = 'Domain not authorized in Firebase Console.';
          else if (error.message) msg = error.message;
          // Surface the error to Login page via a re-throw so it can show toast
          throw new Error(msg);
        } finally {
          set({ isLoading: false });
        }
      },

      onboard: async (role: string) => {
        set({ isLoading: true });
        try {
          const res = await apiClient.post('/api/auth/onboard', { role });
          set({ user: res.user, isAuthenticated: true, needsOnboarding: false, onboardingState: 'ACTIVE' });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const currentToken = get().token;
          if (currentToken && !currentToken.startsWith('dev-token')) {
            await signOut(auth);
          }
          localStorage.removeItem('svsms_token');
          set({ user: null, token: null, isAuthenticated: false, needsOnboarding: false, onboardingState: null, pendingRequests: [], selectedGarageId: null });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, selectedGarageId: state.selectedGarageId }),
    }
  )
);
