
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { BuyerDashboardNew } from './BuyerDashboardNew';
import { AgentDashboard } from './AgentDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';

export const UserDashboard = () => {
  const { profile, refetchProfile, user } = useAuth();
  const { viewMode } = useViewMode();
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
      return <SuperAdminDashboard />;
    default:
      return <BuyerDashboardNew />; // Default to buyer dashboard
  }
};
