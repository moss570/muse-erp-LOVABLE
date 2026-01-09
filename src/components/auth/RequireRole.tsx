import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

interface RequireRoleProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'manager' | 'supervisor' | 'employee')[];
  fallbackPath?: string;
}

/**
 * Role-based access control component.
 * Wraps protected content and redirects or shows access denied for unauthorized users.
 */
export function RequireRole({ children, allowedRoles, fallbackPath }: RequireRoleProps) {
  const { role, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has required role
  const hasAccess = role && allowedRoles.includes(role);

  if (!hasAccess) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this page. 
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
