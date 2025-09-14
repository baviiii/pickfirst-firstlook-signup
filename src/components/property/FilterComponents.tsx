import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X, Filter, Search, RefreshCw, DollarSign, Home, MapPin } from 'lucide-react';

export interface PropertyFilters {
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  location?: string;
  searchTerm?: string;
}

interface FilterComponentsProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onClearFilters: () => void;
}

export const FilterComponents = ({ filters, onFiltersChange, onClearFilters }: FilterComponentsProps) => {
  const [priceRange, setPriceRange] = useState([filters.priceMin || 0, filters.priceMax || 1000000]);

  const propertyTypes = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land', 'Commercial'];
  const bedroomOptions = ['1', '2', '3', '4', '5', '6+'];
  const bathroomOptions = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '5+'];

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value);
    onFiltersChange({
      ...filters,
      priceMin: value[0],
      priceMax: value[1]
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.propertyType) count++;
    if (filters.location) count++;
    if (filters.searchTerm) count++;
    return count;
  };

  const getActiveFilters = () => {
    const active = [];
    if (filters.priceMin || filters.priceMax) {
      active.push(`$${filters.priceMin?.toLocaleString() || '0'} - $${filters.priceMax?.toLocaleString() || '∞'}`);
    }
    if (filters.bedrooms) active.push(`${filters.bedrooms} beds`);
    if (filters.bathrooms) active.push(`${filters.bathrooms} baths`);
    if (filters.propertyType) active.push(filters.propertyType);
    if (filters.location) active.push(filters.location);
    if (filters.searchTerm) active.push(`"${filters.searchTerm}"`);
    return active;
  };

  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by address, city, or property features..."
              value={filters.searchTerm || ''}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5 text-pickfirst-yellow" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="bg-pickfirst-yellow/20 text-pickfirst-yellow">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </CardTitle>
            {getActiveFilterCount() > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-300 hover:text-pickfirst-yellow border-gray-600"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-pickfirst-yellow" />
              Price Range: ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
            </Label>
            <Slider
              value={priceRange}
              onValueChange={handlePriceRangeChange}
              max={1000000}
              step={10000}
              className="w-full"
            />
          </div>

          {/* Quick Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Property Type */}
            <div>
              <Label className="text-gray-300 text-sm">Property Type</Label>
              <Select value={filters.propertyType || ''} onValueChange={(value) => handleFilterChange('propertyType', value || undefined)}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Any Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Type</SelectItem>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bedrooms */}
            <div>
              <Label className="text-gray-300 text-sm">Bedrooms</Label>
              <Select value={filters.bedrooms?.toString() || ''} onValueChange={(value) => handleFilterChange('bedrooms', value ? parseInt(value) : undefined)}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {bedroomOptions.map(beds => (
                    <SelectItem key={beds} value={beds.replace('+', '')}>{beds} beds</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bathrooms */}
            <div>
              <Label className="text-gray-300 text-sm">Bathrooms</Label>
              <Select value={filters.bathrooms?.toString() || ''} onValueChange={(value) => handleFilterChange('bathrooms', value ? parseFloat(value) : undefined)}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {bathroomOptions.map(baths => (
                    <SelectItem key={baths} value={baths.replace('+', '')}>{baths} baths</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label className="text-gray-300 text-sm">Location</Label>
              <Input
                type="text"
                placeholder="City, State"
                value={filters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {getActiveFilterCount() > 0 && (
            <div className="pt-3 border-t border-gray-700">
              <Label className="text-gray-300 text-sm block mb-2">Active Filters:</Label>
              <div className="flex flex-wrap gap-2">
                {getActiveFilters().map((filter, index) => (
                  <Badge key={index} variant="secondary" className="bg-pickfirst-yellow/20 text-pickfirst-yellow">
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FilterComponents;