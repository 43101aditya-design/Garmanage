import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { apiClient } from '../api/services/apiClient';

export interface JoinRequest {
  id: string;
  requested_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  garage_name: string;
}

export interface Workspace {
  id: string;
  type: 'customer' | 'garage';
  role: 'owner' | 'manager' | 'mechanic' | 'customer';
  garage_id?: string;
  garage_name?: string;
  name: string;
  description: string;
}

export interface User {
  id: string;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'mechanic' | 'customer';
  customer_id?: string | null;
  garage_id?: string | null;
  garage_name?: string | null;
  memberships: Array<{ garage_id: string; garage_name?: string; role_name: string; membership_id: string }>;
  availableWorkspaces?: Workspace[];
  activeWorkspace?: Workspace | null;
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
  switchWorkspace: (workspace: Workspace) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedGarage: (garageId: string) => void;
  syncProfile: () => Promise<void>;
  initAuthListener: () => () => void;
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
    memberships: [{ garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', role_name: 'owner', membership_id: 'dev-m-owner' }],
    availableWorkspaces: [
      { id: 'dev-m-owner', type: 'garage', role: 'owner', garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', name: 'Apex Speed Garage', description: 'Owner Workspace' },
      { id: 'customer_personal', type: 'customer', role: 'customer', name: 'Personal Customer Account', description: 'Manage vehicles & book services' }
    ],
    activeWorkspace: { id: 'dev-m-owner', type: 'garage', role: 'owner', garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', name: 'Apex Speed Garage', description: 'Owner Workspace' }
  },
  manager: {
    id: '75accc6d-2146-42fe-a1b9-3a744d9c4167',
    firebase_uid: 'dev-manager-uid',
    name: 'Dev Manager',
    email: 'manager@svsms.com',
    role: 'manager',
    onboarding_state: 'ACTIVE',
    memberships: [{ garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', role_name: 'manager', membership_id: 'dev-m-manager' }],
    availableWorkspaces: [
      { id: 'dev-m-manager', type: 'garage', role: 'manager', garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', name: 'Apex Speed Garage', description: 'Manager Workspace' },
      { id: 'customer_personal', type: 'customer', role: 'customer', name: 'Personal Customer Account', description: 'Manage vehicles & book services' }
    ],
    activeWorkspace: { id: 'dev-m-manager', type: 'garage', role: 'manager', garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', name: 'Apex Speed Garage', description: 'Manager Workspace' }
  },
  mechanic: {
    id: 'ef002b07-5614-4ec2-a8fe-9a933e13f6fc',
    firebase_uid: 'dev-mechanic-uid',
    name: 'Dev Mechanic',
    email: 'mechanic@svsms.com',
    role: 'mechanic',
    onboarding_state: 'ACTIVE',
    memberships: [{ garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', role_name: 'mechanic', membership_id: 'dev-m-mechanic' }],
    availableWorkspaces: [
      { id: 'dev-m-mechanic', type: 'garage', role: 'mechanic', garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', name: 'Apex Speed Garage', description: 'Mechanic Workspace' },
      { id: 'customer_personal', type: 'customer', role: 'customer', name: 'Personal Customer Account', description: 'Manage vehicles & book services' }
    ],
    activeWorkspace: { id: 'dev-m-mechanic', type: 'garage', role: 'mechanic', garage_id: REAL_GARAGE_ID, garage_name: 'Apex Speed Garage', name: 'Apex Speed Garage', description: 'Mechanic Workspace' }
  },
  customer: {
    id: 'dev-customer-1',
    firebase_uid: 'dev-customer-uid',
    name: 'Dev Customer',
    email: 'customer@garmanage.dev',
    role: 'customer',
    customer_id: 'customer-uuid-1',
    onboarding_state: 'ACTIVE',
    memberships: [],
    availableWorkspaces: [
      { id: 'customer_personal', type: 'customer', role: 'customer', name: 'Personal Customer Account', description: 'Manage vehicles & book services' }
    ],
    activeWorkspace: { id: 'customer_personal', type: 'customer', role: 'customer', name: 'Personal Customer Account', description: 'Manage vehicles & book services' }
  },
};

const getInitialLoadingState = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      // If user session and token are both cached, hydrate immediately without blocking spinner
      if (parsed?.state?.token && parsed?.state?.user && parsed?.state?.isAuthenticated) {
        localStorage.setItem('svsms_token', parsed.state.token);
        return false;
      }
      if (parsed?.state?.token) {
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
        const currentToken = get().token || localStorage.getItem('svsms_token');
        if (!currentToken) return;

        // Dev tokens are self-contained demo users (preserve offline & in production)
        if (currentToken.startsWith('dev-token')) {
          const role = currentToken.replace('dev-token-', '') as keyof typeof DEV_USERS;
          if (DEV_USERS[role]) {
            const user = get().user || DEV_USERS[role];
            set({ 
              user, 
              isAuthenticated: true, 
              needsOnboarding: false, 
              onboardingState: 'ACTIVE',
              selectedGarageId: user.activeWorkspace?.garage_id || user.memberships?.[0]?.garage_id || null
            });
            return;
          }
        }

        try {
          const res = await apiClient.get('/api/auth/me');
          const user: User = res?.user ?? res;
          if (!user || !user.id) {
            console.warn('[syncProfile] Unexpected response shape:', res);
            return;
          }
          const onboardingState = user.onboarding_state || 'ACTIVE';
          const pendingRequests: JoinRequest[] = user.pendingRequests || [];
          const selectedGarageId = user.activeWorkspace?.garage_id 
            || (user.memberships?.length === 1 ? user.memberships[0].garage_id : get().selectedGarageId);
          set({ 
            user, 
            isAuthenticated: true, 
            needsOnboarding: false, 
            onboardingState, 
            pendingRequests, 
            selectedGarageId 
          });
        } catch (error: any) {
          const data = error?.response?.data ?? error?.data ?? {};
          if (data.requiresOnboarding) {
            const onboardingState = data.onboarding_state || 'ONBOARDING';
            const pendingRequests: JoinRequest[] = data.pendingRequests || [];
            set({ needsOnboarding: true, isAuthenticated: false, user: null, onboardingState, pendingRequests });
          } else if (error?.status === 401) {
            // Check if Firebase auth can refresh the token before invalidating
            let refreshed = false;
            try {
              if (auth.currentUser) {
                const freshToken = await auth.currentUser.getIdToken(true);
                localStorage.setItem('svsms_token', freshToken);
                set({ token: freshToken });
                refreshed = true;
                const retryRes = await apiClient.get('/api/auth/me');
                const retryUser: User = retryRes?.user ?? retryRes;
                if (retryUser && retryUser.id) {
                  set({ user: retryUser, isAuthenticated: true });
                  return;
                }
              }
            } catch (refErr) {
              console.warn('[syncProfile] Automatic token refresh failed:', refErr);
            }

            if (!refreshed) {
              console.warn('[syncProfile] Session expired or unauthorized.');
              localStorage.removeItem('svsms_token');
              localStorage.removeItem('svsms-garage');
              localStorage.removeItem('auth-storage');
              set({ user: null, isAuthenticated: false, token: null, needsOnboarding: false, onboardingState: null });
            }
          } else {
            // For temporary network glitches / offline / 500s:
            // NEVER destroy existing login session! Retain the cached user credentials.
            console.warn('[syncProfile] Non-fatal sync error (retaining cached session):', error?.message || error);
          }
        }
      },

      initAuthListener: () => {
        if (!isFirebaseConfigured) return () => {};

        let isFirstCheck = true;
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const freshToken = await firebaseUser.getIdToken();
              localStorage.setItem('svsms_token', freshToken);
              set({ token: freshToken });
              await get().syncProfile();
            } catch (err) {
              console.warn('[AUTH] Background token refresh error:', err);
            } finally {
              if (isFirstCheck) {
                set({ isLoading: false });
                isFirstCheck = false;
              }
            }
          } else {
            const currentToken = get().token || localStorage.getItem('svsms_token');
            // If Firebase says no user and current token is a Firebase token (not dev), clear session
            if (currentToken && !currentToken.startsWith('dev-token')) {
              localStorage.removeItem('svsms_token');
              localStorage.removeItem('auth-storage');
              set({ user: null, token: null, isAuthenticated: false, onboardingState: null });
            }
            if (isFirstCheck) {
              set({ isLoading: false });
              isFirstCheck = false;
            }
          }
        });

        return unsubscribe;
      },

      switchWorkspace: async (workspace: Workspace) => {
        set({ isLoading: true });
        try {
          const res = await apiClient.post('/api/auth/switch-workspace', {
            role: workspace.role,
            garageId: workspace.garage_id,
          });

          if (!res || (!res.user && !res.role)) {
            throw new Error('Authoritative workspace switch failed: invalid response from server.');
          }

          const updatedUser: User = res.user || { ...get().user!, role: workspace.role, activeWorkspace: workspace };
          const newGarageId = workspace.garage_id || null;

          // Invalidate and flush dependent garage state so old garage data never leaks
          localStorage.removeItem('svsms-garage');
          set({
            user: updatedUser,
            selectedGarageId: newGarageId,
            isLoading: false,
          });
          await get().syncProfile();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

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
          localStorage.removeItem('svsms-garage');
          localStorage.removeItem('auth-storage');
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false, 
            needsOnboarding: false, 
            onboardingState: null, 
            pendingRequests: [], 
            selectedGarageId: null 
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        selectedGarageId: state.selectedGarageId,
        onboardingState: state.onboardingState,
        needsOnboarding: state.needsOnboarding,
      }),
    }
  )
);
