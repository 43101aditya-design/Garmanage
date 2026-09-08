import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isRoleAllowed, getDashboardRoute } from '../../permissions';

export const ProtectedRoute = ({
  allowedRoles,
  children,
}: {
  allowedRoles?: string[];
  children: React.ReactNode;
}) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !isRoleAllowed(user.role, allowedRoles)) {
    const defaultRoute = getDashboardRoute(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};
