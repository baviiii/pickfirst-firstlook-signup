import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalizedPropertyRecommendations } from '@/components/buyer/PersonalizedPropertyRecommendations';
import { PropertyComparisonTool } from '@/components/property/PropertyComparisonTool';
import PropertyAlerts from '@/components/buyer/PropertyAlerts';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { BuyerSubscriptionStatus } from '@/components/buyer/BuyerSubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCardNotifications } from '@/hooks/useCardNotifications';
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
  TrendingUp,
  Clock,
  AlertCircle,
  Crown,
  Lock,
  Star
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useNavigate } from 'react-router-dom';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { analyticsService, BuyerMetrics } from '@/services/analyticsService';
import { appointmentService } from '@/services/appointmentService';
import { BuyerProfileService } from '@/services/buyerProfileService';
import { toast } from 'sonner';

interface BuyerPreferences {
  min_budget?: number;
  max_budget?: number;
  preferred_bedrooms?: number;
  preferred_bathrooms?: number;
  preferred_areas?: string[];
}

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

const BuyerDashboardComponent = () => {
  const { profile } = useAuth();
  const { subscribed, subscriptionTier, openCustomerPortal, isFeatureEnabled } = useSubscription();
  const navigate = useNavigate();
  const { cardCounts, hasNewNotification, clearCardNotifications } = useCardNotifications();
  
  // State management
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [metrics, setMetrics] = useState<BuyerMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsResult, metricsResult, appointmentsResult] = await Promise.all([
          PropertyService.getApprovedListings(),
          analyticsService.getBuyerMetrics(),
          appointmentService.getMyAppointments().then(result => ({
            ...result,
            data: (result.data || []).map(appt => ({
              ...appt,
              status: isValidAppointmentStatus(appt.status) ? appt.status : 'scheduled'
            }))
          }))
        ]);
        
        setListings(listingsResult.data || []);
        setMetrics(metricsResult.data);
        setAppointments(appointmentsResult.data || []);
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
  }, [profile]);

  // Get subscription badge with proper typing
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

  // Refresh appointments function
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

  // Handle appointment confirmation
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

  // Handle appointment decline
  const handleDeclineAppointment = async (id: string) => {
    try {
      const result = await appointmentService.updateAppointment(id, { status: 'declined' } as any);
      
      // Check if the service returned an error
      if (result.error) {
        console.error('Error declining appointment:', result.error);
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
      onClick: () => navigate('/browse-properties'),
      cardType: 'properties' as const
    },
    { 
      icon: Star, 
      label: 'Off-Market Properties', 
      description: subscriptionTier === 'premium' ? 'Exclusive agent listings' : 'Premium feature - upgrade to access', 
      color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', 
      onClick: () => subscriptionTier === 'premium' ? navigate('/off-market') : navigate('/pricing'),
      premium: subscriptionTier !== 'premium',
      cardType: null as any
    },
    { 
      icon: Heart, 
      label: 'Saved Properties', 
      description: 'View your favorite listings', 
      color: 'bg-red-500/10 text-red-500', 
      onClick: () => navigate('/saved-properties'),
      cardType: 'favorites' as const
    },
    { 
      icon: MapPin, 
      label: 'Property Map', 
      description: 'Explore properties on map', 
      color: 'bg-green-500/10 text-green-500', 
      onClick: () => navigate('/property-map'),
      cardType: 'properties' as const
    },
    { 
      icon: Filter, 
      label: 'Search Filters', 
      description: 'Set your preferences', 
      color: 'bg-purple-500/10 text-purple-500', 
      onClick: () => navigate('/search-filters'),
      cardType: 'alerts' as const
    },
    { 
      icon: MessageSquare, 
      label: 'Messages', 
      description: 'Chat with agents', 
      color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', 
      onClick: () => { clearCardNotifications('messages'); navigate('/buyer-messages'); },
      cardType: 'messages' as const
    },
    { 
      icon: Settings, 
      label: 'Account Settings', 
      description: 'Update your profile', 
      color: 'bg-gray-500/10 text-gray-500', 
      onClick: () => navigate('/buyer-account-settings'),
      cardType: null as any
    }
  ];

  // Check if user has made an inquiry for a property (placeholder)
  const hasInquired = (propertyId: string): boolean => {
    // TODO: Implement actual logic to check inquiries
    // This could check against user's inquiry history from the metrics or a separate service
    return false;
  };

  // Get status badge styles for appointments
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

  // Format activity action for display
  const formatActivityAction = (action: string, tableName: string) => {
    const actionMap = {
      INSERT: 'Created',
      UPDATE: 'Updated', 
      DELETE: 'Removed'
    };
    
    const tableMap = {
      inquiries: 'inquiry',
      favorites: 'favorite property',
      saved_searches: 'saved search'
    };
    
    return `${actionMap[action as keyof typeof actionMap] || action} ${tableMap[tableName as keyof typeof tableMap] || tableName}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {profile?.full_name || 'Buyer'}!
            </h1>
            <p className="text-gray-300">Ready to find your dream home?</p>
          </div>
          <div className="flex items-center gap-2">
            {getSubscriptionBadge()}
            {subscriptionTier === 'free' ? (
              <Button 
                variant="outline" 
                size="sm"
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
                onClick={() => navigate('/pricing')}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
                onClick={openCustomerPortal}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyerActions.map((action, index) => {
            const Icon = action.icon;
            const notificationCount = action.cardType ? cardCounts[action.cardType] || 0 : 0;
            const hasNew = action.cardType ? hasNewNotification(action.cardType) : false;
            
            // Show premium badge for premium actions if user is on free tier  
            const showPremiumBadge = (action as any).premium && subscriptionTier === 'free';
            
            return (
              <Card 
                key={index} 
                className={`hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105 relative ${
                  showPremiumBadge ? 'opacity-75' : ''
                } ${
                  hasNew ? 'animate-pulse-border' : ''
                }`}
                onClick={action.onClick}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${action.color} relative`}>
                        <Icon className="h-5 w-5" />
                        {notificationCount > 0 && (
                          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold ${
                            hasNew ? 'animate-bounce-scale' : ''
                          }`}>
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base text-white">{action.label}</CardTitle>
                    </div>
                    {showPremiumBadge && (
                      <Badge className="bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30 text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm text-gray-300">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Subscription Status */}
        <BuyerSubscriptionStatus />

        {/* Personalized Property Recommendations */}
        <PersonalizedPropertyRecommendations />

        {/* All Available Properties */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">All Available Properties</CardTitle>
                <CardDescription className="text-gray-300">
                  Browse all properties on the market
                </CardDescription>
              </div>
              {listings.length > 6 && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/browse-properties')}
                  className="text-white border-white/20 hover:bg-white/5"
                >
                  View All {listings.length}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingListings ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
                <span className="ml-3 text-gray-300">Loading properties...</span>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <div className="text-gray-400">No properties available at the moment.</div>
                <div className="text-gray-500 text-sm mt-1">Check back soon for new listings!</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.slice(0, 6).map(listing => (
                  <Card key={listing.id} className="bg-white/5 border border-pickfirst-yellow/10 hover:border-pickfirst-yellow/40 transition-all duration-300 group">
                    <CardHeader className="p-0 relative">
                      <div className="aspect-video bg-gray-700 rounded-t-md overflow-hidden relative">
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-gray-800 flex items-center justify-center ${listing.images && listing.images.length > 0 ? 'hidden' : ''}`}>
                          <Home className="h-12 w-12 text-gray-500" />
                        </div>
                        
                        {/* Enhanced Inquiry Status Badge */}
                        <div className="absolute top-2 right-2">
                          {hasInquired(listing.id) ? (
                            <Badge className="bg-green-600/90 hover:bg-green-600 text-white border border-green-400/50 shadow-lg">
                              <MessageSquare className="h-3 w-3 mr-1.5" /> Inquiry Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-600/90 hover:bg-amber-600/80 text-amber-100 border-amber-400/50 shadow-lg">
                              <MessageSquare className="h-3 w-3 mr-1.5" /> Inquire Now
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg text-pickfirst-yellow line-clamp-1">{listing.title}</CardTitle>
                          <div className="text-white font-bold text-lg">
                            {PropertyService.getDisplayPrice(listing)}
                          </div>
                        </div>
                        <CardDescription className="text-gray-300 text-sm line-clamp-1">
                          {listing.address}, {listing.city}, {listing.state}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {listing.bedrooms !== null && listing.bedrooms !== undefined && (
                          <div className="flex items-center text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded">
                            <span className="font-medium">{listing.bedrooms}</span>
                            <span className="ml-1 text-blue-200">Beds</span>
                          </div>
                        )}
                        {listing.bathrooms !== null && listing.bathrooms !== undefined && (
                          <div className="flex items-center text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded">
                            <span className="font-medium">{listing.bathrooms}</span>
                            <span className="ml-1 text-purple-200">Baths</span>
                          </div>
                        )}
                        {listing.square_feet !== null && listing.square_feet !== undefined && (
                          <div className="flex items-center text-xs bg-green-500/10 text-green-300 px-2 py-1 rounded">
                            <span className="font-medium">{listing.square_feet.toLocaleString()}</span>
                            <span className="ml-1 text-green-200">sq ft</span>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full bg-pickfirst-yellow/5 text-pickfirst-yellow border-pickfirst-yellow/30 hover:bg-pickfirst-yellow/10 hover:border-pickfirst-yellow/50 transition-colors"
                        onClick={() => navigate(`/property/${listing.id}`)}
                      >
                        {hasInquired(listing.id) ? 'View Inquiry' : 'View Details'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Stats and Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> My Appointments
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 border-gray-600 hover:border-pickfirst-yellow/50"
                  onClick={() => navigate('/buyer-account-settings?tab=appointments')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAppointments ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pickfirst-yellow"></div>
                  <span className="ml-3 text-gray-300">Loading appointments...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-6">
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
                          {(() => {
                            const type = appt.appointment_type;
                            const address = appt.property_address;
                            const genericAddresses = ['Virtual/Office Meeting', 'Online', 'Address Not Specified'];

                            if (type === 'property_showing') {
                              let detail = 'Property Address Not Available';
                              if (appt.property?.title) {
                                detail = appt.property.title;
                              } else if (address && !genericAddresses.includes(address)) {
                                detail = address;
                              }
                              return <div className="text-gray-300 text-sm">{detail}</div>;
                            }

                            if (address && !genericAddresses.includes(address)) {
                              return <div className="text-gray-300 text-sm">{address}</div>;
                            }

                            return null;
                          })()}
                          {appt.agent && (
                            <div className="text-gray-400 text-xs">
                              With: {appt.agent.full_name}
                            </div>
                          )}
                          <div className="text-gray-400 text-xs">
                            Duration: {appt.duration || 60} min
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {appt.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30" 
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
                      {appt.notes && (
                        <div className="text-gray-400 text-sm mt-2 p-2 bg-gray-800/30 rounded">
                          <strong>Notes:</strong> {appt.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  {appointments.length > 3 && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-pickfirst-yellow"
                        onClick={() => navigate('/buyer-account-settings?tab=appointments')}
                      >
                        View {appointments.length - 3} more appointments
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Search Stats */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Your Property Search</CardTitle>
              <CardDescription className="text-gray-300">Track your search activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                  <div className="text-2xl font-bold text-blue-500">
                    {loadingMetrics ? '...' : metrics?.totalInquiries || 0}
                  </div>
                  <div className="text-sm text-gray-300">Inquiries Sent</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                  <div className="text-2xl font-bold text-red-500">
                    {loadingMetrics ? '...' : metrics?.totalFavorites || 0}
                  </div>
                  <div className="text-sm text-gray-300">Saved Properties</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors">
                  <div className="text-2xl font-bold text-green-500">
                    {loadingMetrics ? '...' : metrics?.savedSearches || 0}
                  </div>
                  <div className="text-sm text-gray-300">Saved Searches</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
                  <div className="text-2xl font-bold text-purple-500">
                    {loadingMetrics ? '...' : metrics?.totalConversations || 0}
                  </div>
                  <div className="text-sm text-gray-300">Conversations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingMetrics ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pickfirst-yellow"></div>
                    <span className="ml-3 text-gray-300">Loading activity...</span>
                  </div>
                ) : metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
                  metrics.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <div className={`h-2 w-2 rounded-full ${
                        activity.action === 'INSERT' ? 'bg-green-500' :
                        activity.action === 'UPDATE' ? 'bg-blue-500' :
                        activity.action === 'DELETE' ? 'bg-red-500' : 'bg-purple-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {formatActivityAction(activity.action, activity.table_name)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <div className="text-gray-400 text-sm">No recent activity</div>
                  </div>
                )}
              </div>
            </CardContent>
        </Card>

        {/* Property Comparison Tool */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Property Comparison Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyComparisonTool />
          </CardContent>
        </Card>

        {/* Property Alerts */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Property Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyAlerts />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Export with error boundary
export const BuyerDashboard = withErrorBoundary(BuyerDashboardComponent);