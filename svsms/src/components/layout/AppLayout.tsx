import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from 'sonner';
import { cn } from '../../utils/cn';

export const AppLayout = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { isSidebarCollapsed } = useUIStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative w-full max-w-full">
      <Sidebar />
      {/* Main content shifts right on desktop to make room for the sidebar */}
      <div className={cn(
        "flex flex-1 flex-col overflow-hidden w-full max-w-full transition-all duration-300 ease-in-out",
        // Desktop: add left padding equal to sidebar width (64 = w-64)
        // When collapsed sidebar is hidden, no padding needed
        isSidebarCollapsed ? "lg:pl-0" : "lg:pl-64"
      )}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/20 custom-scrollbar">
          <div className="mx-auto max-w-7xl h-full space-y-4 md:space-y-6 pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster position="top-right" theme="system" richColors />
    </div>
  );
};
