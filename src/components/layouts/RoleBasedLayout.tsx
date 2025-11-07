import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BuyerLayoutImproved } from './BuyerLayoutImproved';
import { AgentLayoutSidebar } from './AgentLayoutSidebar';
import { SuperAdminLayout } from './SuperAdminLayout';

interface RoleBasedLayoutProps {
  children: ReactNode;
  fallbackLayout?: 'buyer' | 'agent' | 'none';
}

export const RoleBasedLayout = ({ children, fallbackLayout = 'none' }: RoleBasedLayoutProps) => {
  const { profile, user } = useAuth();

  // If user is not authenticated, render without layout (for public pages)
  if (!user) {
    if (fallbackLayout === 'none') {
      return <>{children}</>;
    }
    // For public pages that want a specific layout preview
    if (fallbackLayout === 'buyer') {
      return <BuyerLayoutImproved>{children}</BuyerLayoutImproved>;
    }
    if (fallbackLayout === 'agent') {
      return <AgentLayoutSidebar>{children}</AgentLayoutSidebar>;
    }
  }

  // If user is authenticated but profile is still loading, show loading
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-pickfirst-yellow/20 border-t-pickfirst-yellow rounded-full animate-spin"></div>
          </div>
          <div className="text-white text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  // Apply layout based on user role
  switch (profile?.role) {
    case 'buyer':
      return <BuyerLayoutImproved>{children}</BuyerLayoutImproved>;
    case 'agent':
      return <AgentLayoutSidebar>{children}</AgentLayoutSidebar>;
    case 'super_admin':
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    default:
      // Default to buyer layout for authenticated users with unknown roles
      return <BuyerLayoutImproved>{children}</BuyerLayoutImproved>;
  }
};
