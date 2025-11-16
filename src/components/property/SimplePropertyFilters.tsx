import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Home, 
  Filter,
  X,
  Bed,
  Bath,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

interface SimpleFilters {
  searchTerm?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  minSquareFootage?: number;
  maxSquareFootage?: number;
}

interface SimplePropertyFiltersProps {
  onFiltersChange?: (filters: SimpleFilters) => void;
  onSearch?: () => void;
  className?: string;
}

const SimplePropertyFilters: React.FC<SimplePropertyFiltersProps> = ({
  onFiltersChange,
  onSearch,
  className = ''
}) => {
  const [filters, setFilters] = useState<SimpleFilters>({
    // Don't set default price filters - let BrowseProperties handle it
    minSquareFootage: 0,
    maxSquareFootage: 5000
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);

  useEffect(() => {
    // Don't call onFiltersChange on initial mount - wait for user interaction
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }
    // Only call onFiltersChange after initial mount when filters change
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange, isInitialMount]);

  const handleFilterChange = (key: keyof SimpleFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      // Clear all filters completely
      minSquareFootage: 0,
      maxSquareFootage: 5000
    });
    // Explicitly call onFiltersChange when clearing to reset parent state
    onFiltersChange?.({});
    toast.success('Filters cleared');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm?.trim()) count++;
    if (filters.location?.trim()) count++;
    if (filters.priceMin && filters.priceMin > 0) count++;
    if (filters.priceMax && filters.priceMax < 1000000) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.propertyType) count++;
    if (filters.minSquareFootage && filters.minSquareFootage > 0) count++;
    if (filters.maxSquareFootage && filters.maxSquareFootage < 5000) count++;
    return count;
  };

  return (
  <Card className={`pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-foreground flex items-center gap-2 flex-wrap">
            <Filter className="h-5 w-5 text-primary" />
            Property Search
            {getActiveFilterCount() > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {getActiveFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-primary"
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground hover:text-primary"
              >
                {showAdvanced ? 'Simple' : 'Advanced'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-muted-foreground hover:text-primary"
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Basic Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label className="text-muted-foreground mb-2 block text-sm">Search Properties</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Enter keywords (e.g., pool, garage, modern)..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="pl-10 bg-card border border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground mb-2 block text-sm">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="City, suburb, or postcode..."
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="pl-10 bg-card border border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          </div>

          {/* Price Range */}
          <div>
          <Label className="text-muted-foreground mb-4 block text-sm">
            {filters.priceMin !== undefined || filters.priceMax !== undefined
              ? `Price Range: $${(filters.priceMin || 0).toLocaleString()} - $${(filters.priceMax || 1000000).toLocaleString()}`
              : 'Price Range: Not Set'}
          </Label>
          <Slider
            value={filters.priceMin !== undefined || filters.priceMax !== undefined 
              ? [filters.priceMin || 0, filters.priceMax || 1000000]
              : [0, 1000000]}
            onValueChange={([min, max]) => {
              // Only set filters if user actually moved the slider (not at defaults)
              if (min > 0 || max < 1000000) {
                handleFilterChange('priceMin', min > 0 ? min : undefined);
                handleFilterChange('priceMax', max < 1000000 ? max : undefined);
              } else {
                // Reset to empty if back at defaults
                handleFilterChange('priceMin', undefined);
                handleFilterChange('priceMax', undefined);
              }
            }}
            max={1000000}
            min={0}
            step={10000}
            className="w-full mb-3 sm:mb-4"
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs">Min Price</Label>
              <Input
                type="number"
                placeholder="No minimum"
                value={filters.priceMin !== undefined ? filters.priceMin : ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  // Only set if > 0, otherwise clear
                  handleFilterChange('priceMin', value && value > 0 ? value : undefined);
                }}
                className="bg-card border border-border text-foreground text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground mb-1 block text-xs">Max Price</Label>
              <Input
                type="number"
                placeholder="No maximum"
                value={filters.priceMax !== undefined ? filters.priceMax : ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  // Only set if < 1000000 (not default), otherwise clear
                  handleFilterChange('priceMax', value && value < 1000000 ? value : undefined);
                }}
                className="bg-card border border-border text-foreground text-sm"
              />
            </div>
          </div>
          </div>

          {/* Property Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label className="text-muted-foreground mb-2 block text-sm">Property Type</Label>
            <Select
              value={filters.propertyType || ''}
              onValueChange={(value) => handleFilterChange('propertyType', value === 'any' ? undefined : value)}
            >
              <SelectTrigger className="bg-card border border-border text-foreground">
                <SelectValue placeholder="Any Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Type</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-muted-foreground mb-2 block text-sm flex items-center gap-1">
              <Bed className="h-4 w-4" />
              Bedrooms
            </Label>
            <Select
              value={filters.bedrooms?.toString() || ''}
              onValueChange={(value) => handleFilterChange('bedrooms', value === 'any' ? undefined : parseInt(value))}
            >
              <SelectTrigger className="bg-card border border-border text-foreground">
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
            <Label className="text-muted-foreground mb-2 block text-sm flex items-center gap-1">
              <Bath className="h-4 w-4" />
              Bathrooms
            </Label>
            <Select
              value={filters.bathrooms?.toString() || ''}
              onValueChange={(value) => handleFilterChange('bathrooms', value === 'any' ? undefined : parseFloat(value))}
            >
              <SelectTrigger className="bg-card border border-border text-foreground">
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

          {/* Advanced Filters (Collapsible) */}
          {showAdvanced && (
            <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-border">
            <div>
              <Label className="text-gray-300 mb-2 block text-sm flex items-center gap-1">
                <Square className="h-4 w-4" />
                Property Size (sq ft)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min sq ft"
                  value={filters.minSquareFootage || ''}
                  onChange={(e) => handleFilterChange('minSquareFootage', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-card border border-border text-foreground text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max sq ft"
                  value={filters.maxSquareFootage || ''}
                  onChange={(e) => handleFilterChange('maxSquareFootage', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-card border border-border text-foreground text-sm"
                />
              </div>
            </div>
            </div>
          )}

          {/* Search Button */}
          <Button
            onClick={onSearch}
            className="w-full bg-primary hover:bg-pickfirst-amber text-primary-foreground font-medium py-2.5 sm:py-3"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Properties
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

export default SimplePropertyFilters;
