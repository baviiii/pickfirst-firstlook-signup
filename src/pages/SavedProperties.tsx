import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';

const SavedPropertiesPage = () => {
  const navigate = useNavigate();
  const [savedProperties, setSavedProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      const { data } = await PropertyService.getFavorites();
      setSavedProperties(data || []);
      setLoading(false);
    };
    fetchFavorites();
  }, []);

  const handleRemoveFromFavorites = async (propertyId: string) => {
    const { error } = await PropertyService.removeFromFavorites(propertyId);
    if (error) {
      toast.error('Failed to remove from favorites');
    } else {
      toast.success('Removed from favorites');
      setSavedProperties(properties => properties.filter(p => p.id !== propertyId));
    }
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Saved Properties</h1>
        </div>

        {/* Saved Properties Stats */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Saved Properties
            </CardTitle>
            <CardDescription className="text-gray-300">
              You have {savedProperties.length} properties saved
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Saved Properties Grid */}
        <div className="space-y-6">
          {loading ? (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
              <CardContent className="text-center py-12">
                <div className="text-gray-300">Loading your saved properties...</div>
              </CardContent>
            </Card>
          ) : savedProperties.length === 0 ? (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
              <CardContent className="text-center py-12">
                <Heart className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <div className="text-gray-400 mb-2">No saved properties yet</div>
                <div className="text-gray-500 text-sm">Start browsing to save properties you love</div>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/browse-properties')}
                >
                  Browse Properties
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProperties.map(property => (
                <Card key={property.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 hover:border-primary/40 transition-all hover:scale-105">
                  <CardHeader>
                    <div className="aspect-video bg-gray-700 rounded-md mb-3 relative overflow-hidden">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gray-700 flex items-center justify-center ${property.images && property.images.length > 0 ? 'hidden' : ''}`}>
                        <span className="text-gray-500 text-sm">No Image</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-500/10 p-2"
                          onClick={() => handleRemoveFromFavorites(property.id)}
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg text-primary">{property.title}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {property.address}, {property.city}, {property.state}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white font-bold text-xl mb-2">${property.price.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm mb-3">{property.property_type?.replace(/\b\w/g, l => l.toUpperCase()) || 'Property'}</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {property.bedrooms !== null && <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-sm">{property.bedrooms} Bed</span>}
                      {property.bathrooms !== null && <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded text-sm">{property.bathrooms} Bath</span>}
                      {property.square_feet !== null && <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-sm">{property.square_feet} Sq Ft</span>}
                    </div>
                    {property.description && (
                      <p className="text-gray-300 text-sm line-clamp-2 mb-3">{property.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-500 border-red-500 hover:bg-red-500/10"
                        onClick={() => handleRemoveFromFavorites(property.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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

export default SavedPropertiesPage;