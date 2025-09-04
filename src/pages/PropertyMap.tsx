import { useEffect, useState } from 'react';
import { PageWrapper } from '@/components/ui/page-wrapper';
import PropertyMap from '@/components/maps/PropertyMap';
import { MapAnalyticsService } from '@/services/mapAnalyticsService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type PropertyListing = Tables<'property_listings'>;

const PropertyMapPage = () => {
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    console.log('Selected property:', property);
    toast.success(`Selected: ${property.title}`);
    // Handle property selection - could navigate to property details
    // You can implement navigation to property details page here
  };

  if (loading) {
    return (
      <PageWrapper title="Property Map" showBackButton={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading properties...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Property Map" showBackButton={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Properties</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Property Map" showBackButton={false}>
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Map</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {properties.length > 0 
              ? `Explore ${properties.length} properties in your area with our interactive map. Search for locations, view property details, and find your perfect home.`
              : 'No properties are currently available in the system. Check back later or contact an agent to add new listings.'
            }
          </p>
          {properties.length > 0 && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
            </div>
          )}
        </div>

        {/* Property Map Component */}
        <PropertyMap
          properties={properties}
          onPropertySelect={handlePropertySelect}
          showControls={true}
          className="w-full"
        />
      </div>
    </PageWrapper>
  );
};

export default PropertyMapPage; 