import { useEffect, useState } from 'react';
import PropertyMap from '@/components/maps/PropertyMap';
import { MapAnalyticsService } from '@/services/mapAnalyticsService';
import { toast } from 'sonner';
import { Loader2, Crown, Lock, MapPin } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

type PropertyListing = Tables<'property_listings'>;

const PropertyMapPage = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canAccessOffMarketListings, subscriptionTier } = useSubscription();

  // Fetch real properties from the database
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await MapAnalyticsService.getMapProperties();
      
      if (error) {
        console.error('Error fetching properties:', error);
        setError('Failed to load properties');
        toast.error('Failed to load properties');
      } else {
        setProperties(data || []);
        if (data && data.length === 0) {
          toast.info('No properties available in the system yet');
        } else {
          toast.success(`Loaded ${data?.length || 0} properties for the map`);
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handlePropertySelect = (property: PropertyListing) => {
    toast.success(`Selected: ${property.title}`);
    // Handle property selection - could navigate to property details
    // You can implement navigation to property details page here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-pickfirst-yellow" />
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Properties</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-pickfirst-yellow text-black rounded hover:bg-amber-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasOffMarketAccess = canAccessOffMarketListings();
  // Filter properties based on premium access: premium users see all properties including off-market
  const visibleProperties = hasOffMarketAccess
    ? properties // Premium users see ALL properties (including off-market with listing_source = 'agent_posted')
    : properties.filter(property => (property as any).listing_source !== 'agent_posted'); // Non-premium: exclude off-market
  
  // Count off-market properties (for both premium and non-premium to show what's available)
  const totalOffMarketCount = properties.filter(p => (p as any).listing_source === 'agent_posted').length;
  const offMarketCount = hasOffMarketAccess ? totalOffMarketCount : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Property Map</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {visibleProperties.length > 0 
            ? `Explore ${visibleProperties.length} properties in your area with our interactive map. Search for locations, view property details, and find your perfect home.`
            : 'No properties are currently available in the system. Check back later or contact an agent to add new listings.'
          }
        </p>
        {visibleProperties.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center px-4 py-2 bg-pickfirst-yellow/20 text-foreground rounded-full text-sm border border-pickfirst-yellow/30">
              <span className="w-2 h-2 bg-pickfirst-yellow rounded-full mr-2"></span>
              {visibleProperties.length} {visibleProperties.length === 1 ? 'property' : 'properties'} available
            </div>
            {hasOffMarketAccess && offMarketCount > 0 && (
              <div className="inline-flex items-center px-4 py-2 bg-green-500/10 text-foreground rounded-full text-sm border border-green-500/30">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {offMarketCount} exclusive off-market {offMarketCount === 1 ? 'listing' : 'listings'}
              </div>
            )}
          </div>
        )}
        
        {/* Premium Off-Market Button */}
        <div className="mt-4 flex justify-center">
          {hasOffMarketAccess ? (
            <Button
              onClick={() => navigate('/off-market')}
              className="bg-gradient-to-r from-pickfirst-yellow to-pickfirst-amber hover:from-pickfirst-amber hover:to-pickfirst-yellow text-black font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Crown className="w-5 h-5" />
              <span>View {totalOffMarketCount > 0 ? `${totalOffMarketCount} ` : ''}Exclusive Off-Market Properties</span>
              <MapPin className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-pickfirst-yellow/90 to-pickfirst-amber/90 hover:from-pickfirst-yellow hover:to-pickfirst-amber text-black font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Lock className="w-5 h-5 relative z-10" />
              <span className="relative z-10">
                {totalOffMarketCount > 0 
                  ? `Unlock ${totalOffMarketCount} Exclusive Off-Market ${totalOffMarketCount === 1 ? 'Listing' : 'Listings'} - Upgrade to Premium`
                  : 'Upgrade to Premium - Access Exclusive Off-Market Listings'
                }
              </span>
              <Crown className="w-5 h-5 relative z-10" />
            </Button>
          )}
        </div>
      </div>

      {/* Property Map Component */}
      <PropertyMap
        properties={visibleProperties}
        onPropertySelect={handlePropertySelect}
        showControls={true}
        className="w-full"
      />
    </div>
  );
};

export default PropertyMapPage;