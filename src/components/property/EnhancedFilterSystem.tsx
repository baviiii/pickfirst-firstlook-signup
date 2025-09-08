import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  MapPin, 
  Star, 
  DollarSign, 
  Home, 
  Filter,
  X,
  ChevronDown,
  Navigation,
  GraduationCap,
  Train,
  Dumbbell,
  ShoppingBag,
  Stethoscope,
  TreePine,
  Coffee,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react';
import { googleMapsService, PlaceAutocompleteResult } from '@/services/googleMapsService';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';

export interface PropertyFilters {
  // Basic filters
  searchTerm?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  priceRange: [number, number];
  bedrooms?: string;
  bathrooms?: string;
  propertyType?: string;
  squareFootageRange: [number, number];
  yearBuiltRange: [number, number];
  
  // Advanced filters
  features?: string[];
  
  // Location-based filters with Google Places integration
  nearbyAmenities?: {
    schools?: { required: boolean; maxDistance: number; minRating: number };
    restaurants?: { required: boolean; maxDistance: number; minRating: number };
    shopping?: { required: boolean; maxDistance: number; minRating: number };
    healthcare?: { required: boolean; maxDistance: number; minRating: number };
    parks?: { required: boolean; maxDistance: number; minRating: number };
    transit?: { required: boolean; maxDistance: number; minRating: number };
    gyms?: { required: boolean; maxDistance: number; minRating: number };
  };
  
  // Area quality filters
  areaFilters?: {
    walkScore?: { min: number; required: boolean };
    schoolRating?: { min: number; required: boolean };
    transitScore?: { min: number; required: boolean };
    safetyScore?: { min: number; required: boolean };
  };
}

interface FilterComponentsProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onClearFilters: () => void;
  onApplyFilters?: () => void;
}

