import React, { useState, useEffect } from 'react';
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
  Eye,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import SimplePropertyFilters from '@/components/property/SimplePropertyFilters';
import { EarlyAccessBadge } from '@/components/property/EarlyAccessBadge';

type ViewMode = 'grid' | 'list';
type SortOption = 'price-low' | 'price-high' | 'newest' | 'oldest';

const BrowsePropertiesSimple = () => {
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
  const [currentFilters, setCurrentFilters] = useState<any>({});

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
      setListings(data || []);
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

    // Apply search filter
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
      filtered = filtered.filter(listing => 
        (listing.bedrooms || 0) >= currentFilters.bedrooms
      );
    }

    // Apply bathroom filter
    if (currentFilters.bathrooms) {
      filtered = filtered.filter(listing => 
        (listing.bathrooms || 0) >= currentFilters.bathrooms
      );
    }

    // Apply price range filter
    if (currentFilters.priceMin !== undefined || currentFilters.priceMax !== undefined) {
      filtered = filtered.filter(listing => {
        const price = listing.price || 0;
        const minPrice = currentFilters.priceMin || 0;
        const maxPrice = currentFilters.priceMax || Infinity;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply square footage filter
    if (currentFilters.minSquareFootage !== undefined || currentFilters.maxSquareFootage !== undefined) {
      filtered = filtered.filter(listing => {
        const sqft = listing.square_feet || 0;
        const minSqft = currentFilters.minSquareFootage || 0;
        const maxSqft = currentFilters.maxSquareFootage || Infinity;
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

  const handleFiltersChange = (filters: any) => {
    setCurrentFilters(filters);
  };

  const handleSearch = () => {
    applyFiltersAndSort();
    toast.success('Search updated');
  };

  const toggleFavorite = async (propertyId: string) => {
    if (!canUseFavorites()) {
      toast.error('Please upgrade to save favorites');
      return;
    }

    const favoritesLimit = getFavoritesLimit();
    const isFavorited = favorites.has(propertyId);

    if (!isFavorited && favoritesLimit !== -1 && favorites.size >= favoritesLimit) {
      toast.error(`You can only save up to ${favoritesLimit} favorites. Upgrade for unlimited favorites.`);
      return;
    }

    try {
      if (isFavorited) {
        await PropertyService.removeFromFavorites(propertyId);
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(propertyId);
          return newFavorites;
        });
        toast.success('Removed from favorites');
      } else {
        await PropertyService.addToFavorites(propertyId);
        setFavorites(prev => new Set(prev).add(propertyId));
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleInquire = (property: PropertyListing) => {
    if (property.status === 'sold') {
      toast.error('This property has been sold');
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

    setSubmittingInquiry(true);
    try {
      const { data, error } = await PropertyService.createInquiry(
        selectedProperty.id,
        inquiryMessage.trim()
      );

      if (error) throw error;

      toast.success('Inquiry sent successfully! Check your messages to continue the conversation.');
      setIsInquiryDialogOpen(false);
      setInquiryMessage('');
      setSelectedProperty(null);
      setInquiredProperties(prev => new Set(prev).add(selectedProperty.id));
    } catch (error) {
      toast.error('Failed to send inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const PropertyCard = ({ listing }: { listing: PropertyListing }) => {
    const hasImages = listing.images && listing.images.length > 0;
    const isFavorited = favorites.has(listing.id);
    const hasInquired = inquiredProperties.has(listing.id);
    const isSold = listing.status === 'sold';

    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
        <div className="relative">
          {/* Property Image */}
          <div className="aspect-video overflow-hidden">
            {hasImages ? (
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Home className="h-16 w-16 text-gray-600" />
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {isSold && (
              <Badge className="bg-red-500 text-white font-bold">
                SOLD
              </Badge>
            )}
            <EarlyAccessBadge earlyAccessUntil={listing.early_access_until} />
            {hasImages && (
              <Badge className="bg-black/50 text-white flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {listing.images.length}
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          {profile?.role === 'buyer' && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(listing.id);
              }}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          {/* Price */}
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-2xl font-bold ${isSold ? 'text-gray-400 line-through' : 'text-yellow-400'}`}>
              {formatPrice(listing.price)}
            </h3>
            {isSold && listing.sold_price && (
              <span className="text-green-400 font-semibold">
                Sold: {formatPrice(listing.sold_price)}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-white font-semibold text-lg mb-2 line-clamp-1">
            {listing.title}
          </h4>

          {/* Location */}
          <div className="flex items-center text-gray-300 text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="line-clamp-1">
              {listing.address}, {listing.city}, {listing.state}
            </span>
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-gray-300 text-sm mb-4">
            {listing.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{listing.bedrooms}</span>
              </div>
            )}
            {listing.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{listing.bathrooms}</span>
              </div>
            )}
            {listing.square_feet && (
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                <span>{listing.square_feet.toLocaleString()} sq ft</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(`/property/${listing.id}`)}
              className="flex-1 bg-yellow-400 hover:bg-amber-500 text-black font-medium"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            {profile?.role === 'buyer' && !isSold && (
              <Button
                onClick={() => handleInquire(listing)}
                variant="outline"
                className={`border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black ${
                  hasInquired ? 'bg-yellow-400/20' : ''
                }`}
                disabled={hasInquired}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {hasInquired ? 'Inquired' : 'Inquire'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-300 hover:text-yellow-400"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Browse Properties</h1>
              <p className="text-gray-400">
                {filteredListings.length} properties found
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-700 rounded">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <SimplePropertyFilters
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
        />

        {/* Properties Grid */}
        {filteredListings.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
            <CardContent className="text-center py-12">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Properties Found</h3>
              <p className="text-gray-400">
                Try adjusting your search criteria or filters to find more properties.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredListings.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Inquiry Dialog */}
        <Dialog open={isInquiryDialogOpen} onOpenChange={setIsInquiryDialogOpen}>
          <DialogContent className="bg-gray-900 border border-yellow-400/20">
            <DialogHeader>
              <DialogTitle className="text-white">
                Inquire About Property
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                {selectedProperty && `Send a message about ${selectedProperty.title}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inquiry-message" className="text-gray-300">
                  Your Message
                </Label>
                <Textarea
                  id="inquiry-message"
                  placeholder="I'm interested in this property. Could you provide more information?"
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsInquiryDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitInquiry}
                  disabled={submittingInquiry || !inquiryMessage.trim()}
                  className="bg-yellow-400 hover:bg-amber-500 text-black"
                >
                  {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default withErrorBoundary(BrowsePropertiesSimple);
