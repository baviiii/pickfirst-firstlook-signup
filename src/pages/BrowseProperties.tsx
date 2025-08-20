import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
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
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type ViewMode = 'grid' | 'list';
type SortOption = 'price-low' | 'price-high' | 'newest' | 'oldest';

const BrowsePropertiesPageComponent = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // State
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isInquiryDialogOpen, setIsInquiryDialogOpen] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [propertyType, setPropertyType] = useState<string>('all');
  const [bedrooms, setBedrooms] = useState<string>('all');
  const [bathrooms, setBathrooms] = useState<string>('all');

  useEffect(() => {
    fetchListings();
    if (profile?.role === 'buyer') {
      fetchFavorites();
    }
  }, [profile]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [listings, searchTerm, sortBy, priceRange, propertyType, bedrooms, bathrooms]);

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
      setFavorites(new Set(data?.map(fav => fav.property_id) || []));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...listings];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(term) ||
        listing.address.toLowerCase().includes(term) ||
        listing.city.toLowerCase().includes(term) ||
        listing.state.toLowerCase().includes(term) ||
        listing.description?.toLowerCase().includes(term) ||
        listing.property_type.toLowerCase().includes(term)
      );
    }

    // Apply property type filter
    if (propertyType !== 'all') {
      filtered = filtered.filter(listing => listing.property_type === propertyType);
    }

    // Apply bedroom filter
    if (bedrooms !== 'all') {
      const bedroomNum = parseInt(bedrooms);
      filtered = filtered.filter(listing => 
        bedrooms === '4+' 
          ? (listing.bedrooms || 0) >= 4
          : listing.bedrooms === bedroomNum
      );
    }

    // Apply bathroom filter
    if (bathrooms !== 'all') {
      const bathroomNum = parseInt(bathrooms);
      filtered = filtered.filter(listing => 
        bathrooms === '3+' 
          ? (listing.bathrooms || 0) >= 3
          : listing.bathrooms === bathroomNum
      );
    }

    // Apply price range filter
    filtered = filtered.filter(listing => 
      listing.price >= priceRange[0] && listing.price <= priceRange[1]
    );

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
        await PropertyService.addToFavorites(propertyId);
        setFavorites(prev => new Set(prev).add(propertyId));
        toast.success('Property saved to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleInquireProperty = (property: PropertyListing, e: React.MouseEvent) => {
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
    } catch (error) {
      toast.error('Failed to send inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, 1000000]);
    setPropertyType('all');
    setBedrooms('all');
    setBathrooms('all');
  };

  const PropertyCard = ({ listing }: { listing: PropertyListing }) => {
    const isFavorited = favorites.has(listing.id);
    const hasImages = listing.images && listing.images.length > 0;

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
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-500" />
                </div>
              )}
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
                  ${listing.price.toLocaleString()}
                  <span className="text-sm font-normal text-yellow-400/70 ml-1">
                    {listing.property_type === 'weekly' ? '/week' : listing.property_type === 'monthly' ? '/month' : ''}
                  </span>
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
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10"
                  onClick={(e) => handleInquireProperty(listing, e)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Inquire
                </Button>
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
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-500" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-yellow-400/90 hover:bg-yellow-400 text-black font-medium">
              {listing.status === 'available' ? 'Available' : 'Under Contract'}
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
                ${listing.price.toLocaleString()}
                <span className="text-xs font-normal text-yellow-400/70 ml-1">
                  {listing.property_type === 'weekly' ? '/wk' : listing.property_type === 'monthly' ? '/mo' : ''}
                </span>
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
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10 text-xs py-2"
                onClick={(e) => handleInquireProperty(listing, e)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Inquire
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
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Browse Properties</h1>
                  <p className="text-sm text-yellow-400/80">{filteredListings.length} properties available</p>
                </div>
              </div>
              
              {/* View Mode Toggle */}
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
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Search and Controls */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by location, property type, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-4 bg-gray-900/50 border border-yellow-400/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent text-lg backdrop-blur-xl"
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

            {/* Filter and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 bg-gray-900/50 border border-yellow-400/20 rounded-lg text-white focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              
              {(searchTerm || propertyType !== 'all' || bedrooms !== 'all' || bathrooms !== 'all') && (
                <Button 
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <Card className="bg-gray-900/50 border-yellow-400/20 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-white mb-2 block">Property Type</Label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      >
                        <option value="all">All Types</option>
                        <option value="sale">For Sale</option>
                        <option value="rent">For Rent</option>
                        <option value="weekly">Weekly Rental</option>
                        <option value="monthly">Monthly Rental</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-white mb-2 block">Bedrooms</Label>
                      <select
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      >
                        <option value="all">Any</option>
                        <option value="1">1 Bedroom</option>
                        <option value="2">2 Bedrooms</option>
                        <option value="3">3 Bedrooms</option>
                        <option value="4+">4+ Bedrooms</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-white mb-2 block">Bathrooms</Label>
                      <select
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      >
                        <option value="all">Any</option>
                        <option value="1">1 Bathroom</option>
                        <option value="2">2 Bathrooms</option>
                        <option value="3+">3+ Bathrooms</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-white mb-2 block">
                        Price Range: ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                      </Label>
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="Min price"
                          value={priceRange[0]}
                          onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Input
                          type="number"
                          placeholder="Max price"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000000])}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                <Button onClick={clearFilters} variant="outline" className="text-yellow-400 border-yellow-400/40">
                  Clear All Filters
                </Button>
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
        </div>
      </div>

      {/* Inquiry Dialog */}
      <Dialog open={isInquiryDialogOpen} onOpenChange={setIsInquiryDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-yellow-400/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Inquire About Property</DialogTitle>
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