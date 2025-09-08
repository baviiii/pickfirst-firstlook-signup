import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdvancedPropertyFilters } from '@/services/filterService';

const DEFAULT_FILTERS: AdvancedPropertyFilters = {
  priceMin: 0,
  priceMax: 1000000,
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc'
};

export const useFilterState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<AdvancedPropertyFilters>(DEFAULT_FILTERS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize filters from URL on mount
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    setFilters({ ...DEFAULT_FILTERS, ...urlFilters });
    setIsInitialized(true);
  }, [searchParams]);

  // Update URL when filters change
  const updateFilters = useCallback((newFilters: Partial<AdvancedPropertyFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset to page 1 when filters change
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  }, [filters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    updateURL(DEFAULT_FILTERS);
  }, []);

  // Update pagination
  const updatePagination = useCallback((page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  }, [filters]);

  // Update sorting
  const updateSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    const updatedFilters = { ...filters, sortBy: sortBy as any, sortOrder, page: 1 };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
  }, [filters]);

  // Update URL in browser
  const updateURL = (filters: AdvancedPropertyFilters) => {
    const params = new URLSearchParams();
    
    // Only add non-default values to URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'features' && Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else if (key === 'nearbyAmenities' || key === 'areaFilters') {
          // Handle nested objects
          if (value && typeof value === 'object') {
            params.set(key, JSON.stringify(value));
          }
        } else if (key === 'page' && value !== 1) {
          params.set(key, value.toString());
        } else if (key !== 'page' && key !== 'limit') {
          params.set(key, value.toString());
        }
      }
    });

    setSearchParams(params, { replace: true });
  };

  return {
    filters,
    isInitialized,
    updateFilters,
    clearFilters,
    updatePagination,
    updateSorting
  };
};

// Parse filters from URL search params
function parseFiltersFromURL(searchParams: URLSearchParams): Partial<AdvancedPropertyFilters> {
  const filters: Partial<AdvancedPropertyFilters> = {};

  // Basic string filters
  const stringFilters = ['searchTerm', 'location', 'propertyType', 'sortBy', 'sortOrder'];
  stringFilters.forEach(key => {
    const value = searchParams.get(key);
    if (value) {
      (filters as any)[key] = value;
    }
  });

  // Numeric filters
  const numericFilters = [
    'priceMin', 'priceMax', 'bedrooms', 'bathrooms', 'squareFootageMin', 
    'squareFootageMax', 'yearBuiltMin', 'yearBuiltMax', 'lotSizeMin', 
    'lotSizeMax', 'garageSpaces', 'hoaMin', 'hoaMax', 'page', 'limit'
  ];
  numericFilters.forEach(key => {
    const value = searchParams.get(key);
    if (value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        (filters as any)[key] = numValue;
      }
    }
  });

  // Array filters
  const features = searchParams.get('features');
  if (features) {
    filters.features = features.split(',').filter(Boolean);
  }

  // Nested object filters
  const nearbyAmenities = searchParams.get('nearbyAmenities');
  if (nearbyAmenities) {
    try {
      filters.nearbyAmenities = JSON.parse(nearbyAmenities);
    } catch (error) {
      console.error('Error parsing nearbyAmenities from URL:', error);
    }
  }

  const areaFilters = searchParams.get('areaFilters');
  if (areaFilters) {
    try {
      filters.areaFilters = JSON.parse(areaFilters);
    } catch (error) {
      console.error('Error parsing areaFilters from URL:', error);
    }
  }

  return filters;
}

// Generate shareable filter URL
export const generateFilterURL = (filters: AdvancedPropertyFilters): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'features' && Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (key === 'nearbyAmenities' || key === 'areaFilters') {
        if (value && typeof value === 'object') {
          params.set(key, JSON.stringify(value));
        }
      } else if (key !== 'page' && key !== 'limit') {
        params.set(key, value.toString());
      }
    }
  });

  return `${window.location.pathname}?${params.toString()}`;
};

// Validate filters
export const validateFilters = (filters: AdvancedPropertyFilters): string[] => {
  const errors: string[] = [];

  if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
    if (filters.priceMin > filters.priceMax) {
      errors.push('Minimum price cannot be greater than maximum price');
    }
  }

  if (filters.squareFootageMin !== undefined && filters.squareFootageMax !== undefined) {
    if (filters.squareFootageMin > filters.squareFootageMax) {
      errors.push('Minimum square footage cannot be greater than maximum square footage');
    }
  }

  if (filters.yearBuiltMin !== undefined && filters.yearBuiltMax !== undefined) {
    if (filters.yearBuiltMin > filters.yearBuiltMax) {
      errors.push('Minimum year built cannot be greater than maximum year built');
    }
  }

  if (filters.bedrooms !== undefined && filters.bedrooms < 0) {
    errors.push('Number of bedrooms cannot be negative');
  }

  if (filters.bathrooms !== undefined && filters.bathrooms < 0) {
    errors.push('Number of bathrooms cannot be negative');
  }

  return errors;
};
