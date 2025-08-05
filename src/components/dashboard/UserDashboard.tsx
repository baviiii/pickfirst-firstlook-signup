
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

  // Debug logging
  console.log('UserDashboard - Profile:', profile);
  console.log('UserDashboard - Role:', profile?.role);

  // Route to the appropriate dashboard based on user role
  switch (profile?.role) {
    case 'buyer':
      console.log('Rendering BuyerDashboard');
      return <BuyerDashboard />;
    case 'agent':
      console.log('Rendering AgentDashboard');
      return <AgentDashboard />;
    case 'super_admin':
      console.log('Rendering SuperAdminDashboard');
      return <SuperAdminDashboard />;
    default:
      console.log('Defaulting to BuyerDashboard - Role was:', profile?.role);
      return <BuyerDashboard />; // Default to buyer dashboard
  }
};
