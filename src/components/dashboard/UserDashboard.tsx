
import { useAuth } from '@/hooks/useAuth';
import { BuyerDashboard } from './BuyerDashboard';
import { AgentDashboard } from './AgentDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';

export const UserDashboard = () => {
  const { profile } = useAuth();

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
