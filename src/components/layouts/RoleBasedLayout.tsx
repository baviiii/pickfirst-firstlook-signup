import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { BuyerLayoutImproved } from './BuyerLayoutImproved';
import { AgentLayoutSidebar } from './AgentLayoutSidebar';
import { SuperAdminLayout } from './SuperAdminLayout';

interface RoleBasedLayoutProps {
  children: ReactNode;
  fallbackLayout?: 'buyer' | 'agent' | 'none';
}

export const RoleBasedLayout = ({ children, fallbackLayout = 'none' }: RoleBasedLayoutProps) => {
  const { profile, user } = useAuth();
  const { viewMode } = useViewMode();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayMode, setDisplayMode] = useState<'agent' | 'buyer' | null>(null);

  // Handle smooth transitions between modes
  useEffect(() => {
    if (profile?.role === 'agent') {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayMode(viewMode);
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setDisplayMode(null);
    }
  }, [viewMode, profile?.role]);

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

  // Apply layout based on view mode (for agents) or role (for others)
  // Agents can switch between agent and buyer views with smooth transitions
  if (profile?.role === 'agent') {
    const currentMode = displayMode || viewMode;
    const LayoutComponent = currentMode === 'buyer' ? BuyerLayoutImproved : AgentLayoutSidebar;
    
    return (
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <LayoutComponent>{children}</LayoutComponent>
      </div>
    );
  }

  // Apply layout based on user role for non-agents
  switch (profile?.role) {
    case 'buyer':
      return <BuyerLayoutImproved>{children}</BuyerLayoutImproved>;
    case 'super_admin':
      return <SuperAdminLayout>{children}</SuperAdminLayout>;
    default:
      // Default to buyer layout for authenticated users with unknown roles
      return <BuyerLayoutImproved>{children}</BuyerLayoutImproved>;
  }
};
