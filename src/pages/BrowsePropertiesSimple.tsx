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
  X,
  Lock,
  Crown,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { useSubscription } from '@/hooks/useSubscription';
import SimplePropertyFilters from '@/components/property/SimplePropertyFilters';
import { formatPriceForDisplay } from '@/utils/priceUtils';
import { EarlyAccessBadge } from '@/components/property/EarlyAccessBadge';

type ViewMode = 'grid' | 'list';
type SortOption = 'price-low' | 'price-high' | 'newest' | 'oldest';

const BrowsePropertiesSimple = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { viewMode: userViewMode } = useViewMode();
  const { canUseFavorites, getFavoritesLimit, canAccessOffMarketListings } = useSubscription();
  
  // State
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isInquiryDialogOpen, setIsInquiryDialogOpen] = useState(false);
  const [isInquirySuccessOpen, setIsInquirySuccessOpen] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<any>(null);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [inquiredProperties, setInquiredProperties] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentFilters, setCurrentFilters] = useState<any>({});

  useEffect(() => {
    fetchListings();
    if (userViewMode === 'buyer') {
      fetchFavorites();
      fetchUserInquiries();
    }
  }, [profile, userViewMode]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [listings, currentFilters, sortBy]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Include off-market listings in the response; we'll lock them in the UI
      const { data } = await PropertyService.getApprovedListings(undefined, {
        includeOffMarket: true,
      });
      // Keep all approved listings (including agent_posted off-market)
      const approvedListings = data || [];
      setListings(approvedListings);
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
      console.log('Fetching user inquiries...', { userViewMode, profile: profile?.id });
      const { data, error } = await PropertyService.getMyInquiries();
      console.log('getMyInquiries response:', { data, error, dataLength: data?.length });
      
      if (error) {
        console.error('Error from getMyInquiries:', error);
        return;
      }
      
      const inquiredPropertyIds = data?.map(inquiry => inquiry.property_id) || [];
      const inquiredSet = new Set(inquiredPropertyIds);
      console.log('Fetched inquired properties:', {
        count: inquiredSet.size,
        propertyIds: Array.from(inquiredSet),
        inquiries: data?.map(i => ({ id: i.id, property_id: i.property_id, status: i.status }))
      });
      setInquiredProperties(inquiredSet);
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

  const handleEnquire = (property: PropertyListing) => {
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

      if (error) {
        // Check if this is a duplicate inquiry with a conversation link
        if ((error as any).conversationLink) {
          toast.error('You have already inquired about this property', {
            description: 'You can continue the conversation in your messages.',
            duration: 6000,
            action: {
              label: 'View Conversation',
              onClick: () => window.location.href = (error as any).conversationLink
            }
          });
        } else {
          throw error;
        }
        return;
      }

      // Store inquiry data for success modal
      setSubmittedInquiry({
        ...data,
        property: selectedProperty,
        message: inquiryMessage.trim()
      });
      
      // Update inquired properties immediately for visual feedback
      if (selectedProperty && data) {
        console.log('Inquiry created successfully:', {
          inquiryId: data.id,
          propertyId: selectedProperty.id,
          propertyTitle: selectedProperty.title,
          buyerId: data.buyer_id,
          status: data.status
        });
        setInquiredProperties(prev => {
          const newSet = new Set(prev);
          newSet.add(selectedProperty.id);
          console.log('Updated inquired properties state:', {
            propertyId: selectedProperty.id,
            newSetSize: newSet.size,
            newSetList: Array.from(newSet)
          });
          return newSet;
        });
      } else {
        console.warn('No inquiry data returned or no selected property:', { data, selectedProperty });
      }
      
      // Close inquiry dialog and show success modal
      setIsInquiryDialogOpen(false);
      setIsInquirySuccessOpen(true);
      setInquiryMessage('');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to send inquiry. Please try again.');
    } finally {
      setSubmittingInquiry(false);
    }
  };


  const PropertyCard = ({ listing }: { listing: PropertyListing }) => {
    const hasImages = listing.images && listing.images.length > 0;
    const isFavorited = favorites.has(listing.id);
    const hasInquired = inquiredProperties.has(listing.id);
    const isSold = listing.status === 'sold';
    
    // Debug log to verify inquired properties
    console.log('Property card render:', {
      id: listing.id,
      title: listing.title,
      hasInquired,
      inquiredPropertiesSize: inquiredProperties.size,
      inquiredPropertiesList: Array.from(inquiredProperties)
    });
    
    // Identify off-market (agent posted) properties
    const isOffMarket = (listing as any).listing_source === 'agent_posted';
    const isPremiumUser = canAccessOffMarketListings();
    const isLockedOffMarket = isOffMarket && !isPremiumUser;

    return (
      <Card 
        className={`text-card-foreground shadow-2xl transition-all duration-300 hover:scale-[1.02] overflow-hidden relative ${
          hasInquired 
            ? '!border-2 !border-green-600 !bg-green-50 dark:!bg-green-900/30 !shadow-green-500/30 ring-2 ring-green-400/40 hover:!shadow-green-500/40' 
            : 'pickfirst-glass bg-card/90 border border-pickfirst-yellow/30 hover:shadow-pickfirst-yellow/30'
        } ${
          isLockedOffMarket ? 'cursor-not-allowed opacity-95' : 'cursor-pointer'
        }`}
        style={hasInquired ? { 
          borderColor: '#16a34a', 
          backgroundColor: '#f0fdf4',
          boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3), 0 4px 6px -2px rgba(34, 197, 94, 0.2)'
        } : undefined}
        onClick={() => {
          if (isLockedOffMarket) {
            navigate('/pricing');
          } else {
            navigate(`/property/${listing.id}`);
          }
        }}
      >
        <div className="relative">
          {/* Property Image */}
          <div className="aspect-video overflow-hidden relative">
            {hasImages ? (
              <>
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isLockedOffMarket ? 'blur-sm opacity-50' : 'hover:scale-110'
                  }`}
                />
                {isLockedOffMarket && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Home className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 left-3 flex gap-2 z-10 flex-wrap">
            {hasInquired && (
              <Badge className="bg-green-600 text-white font-bold border-2 border-green-400 shadow-xl z-20 px-2 py-1 animate-pulse">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 fill-white" />
                Enquired
              </Badge>
            )}
            {isOffMarket && (
              <Badge className="bg-pickfirst-yellow text-black font-bold border border-pickfirst-yellow/30">
                Off-Market
              </Badge>
            )}
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
          {userViewMode === 'buyer' && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white z-10"
              onClick={(e) => {
                e.stopPropagation();
                if (!isLockedOffMarket) {
                  toggleFavorite(listing.id);
                }
              }}
              disabled={isLockedOffMarket}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          {/* Price */}
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-2xl font-bold ${isSold ? 'text-muted-foreground line-through' : 'text-primary'}`}>
              {isLockedOffMarket ? 'Premium Off-Market' : formatPriceForDisplay(listing.price, listing.price_display)}
            </h3>
            {isSold && listing.sold_price && (
              <span className="text-green-600 font-semibold">
                Sold: {formatPriceForDisplay(listing.sold_price)}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-foreground font-semibold text-lg mb-2 line-clamp-1">
            {listing.title}
          </h4>

          {/* Location */}
          <div className="flex items-center text-muted-foreground text-sm mb-3">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="line-clamp-1">
              {listing.address}, {listing.city}, {listing.state}
            </span>
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
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
                <span>{listing.square_feet.toLocaleString()} sq metres</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isLockedOffMarket ? (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/pricing');
                }}
                className="flex-1 bg-primary hover:bg-pickfirst-amber text-primary-foreground font-medium"
              >
                <Crown className="h-4 w-4 mr-2" />
                Unlock with Premium
              </Button>
            ) : (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/property/${listing.id}`);
                  }}
                  className="flex-1 bg-primary hover:bg-pickfirst-amber text-primary-foreground font-medium"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                
                {userViewMode === 'buyer' && !isSold && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnquire(listing);
                    }}
                    variant="outline"
                    className={`${
                      hasInquired 
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300 font-semibold cursor-not-allowed' 
                        : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                    disabled={hasInquired}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {hasInquired ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Enquired
                      </>
                    ) : (
                      'Enquire'
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
        
        {/* Premium lock overlay for non-premium buyers on off-market listings */}
        {isLockedOffMarket && (
          <div className="absolute inset-0 rounded-lg bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 px-4 text-center z-30">
            <Crown className="h-6 w-6 text-primary mb-1" />
            <p className="text-sm font-semibold text-foreground">
              Premium Off-Market Listing
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Upgrade to unlock full details and contact the agent.
            </p>
            <Button
              size="sm"
              className="bg-primary hover:bg-pickfirst-amber text-primary-foreground text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/pricing');
              }}
            >
              View Premium Plans
            </Button>
          </div>
        )}
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
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-4">
          {/* Back Button and Title */}
            <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-primary shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline ml-2">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">Browse Properties</h1>
              <p className="text-sm text-muted-foreground">
                {filteredListings.length} {filteredListings.length === 1 ? 'property' : 'properties'} found
              </p>
            </div>
          </div>

          {/* Controls Row - Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Sort Options */}
            <div className="flex items-center gap-2 flex-1">
              <SortAsc className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-card border border-border text-foreground rounded px-3 py-2 text-sm w-full sm:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
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
        </div>

        {/* Filters */}
        <SimplePropertyFilters
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
        />

        {/* Properties Grid */}
        {filteredListings.length === 0 ? (
          <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
            <CardContent className="text-center py-12">
              <Home className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Properties Found</h3>
              <p className="text-muted-foreground">
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
          <DialogContent className="bg-white border border-pickfirst-yellow/30">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Enquire About Property
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedProperty && `Send a message about ${selectedProperty.title}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inquiry-message" className="text-foreground">
                  Your Message
                </Label>
                <Textarea
                  id="inquiry-message"
                  placeholder="I'm interested in this property. Could you provide more information?"
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground mt-2"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsInquiryDialogOpen(false)}
                  className="border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitInquiry}
                  disabled={submittingInquiry || !inquiryMessage.trim()}
                  className="bg-primary hover:bg-pickfirst-amber text-primary-foreground"
                >
                  {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inquiry Success Modal */}
        <Dialog open={isInquirySuccessOpen} onOpenChange={setIsInquirySuccessOpen}>
          <DialogContent className="bg-white border border-green-500/30 max-w-2xl">
            <DialogHeader className="bg-gradient-to-r from-green-500/5 to-transparent border-b border-green-500/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <DialogTitle className="text-green-600 text-xl font-bold">Your Inquiry</DialogTitle>
                </div>
                <Badge className="bg-green-500/10 text-green-600 border border-green-500/30 font-semibold">
                  Inquiry Sent
                </Badge>
              </div>
              <div className="text-foreground mt-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  Pending
                </Badge>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your inquiry about <span className="font-semibold text-foreground">{submittedInquiry?.property?.title}</span> has been sent to the agent.
                </p>
              </div>

              {/* Property Details */}
              {submittedInquiry?.property && (
                <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="text-foreground font-semibold">
                      {submittedInquiry.property.title}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {submittedInquiry.property.address}
                  </div>
                </div>
              )}

              {/* Your Message */}
              {submittedInquiry?.message && (
                <div>
                  <div className="text-foreground font-semibold text-sm mb-2">Your Message:</div>
                  <div className="text-foreground text-sm bg-muted/50 p-3 rounded border border-border">
                    {submittedInquiry.message}
                  </div>
                </div>
              )}

              {/* Timing */}
              <div className="flex items-center gap-2 text-xs text-foreground bg-muted/30 p-3 rounded border border-border">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>
                  Sent: {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })} at {new Date().toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
              </div>

              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border border-border">
                The agent will respond to your inquiry soon.
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {submittedInquiry?.conversation_id ? (
                  <Button
                    onClick={() => {
                      setIsInquirySuccessOpen(false);
                      navigate(`/buyer-messages?conversation=${submittedInquiry.conversation_id}`);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Conversation
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setIsInquirySuccessOpen(false);
                      navigate('/buyer-messages');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Go to Messages
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsInquirySuccessOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default withErrorBoundary(BrowsePropertiesSimple);
