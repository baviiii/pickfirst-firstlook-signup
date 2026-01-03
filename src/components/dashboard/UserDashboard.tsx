
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { BuyerDashboardNew } from './BuyerDashboardNew';
import { AgentDashboard } from './AgentDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { RoleBasedLayout } from '@/components/layouts/RoleBasedLayout';
import { supabase } from '@/integrations/supabase/client';

export const UserDashboard = () => {
  const { profile, refetchProfile, user } = useAuth();
  const { viewMode } = useViewMode();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Only refetch when component mounts
  useEffect(() => {
    const initializeDashboard = async () => {
      if (user && !profile) {
        await refetchProfile();
      }
      setIsLoading(false);
    };
    
    initializeDashboard();
  }, [user, profile, refetchProfile]);

  // CRITICAL: Check if user is suspended - block dashboard access
  useEffect(() => {
    if (profile && profile.subscription_status === 'suspended') {
      console.warn('[UserDashboard] User is suspended, signing out');
      supabase.auth.signOut().then(() => {
        navigate('/auth?error=suspended', { replace: true });
      });
    }
  }, [profile, navigate]);

  // Show loading state to prevent flash of wrong layout
  if (isLoading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pickfirst-yellow/20 border-t-pickfirst-yellow rounded-full animate-spin"></div>
          </div>
          <div className="text-white text-lg font-medium">Loading your dashboard...</div>
          <div className="text-gray-400 text-sm">Please wait while we prepare your experience</div>
        </div>
      </div>
    );
  }

  // CRITICAL: Block suspended users from accessing dashboard
  if (profile && profile.subscription_status === 'suspended') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-2xl font-bold">Account Suspended</div>
          <p className="text-white/70">Your account has been suspended. Contact support for assistance.</p>
          <p className="text-white/50 text-sm">You will be redirected to the login page...</p>
        </div>
      </div>
    );
  }

  // Route to the appropriate dashboard based on user role and view mode
  // Agents can switch between agent and buyer dashboards
  if (profile?.role === 'agent') {
    return viewMode === 'buyer' ? <BuyerDashboardNew /> : <AgentDashboard />;
  }

  // Route to the appropriate dashboard based on user role for non-agents
  switch (profile?.role) {
    case 'buyer':
      return <BuyerDashboardNew />;
    case 'super_admin':
      return (
        <RoleBasedLayout>
          <SuperAdminDashboard />
        </RoleBasedLayout>
      );
    default:
      return <BuyerDashboardNew />; // Default to buyer dashboard
  }
};
