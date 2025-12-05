import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  MapPin, 
  Star, 
  DollarSign, 
  Home, 
  Filter,
  X,
  ChevronDown,
  Save,
  Bookmark,
  Share2,
  TrendingUp,
  Zap,
  Loader2,
  AlertCircle,
  Calendar,
  Car,
  Building,
  TreePine,
  Wifi,
  Shield,
  Waves,
  Dumbbell,
  ShoppingBag,
  GraduationCap,
  Hospital,
  Plane,
  Train,
  Coffee,
  Music,
  Camera,
  Maximize,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bath,
  Bed,
  Square,
  MapPinIcon,
  Settings
} from 'lucide-react';
import { googleMapsService, PlaceAutocompleteResult } from '@/services/googleMapsService';
import { FilterService, AdvancedPropertyFilters, FilterResult, SavedFilter } from '@/services/filterService';
import { useFilterState, generateFilterURL } from '@/hooks/useFilterState';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

interface ProductionFilterSystemProps {
  onResultsChange?: (results: FilterResult) => void;
  onLoadingChange?: (loading: boolean) => void;
  showResults?: boolean;
  className?: string;
}

const ProductionFilterSystem: React.FC<ProductionFilterSystemProps> = ({
  onResultsChange,
  onLoadingChange,
  showResults = true,
  className = ''
}) => {
  const { filters, isInitialized, updateFilters, clearFilters, updatePagination, updateSorting } = useFilterState();
  
  const [results, setResults] = useState<FilterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    price: false,
    property: false,
    features: false,
    amenities: false,
    area: false,
    advanced: false,
    accessibility: false
  });

  // Debounced search terms
  const debouncedSearchTerm = useDebounce(filters.searchTerm || '', 500);
  const debouncedLocation = useDebounce(filters.location || '', 500);

  // Location autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Filter suggestions
  const [filterSuggestions, setFilterSuggestions] = useState({
    propertyTypes: [],
    priceRange: { min: 0, max: 2000000 },
    bedroomOptions: [],
    bathroomOptions: [],
    features: [],
    locations: []
  });

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // Load filter suggestions
  useEffect(() => {
    loadFilterSuggestions();
  }, []);

  // Apply filters when they change (with debouncing)
  useEffect(() => {
    if (!isInitialized) return;

    // Do not auto-load everything on first mount if no filters are set
    const hasAnyFilter = Boolean(
      (filters.searchTerm && filters.searchTerm.trim()) ||
      (filters.location && filters.location.trim()) ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.bedrooms !== undefined ||
      filters.bathrooms !== undefined ||
      filters.propertyType ||
      (filters.features && filters.features.length > 0) ||
      filters.squareFootageMin !== undefined ||
      filters.squareFootageMax !== undefined ||
      filters.yearBuiltMin !== undefined ||
      filters.yearBuiltMax !== undefined ||
      filters.lotSizeMin !== undefined ||
      filters.lotSizeMax !== undefined ||
      filters.garageSpaces !== undefined ||
      filters.hoaMin !== undefined ||
      filters.hoaMax !== undefined ||
      (filters.nearbyAmenities && Object.values(filters.nearbyAmenities).some(Boolean)) ||
      (filters.listingStatus && filters.listingStatus.length > 0) ||
      filters.daysOnMarket !== undefined ||
      filters.openHouse !== undefined ||
      filters.virtualTour !== undefined ||
      filters.priceReduced !== undefined ||
      filters.foreclosure !== undefined ||
      filters.shortSale !== undefined ||
      (filters.accessibilityFeatures && filters.accessibilityFeatures.length > 0)
    );

    if (!hasAnyFilter) {
      // Show empty results instead of loading everything
      setResults({
        properties: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
        appliedFilters: filters,
        filterStats: {
          matchingProperties: 0,
          totalProperties: 0,
          averagePrice: 0,
          priceRange: { min: 0, max: 0 }
        }
      });
      onResultsChange?.({
        properties: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
        appliedFilters: filters,
        filterStats: {
          matchingProperties: 0,
          totalProperties: 0,
          averagePrice: 0,
          priceRange: { min: 0, max: 0 }
        }
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, isInitialized]);

  // Location autocomplete
  useEffect(() => {
    if (debouncedLocation && debouncedLocation.length > 2) {
      searchLocations(debouncedLocation);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, [debouncedLocation]);

  const loadSavedFilters = async () => {
    try {
      const saved = await FilterService.getSavedFilters();
      setSavedFilters(saved);
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  };

  const loadFilterSuggestions = async () => {
    try {
      const suggestions = await FilterService.getFilterSuggestions();
      setFilterSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading filter suggestions:', error);
    }
  };

  const searchLocations = async (query: string) => {
    try {
      const suggestions = await googleMapsService.searchPlaces(query);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(true);
    } catch (error) {
      console.error('Error searching locations:', error);
    }
  };

  const applyFilters = async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);
    onLoadingChange?.(true);

    try {
      // Clean filters to remove any null/undefined values that could cause database errors
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined)
      ) as AdvancedPropertyFilters;
      
      console.log('ProductionFilterSystem - Original filters:', filters);
      console.log('ProductionFilterSystem - Cleaned filters:', cleanFilters);
      
      const results = await FilterService.applyFilters(cleanFilters);
      setResults(results);
      onResultsChange?.(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply filters';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Set empty results on error to prevent stale data
      const emptyResults: FilterResult = {
        properties: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
        appliedFilters: filters,
        filterStats: {
          matchingProperties: 0,
          totalProperties: 0,
          averagePrice: 0,
          priceRange: { min: 0, max: 0 }
        }
      };
      setResults(emptyResults);
      onResultsChange?.(emptyResults);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleFilterChange = (key: keyof AdvancedPropertyFilters, value: any) => {
    updateFilters({ [key]: value });
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Please enter a name for the filter');
      return;
    }

    try {
      await FilterService.saveFilter(filterName, filters);
      toast.success('Filter saved successfully');
      setShowSaveDialog(false);
      setFilterName('');
      loadSavedFilters();
    } catch (error) {
      toast.error('Failed to save filter');
    }
  };

  const handleLoadSavedFilter = (savedFilter: SavedFilter) => {
    updateFilters(savedFilter.filters);
    toast.success(`Loaded filter: ${savedFilter.name}`);
  };

  const handleDeleteSavedFilter = async (filterId: string) => {
    try {
      await FilterService.deleteSavedFilter(filterId);
      toast.success('Filter deleted');
      loadSavedFilters();
    } catch (error) {
      toast.error('Failed to delete filter');
    }
  };

  const handleShareFilter = () => {
    const url = generateFilterURL(filters);
    navigator.clipboard.writeText(window.location.origin + url);
    toast.success('Filter URL copied to clipboard');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.location) count++;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.bedrooms !== undefined) count++;
    if (filters.bathrooms !== undefined) count++;
    if (filters.propertyType) count++;
    if (filters.features?.length) count += filters.features.length;
    if (filters.squareFootageMin !== undefined || filters.squareFootageMax !== undefined) count++;
    if (filters.yearBuiltMin !== undefined || filters.yearBuiltMax !== undefined) count++;
    if (filters.lotSizeMin !== undefined || filters.lotSizeMax !== undefined) count++;
    if (filters.garageSpaces !== undefined) count++;
    if (filters.hoaMin !== undefined || filters.hoaMax !== undefined) count++;
    if (filters.nearbyAmenities) {
      const amenities = Object.values(filters.nearbyAmenities).filter(Boolean);
      count += amenities.length;
    }
    return count;
  };

  const ExpandableSection = ({ 
    title, 
    icon, 
    sectionKey, 
    children,
    badge 
  }: {
    title: string;
    icon: React.ReactNode;
    sectionKey: keyof typeof expandedSections;
    children: React.ReactNode;
    badge?: number;
  }) => (
    <Card className="pickfirst-glass bg-card/90 backdrop-blur-xl border border-pickfirst-yellow/30 shadow-lg">
      <CardHeader 
        className="cursor-pointer hover:bg-pickfirst-yellow/10 transition-colors p-3 sm:p-4 focus:outline-none focus:ring-2 focus:ring-pickfirst-yellow/50 rounded-lg"
        onClick={() => toggleSection(sectionKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection(sectionKey);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expandedSections[sectionKey]}
        aria-label={`${title} filter section`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-foreground text-sm sm:text-base font-semibold">{title}</CardTitle>
            {badge !== undefined && badge > 0 && (
              <Badge className="bg-pickfirst-yellow text-black text-xs font-semibold" aria-label={`${badge} active filters`}>
                {badge}
              </Badge>
            )}
          </div>
          <ChevronDown 
            className={`h-4 w-4 sm:h-5 sm:w-5 text-pickfirst-yellow transition-transform ${
              expandedSections[sectionKey] ? 'rotate-180' : ''
            }`} 
            aria-hidden="true"
          />
        </div>
      </CardHeader>
      {expandedSections[sectionKey] && (
        <CardContent className="border-t border-pickfirst-yellow/20 bg-card/50 p-3 sm:p-4">
          {children}
        </CardContent>
      )}
    </Card>
  );

  const MobileFilterToggle = () => (
    <div className="sm:hidden fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
        className="bg-yellow-400 hover:bg-amber-500 text-black rounded-full p-3 shadow-2xl"
      >
        <Filter className="h-5 w-5" />
      </Button>
    </div>
  );

  const MobileFilterOverlay = () => (
    isMobileFiltersOpen && (
      <div className="sm:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
        <div className="absolute inset-y-0 right-0 w-full max-w-sm pickfirst-glass bg-card/95 border-l border-pickfirst-yellow/30 overflow-y-auto">
          <div className="p-4 border-b border-pickfirst-yellow/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="text-foreground hover:text-pickfirst-yellow"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {/* Mobile filter content goes here - same as desktop but in overlay */}
            <FilterContent />
          </div>
        </div>
      </div>
    )
  );

  const FilterContent = () => (
    <>
      {/* Basic Search & Location */}
      <ExpandableSection
        title="Search & Location"
        icon={<Search className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="basic"
      >
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Search Keywords</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Enter keywords..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="pl-10 bg-background/50 border-pickfirst-yellow/30 text-foreground placeholder-muted-foreground text-sm"
              />
            </div>
          </div>

          {/* Location with Autocomplete */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Enter city, suburb, or address..."
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-10 bg-background/50 border-pickfirst-yellow/30 text-foreground placeholder-muted-foreground text-sm"
              />
              
              {/* Location Suggestions */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-pickfirst-yellow/30 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-2 text-left text-popover-foreground hover:bg-pickfirst-yellow/10 transition-colors text-sm"
                      onClick={() => {
                        handleFilterChange('location', suggestion.description);
                        setShowLocationSuggestions(false);
                      }}
                    >
                      <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                      <div className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ExpandableSection>

      {/* Price Range */}
      <ExpandableSection
        title="Price Range"
        icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="price"
        badge={filters.priceMin || filters.priceMax ? 1 : 0}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-foreground mb-4 block text-sm font-medium">
              Price Range: ${(filters.priceMin || 0).toLocaleString()} - ${(filters.priceMax || 2000000).toLocaleString()}
            </Label>
            <Slider
              value={[filters.priceMin || 0, filters.priceMax || 2000000]}
              onValueChange={([min, max]) => {
                handleFilterChange('priceMin', min);
                handleFilterChange('priceMax', max);
              }}
              max={2000000}
              min={0}
              step={25000}
              className="w-full"
            />
          </div>
          
          {/* Manual price inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground mb-1 block text-sm font-medium">Min Price</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-foreground mb-1 block text-sm font-medium">Max Price</Label>
              <Input
                type="number"
                placeholder="2000000"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
            </div>
          </div>

          {/* HOA Fees */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">HOA Fees (Monthly)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min HOA"
                value={filters.hoaMin || ''}
                onChange={(e) => handleFilterChange('hoaMin', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
              <Input
                type="number"
                placeholder="Max HOA"
                value={filters.hoaMax || ''}
                onChange={(e) => handleFilterChange('hoaMax', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
            </div>
          </div>
        </div>
      </ExpandableSection>

      {/* Property Details */}
      <ExpandableSection
        title="Property Details"
        icon={<Home className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="property"
        badge={[filters.propertyType, filters.bedrooms, filters.bathrooms, filters.squareFootageMin, filters.squareFootageMax].filter(Boolean).length}
      >
        <div className="space-y-4">
          {/* Property Type */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Property Type</Label>
            <Select
              value={filters.propertyType || ''}
              onValueChange={(value) => handleFilterChange('propertyType', value === 'any' ? undefined : value)}
            >
              <SelectTrigger className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm">
                <SelectValue placeholder="Any Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Type</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground mb-2 block text-sm font-medium">Bedrooms</Label>
              <Select
                value={filters.bedrooms?.toString() || ''}
                onValueChange={(value) => handleFilterChange('bedrooms', value === 'any' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}+</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-foreground mb-2 block text-sm font-medium">Bathrooms</Label>
              <Select
                value={filters.bathrooms?.toString() || ''}
                onValueChange={(value) => handleFilterChange('bathrooms', value === 'any' ? undefined : parseFloat(value))}
              >
                <SelectTrigger className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}+</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Square Footage</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min sqft"
                value={filters.squareFootageMin || ''}
                onChange={(e) => handleFilterChange('squareFootageMin', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
              <Input
                type="number"
                placeholder="Max sqft"
                value={filters.squareFootageMax || ''}
                onChange={(e) => handleFilterChange('squareFootageMax', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
            </div>
          </div>

          {/* Lot Size */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Lot Size (acres)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                step="0.1"
                placeholder="Min acres"
                value={filters.lotSizeMin || ''}
                onChange={(e) => handleFilterChange('lotSizeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Max acres"
                value={filters.lotSizeMax || ''}
                onChange={(e) => handleFilterChange('lotSizeMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
            </div>
          </div>

          {/* Year Built */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Year Built</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Min year"
                min="1800"
                max={new Date().getFullYear()}
                value={filters.yearBuiltMin || ''}
                onChange={(e) => handleFilterChange('yearBuiltMin', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
              <Input
                type="number"
                placeholder="Max year"
                min="1800"
                max={new Date().getFullYear()}
                value={filters.yearBuiltMax || ''}
                onChange={(e) => handleFilterChange('yearBuiltMax', e.target.value ? parseInt(e.target.value) : undefined)}
                className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
              />
            </div>
          </div>

          {/* Garage Spaces */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Garage Spaces</Label>
            <Select
              value={filters.garageSpaces?.toString() || ''}
              onValueChange={(value) => handleFilterChange('garageSpaces', value === 'any' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="0">No Garage</SelectItem>
                {[1, 2, 3, 4].map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}+ spaces</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ExpandableSection>

      {/* Property Features */}
      <ExpandableSection
        title="Property Features"
        icon={<Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="features"
        badge={filters.features?.length || 0}
      >
        <div className="space-y-3">
          <Label className="text-foreground mb-3 block text-sm font-medium">Select Features</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'Pool', 'Spa/Hot Tub', 'Garden/Landscaping', 'Balcony/Patio', 'Fireplace', 
              'Air Conditioning', 'Heating', 'Dishwasher', 'Laundry Room', 'Walk-in Closet',
              'Hardwood Floors', 'Tile Flooring', 'Carpet', 'Basement', 'Attic',
              'Deck', 'Fence', 'Security System', 'Solar Panels', 'Smart Home Features',
              'High Ceilings', 'Bay Windows', 'Skylight', 'Wine Cellar', 'Home Office',
              'Gym/Exercise Room', 'Media Room', 'Game Room', 'Workshop', 'Guest House'
            ].map(feature => (
              <label key={feature} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
                <Checkbox
                  checked={filters.features?.includes(feature) || false}
                  onCheckedChange={(checked) => {
                    const currentFeatures = filters.features || [];
                    if (checked) {
                      handleFilterChange('features', [...currentFeatures, feature]);
                    } else {
                      handleFilterChange('features', currentFeatures.filter(f => f !== feature));
                    }
                  }}
                />
                <span className="text-sm text-foreground">{feature}</span>
              </label>
            ))}
          </div>
        </div>
      </ExpandableSection>

      {/* Nearby Amenities */}
      <ExpandableSection
        title="Nearby Amenities"
        icon={<MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="amenities"
        badge={filters.nearbyAmenities ? Object.values(filters.nearbyAmenities).filter(Boolean).length : 0}
      >
        <div className="space-y-4">
          <Label className="text-foreground mb-3 block text-sm font-medium">Find properties near:</Label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { key: 'schools', icon: GraduationCap, label: 'Good Schools' },
              { key: 'hospitals', icon: Hospital, label: 'Hospitals/Medical' },
              { key: 'shopping', icon: ShoppingBag, label: 'Shopping Centers' },
              { key: 'restaurants', icon: Coffee, label: 'Restaurants/Dining' },
              { key: 'parks', icon: TreePine, label: 'Parks/Recreation' },
              { key: 'gyms', icon: Dumbbell, label: 'Fitness Centers' },
              { key: 'publicTransport', icon: Train, label: 'Public Transport' },
              { key: 'airports', icon: Plane, label: 'Airports' },
              { key: 'entertainment', icon: Music, label: 'Entertainment' }
            ].map(({ key, icon: Icon, label }) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
                <Checkbox
                  checked={filters.nearbyAmenities?.[key] || false}
                  onCheckedChange={(checked) => {
                    const current = filters.nearbyAmenities || {};
                    handleFilterChange('nearbyAmenities', {
                      ...current,
                      [key]: checked
                    });
                  }}
                />
                <Icon className="h-4 w-4 text-pickfirst-yellow" />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </ExpandableSection>

      {/* Advanced Filters */}
      <ExpandableSection
        title="Advanced Options"
        icon={<Settings className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="advanced"
      >
        <div className="space-y-4">
          {/* Listing Status */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Listing Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'active', label: 'Active' },
                { key: 'pending', label: 'Pending' },
                { key: 'sold', label: 'Recently Sold' },
                { key: 'new', label: 'New Listings' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
                  <Checkbox
                    checked={filters.listingStatus?.includes(key) || false}
                    onCheckedChange={(checked) => {
                      const current = filters.listingStatus || [];
                      if (checked) {
                        handleFilterChange('listingStatus', [...current, key]);
                      } else {
                        handleFilterChange('listingStatus', current.filter(s => s !== key));
                      }
                    }}
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Days on Market */}
          <div>
            <Label className="text-foreground mb-2 block text-sm font-medium">Days on Market</Label>
            <Select
              value={filters.daysOnMarket?.toString() || ''}
              onValueChange={(value) => handleFilterChange('daysOnMarket', value === 'any' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
              <Checkbox
                checked={filters.openHouse || false}
                onCheckedChange={(checked) => handleFilterChange('openHouse', checked)}
              />
              <span className="text-sm text-foreground">Open House Available</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
              <Checkbox
                checked={filters.virtualTour || false}
                onCheckedChange={(checked) => handleFilterChange('virtualTour', checked)}
              />
              <span className="text-sm text-foreground">Virtual Tour Available</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
              <Checkbox
                checked={filters.priceReduced || false}
                onCheckedChange={(checked) => handleFilterChange('priceReduced', checked)}
              />
              <span className="text-sm text-foreground">Price Recently Reduced</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
              <Checkbox
                checked={filters.foreclosure || false}
                onCheckedChange={(checked) => handleFilterChange('foreclosure', checked)}
              />
              <span className="text-sm text-foreground">Foreclosure Properties</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
              <Checkbox
                checked={filters.shortSale || false}
                onCheckedChange={(checked) => handleFilterChange('shortSale', checked)}
              />
              <span className="text-sm text-foreground">Short Sale Properties</span>
            </label>
          </div>
        </div>
      </ExpandableSection>

      {/* Accessibility Features */}
      <ExpandableSection
        title="Accessibility Features"
        icon={<Shield className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />}
        sectionKey="accessibility"
        badge={filters.accessibilityFeatures?.length || 0}
      >
        <div className="space-y-3">
          <Label className="text-foreground mb-3 block text-sm font-medium">Accessibility Features</Label>
          <div className="grid grid-cols-1 gap-2">
            {[
              'Wheelchair Accessible',
              'Ramp Access',
              'Wide Doorways',
              'Accessible Bathroom',
              'Accessible Kitchen',
              'Elevator Access',
              'Ground Floor Unit',
              'Accessible Parking',
              'Visual Alarms',
              'Hearing Loop System'
            ].map(feature => (
              <label key={feature} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-pickfirst-yellow/10 transition-colors border border-transparent hover:border-pickfirst-yellow/20">
                <Checkbox
                  checked={filters.accessibilityFeatures?.includes(feature) || false}
                  onCheckedChange={(checked) => {
                    const current = filters.accessibilityFeatures || [];
                    if (checked) {
                      handleFilterChange('accessibilityFeatures', [...current, feature]);
                    } else {
                      handleFilterChange('accessibilityFeatures', current.filter(f => f !== feature));
                    }
                  }}
                />
                <span className="text-sm text-foreground">{feature}</span>
              </label>
            ))}
          </div>
        </div>
      </ExpandableSection>
    </>
  );

  if (!isInitialized) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Loading skeleton for filter stats */}
        <Card className="pickfirst-glass bg-card/90 backdrop-blur-xl border border-pickfirst-yellow/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading skeleton for filter sections */}
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="pickfirst-glass bg-card/90 backdrop-blur-xl border border-pickfirst-yellow/30">
            <CardHeader className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Filter Stats and Actions */}
      <Card className="pickfirst-glass bg-card/90 backdrop-blur-xl border border-pickfirst-yellow/30">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-pickfirst-yellow" />
                <span className="text-foreground font-semibold text-sm sm:text-base">
                  {results ? `${results.filterStats.matchingProperties} of ${results.filterStats.totalProperties} properties` : 'Loading...'}
                </span>
              </div>
              {getActiveFilterCount() > 0 && (
                <Badge className="bg-pickfirst-yellow text-black text-xs font-semibold">
                  {getActiveFilterCount()} filters active
                </Badge>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{error}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                className="text-foreground hover:text-pickfirst-yellow border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10 text-xs sm:text-sm"
              >
                <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareFilter}
                className="text-foreground hover:text-pickfirst-yellow border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10 text-xs sm:text-sm"
              >
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-foreground hover:text-pickfirst-yellow border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10 text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <Card className="pickfirst-glass bg-card/90 backdrop-blur-xl border border-pickfirst-yellow/30">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-foreground flex items-center gap-2 text-sm sm:text-base font-semibold">
              <Bookmark className="h-4 w-4 sm:h-5 sm:w-5 text-pickfirst-yellow" />
              Saved Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(filter => (
                <div key={filter.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadSavedFilter(filter)}
                    className="text-foreground hover:text-pickfirst-yellow border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10 text-xs sm:text-sm"
                  >
                    {filter.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSavedFilter(filter.id)}
                    className="text-muted-foreground hover:text-red-400 p-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Filter Content */}
      <div className="hidden sm:block space-y-4">
        <FilterContent />
      </div>

      {/* Mobile Filter Toggle & Overlay */}
      <MobileFilterToggle />
      <MobileFilterOverlay />

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md pickfirst-glass bg-card/95 border border-pickfirst-yellow/30">
            <CardHeader className="p-4">
              <CardTitle className="text-foreground text-lg font-semibold">Save Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div>
                <Label className="text-foreground mb-2 block text-sm font-medium">Filter Name</Label>
                <Input
                  placeholder="Enter filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="bg-background/50 border-pickfirst-yellow/30 text-foreground text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveFilter}
                  className="bg-pickfirst-yellow hover:bg-amber-500 text-black text-sm flex-1 font-semibold"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="text-foreground border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10 text-sm flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductionFilterSystem;