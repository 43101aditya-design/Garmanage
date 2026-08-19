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
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <div className="mx-auto max-w-7xl h-full space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster position="top-right" theme="system" richColors />
    </div>
  );
};
