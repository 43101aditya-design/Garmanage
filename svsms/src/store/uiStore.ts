import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean; // Controls mobile overlay visibility
  isSidebarCollapsed: boolean; // Controls desktop collapse state
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,  // Mobile: default closed
  isSidebarCollapsed: false, // Desktop: default expanded
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  toggleSidebarCollapsed: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
