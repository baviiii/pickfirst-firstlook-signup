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

// ============================================
// TRANSITION CONFIGURATION - EDIT HERE! 🎨
// ============================================
const TRANSITION_CONFIG = {
  // Timing (in milliseconds)
  duration: 400,              // How long each phase takes (old layout out, new layout in)
  startDelay: 10,            // Small delay before starting animation (for smooth rendering)
  
  // Easing function (controls animation speed curve)
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Try: 'ease-in-out', 'ease-out', or custom cubic-bezier
  
  // Transform effects
  scale: {
    start: 1,                // Initial scale (1 = normal size)
    end: 0.9,                // Scale during transition (0.9 = 90% size)
  },
  rotateY: {
    degrees: 15,             // 3D rotation angle (degrees) - set to 0 to disable
  },
  
  // Visual effects
  blur: {
    active: '12px',          // Blur amount during transition (set to '0px' to disable)
    inactive: '0px',          // Blur when not transitioning
  },
  brightness: {
    active: 0.8,             // Brightness during transition (0.8 = 80%, set to 1 to disable)
    inactive: 1,             // Normal brightness
  },
  opacity: {
    start: 1,                // Starting opacity
    end: 0,                  // Ending opacity during transition
  },
  
  // Loading overlay
  loadingOverlay: {
    show: true,              // Set to false to hide loading overlay
    spinnerSize: 24,         // Size of spinner rings (in Tailwind units, 24 = 6rem = 96px)
    spinnerSpeed: '1.5s',    // Speed of inner spinner (reverse direction)
  },
} as const;
// ============================================

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
        }, TRANSITION_CONFIG.startDelay);
        
        // Phase 1: Fade out and slide current layout
        const phase1Timer = setTimeout(() => {
          // Phase 2: Switch layout component
          setDisplayMode(viewMode);
          setPrevViewMode(viewMode);
          setOldLayoutExiting(false);
          
          // Phase 3: Fade in and slide new layout
          const phase2Timer = setTimeout(() => {
            setIsTransitioning(false);
          }, TRANSITION_CONFIG.duration);
          
          return () => clearTimeout(phase2Timer);
        }, TRANSITION_CONFIG.duration);
        
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
        {isTransitioning && TRANSITION_CONFIG.loadingOverlay.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-amber-50/95 via-yellow-50/90 to-orange-50/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="text-center space-y-6">
              <div className="relative mx-auto">
                {/* Outer spinning ring */}
                <div 
                  className="border-4 border-pickfirst-yellow/20 border-t-pickfirst-yellow rounded-full animate-spin"
                  style={{ 
                    width: `${TRANSITION_CONFIG.loadingOverlay.spinnerSize * 4}px`, 
                    height: `${TRANSITION_CONFIG.loadingOverlay.spinnerSize * 4}px` 
                  }}
                ></div>
                {/* Inner pulsing glow ring */}
                <div 
                  className="absolute inset-0 border-4 border-pickfirst-amber/40 border-t-pickfirst-amber rounded-full animate-spin"
                  style={{ 
                    width: `${TRANSITION_CONFIG.loadingOverlay.spinnerSize * 4}px`, 
                    height: `${TRANSITION_CONFIG.loadingOverlay.spinnerSize * 4}px`,
                    animationDuration: TRANSITION_CONFIG.loadingOverlay.spinnerSpeed, 
                    animationDirection: 'reverse' 
                  }}
                ></div>
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
              opacity: oldLayoutExiting ? TRANSITION_CONFIG.opacity.end : TRANSITION_CONFIG.opacity.start,
              transform: oldLayoutExiting 
                ? `translateX(${slideDirection === 'left' ? '-100%' : '100%'}) scale(${TRANSITION_CONFIG.scale.end}) rotateY(${slideDirection === 'left' ? `-${TRANSITION_CONFIG.rotateY.degrees}deg` : `${TRANSITION_CONFIG.rotateY.degrees}deg`})`
                : `translateX(0) scale(${TRANSITION_CONFIG.scale.start}) rotateY(0deg)`,
              filter: oldLayoutExiting 
                ? `blur(${TRANSITION_CONFIG.blur.active}) brightness(${TRANSITION_CONFIG.brightness.active})`
                : `blur(${TRANSITION_CONFIG.blur.inactive}) brightness(${TRANSITION_CONFIG.brightness.inactive})`,
              transition: `all ${TRANSITION_CONFIG.duration}ms ${TRANSITION_CONFIG.easing}`,
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
              opacity: showOldLayout ? TRANSITION_CONFIG.opacity.end : TRANSITION_CONFIG.opacity.start,
              transform: showOldLayout 
                ? `translateX(${slideDirection === 'left' ? '100%' : '-100%'}) scale(${TRANSITION_CONFIG.scale.end}) rotateY(${slideDirection === 'left' ? `${TRANSITION_CONFIG.rotateY.degrees}deg` : `-${TRANSITION_CONFIG.rotateY.degrees}deg`})`
                : `translateX(0) scale(${TRANSITION_CONFIG.scale.start}) rotateY(0deg)`,
              filter: showOldLayout 
                ? `blur(${TRANSITION_CONFIG.blur.active}) brightness(${TRANSITION_CONFIG.brightness.active})`
                : `blur(${TRANSITION_CONFIG.blur.inactive}) brightness(${TRANSITION_CONFIG.brightness.inactive})`,
              transition: showOldLayout 
                ? `all ${TRANSITION_CONFIG.duration}ms ${TRANSITION_CONFIG.easing} ${TRANSITION_CONFIG.duration}ms`
                : `all ${TRANSITION_CONFIG.duration}ms ${TRANSITION_CONFIG.easing}`,
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
