import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Heart, 
  Trash2, 
  Eye, 
  Camera,
  MapPin,
  Bed,
  Bath,
  Square,
  Grid,
  List,
  Search,
  Filter,
  SortAsc,
  Home,
  X,
  MessageSquare,
  Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import { withErrorBoundary } from '@/components/ui/error-boundary';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-saved' | 'price-low' | 'price-high' | 'title';

const SavedPropertiesPageComponent = () => {
  const navigate = useNavigate();
  const [savedProperties, setSavedProperties] = useState<PropertyListing[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-saved');
  const [propertyToRemove, setPropertyToRemove] = useState<PropertyListing | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removingProperty, setRemovingProperty] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [savedProperties, searchTerm, sortBy]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const { data, error } = await PropertyService.getFavorites();
      if (error) throw error;
      setSavedProperties(data || []);
    } catch (error) {
      toast.error('Failed to load saved properties');
      setSavedProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...savedProperties];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(term) ||
        property.address.toLowerCase().includes(term) ||
        property.city.toLowerCase().includes(term) ||
        property.state.toLowerCase().includes(term) ||
        property.description?.toLowerCase().includes(term) ||
        property.property_type.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'date-saved':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
    });

    setFilteredProperties(filtered);
  };

  const handleRemoveFromFavorites = async (property: PropertyListing) => {
    setPropertyToRemove(property);
    setShowRemoveDialog(true);
  };

  const confirmRemoveFromFavorites = async () => {
    if (!propertyToRemove) return;

    setRemovingProperty(true);
    try {
      const { error } = await PropertyService.removeFromFavorites(propertyToRemove.id);
      if (error) throw error;
      
      setSavedProperties(properties => 
        properties.filter(p => p.id !== propertyToRemove.id)
      );
      toast.success('Property removed from favorites');
    } catch (error) {
      toast.error('Failed to remove from favorites');
    } finally {
      setRemovingProperty(false);
      setShowRemoveDialog(false);
      setPropertyToRemove(null);
    }
  };

  const handleShare = async (property: PropertyListing) => {
    const url = `${window.location.origin}/property/${property.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: url,
        });
      } catch (error) {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const PropertyCard = ({ property }: { property: PropertyListing }) => {
    const hasImages = property.images && property.images.length > 0;

    if (viewMode === 'list') {
      return (
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.01]">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-80 aspect-video sm:aspect-square overflow-hidden relative">
              {hasImages ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-500" />
                </div>
              )}
              
              {/* Action Buttons Overlay */}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleShare(property)}
                  className="bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFromFavorites(property)}
                  className="bg-black/50 backdrop-blur-sm hover:bg-red-500/70 text-red-400 hover:text-white rounded-full"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{property.title}</h3>
                  <div className="flex items-center text-yellow-400/80 mb-3">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-sm">{property.address}, {property.city}, {property.state}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-yellow-400">
                    ${property.price.toLocaleString()}
                    <span className="text-sm font-normal text-yellow-400/70 ml-1">
                      {property.property_type === 'weekly' ? '/week' : property.property_type === 'monthly' ? '/month' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    {property.bedrooms !== null && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">{property.bedrooms}</span>
                      </div>
                    )}
                    {property.bathrooms !== null && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">{property.bathrooms}</span>
                      </div>
                    )}
                    {property.square_feet !== null && (
                      <div className="flex items-center gap-1">
                        <Square className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">{property.square_feet.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {property.description && (
                  <p className="text-gray-300 text-sm line-clamp-2">{property.description}</p>
                )}
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(`/property/${property.id}`)}
                    className="bg-yellow-400 hover:bg-amber-500 text-black"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveFromFavorites(property)}
                    className="text-red-400 border-red-400/40 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.02] group cursor-pointer">
        <div 
          className="relative aspect-video overflow-hidden rounded-t-lg"
          onClick={() => navigate(`/property/${property.id}`)}
        >
          {hasImages ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-500" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-yellow-400/90 hover:bg-yellow-400 text-black font-medium">
              {property.status === 'available' ? 'Available' : 'Under Contract'}
            </Badge>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleShare(property);
              }}
              className="bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFromFavorites(property);
              }}
              className="bg-black/50 backdrop-blur-sm hover:bg-red-500/70 text-red-400 hover:text-white rounded-full"
            >
              <Heart className="w-4 h-4 fill-current" />
            </Button>
          </div>
          
          {/* Image Count */}
          {hasImages && property.images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
              {property.images.length} photos
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">
                {property.title}
              </h3>
              <div className="flex items-center text-yellow-400/80">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="text-xs">{property.address}, {property.city}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold text-yellow-400">
                ${property.price.toLocaleString()}
                <span className="text-xs font-normal text-yellow-400/70 ml-1">
                  {property.property_type === 'weekly' ? '/wk' : property.property_type === 'monthly' ? '/mo' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {property.bedrooms !== null && (
                  <div className="flex items-center gap-1">
                    <Bed className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-300">{property.bedrooms}</span>
                  </div>
                )}
                {property.bathrooms !== null && (
                  <div className="flex items-center gap-1">
                    <Bath className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-300">{property.bathrooms}</span>
                  </div>
                )}
                {property.square_feet !== null && (
                  <div className="flex items-center gap-1">
                    <Square className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-300">{Math.round(property.square_feet/1000)}k</span>
                  </div>
                )}
              </div>
            </div>
            
            {property.description && (
              <p className="text-gray-400 text-xs line-clamp-2">{property.description}</p>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => navigate(`/property/${property.id}`)}
                className="flex-1 bg-yellow-400 hover:bg-amber-500 text-black text-xs py-2"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromFavorites(property);
                }}
                className="text-red-400 border-red-400/40 hover:bg-red-400/10 text-xs py-2 px-3"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 rounded-full bg-gradient-to-r from-yellow-400/15 to-amber-500/15 opacity-15 blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-yellow-400/10 opacity-10 blur-xl animate-bounce" style={{animationDuration: '4s'}}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-yellow-400/20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                    <Heart className="h-6 w-6 text-red-500 fill-current" />
                    Saved Properties
                  </h1>
                  <p className="text-sm text-yellow-400/80">
                    {filteredProperties.length} of {savedProperties.length} properties
                  </p>
                </div>
              </div>
              
              {/* View Mode Toggle - Hidden if no properties */}
              {savedProperties.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-yellow-400 text-black hover:bg-amber-500' : 'text-gray-400 hover:text-white'}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-yellow-400 text-black hover:bg-amber-500' : 'text-gray-400 hover:text-white'}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Search and Controls - Only show if there are saved properties */}
          {savedProperties.length > 0 && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search your saved properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-gray-900/50 border border-yellow-400/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent backdrop-blur-xl"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Sort Control */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2 bg-gray-900/50 border border-yellow-400/20 rounded-lg text-white focus:ring-2 focus:ring-yellow-400/50 backdrop-blur-xl"
                  >
                    <option value="date-saved">Recently Saved</option>
                    <option value="title">Property Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
                
                {searchTerm && (
                  <Button
                    variant="ghost"
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-white"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Properties Grid/List */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                  <p className="text-white">Loading your saved properties...</p>
                </div>
              </div>
            ) : savedProperties.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
                <CardContent className="text-center py-16">
                  <Heart className="h-16 w-16 text-gray-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-4">No saved properties yet</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Start browsing properties and save the ones you love by clicking the heart icon
                  </p>
                  <Button 
                    onClick={() => navigate('/browse-properties')}
                    className="bg-yellow-400 hover:bg-amber-500 text-black font-medium px-6 py-3"
                    size="lg"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Browse Properties
                  </Button>
                </CardContent>
              </Card>
            ) : filteredProperties.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
                <CardContent className="text-center py-16">
                  <Search className="h-16 w-16 text-gray-500 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-4">No properties match your search</h3>
                  <p className="text-gray-400 mb-6">Try adjusting your search terms</p>
                  <Button 
                    onClick={() => setSearchTerm('')}
                    variant="outline" 
                    className="text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-6'
              }>
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-yellow-400/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Remove from Favorites
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to remove "{propertyToRemove?.title}" from your saved properties?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={removingProperty}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRemoveFromFavorites}
              disabled={removingProperty}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              {removingProperty ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Removing...
                </span>
              ) : (
                'Remove'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SavedPropertiesPage = withErrorBoundary(SavedPropertiesPageComponent);

export default SavedPropertiesPage;