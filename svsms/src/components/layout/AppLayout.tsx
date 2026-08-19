import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from 'sonner';

export const AppLayout = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background relative w-full max-w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden w-full max-w-full">
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
