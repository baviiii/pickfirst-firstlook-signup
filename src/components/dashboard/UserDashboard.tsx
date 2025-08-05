
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BuyerDashboard } from './BuyerDashboard';
import { AgentDashboard } from './AgentDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';

export const UserDashboard = () => {
  const { profile, refetchProfile } = useAuth();

  // Refetch profile data every 5 seconds to catch role changes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchProfile();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetchProfile]);

  // Also refetch when component mounts
  useEffect(() => {
    refetchProfile();
  }, [refetchProfile]);

  // Route to the appropriate dashboard based on user role
  switch (profile?.role) {
    case 'buyer':
      return <BuyerDashboard />;
    case 'agent':
      return <AgentDashboard />;
    case 'super_admin':
      return <SuperAdminDashboard />;
    default:
      return <BuyerDashboard />; // Default to buyer dashboard
  }
};
