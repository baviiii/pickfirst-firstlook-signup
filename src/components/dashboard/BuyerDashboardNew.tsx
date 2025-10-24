import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PersonalizedPropertyRecommendations } from '@/components/buyer/PersonalizedPropertyRecommendations';
import { PropertyComparisonTool } from '@/components/property/PropertyComparisonTool';
import PropertyAlerts from '@/components/buyer/PropertyAlerts';
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
  Calendar, 
  Check, 
  X,
  Clock,
  AlertCircle,
  Crown,
  Star,
  Bell,
  Menu,
  CreditCard,
  Bed,
  Bath,
  Square,
  LogOut,
  Info,
  X as CloseIcon
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useNavigate } from 'react-router-dom';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { analyticsService, BuyerMetrics } from '@/services/analyticsService';
import { appointmentService } from '@/services/appointmentService';
import { messageService } from '@/services/messageService';
import PropertyAlertService, { PropertyAlert } from '@/services/propertyAlertService';
import { toast } from 'sonner';

type AppointmentStatus = 'scheduled' | 'confirmed' | 'declined' | 'completed' | 'cancelled' | 'no_show';

function isValidAppointmentStatus(status: string): status is AppointmentStatus {
  return ['scheduled', 'confirmed', 'declined', 'completed', 'cancelled', 'no_show'].includes(status);
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  appointment_type?: string;
  property_address?: string;
  duration?: number;
  notes?: string;
  property?: {
    id: string;
    title: string;
    address: string;
  } | null;
  agent?: {
    id: string;
    full_name: string;
  } | null;
}

