import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  SortAsc, 
  MessageSquare, 
  Heart,
  Bed,
  Bath, 
  Square,
  MapPin,
  Camera,
  Grid,
  List,
  Home,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import SimplePropertyFilters from '@/components/property/SimplePropertyFilters';

type ViewMode = 'grid' | 'list';
type SortOption = 'price-low' | 'price-high' | 'newest' | 'oldest';

const BrowsePropertiesPageComponent = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { canUseFavorites, getFavoritesLimit } = useSubscription();
  
  // State
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isInquiryDialogOpen, setIsInquiryDialogOpen] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [inquiredProperties, setInquiredProperties] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Simple filter states
  const [currentFilters, setCurrentFilters] = useState<any>({});
  
  // Rate limiting state
  const [lastInquiryTime, setLastInquiryTime] = useState<number>(0);
  const [inquiryCount, setInquiryCount] = useState<number>(0);

  useEffect(() => {
    fetchListings();
    if (profile?.role === 'buyer') {
      fetchFavorites();
      fetchUserInquiries();
    }
  }, [profile]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [listings, currentFilters, sortBy]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data } = await PropertyService.getApprovedListings();
      // Filter out agent-posted (off-market) listings - those require premium
      // Only show external_feed listings on browse page
      const publicListings = data?.filter(listing => 
        (listing as any).listing_source !== 'agent_posted'
      ) || [];
      setListings(publicListings);
    } catch (error) {
      toast.error('Failed to load properties');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data } = await PropertyService.getFavorites();
      setFavorites(new Set(data?.map(fav => fav.id) || []));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchUserInquiries = async () => {
    try {
      const { data } = await PropertyService.getMyInquiries();
      const inquiredPropertyIds = data?.map(inquiry => inquiry.property_id) || [];
      setInquiredProperties(new Set(inquiredPropertyIds));
    } catch (error) {
      console.error('Error fetching user inquiries:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...listings];

    // Apply search term filter
    if (currentFilters.searchTerm) {
      const term = currentFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(term) ||
        listing.address.toLowerCase().includes(term) ||
        listing.city.toLowerCase().includes(term) ||
        listing.state.toLowerCase().includes(term) ||
        listing.description?.toLowerCase().includes(term) ||
        listing.property_type.toLowerCase().includes(term)
      );
    }

    // Apply location filter
    if (currentFilters.location) {
      const location = currentFilters.location.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.address.toLowerCase().includes(location) ||
        listing.city.toLowerCase().includes(location) ||
        listing.state.toLowerCase().includes(location)
      );
    }

    // Apply property type filter
    if (currentFilters.propertyType) {
      filtered = filtered.filter(listing => listing.property_type === currentFilters.propertyType);
    }

    // Apply bedroom filter
    if (currentFilters.bedrooms) {
      filtered = filtered.filter(listing => (listing.bedrooms || 0) >= currentFilters.bedrooms);
    }

    // Apply bathroom filter
    if (currentFilters.bathrooms) {
      filtered = filtered.filter(listing => (listing.bathrooms || 0) >= currentFilters.bathrooms);
    }

    // Apply price range filter
    if (currentFilters.priceMin !== undefined || currentFilters.priceMax !== undefined) {
      filtered = filtered.filter(listing => {
        const price = listing.price || 0;
        const minPrice = currentFilters.priceMin || 0;
        const maxPrice = currentFilters.priceMax || 1000000;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply square footage filter
    if (currentFilters.minSquareFootage !== undefined || currentFilters.maxSquareFootage !== undefined) {
      filtered = filtered.filter(listing => {
        const sqft = listing.square_feet || 0;
        const minSqft = currentFilters.minSquareFootage || 0;
        const maxSqft = currentFilters.maxSquareFootage || 5000;
        return sqft >= minSqft && sqft <= maxSqft;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'newest':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'oldest':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
  };

  const handleToggleFavorite = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!profile) {
      toast.error('Please log in to save properties');
      navigate('/auth');
      return;
    }

    // Check if user can use favorites feature
    if (!canUseFavorites()) {
      toast.error('Favorites feature is not available on your plan');
      return;
    }

    try {
      const isFavorited = favorites.has(propertyId);
      
      if (isFavorited) {
        await PropertyService.removeFromFavorites(propertyId);
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(propertyId);
          return newFavorites;
        });
        toast.success('Property removed from favorites');
      } else {
        // Check favorites limit before adding
        const favoritesLimit = getFavoritesLimit();
        if (favoritesLimit !== -1 && favorites.size >= favoritesLimit) {
          toast.error(`You've reached your limit of ${favoritesLimit} favorites. Upgrade to save more properties.`);
          return;
        }
        
        await PropertyService.addToFavorites(propertyId);
        setFavorites(prev => new Set(prev).add(propertyId));
        toast.success('Property saved to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleEnquireProperty = (property: PropertyListing, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!profile) {
      toast.error('Please log in to inquire about properties');
      navigate('/auth');
      return;
    }

    if (profile.role !== 'buyer') {
      toast.error('Only buyers can inquire about properties');
      return;
    }

    setSelectedProperty(property);
    setIsInquiryDialogOpen(true);
  };

  const handleSubmitInquiry = async () => {
    if (!selectedProperty || !inquiryMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Input validation and basic sanitization
    const sanitizedMessage = inquiryMessage.trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    if (sanitizedMessage.length < 10) {
      toast.error('Message must be at least 10 characters long');
      return;
    }
    if (sanitizedMessage.length > 1000) {
      toast.error('Message must be less than 1000 characters');
      return;
    }

    // Rate limiting check
    const now = Date.now();
    const timeSinceLastInquiry = now - lastInquiryTime;
    const oneMinute = 60 * 1000;
    
    if (timeSinceLastInquiry < oneMinute && inquiryCount >= 3) {
      toast.error('Too many inquiries. Please wait a minute before sending another.');
      return;
    }

    // Reset count if more than a minute has passed
    if (timeSinceLastInquiry >= oneMinute) {
      setInquiryCount(0);
    }

    setSubmittingInquiry(true);
    try {
      const { data, error } = await PropertyService.createInquiry(
        selectedProperty.id,
        sanitizedMessage
      );

      if (error) throw error;

      // Update rate limiting state
      setLastInquiryTime(now);
      setInquiryCount(prev => prev + 1);

      toast.success('Inquiry sent successfully!', {
        description: 'The agent has been notified. A conversation will be opened when they respond. You\'ll receive a notification when the conversation starts.',
        duration: 6000
      });
      setIsInquiryDialogOpen(false);
      setInquiryMessage('');
      setSelectedProperty(null);
      // Add the property to inquired properties
      setInquiredProperties(prev => new Set(prev).add(selectedProperty.id));
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to send inquiry. Please try again.');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Property card component
  const PropertyCard = ({ listing }: { listing: PropertyListing }) => {
    const hasImages = listing.images && listing.images.length > 0;
    const isFavorited = favorites.has(listing.id);
    const hasInquired = inquiredProperties.has(listing.id);

    if (viewMode === 'list') {
      return (
        <Card 
          className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          onClick={() => navigate(`/property/${listing.id}`)}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-80 aspect-video sm:aspect-square overflow-hidden">
              {hasImages ? (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full bg-gray-800 flex items-center justify-center ${hasImages ? 'hidden' : ''}`}>
                <Camera className="w-12 h-12 text-gray-500" />
              </div>
            </div>
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{listing.title}</h3>
                  <div className="flex items-center text-yellow-400/80 mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{listing.address}, {listing.city}, {listing.state}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleToggleFavorite(listing.id, e)}
                  className={`rounded-full hover:bg-yellow-400/10 ${isFavorited ? 'text-yellow-400' : 'text-gray-400'}`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                </Button>
              </div>
              
              <div className="flex items-center gap-6 mb-4">
                <div className="text-2xl font-bold text-yellow-400">
                  {listing.status === 'sold' && listing.sold_price ? (
                    <>
                      <span className="text-lg text-gray-400 line-through">${listing.price.toLocaleString()}</span>
                      <br />
                      <span className="text-red-400">Sold: ${listing.sold_price.toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      ${listing.price.toLocaleString()}
                      <span className="text-sm font-normal text-yellow-400/70 ml-1">
                        {listing.property_type === 'weekly' ? '/week' : listing.property_type === 'monthly' ? '/month' : ''}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {listing.bedrooms !== null && (
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">{listing.bedrooms}</span>
                    </div>
                  )}
                  {listing.bathrooms !== null && (
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">{listing.bathrooms}</span>
                    </div>
                  )}
                  {listing.square_feet !== null && (
                    <div className="flex items-center gap-1">
                      <Square className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-300">{listing.square_feet.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {listing.description && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{listing.description}</p>
              )}
              
              <div className="flex gap-3">
                <Button 
                  size="sm"
                  className="bg-yellow-400 hover:bg-amber-500 text-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/property/${listing.id}`);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                {listing.status !== 'sold' ? (
                  hasInquired ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled
                      className="text-blue-400 border-blue-400/40 cursor-not-allowed"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Already Enquired
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10"
                      onClick={(e) => handleEnquireProperty(listing, e)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Enquire
                    </Button>
                  )
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled
                    className="text-gray-500 border-gray-500/40 cursor-not-allowed"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Property Sold
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card 
        className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
        onClick={() => navigate(`/property/${listing.id}`)}
      >
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          {hasImages ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-full h-full bg-gray-800 flex items-center justify-center ${hasImages ? 'hidden' : ''}`}>
            <Camera className="w-12 h-12 text-gray-500" />
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge className={`font-medium ${
              listing.status === 'sold' 
                ? 'bg-red-500/90 hover:bg-red-500 text-white' 
                : listing.status === 'available' 
                  ? 'bg-green-500/90 hover:bg-green-500 text-white'
                  : 'bg-yellow-400/90 hover:bg-yellow-400 text-black'
            }`}>
              {listing.status === 'sold' ? 'SOLD' : listing.status === 'available' ? 'Available' : 'Under Contract'}
            </Badge>
          </div>
          
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleToggleFavorite(listing.id, e)}
            className={`absolute top-3 right-3 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 ${isFavorited ? 'text-yellow-400' : 'text-white'}`}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </Button>
          
          {/* Image Count */}
          {hasImages && listing.images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
              {listing.images.length} photos
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">
                {listing.title}
              </h3>
              <div className="flex items-center text-yellow-400/80">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="text-xs">{listing.address}, {listing.city}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xl font-bold text-yellow-400">
                {listing.status === 'sold' && listing.sold_price ? (
                  <>
                    <span className="text-sm text-gray-400 line-through">${listing.price.toLocaleString()}</span>
                    <br />
                    <span className="text-red-400">Sold: ${listing.sold_price.toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    ${listing.price.toLocaleString()}
                    <span className="text-xs font-normal text-yellow-400/70 ml-1">
                      {listing.property_type === 'weekly' ? '/wk' : listing.property_type === 'monthly' ? '/mo' : ''}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {listing.bedrooms !== null && (
                  <div className="flex items-center gap-1">
                    <Bed className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-300">{listing.bedrooms}</span>
                  </div>
                )}
                {listing.bathrooms !== null && (
                  <div className="flex items-center gap-1">
                    <Bath className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-300">{listing.bathrooms}</span>
                  </div>
                )}
                {listing.square_feet !== null && (
                  <div className="flex items-center gap-1">
                    <Square className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-300">{Math.round(listing.square_feet/1000)}k</span>
                  </div>
                )}
              </div>
            </div>
            
            {listing.description && (
              <p className="text-gray-400 text-xs line-clamp-2">{listing.description}</p>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm"
                className="flex-1 bg-yellow-400 hover:bg-amber-500 text-black text-xs py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/property/${listing.id}`);
                }}
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              {listing.status !== 'sold' ? (
                hasInquired ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled
                    className="flex-1 text-blue-400 border-blue-400/40 cursor-not-allowed text-xs py-2"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Enquired
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10 text-xs py-2"
                    onClick={(e) => handleEnquireProperty(listing, e)}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Enquire
                  </Button>
                )
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled
                  className="flex-1 text-gray-500 border-gray-500/40 cursor-not-allowed text-xs py-2"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Sold
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-gray-300">{filteredListings.length} properties available</p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-yellow-400 text-black hover:bg-amber-500' : 'text-gray-400 hover:text-white'}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Grid</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-yellow-400 text-black hover:bg-amber-500' : 'text-gray-400 hover:text-white'}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">List</span>
            </Button>
          </div>
        </div>
        {/* Simple Property Filters */}
        <SimplePropertyFilters 
          onFiltersChange={setCurrentFilters}
          onSearch={() => applyFiltersAndSort()}
        />

        {/* Sort Controls */}
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-xl border border-yellow-400/20 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Sort Controls */}
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <SortAsc className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
              <Label className="text-white text-xs sm:text-sm whitespace-nowrap">Sort:</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex-1 sm:flex-initial px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-400/50 text-xs sm:text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid/List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-white">Loading properties...</p>
              </div>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-20">
              <Home className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No properties found</h3>
              <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                : 'space-y-6'
            }>
              {filteredListings.map(listing => (
                <PropertyCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        {/* Inquiry Dialog */}
        <Dialog open={isInquiryDialogOpen} onOpenChange={setIsInquiryDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-yellow-400/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Enquire About Property</DialogTitle>
            <DialogDescription className="text-gray-300">
              Send a message to the agent about {selectedProperty?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inquiry-message" className="text-white">Your Message</Label>
              <Textarea
                id="inquiry-message"
                placeholder="I'm interested in this property. Could you provide more information about viewing times, additional features, or next steps?"
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 mt-2 min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInquiryDialogOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInquiry}
                disabled={submittingInquiry || !inquiryMessage.trim()}
                className="flex-1 bg-yellow-400 hover:bg-amber-500 text-black"
              >
                {submittingInquiry ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Sending...
                  </span>
                ) : (
                  'Send Inquiry'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const BrowsePropertiesPage = withErrorBoundary(BrowsePropertiesPageComponent);

export default BrowsePropertiesPage;