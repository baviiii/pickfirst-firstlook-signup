import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase, clearAuthTokens } from '@/integrations/supabase/client';

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
  const { user, profile, loading, isRecoverySession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (isRecoverySession && location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
        return;
      }

      // If no user is authenticated, redirect to auth page
      if (!user) {
        navigate(fallbackPath, { replace: true });
        return;
      }

      // CRITICAL: Check if user is suspended - block access immediately
      if (profile && profile.subscription_status === 'suspended') {
        console.warn('[ProtectedRoute] User is suspended, signing out and redirecting');
        supabase.auth.signOut().then(() => {
          navigate('/auth?error=suspended', { replace: true });
        });
        return;
      }

      // Note: Profile loading is handled in useAuth hook
      // We only check for deletion here if loading is complete and profile still missing
      // The useAuth hook already handles the deletion check with retries

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
  }, [user, profile, loading, navigate, requiredRole, fallbackPath, isRecoverySession, location.pathname]);

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
  if (!user || isRecoverySession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow mx-auto mb-4" />
          <p className="text-white/70">
            {isRecoverySession ? 'Finishing password reset...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  // CRITICAL: Check if user is suspended before rendering anything
  if (profile && profile.subscription_status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-xl font-bold">Account Suspended</div>
          <p className="text-white/70">Your account has been suspended. Contact support for assistance.</p>
          <p className="text-white/50 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If role is required, we MUST wait for profile to load before allowing access
  // This prevents security issues where unauthorized users could see protected content
  if (requiredRole) {
    // Wait for profile to load before checking role permissions
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

    // Profile is loaded, now check role permissions
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

  // User is authenticated, not suspended, and has required permissions
  return <>{children}</>;
};