const BuyerDashboardNewComponent = () => {
  const { profile, signOut } = useAuth();
  const { subscribed, subscriptionTier, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();
  
  // State management
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [metrics, setMetrics] = useState<BuyerMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024); // Desktop open by default
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

  // Fetch all data and notifications on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          listingsResult,
          metricsResult,
          appointmentsResult,
          messageStats,
          propertyAlerts
        ] = await Promise.all([
          PropertyService.getApprovedListings(),
          analyticsService.getBuyerMetrics(),
          appointmentService.getMyAppointments().then(result => ({
            ...result,
            data: (result.data || []).map(appt => ({
              ...appt,
              status: isValidAppointmentStatus(appt.status) ? appt.status : 'scheduled'
            }))
          })),
          messageService.getConversationStats().catch(() => ({ total: 0, unread: 0 })),
          profile?.id ? PropertyAlertService.getBuyerAlertHistory(profile.id).catch(() => []) : Promise.resolve([])
        ]);
        
        setListings(listingsResult.data || []);
        setMetrics(metricsResult.data);
        setAppointments(appointmentsResult.data || []);
        
        // Calculate notifications
        setUnreadMessages(messageStats.unread || 0);
        
        // Count pending appointments (scheduled or confirmed in the future)
        const pending = (appointmentsResult.data || []).filter(
          appt => ['scheduled', 'confirmed'].includes(appt.status)
        ).length;
        setPendingAppointments(pending);
        
        // Count new property alerts from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newAlerts = (propertyAlerts || []).filter(
          (alert: PropertyAlert) => new Date(alert.created_at) > sevenDaysAgo
        ).length;
        setNewPropertyAlerts(newAlerts);
        
        // Count new properties from last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const newProps = (listingsResult.data || []).filter(
          (listing: PropertyListing) => new Date(listing.created_at || '') > threeDaysAgo
        ).length;
        setRecentProperties(newProps);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoadingListings(false);
        setLoadingMetrics(false);
        setLoadingAppointments(false);
      }
    };
    
    fetchData();
    
    // Set up real-time message updates
    const messageSubscription = messageService.subscribeToConversations(
      () => {
        // Refresh message stats when conversations update
        messageService.getConversationStats()
          .then(stats => setUnreadMessages(stats.unread || 0))
          .catch(console.error);
      }
    );
    
    return () => {
      messageSubscription?.unsubscribe();
    };
  }, [profile]);

  // Show welcome toast on mount
  useEffect(() => {
    const firstName = profile?.full_name?.split(' ')[0] || 'Buyer';
    toast.success(`Welcome back, ${firstName}! 👋`, {
      description: "Ready to find your dream home?",
      duration: 3000,
    });
  }, []);

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

  // Refresh appointments
  const refreshAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const { data } = await appointmentService.getMyAppointments();
      const validatedAppointments = (data || []).map(appt => ({
        ...appt,
        status: isValidAppointmentStatus(appt.status) ? appt.status : 'scheduled'
      }));
      setAppointments(validatedAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      toast.error('Failed to refresh appointments');
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  // Handle appointment actions
  const handleConfirmAppointment = async (id: string) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'confirmed' } as any);
      await refreshAppointments();
      toast.success('Appointment confirmed');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast.error('Failed to confirm appointment');
    }
  };

  const handleDeclineAppointment = async (id: string) => {
    try {
      const result = await appointmentService.updateAppointment(id, { status: 'declined' } as any);
      if (result.error) {
        toast.error('Failed to decline appointment');
        return;
      }
      await refreshAppointments();
      toast.success('Appointment declined');
    } catch (error) {
      console.error('Error declining appointment:', error);
      toast.error('Failed to decline appointment');
    }
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

  const getAppointmentStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
      declined: 'bg-red-500/20 text-red-300 border-red-500/30',
      completed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      no_show: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
  };

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
            {/* Logo - Always visible */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                {/* Gradient Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-pickfirst-yellow via-amber-500 to-pickfirst-yellow rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-[pulse_3s_ease-in-out_infinite]"></div>
                {/* Logo Container */}
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
              {/* Desktop Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {/* Mobile Close */}
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

        {/* Sidebar Footer - Subscription & Actions */}
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
                onUnreadCountChange={(count) => {
                  // Update the total notifications count when notifications are read/deleted
                  // This keeps the badge in sync with the actual notification state
                }}
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

        {/* Dashboard Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Inquiries Sent</p>
                    <p className="text-3xl font-bold text-blue-400">{loadingMetrics ? '...' : metrics?.totalInquiries || 0}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/40 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Saved Properties</p>
                    <p className="text-3xl font-bold text-red-400">{loadingMetrics ? '...' : metrics?.totalFavorites || 0}</p>
                  </div>
                  <Heart className="h-10 w-10 text-red-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Saved Searches</p>
                    <p className="text-3xl font-bold text-green-400">{loadingMetrics ? '...' : metrics?.savedSearches || 0}</p>
                  </div>
                  <Filter className="h-10 w-10 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Conversations</p>
                    <p className="text-3xl font-bold text-purple-400">{loadingMetrics ? '...' : metrics?.totalConversations || 0}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personalized Property Recommendations */}
          <PersonalizedPropertyRecommendations />

          {/* Recent Appointments */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-pickfirst-yellow" />
                    Upcoming Appointments
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Your scheduled property viewings
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/buyer-account-settings?tab=appointments')}
                  className="text-gray-300 hover:text-pickfirst-yellow border-pickfirst-yellow/30"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
                  <span className="ml-3 text-gray-300">Loading appointments...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-400">No appointments scheduled yet</div>
                  <div className="text-gray-500 text-sm mt-1">Agents will schedule appointments with you here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 3).map((appt) => (
                    <div key={appt.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="uppercase text-xs">
                              {appt.appointment_type?.replace('_', ' ') || 'Meeting'}
                            </Badge>
                            <span className="text-white font-medium text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {appt.date} @ {appt.time}
                            </span>
                          </div>
                          {appt.property?.title && (
                            <div className="text-gray-300 text-sm">{appt.property.title}</div>
                          )}
                          {appt.agent && (
                            <div className="text-gray-400 text-xs">
                              With: {appt.agent.full_name}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {appt.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500/20 text-green-300 hover:bg-green-500/30" 
                                onClick={() => handleConfirmAppointment(appt.id)}
                              >
                                <Check className="h-4 w-4 mr-1" /> Confirm
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-300 border-red-400/30 hover:bg-red-500/10" 
                                onClick={() => handleDeclineAppointment(appt.id)}
                              >
                                <X className="h-4 w-4 mr-1" /> Decline
                              </Button>
                            </>
                          )}
                          {appt.status && appt.status !== 'scheduled' && (
                            <Badge className={getAppointmentStatusBadge(appt.status)}>
                              {appt.status.charAt(0).toUpperCase() + appt.status.slice(1).replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Comparison Tool */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Property Comparison Tool</CardTitle>
              <CardDescription className="text-gray-300">Compare properties side by side</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyComparisonTool />
            </CardContent>
          </Card>

          {/* Property Alerts */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-pickfirst-yellow" />
                Property Alerts
              </CardTitle>
              <CardDescription className="text-gray-300">Get notified about new listings matching your criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyAlerts />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Export with error boundary
export const BuyerDashboardNew = withErrorBoundary(BuyerDashboardNewComponent);
