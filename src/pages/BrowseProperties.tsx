import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Filter, SortAsc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { withErrorBoundary } from '@/components/ui/error-boundary';

const BrowsePropertiesPageComponent = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const { data } = await PropertyService.getApprovedListings();
      setListings(data || []);
      setLoading(false);
    };
    fetchListings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-primary border-white/20 hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Browse Properties</h1>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by location, property type, or keywords..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button variant="outline" className="text-gray-300 hover:text-primary">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" className="text-gray-300 hover:text-primary">
            <SortAsc className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>

        {/* Properties Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-300">Loading properties...</div>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400">No properties found.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => (
                <Card key={listing.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 hover:border-primary/40 transition-all hover:scale-105 cursor-pointer">
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
                    <CardTitle className="text-lg text-primary">{listing.title}</CardTitle>
                    <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white font-bold text-xl mb-2">${listing.price.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm mb-3">{listing.property_type.replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {listing.bedrooms !== null && <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-sm">{listing.bedrooms} Bed</span>}
                      {listing.bathrooms !== null && <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded text-sm">{listing.bathrooms} Bath</span>}
                      {listing.square_feet !== null && <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-sm">{listing.square_feet} Sq Ft</span>}
                    </div>
                    {listing.description && (
                      <p className="text-gray-300 text-sm line-clamp-2 mb-3">{listing.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">View Details</Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10">
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BrowsePropertiesPage = withErrorBoundary(BrowsePropertiesPageComponent);

export default BrowsePropertiesPage;