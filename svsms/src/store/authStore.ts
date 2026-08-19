import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'mechanic' | 'customer';
  branch_id?: string;
  reference_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('svsms_token'),
  isAuthenticated: !!localStorage.getItem('svsms_token'),
  
  login: (user, token) => {
    localStorage.setItem('svsms_token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('svsms_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
