import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactElement;
  role?: string | string[]; // Allow single role string or array of role strings
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Log the state information that ProtectedRoute is about to use
  console.log('ProtectedRoute: Evaluating access. State from useAuthStore:', {
    isAuthenticated,
    user: user ? JSON.parse(JSON.stringify(user)) : null, // Deep copy for logging, handles null user
    pathname: location.pathname,
    requiredRole: role
  });

  if (!isAuthenticated) {
    console.log("ProtectedRoute: User is not authenticated. Redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // At this point, isAuthenticated is TRUE.
  // Check for inconsistent state: authenticated but no user object or role.
  if (!user || !user.role) {
    console.error('ProtectedRoute: User is authenticated but user object or role is missing. Logging out. User object:', user ? JSON.parse(JSON.stringify(user)) : null);
    useAuthStore.getState().clearAuth(); // Clear auth state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated AND user object and user.role are present.
  // Only proceed with role checking if a 'role' prop was actually provided.
  if (role) {
    const userRole = user.role;
    const requiredRoles = Array.isArray(role) ? role : [role];
    const hasRequiredRole = requiredRoles.includes(userRole);

    if (!hasRequiredRole) {
      // User is authenticated, has a valid role, but not the one required for THIS route.
      // Redirect to a sensible default page based on their actual role.
      // console.log(`Redirecting: Role '${userRole}' does not have access to ${location.pathname}. Required: ${requiredRoles.join(', ')}`);
      if (userRole === 'superAdmin') {
        return <Navigate to="/admin/select-company" replace />;
      } else if (userRole === 'admin') {
        return <Navigate to="/admin/analytics-dashboard" replace />;
      } else if (userRole === 'employee') {
        return <Navigate to="/" replace />;
      }
      // General fallback if their role isn't one of the above, or for unexpected roles.
      return <Navigate to="/" replace />;
    }
  }

  // If no 'role' prop was passed to ProtectedRoute, just being authenticated is enough.
  // Or, if a 'role' prop was passed AND the user has the required role.
  return children;
};

export default ProtectedRoute; 