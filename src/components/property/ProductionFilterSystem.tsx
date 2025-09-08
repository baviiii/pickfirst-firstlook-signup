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
  AlertCircle
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
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    amenities: false,
    area: false,
    advanced: false
  });

  // Debounced search term
  const debouncedSearchTerm = useDebounce(filters.searchTerm || '', 500);
  const debouncedLocation = useDebounce(filters.location || '', 500);

  // Location autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Filter suggestions
  const [filterSuggestions, setFilterSuggestions] = useState({
    propertyTypes: [],
    priceRange: { min: 0, max: 1000000 },
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

  // Apply filters when they change
  useEffect(() => {
    if (isInitialized) {
      applyFilters();
    }
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
      const results = await FilterService.applyFilters(filters);
      setResults(results);
      onResultsChange?.(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply filters';
      setError(errorMessage);
      toast.error(errorMessage);
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
    <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
      <CardHeader 
        className="cursor-pointer hover:bg-yellow-400/5 transition-colors"
        onClick={() => toggleSection(sectionKey)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-white">{title}</CardTitle>
            {badge !== undefined && badge > 0 && (
              <Badge className="bg-yellow-400 text-black">{badge}</Badge>
            )}
          </div>
          <ChevronDown 
            className={`h-5 w-5 text-yellow-400 transition-transform ${
              expandedSections[sectionKey] ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </CardHeader>
      {expandedSections[sectionKey] && (
        <CardContent className="border-t border-yellow-400/10">
          {children}
        </CardContent>
      )}
    </Card>
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filter Stats and Actions */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">
                  {results ? `${results.filterStats.matchingProperties} of ${results.filterStats.totalProperties} properties` : 'Loading...'}
                </span>
              </div>
              {getActiveFilterCount() > 0 && (
                <Badge className="bg-yellow-400 text-black">
                  {getActiveFilterCount()} filters active
                </Badge>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
                className="text-gray-300 hover:text-yellow-400 border-gray-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareFilter}
                className="text-gray-300 hover:text-yellow-400 border-gray-600"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-gray-300 hover:text-yellow-400 border-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-yellow-400" />
              Saved Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(filter => (
                <Button
                  key={filter.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadSavedFilter(filter)}
                  className="text-gray-300 hover:text-yellow-400 border-gray-600"
                >
                  {filter.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Filters */}
      <ExpandableSection
        title="Basic Filters"
        icon={<Home className="h-5 w-5 text-yellow-400" />}
        sectionKey="basic"
      >
        <div className="space-y-6">
          {/* Search */}
          <div>
            <Label className="text-gray-300 mb-2 block">Search Keywords</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Enter keywords..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Location with Autocomplete */}
          <div>
            <Label className="text-gray-300 mb-2 block">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Enter city, suburb, or address..."
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
              />
              
              {/* Location Suggestions */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-2 text-left text-white hover:bg-yellow-400/10 transition-colors"
                      onClick={() => {
                        handleFilterChange('location', suggestion.description);
                        setShowLocationSuggestions(false);
                      }}
                    >
                      <div className="font-medium">{suggestion.structured_formatting.main_text}</div>
                      <div className="text-sm text-gray-400">{suggestion.structured_formatting.secondary_text}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-gray-300 mb-4 block">
              Price Range: ${(filters.priceMin || 0).toLocaleString()} - ${(filters.priceMax || 1000000).toLocaleString()}
            </Label>
            <Slider
              value={[filters.priceMin || 0, filters.priceMax || 1000000]}
              onValueChange={([min, max]) => {
                handleFilterChange('priceMin', min);
                handleFilterChange('priceMax', max);
              }}
              max={filterSuggestions.priceRange.max}
              min={filterSuggestions.priceRange.min}
              step={10000}
              className="w-full"
            />
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Property Type</Label>
              <Select
                value={filters.propertyType || ''}
                onValueChange={(value) => handleFilterChange('propertyType', value)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Any Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Type</SelectItem>
                  {filterSuggestions.propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-gray-300 mb-2 block">Bedrooms</Label>
              <Select
                value={filters.bedrooms?.toString() || ''}
                onValueChange={(value) => handleFilterChange('bedrooms', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {filterSuggestions.bedroomOptions.map(option => (
                    <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-gray-300 mb-2 block">Bathrooms</Label>
              <Select
                value={filters.bathrooms?.toString() || ''}
                onValueChange={(value) => handleFilterChange('bathrooms', value ? parseFloat(value) : undefined)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {filterSuggestions.bathroomOptions.map(option => (
                    <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Features */}
          <div>
            <Label className="text-gray-300 mb-3 block">Property Features</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filterSuggestions.features.map(feature => (
                <label key={feature} className="flex items-center space-x-2 cursor-pointer">
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
                  <span className="text-sm text-gray-300">{feature}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </ExpandableSection>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96 bg-gray-900 border border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-white">Save Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Filter Name</Label>
                <Input
                  placeholder="Enter filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveFilter}
                  className="bg-yellow-400 hover:bg-amber-500 text-black"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="text-gray-300 border-gray-600"
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
