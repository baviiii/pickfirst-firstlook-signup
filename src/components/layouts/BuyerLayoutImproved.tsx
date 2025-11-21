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
    <div className="flex min-h-screen relative overflow-hidden bg-white">

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
        {/* Sidebar background */}
        <div className="absolute inset-0 bg-white border-r border-gray-200"></div>
        
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
        <div className="p-5 border-t border-gray-200 space-y-4 bg-white">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Your Plan</span>
              </div>
              {getSubscriptionBadge()}
            </div>
            {subscriptionTier === 'free' ? (
              <Button
                onClick={() => navigate('/pricing')}
                className="w-full bg-primary hover:bg-pickfirst-amber text-primary-foreground text-sm font-semibold shadow-sm rounded-xl transition-all duration-300"
                size="sm"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            ) : (
              <Button
                onClick={openCustomerPortal}
                variant="outline"
                className="w-full text-foreground border-border hover:bg-muted text-sm rounded-xl transition-all duration-300"
                size="sm"
              >
                Manage Subscription
              </Button>
            )}
          </div>
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <Button
              onClick={() => navigate('/about')}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted text-sm rounded-xl transition-all duration-300"
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
        <header className="sticky top-0 z-10 mx-4 mt-4 mb-1 rounded-2xl bg-white shadow-md border border-gray-200">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            {/* Left: Logo (when sidebar collapsed) + Menu Toggle */}
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-all duration-300"
                  onClick={() => navigate('/dashboard')}
                >
                  <img 
                    src="/logo.jpg" 
                    alt="PickFirst Logo" 
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  <span className="hidden md:inline font-bold text-foreground text-lg tracking-tight">PickFirst</span>
                </div>
              )}
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
                className="text-foreground hover:bg-muted rounded-xl transition-all duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Center: Premium Search (desktop only) */}
            <div className="hidden lg:flex flex-1 max-w-2xl">
              <div className="w-full rounded-2xl border border-pickfirst-yellow/40 bg-white/90 shadow-inner px-3 py-2">
                <AdvancedSearchDropdown />
              </div>
            </div>

            {/* Right: Agent Mode Toggle (if agent), Notifications & Premium Profile */}
            <div className="flex items-center gap-3">
              {/* Beautiful Agent Mode Toggle Button (only show if agent in buyer mode) */}
              {canSwitchToBuyer && viewMode === 'buyer' && (
                <Button
                  onClick={() => {
                    toggleViewMode();
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

              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/80 border border-border shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative">
                  {/* Avatar */}
                  <div className="relative h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm ring-2 ring-primary/20">
                    {profile?.full_name?.charAt(0) || 'B'}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-foreground">{profile?.full_name || 'Buyer'}</div>
                  <div className="text-xs text-muted-foreground font-medium">Property Seeker</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero search overlay */}
        <section className="mx-4 mb-4">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/60 shadow-2xl shadow-yellow-500/10 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0">
              <img
                src="/public/syndey-habour.jpg"
                alt="Sydney Harbour"
                className="w-full h-full object-cover object-center brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-transparent"></div>
              <div className="absolute -top-16 right-4 h-32 w-32 rounded-full bg-pickfirst-yellow/40 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-primary/30 blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-4 px-6 py-8 lg:px-12 lg:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Featured search
              </p>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Discover your next property with a spotlight search
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use our smart filters to surface approved, premium, and off-market homes that match your needs. The search runs instantly and stays flexible like the market.
              </p>
              <div className="w-full max-w-4xl rounded-2xl border border-pickfirst-yellow/40 bg-white/90 p-2 shadow-lg shadow-yellow-500/10">
                <AdvancedSearchDropdown />
              </div>
            </div>
          </div>
        </section>

        {/* Content Area - Floating Card Style */}
        <div className="flex-1 px-4 pb-24 md:pb-4">
          <div className="h-full rounded-2xl bg-white shadow-sm border border-gray-200 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};