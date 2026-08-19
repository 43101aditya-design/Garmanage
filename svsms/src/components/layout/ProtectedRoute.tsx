import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const ProtectedRoute = ({ allowedRoles, children }: { allowedRoles?: string[], children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard
    switch (user.role) {
      case 'owner': return <Navigate to="/owner" replace />;
      case 'manager': return <Navigate to="/manager" replace />;
      case 'mechanic': return <Navigate to="/mechanic/profile" replace />;
      case 'customer': return <Navigate to="/customer" replace />;
      default: return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
