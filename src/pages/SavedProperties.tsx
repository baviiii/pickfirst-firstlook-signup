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
  Share2,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { useSubscription } from '@/hooks/useSubscription';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-saved' | 'price-low' | 'price-high' | 'title';

const SavedPropertiesPageComponent = () => {
  const navigate = useNavigate();
  const { getFavoritesLimit } = useSubscription();
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

  const formatPriceForDisplay = (price: number | null, priceDisplay: string | null) => {
    if (priceDisplay && priceDisplay.trim().length > 0) {
      return priceDisplay.trim();
    }
    if (price && price > 0) {
      return `$${price.toLocaleString()}`;
    }
    return 'Price on request';
  };

  const PropertyCard = ({ property }: { property: PropertyListing }) => {
    const hasImages = property.images && property.images.length > 0;
    const isSold = property.status === 'sold' && !!property.sold_price && property.sold_price > 0;
    const displayPrice = PropertyService.getDisplayPrice(property);
    const originalPriceText = formatPriceForDisplay(property.price, property.price_display);

    if (viewMode === 'list') {
      return (
        <Card className="text-card-foreground shadow-2xl transition-all duration-300 hover:scale-[1.01] pickfirst-glass bg-card/90 border border-pickfirst-yellow/30">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-80 aspect-video sm:aspect-square overflow-hidden relative">
              {hasImages ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Home className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Action Buttons Overlay */}
              <div className="absolute top-3 right-3 flex gap-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleShare(property)}
                  className="bg-black/60 hover:bg-black/80 text-white rounded-full"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFromFavorites(property)}
                  className="bg-black/60 hover:bg-red-500/80 text-red-400 hover:text-white rounded-full"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </Button>
              </div>
            </div>
            
            <CardContent className="flex-1 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{property.title}</h3>
                  <div className="flex items-center text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-sm">{property.address}, {property.city}, {property.state}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-primary">
                    {isSold && originalPriceText ? (
                      <>
                        <span className="text-lg text-muted-foreground line-through">{originalPriceText}</span>
                        <br />
                        <span className="text-green-600">{displayPrice}</span>
                      </>
                    ) : (
                      displayPrice
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {property.bedrooms !== null && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        <span>{property.bedrooms}</span>
                      </div>
                    )}
                    {property.bathrooms !== null && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        <span>{property.bathrooms}</span>
                      </div>
                    )}
                    {property.square_feet !== null && (
                      <div className="flex items-center gap-1">
                        <Square className="w-4 h-4" />
                        <span>{property.square_feet.toLocaleString()} sq metres</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {property.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2">{property.description}</p>
                )}
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(`/property/${property.id}`)}
                    className="bg-primary hover:bg-pickfirst-amber text-primary-foreground"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveFromFavorites(property)}
                    className="border-red-500/40 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      );
    }

    return (
      <Card 
        className="text-card-foreground shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden relative pickfirst-glass bg-card/90 border border-pickfirst-yellow/30 hover:shadow-pickfirst-yellow/30 cursor-pointer group"
        onClick={() => navigate(`/property/${property.id}`)}
      >
        <div className="relative">
          {/* Property Image */}
          <div className="aspect-video overflow-hidden relative">
            {hasImages ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Home className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex gap-2 z-10 flex-wrap">
            {isSold && (
              <Badge className="bg-red-500 text-white font-bold">
                SOLD
              </Badge>
            )}
            {property.status === 'available' && !isSold && (
              <Badge className="bg-green-500 text-white font-bold">
                Available
              </Badge>
            )}
            {hasImages && (
              <Badge className="bg-black/50 text-white flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {property.images.length}
              </Badge>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleShare(property);
              }}
              className="bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="bg-black/60 hover:bg-red-500/80 text-red-400 hover:text-white rounded-full"
            >
              <Heart className="w-4 h-4 fill-current" />
            </Button>
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Price */}
            <div className="flex items-center justify-between">
              <h3 className={`text-2xl font-bold ${isSold ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                {isSold && originalPriceText ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{originalPriceText}</span>
                    <br />
                    <span className="text-green-600">{displayPrice}</span>
                  </>
                ) : (
                  displayPrice
                )}
              </h3>
              {isSold && property.sold_price && (
                <span className="text-green-600 font-semibold text-sm">
                  Sold: {formatPriceForDisplay(property.sold_price, null)}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-foreground font-semibold text-lg mb-2 line-clamp-1">
              {property.title}
            </h4>

            {/* Location */}
            <div className="flex items-center text-muted-foreground text-sm mb-3">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="line-clamp-1">
                {property.address}, {property.city}, {property.state}
              </span>
            </div>

            {/* Property Details */}
            <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
              {property.bedrooms !== null && (
                <div className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms !== null && (
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span>{property.bathrooms}</span>
                </div>
              )}
              {property.square_feet !== null && (
                <div className="flex items-center gap-1">
                  <Square className="h-4 w-4" />
                  <span>{property.square_feet.toLocaleString()} sq metres</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/property/${property.id}`);
                }}
                className="flex-1 bg-primary hover:bg-pickfirst-amber text-primary-foreground font-medium"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromFavorites(property);
                }}
                className="border-red-500/40 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-card/70 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-4">
          {/* Back Button and Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-primary shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3 truncate">
                <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Saved Properties
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredProperties.length} of {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'}
                {getFavoritesLimit() !== -1 && (
                  <span className="ml-2">
                    (Limit: {getFavoritesLimit()})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Controls Row - Responsive */}
          {savedProperties.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Sort Options */}
              <div className="flex items-center gap-2 flex-1">
                <SortAsc className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-card border border-border text-foreground rounded px-3 py-2 text-sm w-full sm:w-auto"
                >
                  <option value="date-saved">Recently Saved</option>
                  <option value="title">Property Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex border border-border rounded self-end sm:self-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">List</span>
                </Button>
              </div>
            </div>
          )}

          {/* Search Bar - Only show if there are saved properties */}
          {savedProperties.length > 0 && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                type="text"
                placeholder="Search your saved properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Properties Grid/List */}
        {savedProperties.length === 0 ? (
          <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
            <CardContent className="text-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-foreground mb-4">No saved properties yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start browsing properties and save the ones you love by clicking the heart icon
              </p>
              <Button 
                onClick={() => navigate('/browse-properties')}
                className="bg-primary hover:bg-pickfirst-amber text-primary-foreground font-medium px-6 py-3"
                size="lg"
              >
                <Search className="w-5 h-5 mr-2" />
                Browse Properties
              </Button>
            </CardContent>
          </Card>
        ) : filteredProperties.length === 0 ? (
          <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
            <CardContent className="text-center py-16">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-4">No properties match your search</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search terms</p>
              <Button 
                onClick={() => setSearchTerm('')}
                variant="outline" 
                className="border-border text-muted-foreground hover:bg-muted"
              >
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md bg-white border border-pickfirst-yellow/30">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Remove from Favorites
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to remove "{propertyToRemove?.title}" from your saved properties?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              className="flex-1 border-border text-muted-foreground hover:bg-muted"
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
    </>
  );
};

const SavedPropertiesPage = withErrorBoundary(SavedPropertiesPageComponent);

export default SavedPropertiesPage;