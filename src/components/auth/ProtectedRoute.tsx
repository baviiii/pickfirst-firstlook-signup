import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'buyer' | 'agent' | 'super_admin';
  fallbackPath?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  fallbackPath = '/auth' 
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // If no user is authenticated, redirect to auth page
      if (!user) {
        navigate(fallbackPath, { replace: true });
        return;
      }

      // If a specific role is required, check user's role
      if (requiredRole && profile) {
        const userRole = profile.role;
        
        // Check role hierarchy: super_admin can access everything, agent can access agent routes
        const hasPermission = 
          userRole === 'super_admin' || // Super Admin can access everything
          userRole === requiredRole || // Exact role match
          (requiredRole === 'buyer' && userRole === 'agent'); // Agents can access buyer features

        if (!hasPermission) {
          // Redirect to appropriate dashboard based on user's actual role
          const redirectPath = userRole === 'super_admin' ? '/dashboard' : 
                              userRole === 'agent' ? '/dashboard' : 
                              '/dashboard';
          navigate(redirectPath, { replace: true });
          return;
        }
      }
    }
  }, [user, profile, loading, navigate, requiredRole, fallbackPath]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow mx-auto mb-4" />
          <p className="text-white/70">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children (redirect will happen in useEffect)
  if (!user) {
    return null;
  }

  // If role is required but user doesn't have permission, don't render children
  if (requiredRole && profile) {
    const userRole = profile.role;
    const hasPermission = 
      userRole === 'super_admin' || 
      userRole === requiredRole || 
      (requiredRole === 'buyer' && userRole === 'agent');

    if (!hasPermission) {
      return null;
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};
