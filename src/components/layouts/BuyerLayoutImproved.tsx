import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { AdvancedSearchDropdown } from '@/components/search/AdvancedSearchDropdown';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useViewMode } from '@/hooks/useViewMode';
import { 
  Search, 
  Heart, 
  MessageSquare, 
  Settings, 
  Home, 
  MapPin, 
  Filter, 
  Menu,
  CreditCard,
  Crown,
  LogOut,
  Info,
  X,
  Star,
  ShoppingBag,
  UserCog
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BuyerLayoutProps {
  children: ReactNode;
}

export const BuyerLayoutImproved = ({ children }: BuyerLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { subscriptionTier, openCustomerPortal } = useSubscription();
  const { viewMode, toggleViewMode, canSwitchToBuyer } = useViewMode();
  const navigate = useNavigate();
  
  // State management - Start with sidebar closed for cleaner look
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Get subscription badge
  const getSubscriptionBadge = () => {
    const tier = profile?.subscription_tier || subscriptionTier || 'free';
    const badgeConfig = {
      free: { color: 'bg-gray-500', label: 'Free', icon: null },
      basic: { color: 'bg-yellow-600', label: 'Basic', icon: Crown },
      premium: { color: 'bg-amber-600', label: 'Premium', icon: Crown }
    };
    
    const config = badgeConfig[tier as keyof typeof badgeConfig] || badgeConfig.free;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        {IconComponent && <IconComponent className="w-3 h-3" />}
        {config.label}
      </Badge>
    );
  };

  // Buyer action items configuration
  const buyerActions = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      description: 'View your overview', 
      color: 'bg-yellow-600/10 text-yellow-700', 
      onClick: () => navigate('/dashboard') 
    },
    { 
      icon: Search, 
      label: 'Browse Properties', 
      description: 'Find your perfect home', 
      color: 'bg-amber-600/10 text-amber-700', 
      onClick: () => navigate('/browse-properties') 
    },
    { 
      icon: Star, 
      label: 'Off-Market Properties', 
      description: subscriptionTier === 'premium' ? 'Exclusive agent listings' : 'Premium feature', 
      color: 'bg-amber-600/10 text-amber-700', 
      onClick: () => subscriptionTier === 'premium' ? navigate('/off-market') : navigate('/pricing'),
      premium: subscriptionTier !== 'premium'
    },
    { 
      icon: Heart, 
      label: 'Saved Properties', 
      description: 'View your favorites', 
      color: 'bg-orange-600/10 text-orange-700', 
      onClick: () => navigate('/saved-properties') 
    },
    { 
      icon: MapPin, 
      label: 'Property Map', 
      description: 'Explore on map', 
      color: 'bg-yellow-600/10 text-yellow-700', 
      onClick: () => navigate('/property-map') 
    },
    { 
      icon: Filter, 
      label: 'Search Filters', 
      description: 'Set preferences', 
      color: 'bg-amber-600/10 text-amber-700', 
      onClick: () => navigate('/search-filters') 
    },
    { 
      icon: MessageSquare, 
      label: 'Messages', 
      description: 'Chat with agents', 
      color: 'bg-yellow-600/10 text-yellow-700', 
      onClick: () => navigate('/buyer-messages') 
    },
    { 
      icon: Settings, 
      label: 'Account Settings', 
      description: 'Manage your account', 
      color: 'bg-gray-500/10 text-gray-600', 
      onClick: () => navigate('/buyer-account-settings') 
    }
  ];

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Animated Flowing Water Background - Multiple Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50"></div>
      
      {/* Flowing Gradient Waves - Layer 1 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
          style={{
            background: 'radial-gradient(circle at 30% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)',
            animation: 'flow1 25s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[200%] h-[200%] -top-1/2 -right-1/2"
          style={{
            background: 'radial-gradient(circle at 70% 50%, rgba(245, 158, 11, 0.25) 0%, transparent 50%)',
            animation: 'flow2 30s ease-in-out infinite',
            animationDelay: '5s'
          }}
        />
        <div 
          className="absolute w-[200%] h-[200%] -bottom-1/2 -left-1/2"
          style={{
            background: 'radial-gradient(circle at 40% 50%, rgba(249, 115, 22, 0.2) 0%, transparent 50%)',
            animation: 'flow3 35s ease-in-out infinite',
            animationDelay: '10s'
          }}
        />
      </div>

      {/* Floating Liquid Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large flowing blob - moves like water */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.2) 40%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'floatBlob1 20s ease-in-out infinite',
            top: '10%',
            left: '20%'
          }}
        />
        
        {/* Medium flowing blob */}
        <div 
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(249, 115, 22, 0.2) 40%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'floatBlob2 25s ease-in-out infinite',
            bottom: '15%',
            right: '15%',
            animationDelay: '7s'
          }}
        />
        
        {/* Small accent blob */}
        <div 
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(252, 211, 77, 0.3) 0%, rgba(251, 191, 36, 0.15) 40%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'floatBlob3 18s ease-in-out infinite',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animationDelay: '3s'
          }}
        />

        {/* Additional flowing particles */}
        <div 
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, transparent 60%)',
            filter: 'blur(35px)',
            animation: 'floatBlob4 22s ease-in-out infinite',
            top: '70%',
            left: '10%',
            animationDelay: '12s'
          }}
        />
        
        <div 
          className="absolute w-[350px] h-[350px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 60%)',
            filter: 'blur(45px)',
            animation: 'floatBlob5 28s ease-in-out infinite',
            top: '20%',
            right: '25%',
            animationDelay: '5s'
          }}
        />
      </div>

      {/* Subtle shimmer overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.03) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 15s ease-in-out infinite'
        }}
      />

      {/* Elegant texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(180,83,9,0.02)_1px,transparent_0)] bg-[length:32px_32px] pointer-events-none"></div>

      {/* Add keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30%, 20%) rotate(120deg); }
          66% { transform: translate(-20%, 30%) rotate(240deg); }
        }
        @keyframes flow2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-25%, -15%) rotate(-120deg); }
          66% { transform: translate(25%, -25%) rotate(-240deg); }
        }
        @keyframes flow3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20%, -20%) rotate(180deg); }
        }
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -80px) scale(1.1); }
          66% { transform: translate(-80px, 50px) scale(0.9); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, 70px) scale(1.15); }
          66% { transform: translate(70px, -60px) scale(0.95); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(calc(-50% + 40px), calc(-50% - 40px)) scale(1.1); }
        }
        @keyframes floatBlob4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -50px) scale(1.2); }
        }
        @keyframes floatBlob5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 60px) scale(1.1); }
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      ` }} />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Floating Sidebar with Lighter Glass Effect */}
      <aside className={`${
        sidebarOpen ? 'lg:w-80' : 'lg:w-0'
      } ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } 
      w-80 transition-all duration-500 ease-out flex flex-col h-screen fixed lg:relative top-0 z-40 overflow-hidden`}>
        {/* Lighter glass background for sidebar */}
        <div className="absolute inset-0 pickfirst-glass bg-card/90 backdrop-blur-2xl border-r border-pickfirst-yellow/30"></div>
        
        {/* Flowing water effect inside sidebar */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[150%] h-[150%] -top-1/4 -left-1/4"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 60%)',
              animation: 'sidebarFlow1 20s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute w-[120%] h-[120%] -bottom-1/4 -right-1/4"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.12) 0%, transparent 60%)',
              animation: 'sidebarFlow2 25s ease-in-out infinite',
              animationDelay: '5s'
            }}
          />
        </div>

        {/* Very subtle floating blobs in sidebar */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-[200px] h-[200px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%)',
              filter: 'blur(28px)',
              animation: 'sidebarBlob1 15s ease-in-out infinite',
              top: '20%',
              left: '30%'
            }}
          />
          <div 
            className="absolute w-[180px] h-[180px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
              filter: 'blur(24px)',
              animation: 'sidebarBlob2 18s ease-in-out infinite',
              bottom: '30%',
              right: '20%',
              animationDelay: '7s'
            }}
          />
          <div 
            className="absolute w-[150px] h-[150px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, transparent 70%)',
              filter: 'blur(18px)',
              animation: 'sidebarBlob3 20s ease-in-out infinite',
              top: '60%',
              left: '10%',
              animationDelay: '3s'
            }}
          />
        </div>

        {/* Subtle shimmer for sidebar */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.05) 50%, transparent 60%)',
            backgroundSize: '200% 200%',
            animation: 'sidebarShimmer 12s ease-in-out infinite'
          }}
        />
        
        {/* Gradient border */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-pickfirst-yellow/40 to-transparent"></div>
        
        {/* Sidebar animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes sidebarFlow1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(20%, -20%) rotate(180deg); }
          }
          @keyframes sidebarFlow2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(-20%, 20%) rotate(-180deg); }
          }
          @keyframes sidebarBlob1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -40px) scale(1.1); }
            66% { transform: translate(-20px, 30px) scale(0.9); }
          }
          @keyframes sidebarBlob2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-30px, 35px) scale(1.15); }
            66% { transform: translate(35px, -30px) scale(0.95); }
          }
          @keyframes sidebarBlob3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(25px, -25px) scale(1.1); }
          }
          @keyframes sidebarShimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        ` }} />
        
        <div className="relative z-10 flex flex-col h-full">
        
        {/* Elegant Sidebar Header */}
        <div className="p-6 border-b border-border/60">
          <div className="flex items-center justify-between">
            {/* Premium Logo Design */}
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-all duration-300"
              onClick={() => navigate('/dashboard')}
            >
              <div className="relative group">
                {/* Animated glow ring */}
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition duration-700 animate-[pulse_4s_ease-in-out_infinite]"></div>
                
                {/* Logo container */}
                <div className="relative w-12 h-12 rounded-2xl bg-card shadow-2xl shadow-yellow-600/20 flex items-center justify-center overflow-hidden ring-2 ring-pickfirst-yellow/40 group-hover:ring-pickfirst-yellow/60 transition-all duration-300 p-1">
                  <div className="w-full h-full rounded-xl bg-card flex items-center justify-center overflow-hidden">
                    <img 
                      src="/logo.jpg" 
                      alt="PickFirst Logo" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div>
                <span className="font-bold text-foreground text-xl tracking-tight">PickFirst</span>
                <div className="text-xs text-muted-foreground font-medium">Premium Properties</div>
              </div>
            </div>
            
            {/* Elegant Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSidebarOpen(false);
                setMobileMenuOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-xl transition-all duration-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Beautiful Navigation Items */}
        <nav className="flex-1 p-5 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-pickfirst-yellow/30 scrollbar-track-transparent">
          {buyerActions.map((action, index) => {
            const Icon = action.icon;
            const showPremiumBadge = (action as any).premium && subscriptionTier === 'free';
            
            return (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setSidebarOpen(false);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 rounded-2xl transition-all duration-300 justify-start px-4 py-4 hover:bg-card/80 hover:shadow-lg hover:shadow-yellow-600/10 border border-transparent hover:border-pickfirst-yellow/40 group relative hover:-translate-y-0.5"
              >
                {/* Icon with floating effect */}
                <div className={`p-3 rounded-xl ${action.color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg shadow-yellow-600/10`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Text content */}
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {action.description}
                  </div>
                </div>
                
                {/* Premium badge */}
                {showPremiumBadge && (
                  <div className="absolute top-2 right-2">
                    <Crown className="w-4 h-4 text-yellow-600 animate-pulse" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Luxurious Sidebar Footer */}
        <div className="p-5 border-t border-yellow-700/10 space-y-4 bg-gradient-to-b from-transparent to-amber-50/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-yellow-700" />
                <span className="text-sm font-medium text-amber-800">Your Plan</span>
              </div>
              {getSubscriptionBadge()}
            </div>
            {subscriptionTier === 'free' ? (
              <Button
                onClick={() => navigate('/pricing')}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white text-sm font-semibold shadow-lg shadow-yellow-600/30 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-yellow-600/40 hover:-translate-y-0.5"
                size="sm"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            ) : (
              <Button
                onClick={openCustomerPortal}
                variant="outline"
                className="w-full text-amber-800 border-yellow-700/30 hover:bg-yellow-600/10 hover:border-yellow-600/50 text-sm rounded-xl transition-all duration-300"
                size="sm"
              >
                Manage Subscription
              </Button>
            )}
          </div>
          <div className="pt-3 border-t border-yellow-700/10 space-y-2">
            <Button
              onClick={() => navigate('/about')}
              variant="ghost"
              className="w-full justify-start text-amber-700 hover:text-yellow-900 hover:bg-yellow-600/10 text-sm rounded-xl transition-all duration-300"
              size="sm"
            >
              <Info className="h-4 w-4 mr-2" />
              About PickFirst
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-500/10 text-sm rounded-xl transition-all duration-300"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        </div>
      </aside>

      {/* Main Content with Floating Card Effect */}
      <main className="flex-1 transition-all duration-500 ease-out overflow-y-auto h-screen flex flex-col relative">
        {/* Elegant Floating Header */}
        <header className="sticky top-0 z-10 mx-4 mt-4 mb-2 rounded-2xl bg-gradient-to-r from-amber-50/95 via-yellow-50/90 to-orange-50/95 backdrop-blur-2xl shadow-xl shadow-yellow-600/10 border border-yellow-700/20">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            {/* Left: Elegant Menu Toggle */}
            <Button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              variant="ghost"
              size="sm"
              className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-600/10 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-yellow-600/20"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Center: Premium Search (desktop only) */}
            <div className="hidden lg:flex flex-1 max-w-2xl">
              <AdvancedSearchDropdown />
            </div>

            {/* Right: Agent Mode Toggle (if agent), Notifications & Premium Profile */}
            <div className="flex items-center gap-3">
              {/* Beautiful Agent Mode Toggle Button (only show if agent in buyer mode) */}
              {canSwitchToBuyer && viewMode === 'buyer' && (
                <Button
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      toggleViewMode();
                      setIsTransitioning(false);
                    }, 300);
                  }}
                  variant="outline"
                  size="sm"
                  className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300/50 text-amber-700 hover:from-amber-100 hover:to-yellow-100 hover:border-amber-400/70 hover:text-amber-800 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 group"
                >
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="relative flex items-center gap-2">
                    <UserCog className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span className="hidden sm:inline font-medium">Agent Mode</span>
                  </div>
                </Button>
              )}

              <NotificationDropdown />

              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-600/10 to-amber-500/10 border border-yellow-700/20 shadow-lg shadow-yellow-600/10 hover:shadow-xl hover:shadow-yellow-600/20 transition-all duration-300">
                <div className="relative">
                  {/* Glow ring */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-yellow-600 to-amber-600 rounded-full blur-sm opacity-40"></div>
                  
                  {/* Avatar */}
                  <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-yellow-600 to-amber-700 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-yellow-600/30">
                    {profile?.full_name?.charAt(0) || 'B'}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-yellow-900">{profile?.full_name || 'Buyer'}</div>
                  <div className="text-xs text-amber-700/70 font-medium">Property Seeker</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Floating Card Style */}
        <div className="flex-1 px-4 pb-4">
          <div className="h-full rounded-2xl bg-white/40 backdrop-blur-sm shadow-2xl shadow-yellow-600/10 border border-yellow-700/10 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};