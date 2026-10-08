import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LoadingState } from '../ui/LoadingState';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { isAuthenticated, isLoading, role, switchRole } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    // If authenticated and visiting a role-specific portal, sync active role smoothly
    if (isAuthenticated && allowedRole && role !== allowedRole) {
      switchRole(allowedRole);
    }
  }, [isAuthenticated, allowedRole, role, switchRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nest-bg">
        <LoadingState message="Checking your care session..." subMessage="Just a moment" />
      </div>
    );
  }

  // Not signed in -> send to dedicated portal login with return path
  if (!isAuthenticated) {
    if (allowedRole === 'senior') {
      return <Navigate to="/senior/login" state={{ from: location }} replace />;
    } else if (allowedRole === 'caregiver') {
      return <Navigate to="/caretaker/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // In this unified healthcare application, authenticated users can access both portals
  return <>{children}</>;
};
