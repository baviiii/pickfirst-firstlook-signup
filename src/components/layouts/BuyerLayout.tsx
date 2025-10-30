import { ReactNode, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { AdvancedSearchDropdown } from '@/components/search/AdvancedSearchDropdown';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
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
  X as CloseIcon,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { messageService } from '@/services/messageService';
import { appointmentService } from '@/services/appointmentService';
import PropertyAlertService from '@/services/propertyAlertService';
import { PropertyService } from '@/services/propertyService';

interface BuyerLayoutProps {
  children: ReactNode;
}

export const BuyerLayout = ({ children }: BuyerLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { subscriptionTier, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();
  
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [newPropertyAlerts, setNewPropertyAlerts] = useState(0);
  const [recentProperties, setRecentProperties] = useState(0);
  
  // Calculate total notifications
  const totalNotifications = unreadMessages + pendingAppointments + newPropertyAlerts + recentProperties;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Fetch notifications on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [messageStats, appointmentsResult, propertyAlerts, listingsResult] = await Promise.all([
          messageService.getConversationStats().catch(() => ({ total: 0, unread: 0 })),
          appointmentService.getMyAppointments().catch(() => ({ data: [], error: null })),
          profile?.id ? PropertyAlertService.getBuyerAlertHistory(profile.id).catch(() => []) : Promise.resolve([]),
          PropertyService.getApprovedListings().catch(() => ({ data: [], error: null }))
        ]);
        
        setUnreadMessages(messageStats.unread || 0);
        
        // Count pending appointments
        const pending = (appointmentsResult.data || []).filter(
          appt => ['scheduled', 'confirmed'].includes(appt.status)
        ).length;
        setPendingAppointments(pending);
        
        // Count new property alerts from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newAlerts = (propertyAlerts || []).filter(
          alert => new Date(alert.created_at) > sevenDaysAgo
        ).length;
        setNewPropertyAlerts(newAlerts);
        
        // Count new properties from last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const newProps = (listingsResult.data || []).filter(
          listing => new Date(listing.created_at || '') > threeDaysAgo
        ).length;
        setRecentProperties(newProps);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
    
    // Set up real-time message updates
    const messageSubscription = messageService.subscribeToConversations(() => {
      messageService.getConversationStats()
        .then(stats => setUnreadMessages(stats.unread || 0))
        .catch(console.error);
    });
    
    return () => {
      messageSubscription?.unsubscribe();
    };
  }, [profile]);

  // Get subscription badge
  const getSubscriptionBadge = () => {
    const tier = profile?.subscription_tier || subscriptionTier || 'free';
    const badgeConfig = {
      free: { color: 'bg-gray-500', label: 'Free', icon: null },
      basic: { color: 'bg-pickfirst-yellow', label: 'Basic', icon: Crown },
      premium: { color: 'bg-pickfirst-amber', label: 'Premium', icon: Crown }
    };
    
    const config = badgeConfig[tier as keyof typeof badgeConfig] || badgeConfig.free;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} text-black flex items-center gap-1`}>
        {IconComponent && <IconComponent className="w-3 h-3" />}
        {config.label}
      </Badge>
    );
  };

  // Buyer action items configuration
  const buyerActions = [
    { 
      icon: Search, 
      label: 'Browse Properties', 
      description: 'Find your perfect home', 
      color: 'bg-blue-500/10 text-blue-500', 
      onClick: () => navigate('/browse-properties') 
    },
    { 
      icon: Star, 
      label: 'Off-Market Properties', 
      description: subscriptionTier === 'premium' ? 'Exclusive agent listings' : 'Premium feature', 
      color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', 
      onClick: () => subscriptionTier === 'premium' ? navigate('/off-market') : navigate('/pricing'),
      premium: subscriptionTier !== 'premium'
    },
    { 
      icon: Heart, 
      label: 'Saved Properties', 
      description: 'View your favorites', 
      color: 'bg-red-500/10 text-red-500', 
      onClick: () => navigate('/saved-properties') 
    },
    { 
      icon: MapPin, 
      label: 'Property Map', 
      description: 'Explore on map', 
      color: 'bg-green-500/10 text-green-500', 
      onClick: () => navigate('/property-map') 
    },
    { 
      icon: Filter, 
      label: 'Search Filters', 
      description: 'Set preferences', 
      color: 'bg-purple-500/10 text-purple-500', 
      onClick: () => navigate('/search-filters') 
    },
    { 
      icon: MessageSquare, 
      label: 'Messages', 
      description: 'Chat with agents', 
      color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', 
      onClick: () => navigate('/buyer-messages') 
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      description: 'Update profile', 
      color: 'bg-gray-500/10 text-gray-500', 
      onClick: () => navigate('/buyer-account-settings') 
    }
  ];

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${sidebarOpen ? 'w-72' : 'w-20'} transition-all duration-300 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-r border-pickfirst-yellow/20 flex flex-col h-screen fixed lg:sticky top-0 z-40 lg:z-20`}>
        {/* Sidebar Header */}
        <div className="p-4 sm:p-6 border-b border-pickfirst-yellow/20">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pickfirst-yellow via-amber-500 to-pickfirst-yellow rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-[pulse_3s_ease-in-out_infinite]"></div>
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo.jpg" 
                    alt="PickFirst Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {sidebarOpen && (
                <span className="font-bold text-white text-lg tracking-wide">PickFirst</span>
              )}
            </div>
            
            {/* Toggle Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 lg:hidden"
              >
                <CloseIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
          {buyerActions.map((action, index) => {
            const Icon = action.icon;
            const showPremiumBadge = (action as any).premium && subscriptionTier === 'free';
            
            return (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-lg transition-all duration-200 ${
                  sidebarOpen ? 'justify-start px-4 py-3' : 'justify-center p-3'
                } hover:bg-pickfirst-yellow/10 hover:border-pickfirst-yellow/30 border border-transparent group relative`}
                title={!sidebarOpen ? action.label : undefined}
              >
                <div className={`p-2 rounded-lg ${action.color} transition-transform group-hover:scale-110 ${
                  !sidebarOpen ? 'mx-auto' : ''
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                {sidebarOpen && (
                  <>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">{action.label}</div>
                      <div className="text-xs text-gray-400 line-clamp-1">{action.description}</div>
                    </div>
                    {showPremiumBadge && (
                      <Crown className="w-4 h-4 text-pickfirst-yellow" />
                    )}
                  </>
                )}
                {!sidebarOpen && showPremiumBadge && (
                  <div className="absolute -top-1 -right-1">
                    <div className="w-2 h-2 rounded-full bg-pickfirst-yellow animate-pulse"></div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapsed Sidebar Divider */}
        {!sidebarOpen && (
          <div className="px-2 py-2">
            <div className="h-px bg-gradient-to-r from-transparent via-pickfirst-yellow/30 to-transparent"></div>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-pickfirst-yellow/20 space-y-3">
          {sidebarOpen ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-pickfirst-yellow" />
                    <span className="text-sm text-gray-300">Plan</span>
                  </div>
                  {getSubscriptionBadge()}
                </div>
                {subscriptionTier === 'free' ? (
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="w-full bg-pickfirst-yellow hover:bg-amber-500 text-black text-sm"
                    size="sm"
                  >
                    <Crown className="h-3 w-3 mr-2" />
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    onClick={openCustomerPortal}
                    variant="outline"
                    className="w-full text-gray-300 border-pickfirst-yellow/30 hover:bg-pickfirst-yellow/10 text-sm"
                    size="sm"
                  >
                    Manage Plan
                  </Button>
                )}
              </div>
              <div className="pt-2 border-t border-pickfirst-yellow/10 space-y-2">
                <Button
                  onClick={() => navigate('/about')}
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 text-sm"
                  size="sm"
                >
                  <Info className="h-4 w-4 mr-2" />
                  About Us
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/pricing')}
                variant="ghost"
                size="sm"
                className="w-full flex justify-center"
                title="Upgrade Plan"
              >
                <Crown className="h-5 w-5 text-pickfirst-yellow" />
              </Button>
              <Button
                onClick={() => navigate('/about')}
                variant="ghost"
                size="sm"
                className="w-full flex justify-center text-gray-400 hover:text-pickfirst-yellow"
                title="About Us"
              >
                <Info className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="w-full flex justify-center text-red-400 hover:text-red-300"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 transition-all duration-300 overflow-y-auto h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 bg-gradient-to-r from-gray-900/95 to-black/95 backdrop-blur-xl border-b border-pickfirst-yellow/20 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 p-3 -ml-2"
            >
              <Menu className="h-6 w-6" />
            </Button>

            {/* Advanced Search Bar */}
            <div className="flex-1 max-w-2xl">
              <AdvancedSearchDropdown />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications Dropdown */}
              <NotificationDropdown 
                unreadCount={totalNotifications}
                onUnreadCountChange={() => {}}
              />

              {/* User Profile */}
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 border border-pickfirst-yellow/20">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-pickfirst-yellow to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                  {profile?.full_name?.charAt(0) || 'B'}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-white">{profile?.full_name || 'Buyer'}</div>
                  <div className="text-xs text-gray-400">Buyer Account</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
