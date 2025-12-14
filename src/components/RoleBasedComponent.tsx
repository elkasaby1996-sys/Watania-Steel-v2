import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';

interface RoleBasedComponentProps {
  children: React.ReactNode;
  action: 'view' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
}

export function RoleBasedComponent({ children, action, fallback = null }: RoleBasedComponentProps) {
  const { user, loading } = useAuthStore();
  
  // Don't render anything while loading
  if (loading) {
    return <>{fallback}</>;
  }
  
  const userRole = user?.profile?.role;
  const canPerformAction = hasPermission(userRole, action);

  if (!canPerformAction) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
