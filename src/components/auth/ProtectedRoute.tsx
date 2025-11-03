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

  // If not authenticated, show loading (redirect will happen in useEffect)
  // NEVER render the protected content for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow mx-auto mb-4" />
          <p className="text-white/70">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If role is required, check permissions
  if (requiredRole) {
    // Wait for profile to load
    if (!profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow mx-auto mb-4" />
            <p className="text-white/70">Loading profile...</p>
          </div>
        </div>
      );
    }

    const userRole = profile.role;
    const hasPermission = 
      userRole === 'super_admin' || 
      userRole === requiredRole || 
      (requiredRole === 'buyer' && userRole === 'agent');

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow mx-auto mb-4" />
            <p className="text-white/70">Redirecting...</p>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
};
