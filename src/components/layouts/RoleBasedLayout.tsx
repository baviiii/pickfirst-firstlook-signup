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
  const [prevViewMode, setPrevViewMode] = useState<'agent' | 'buyer' | null>(null);
  const [oldLayoutExiting, setOldLayoutExiting] = useState(false);

  // Initialize display mode
  useEffect(() => {
    if (profile?.role === 'agent' && displayMode === null) {
      setDisplayMode(viewMode);
      setPrevViewMode(viewMode);
    }
  }, [profile?.role, viewMode, displayMode]);

  // Handle smooth transitions between modes
  useEffect(() => {
    if (profile?.role === 'agent') {
      if (prevViewMode !== null && prevViewMode !== viewMode) {
        // Start transition
        setIsTransitioning(true);
        setOldLayoutExiting(false);
        
        // Small delay to ensure initial render, then trigger exit animation
        const startTimer = setTimeout(() => {
          setOldLayoutExiting(true);
        }, 10);
        
        // Phase 1: Fade out and slide current layout (400ms)
        const phase1Timer = setTimeout(() => {
          // Phase 2: Switch layout component
          setDisplayMode(viewMode);
          setPrevViewMode(viewMode);
          setOldLayoutExiting(false);
          
          // Phase 3: Fade in and slide new layout (400ms)
          const phase2Timer = setTimeout(() => {
            setIsTransitioning(false);
          }, 400);
          
          return () => clearTimeout(phase2Timer);
        }, 400);
        
        return () => {
          clearTimeout(startTimer);
          clearTimeout(phase1Timer);
        };
      } else if (prevViewMode === null) {
        // Initialize
        setPrevViewMode(viewMode);
        setDisplayMode(viewMode);
      }
    }
  }, [viewMode, profile?.role, prevViewMode]);

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
    const OldLayoutComponent = prevViewMode === 'buyer' ? BuyerLayoutImproved : AgentLayoutSidebar;
    const NewLayoutComponent = viewMode === 'buyer' ? BuyerLayoutImproved : AgentLayoutSidebar;
    const slideDirection = prevViewMode === 'agent' ? 'left' : 'right';
    const showOldLayout = isTransitioning && prevViewMode !== null && prevViewMode !== viewMode;
    const showNewLayout = !isTransitioning || (displayMode === viewMode && prevViewMode !== null && prevViewMode !== viewMode);
    
    return (
      <div className="relative w-full h-screen overflow-hidden">
        {/* Transitioning overlay with beautiful loading indicator */}
        {isTransitioning && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-amber-50/95 via-yellow-50/90 to-orange-50/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="text-center space-y-6">
              <div className="relative mx-auto">
                {/* Outer spinning ring */}
                <div className="w-24 h-24 border-4 border-pickfirst-yellow/20 border-t-pickfirst-yellow rounded-full animate-spin"></div>
                {/* Inner pulsing glow ring */}
                <div className="absolute inset-0 w-24 h-24 border-4 border-pickfirst-amber/40 border-t-pickfirst-amber rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                {/* Center pulsing dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-pickfirst-yellow rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-amber-800 text-xl font-bold">
                  {viewMode === 'buyer' ? 'Switching to Buyer Mode...' : 'Switching to Agent Mode...'}
                </div>
                <div className="text-amber-700/70 text-sm font-medium">Please wait while we transition</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Old layout sliding out */}
        {showOldLayout && (
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: oldLayoutExiting ? 0 : 1,
              transform: oldLayoutExiting 
                ? `translateX(${slideDirection === 'left' ? '-100%' : '100%'}) scale(0.9) rotateY(${slideDirection === 'left' ? '-15deg' : '15deg'})`
                : 'translateX(0) scale(1) rotateY(0deg)',
              filter: oldLayoutExiting ? 'blur(12px) brightness(0.8)' : 'blur(0px) brightness(1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transformStyle: 'preserve-3d',
              perspective: '1000px',
              zIndex: 1
            }}
          >
            <OldLayoutComponent>{children}</OldLayoutComponent>
          </div>
        )}
        
        {/* New layout sliding in */}
        {showNewLayout && (
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: showOldLayout ? 0 : 1,
              transform: showOldLayout 
                ? `translateX(${slideDirection === 'left' ? '100%' : '-100%'}) scale(0.9) rotateY(${slideDirection === 'left' ? '15deg' : '-15deg'})`
                : 'translateX(0) scale(1) rotateY(0deg)',
              filter: showOldLayout ? 'blur(12px) brightness(0.8)' : 'blur(0px) brightness(1)',
              transition: showOldLayout 
                ? 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.4s'
                : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transformStyle: 'preserve-3d',
              perspective: '1000px',
              zIndex: 2
            }}
          >
            <NewLayoutComponent>{children}</NewLayoutComponent>
          </div>
        )}
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
