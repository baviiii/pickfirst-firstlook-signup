
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

  // Debug: Log the profile data
  console.log('UserDashboard - Profile data:', profile);
  console.log('UserDashboard - Profile role:', profile?.role);

  // Route to the appropriate dashboard based on user role
  switch (profile?.role) {
    case 'buyer':
      return <BuyerDashboard />;
    case 'agent':
      return <AgentDashboard />;
    case 'super_admin':
      return <SuperAdminDashboard />;
    default:
      console.log('UserDashboard - Defaulting to buyer dashboard, role was:', profile?.role);
      return <BuyerDashboard />; // Default to buyer dashboard
  }
};
