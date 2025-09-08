
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Search, Heart, MessageSquare, Settings, Home, MapPin, Filter, Calendar, Check, X } from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useNavigate } from 'react-router-dom';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { analyticsService, BuyerMetrics } from '@/services/analyticsService';
import { appointmentService } from '@/services/appointmentService';
import { toast } from 'sonner';

const BuyerDashboardComponent = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [metrics, setMetrics] = useState<BuyerMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingListings(true);
      setLoadingMetrics(true);
      setLoadingAppointments(true);
      
      const [listingsResult, metricsResult, myAppts] = await Promise.all([
        PropertyService.getApprovedListings(),
        analyticsService.getBuyerMetrics(),
        appointmentService.getMyAppointments()
      ]);
      
      setListings(listingsResult.data || []);
      setMetrics(metricsResult.data);
      setAppointments(myAppts.data || []);
      setLoadingListings(false);
      setLoadingMetrics(false);
      setLoadingAppointments(false);
    };
    fetchData();
  }, []);

  const getSubscriptionBadge = () => {
    const tier = profile?.subscription_tier || 'free';
    const colors = {
      free: 'bg-gray-500',
      basic: 'bg-pickfirst-yellow',
      premium: 'bg-pickfirst-amber',
      pro: 'bg-pickfirst-yellow'
    };
    
    return (
      <Badge className={`${colors[tier as keyof typeof colors]} text-black`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  const refreshAppointments = async () => {
    setLoadingAppointments(true);
    const { data } = await appointmentService.getMyAppointments();
    setAppointments(data || []);
    setLoadingAppointments(false);
  };

  const handleConfirmAppointment = async (id: string) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'confirmed' } as any);
      await refreshAppointments();
      toast.success('Appointment confirmed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to confirm appointment');
    }
  };

  const handleDeclineAppointment = async (id: string) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'declined' } as any);
      await refreshAppointments();
      toast.success('Appointment declined');
    } catch (e) {
      console.error(e);
      toast.error('Failed to decline appointment');
    }
  };

  const buyerActions = [
    { icon: Search, label: 'Browse Properties', description: 'Find your perfect home', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/browse-properties') },
    { icon: Heart, label: 'Saved Properties', description: 'View your favorite listings', color: 'bg-red-500/10 text-red-500', onClick: () => navigate('/saved-properties') },
    { icon: MapPin, label: 'Property Map', description: 'Explore properties on map', color: 'bg-green-500/10 text-green-500', onClick: () => navigate('/property-map') },
    { icon: Filter, label: 'Search Filters', description: 'Set your preferences', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/search-filters') },
    { icon: MessageSquare, label: 'Messages', description: 'Chat with agents', color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', onClick: () => navigate('/buyer-messages') },
    { icon: Settings, label: 'Account Settings', description: 'Update your profile', color: 'bg-gray-500/10 text-gray-500', onClick: () => navigate('/buyer-account-settings') }
  ];

  // Check if user has made an inquiry for a property
  const hasInquired = (propertyId: string) => {
    // This is a placeholder - you'll need to implement actual logic to check inquiries
    // For example, you might check against a list of the user's inquiries
    return false; // Return true if user has inquired about this property
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
          <Button 
            variant="outline" 
            size="sm"
            className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
          >
            Upgrade Plan
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buyerActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105" onClick={action.onClick}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base text-white">{action.label}</CardTitle>
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

      {/* Approved Property Listings for Buyers */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardHeader>
          <CardTitle className="text-white">Available Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingListings ? (
            <div className="text-gray-300">Loading properties...</div>
          ) : listings.length === 0 ? (
            <div className="text-gray-400">No properties available at the moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map(listing => (
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
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gray-800 flex items-center justify-center ${listing.images && listing.images.length > 0 ? 'hidden' : ''}`}>
                        <Home className="h-12 w-12 text-gray-500" />
                      </div>
                      
                      {/* Enhanced Inquiry Status Badge */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {hasInquired(listing.id) ? (
                          <div className="relative group">
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-full scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                            <Badge className="relative bg-green-600/90 hover:bg-green-600 text-white border border-green-400/50 shadow-lg shadow-green-900/30 transition-all duration-200 group-hover:scale-105">
                              <MessageSquare className="h-3 w-3 mr-1.5" /> Inquiry Sent
                            </Badge>
                          </div>
                        ) : (
                          <div className="relative group">
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-full scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                            <Badge variant="outline" className="relative bg-amber-600/90 hover:bg-amber-600/80 text-amber-100 border-amber-400/50 shadow-lg shadow-amber-900/20 transition-all duration-200 group-hover:scale-105">
                              <MessageSquare className="h-3 w-3 mr-1.5" /> Inquire Now
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-pickfirst-yellow line-clamp-1">{listing.title}</CardTitle>
                        <div className="text-white font-bold text-lg">${listing.price.toLocaleString()}</div>
                      </div>
                      <CardDescription className="text-gray-300 text-sm mt-1 line-clamp-1">
                        {listing.address}, {listing.city}, {listing.state}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {listing.bedrooms !== null && (
                        <div className="flex items-center text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded">
                          <span className="font-medium">{listing.bedrooms}</span>
                          <span className="ml-1 text-blue-200">Beds</span>
                        </div>
                      )}
                      {listing.bathrooms !== null && (
                        <div className="flex items-center text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded">
                          <span className="font-medium">{listing.bathrooms}</span>
                          <span className="ml-1 text-purple-200">Baths</span>
                        </div>
                      )}
                      {listing.square_feet !== null && (
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

      {/* Appointments and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Calendar className="h-5 w-5" /> My Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <div className="text-gray-300">Loading appointments...</div>
            ) : appointments.length === 0 ? (
              <div className="text-gray-400">No appointments scheduled yet.</div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt: any) => (
                  <div key={appt.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="uppercase">{appt.appointment_type?.replace('_',' ') || 'Meeting'}</Badge>
                          <span className="text-white font-medium">{appt.date} @ {appt.time}</span>
                        </div>
                        <div className="text-gray-300 text-sm">{appt.property_address || 'Virtual/Office Meeting'}</div>
                        <div className="text-gray-400 text-xs">Duration: {appt.duration || 60} min</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {appt.status === 'pending' && (
                          <>
                            <Button size="sm" className="bg-green-500/20 text-green-300 hover:bg-green-500/30" onClick={() => handleConfirmAppointment(appt.id)}>
                              <Check className="h-4 w-4 mr-1" /> Confirm
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-300 border-red-400/30 hover:bg-red-500/10" onClick={() => handleDeclineAppointment(appt.id)}>
                              <X className="h-4 w-4 mr-1" /> Decline
                            </Button>
                          </>
                        )}
                        {appt.status && appt.status !== 'pending' && (
                          <Badge className={
                            appt.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                            appt.status === 'declined' ? 'bg-red-500/20 text-red-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }>
                            {appt.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {appt.notes && (
                      <div className="text-gray-400 text-sm mt-2">Notes: {appt.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Your Property Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-500">
                  {loadingMetrics ? '...' : metrics?.totalInquiries || 0}
                </div>
                <div className="text-sm text-gray-300">Inquiries Sent</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <div className="text-2xl font-bold text-red-500">
                  {loadingMetrics ? '...' : metrics?.totalFavorites || 0}
                </div>
                <div className="text-sm text-gray-300">Saved Properties</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-500">
                  {loadingMetrics ? '...' : metrics?.savedSearches || 0}
                </div>
                <div className="text-sm text-gray-300">Saved Searches</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-500/10">
                <div className="text-2xl font-bold text-purple-500">
                  {loadingMetrics ? '...' : metrics?.totalConversations || 0}
                </div>
                <div className="text-sm text-gray-300">Conversations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingMetrics ? (
                <div className="text-gray-300">Loading activity...</div>
              ) : metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
                metrics.recentActivity.map((activity, index) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className={`h-2 w-2 rounded-full ${
                      activity.action === 'INSERT' ? 'bg-green-500' :
                      activity.action === 'UPDATE' ? 'bg-blue-500' :
                      activity.action === 'DELETE' ? 'bg-red-500' : 'bg-purple-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {activity.action.toLowerCase()} on {activity.table_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Properties */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Recommended Properties</CardTitle>
            <Button variant="outline" size="sm" className="text-gray-300 hover:text-pickfirst-yellow">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(loadingMetrics ? listings.slice(0, 3) : metrics?.recommendedProperties?.slice(0, 3) || listings.slice(0, 3)).map((listing) => (
              <div key={listing.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="aspect-video bg-gray-700 rounded-md mb-3 overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-gray-700 flex items-center justify-center ${listing.images && listing.images.length > 0 ? 'hidden' : ''}`}>
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">{listing.title}</h3>
                <p className="text-sm text-gray-400 mb-2">
                  {listing.bedrooms} bed • {listing.bathrooms} bath • {listing.square_feet} sq ft
                </p>
                <p className="text-lg font-bold text-pickfirst-yellow">${listing.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

// Export with error boundary
export const BuyerDashboard = withErrorBoundary(BuyerDashboardComponent);