const EnhancedFilterSystem: React.FC<FilterComponentsProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  onApplyFilters
}) => {
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceAutocompleteResult[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    amenities: false,
    area: false,
    advanced: false
  });
  const [filterStats, setFilterStats] = useState({
    matchingProperties: 0,
    totalProperties: 0
  });

  const propertyTypes = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land'];
  const bedroomOptions = ['1', '2', '3', '4', '5', '6+'];
  const bathroomOptions = ['1', '1.5', '2', '2.5', '3', '3.5', '4+'];
  const propertyFeatures = [
    'Pool', 'Garage', 'Garden', 'Fireplace', 'Balcony', 'Basement',
    'Air Conditioning', 'Hardwood Floors', 'Granite Counters', 'Stainless Appliances',
    'Walk-in Closet', 'Updated Kitchen', 'Master Suite', 'Home Office'
  ];

  const amenityTypes = [
    { key: 'schools', label: 'Schools', icon: GraduationCap },
    { key: 'restaurants', label: 'Restaurants', icon: Coffee },
    { key: 'shopping', label: 'Shopping', icon: ShoppingBag },
    { key: 'healthcare', label: 'Healthcare', icon: Stethoscope },
    { key: 'parks', label: 'Parks', icon: TreePine },
    { key: 'transit', label: 'Transit', icon: Train },
    { key: 'gyms', label: 'Fitness', icon: Dumbbell }
  ];

  // Debounced location search
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (filters.location && filters.location.length > 2) {
        try {
          const suggestions = await googleMapsService.searchPlaces(filters.location);
          setLocationSuggestions(suggestions);
          setShowLocationSuggestions(true);
        } catch (error) {
          console.error('Error fetching location suggestions:', error);
        }
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [filters.location]);

  // Update filter stats
  useEffect(() => {
    updateFilterStats();
  }, [filters]);

  const updateFilterStats = async () => {
    try {
      // In a real implementation, you'd call an API to get filtered results count
      // For now, we'll simulate this
      const totalProperties = 150; // Simulated total
      const matchingProperties = Math.max(1, Math.floor(totalProperties * (1 - getFilterComplexity())));
      
      setFilterStats({
        matchingProperties,
        totalProperties
      });
    } catch (error) {
      console.error('Error updating filter stats:', error);
    }
  };

  const getFilterComplexity = () => {
    let complexity = 0;
    
    // Basic filters
    if (filters.searchTerm) complexity += 0.1;
    if (filters.location) complexity += 0.15;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000000) complexity += 0.1;
    if (filters.bedrooms) complexity += 0.1;
    if (filters.bathrooms) complexity += 0.1;
    if (filters.propertyType) complexity += 0.1;
    
    // Advanced filters
    if (filters.features && filters.features.length > 0) {
      complexity += filters.features.length * 0.05;
    }
    
    // Amenity filters
    if (filters.nearbyAmenities) {
      Object.values(filters.nearbyAmenities).forEach(amenity => {
        if (amenity?.required) complexity += 0.1;
      });
    }
    
    // Area filters
    if (filters.areaFilters) {
      Object.values(filters.areaFilters).forEach(filter => {
        if (filter?.required) complexity += 0.1;
      });
    }
    
    return Math.min(complexity, 0.9);
  };

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleAmenityFilterChange = (
    amenityType: string, 
    field: 'required' | 'maxDistance' | 'minRating', 
    value: any
  ) => {
    const currentAmenities = filters.nearbyAmenities || {};
    const currentAmenity = currentAmenities[amenityType as keyof typeof currentAmenities] || {
      required: false,
      maxDistance: 1000,
      minRating: 3.0
    };

    onFiltersChange({
      ...filters,
      nearbyAmenities: {
        ...currentAmenities,
        [amenityType]: {
          ...currentAmenity,
          [field]: value
        }
      }
    });
  };

  const handleAreaFilterChange = (
    filterType: string,
    field: 'min' | 'required',
    value: any
  ) => {
    const currentAreaFilters = filters.areaFilters || {};
    const currentFilter = currentAreaFilters[filterType as keyof typeof currentAreaFilters] || {
      min: 0,
      required: false
    };

    onFiltersChange({
      ...filters,
      areaFilters: {
        ...currentAreaFilters,
        [filterType]: {
          ...currentFilter,
          [field]: value
        }
      }
    });
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
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000000) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.propertyType) count++;
    if (filters.features?.length) count += filters.features.length;
    
    if (filters.nearbyAmenities) {
      count += Object.values(filters.nearbyAmenities).filter(a => a?.required).length;
    }
    
    if (filters.areaFilters) {
      count += Object.values(filters.areaFilters).filter(f => f?.required).length;
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

  return (
    <div className="space-y-6">
      {/* Filter Stats */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">
                  {filterStats.matchingProperties} of {filterStats.totalProperties} properties
                </span>
              </div>
              {getActiveFilterCount() > 0 && (
                <Badge className="bg-yellow-400 text-black">
                  {getActiveFilterCount()} filters active
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-300 hover:text-yellow-400 border-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
              {onApplyFilters && (
                <Button
                  size="sm"
                  onClick={onApplyFilters}
                  className="bg-yellow-400 hover:bg-amber-500 text-black"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Apply
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
              Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
            </Label>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => handleFilterChange('priceRange', value)}
              max={1000000}
              step={10000}
              className="w-full"
            />
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Property Type</Label>
              <select
                value={filters.propertyType || ''}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Any Type</option>
                {propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label className="text-gray-300 mb-2 block">Bedrooms</Label>
              <select
                value={filters.bedrooms || ''}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Any</option>
                {bedroomOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label className="text-gray-300 mb-2 block">Bathrooms</Label>
              <select
                value={filters.bathrooms || ''}
                onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Any</option>
                {bathroomOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Features */}
          <div>
            <Label className="text-gray-300 mb-3 block">Property Features</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {propertyFeatures.map(feature => (
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

      {/* Nearby Amenities */}
      <ExpandableSection
        title="Nearby Amenities"
        icon={<MapPin className="h-5 w-5 text-yellow-400" />}
        sectionKey="amenities"
        badge={filters.nearbyAmenities ? Object.values(filters.nearbyAmenities).filter(a => a?.required).length : 0}
      >
        <div className="space-y-6">
          {amenityTypes.map(amenity => {
            const amenityFilter = filters.nearbyAmenities?.[amenity.key as keyof typeof filters.nearbyAmenities];
            const Icon = amenity.icon;
            
            return (
              <div key={amenity.key} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="h-5 w-5 text-yellow-400" />
                  <span className="text-white font-medium">{amenity.label}</span>
                  <label className="flex items-center space-x-2 ml-auto cursor-pointer">
                    <Checkbox
                      checked={amenityFilter?.required || false}
                      onCheckedChange={(checked) => 
                        handleAmenityFilterChange(amenity.key, 'required', checked)
                      }
                    />
                    <span className="text-sm text-gray-300">Required</span>
                  </label>
                </div>
                
                {amenityFilter?.required && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400 text-xs mb-1 block">
                        Max Distance: {amenityFilter.maxDistance}m
                      </Label>
                      <Slider
                        value={[amenityFilter.maxDistance]}
                        onValueChange={([value]) => 
                          handleAmenityFilterChange(amenity.key, 'maxDistance', value)
                        }
                        max={5000}
                        min={100}
                        step={100}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-400 text-xs mb-1 block">
                        Min Rating: {amenityFilter.minRating}★
                      </Label>
                      <Slider
                        value={[amenityFilter.minRating]}
                        onValueChange={([value]) => 
                          handleAmenityFilterChange(amenity.key, 'minRating', value)
                        }
                        max={5}
                        min={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ExpandableSection>

      {/* Area Quality Filters */}
      <ExpandableSection
        title="Area Quality"
        icon={<TrendingUp className="h-5 w-5 text-yellow-400" />}
        sectionKey="area"
        badge={filters.areaFilters ? Object.values(filters.areaFilters).filter(f => f?.required).length : 0}
      >
        <div className="space-y-6">
          {[
            { key: 'walkScore', label: 'Walk Score', icon: Navigation, max: 100 },
            { key: 'schoolRating', label: 'School Rating', icon: GraduationCap, max: 5 },
            { key: 'transitScore', label: 'Transit Score', icon: Train, max: 100 },
            { key: 'safetyScore', label: 'Safety Score', icon: Star, max: 10 }
          ].map(filter => {
            const areaFilter = filters.areaFilters?.[filter.key as keyof typeof filters.areaFilters];
            const Icon = filter.icon;
            
            return (
              <div key={filter.key} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="h-5 w-5 text-yellow-400" />
                  <span className="text-white font-medium">{filter.label}</span>
                  <label className="flex items-center space-x-2 ml-auto cursor-pointer">
                    <Checkbox
                      checked={areaFilter?.required || false}
                      onCheckedChange={(checked) => 
                        handleAreaFilterChange(filter.key, 'required', checked)
                      }
                    />
                    <span className="text-sm text-gray-300">Required</span>
                  </label>
                </div>
                
                {areaFilter?.required && (
                  <div>
                    <Label className="text-gray-400 text-xs mb-1 block">
                      Minimum: {areaFilter.min} {filter.key === 'schoolRating' ? '★' : ''}
                    </Label>
                    <Slider
                      value={[areaFilter.min]}
                      onValueChange={([value]) => 
                        handleAreaFilterChange(filter.key, 'min', value)
                      }
                      max={filter.max}
                      min={0}
                      step={filter.key === 'schoolRating' ? 0.1 : 1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ExpandableSection>
    </div>
  );
};

export default EnhancedFilterSystem;