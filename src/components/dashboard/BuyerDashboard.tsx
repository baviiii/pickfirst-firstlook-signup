
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Search, Heart, MessageSquare, Settings, Home, MapPin, Filter } from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useNavigate } from 'react-router-dom';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { analyticsService, BuyerMetrics } from '@/services/analyticsService';

const BuyerDashboardComponent = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [metrics, setMetrics] = useState<BuyerMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingListings(true);
      setLoadingMetrics(true);
      
      const [listingsResult, metricsResult] = await Promise.all([
        PropertyService.getApprovedListings(),
        analyticsService.getBuyerMetrics()
      ]);
      
      setListings(listingsResult.data || []);
      setMetrics(metricsResult.data);
      setLoadingListings(false);
      setLoadingMetrics(false);
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

  const buyerActions = [
    { icon: Search, label: 'Browse Properties', description: 'Find your perfect home', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/browse-properties') },
    { icon: Heart, label: 'Saved Properties', description: 'View your favorite listings', color: 'bg-red-500/10 text-red-500', onClick: () => navigate('/saved-properties') },
    { icon: MapPin, label: 'Property Map', description: 'Explore properties on map', color: 'bg-green-500/10 text-green-500', onClick: () => navigate('/property-map') },
    { icon: Filter, label: 'Search Filters', description: 'Set your preferences', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/search-filters') },
    { icon: MessageSquare, label: 'Messages', description: 'Chat with agents', color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', onClick: () => navigate('/buyer-messages') },
    { icon: Settings, label: 'Account Settings', description: 'Update your profile', color: 'bg-gray-500/10 text-gray-500', onClick: () => navigate('/buyer-account-settings') }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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
                <Card key={listing.id} className="bg-white/5 border border-pickfirst-yellow/10">
                  <CardHeader>
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
                    <CardTitle className="text-lg text-pickfirst-yellow">{listing.title}</CardTitle>
                    <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white font-bold text-xl mb-2">${listing.price.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm mb-2">{listing.property_type.replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {listing.bedrooms !== null && <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded">{listing.bedrooms} Bed</span>}
                      {listing.bathrooms !== null && <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{listing.bathrooms} Bath</span>}
                      {listing.square_feet !== null && <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded">{listing.square_feet} Sq Ft</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Stats and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
  );
};

// Export with error boundary
export const BuyerDashboard = withErrorBoundary(BuyerDashboardComponent);
