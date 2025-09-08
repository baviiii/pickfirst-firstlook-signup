import { supabase } from '@/integrations/supabase/client';
import { PropertyListing } from './propertyService';
import { googleMapsService } from './googleMapsService';

export interface AdvancedPropertyFilters {
  // Basic filters
  searchTerm?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  squareFootageMin?: number;
  squareFootageMax?: number;
  yearBuiltMin?: number;
  yearBuiltMax?: number;
  
  // Advanced filters
  features?: string[];
  lotSizeMin?: number;
  lotSizeMax?: number;
  garageSpaces?: number;
  hoaMin?: number;
  hoaMax?: number;
  
  // Listing status and market filters
  listingStatus?: string[];
  daysOnMarket?: number;
  openHouse?: boolean;
  virtualTour?: boolean;
  priceReduced?: boolean;
  foreclosure?: boolean;
  shortSale?: boolean;
  
  // Accessibility features
  accessibilityFeatures?: string[];
  
  // Location-based filters
  nearbyAmenities?: {
    schools?: boolean;
    hospitals?: boolean;
    shopping?: boolean;
    restaurants?: boolean;
    parks?: boolean;
    publicTransport?: boolean;
    gyms?: boolean;
    airports?: boolean;
    entertainment?: boolean;
  };
  
  // Area quality filters
  areaFilters?: {
    walkScore?: { min: number; required: boolean };
    schoolRating?: { min: number; required: boolean };
    transitScore?: { min: number; required: boolean };
    safetyScore?: { min: number; required: boolean };
  };
  
  // Pagination and sorting
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'created_at' | 'square_feet' | 'bedrooms' | 'bathrooms';
  sortOrder?: 'asc' | 'desc';
}

export interface FilterResult {
  properties: PropertyListing[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  appliedFilters: AdvancedPropertyFilters;
  filterStats: {
    matchingProperties: number;
    totalProperties: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
  };
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: AdvancedPropertyFilters;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
}

export class FilterService {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, { data: FilterResult; timestamp: number }>();

  /**
   * Apply filters to property listings with database-level filtering
   */
  static async applyFilters(filters: AdvancedPropertyFilters): Promise<FilterResult> {
    const cacheKey = this.generateCacheKey(filters);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      let query = supabase
        .from('property_listings')
        .select('*', { count: 'exact' });

      // Apply basic filters
      if (filters.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,address.ilike.%${filters.searchTerm}%`);
      }

      if (filters.location) {
        query = query.or(`city.ilike.%${filters.location}%,state.ilike.%${filters.location}%,address.ilike.%${filters.location}%`);
      }

      if (filters.priceMin !== undefined) {
        query = query.gte('price', filters.priceMin);
      }

      if (filters.priceMax !== undefined) {
        query = query.lte('price', filters.priceMax);
      }

      if (filters.bedrooms !== undefined) {
        // UI selects X+ so use gte for better matching
        query = query.gte('bedrooms', filters.bedrooms);
      }

      if (filters.bathrooms !== undefined) {
        // Bathrooms can be fractional; use gte for X+
        query = query.gte('bathrooms', filters.bathrooms);
      }

      if (filters.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }

      if (filters.squareFootageMin !== undefined) {
        query = query.gte('square_feet', filters.squareFootageMin);
      }

      if (filters.squareFootageMax !== undefined) {
        query = query.lte('square_feet', filters.squareFootageMax);
      }

      if (filters.yearBuiltMin !== undefined) {
        query = query.gte('year_built', filters.yearBuiltMin);
      }

      if (filters.yearBuiltMax !== undefined) {
        query = query.lte('year_built', filters.yearBuiltMax);
      }

      if (filters.lotSizeMin !== undefined) {
        query = query.gte('lot_size', filters.lotSizeMin);
      }

      if (filters.lotSizeMax !== undefined) {
        query = query.lte('lot_size', filters.lotSizeMax);
      }

      if (filters.garageSpaces !== undefined) {
        query = query.gte('garage_spaces', filters.garageSpaces);
      }

      // Features filtering (array contains)
      if (filters.features && filters.features.length > 0) {
        query = query.overlaps('features', filters.features);
      }

      // Listing status filtering with sensible defaults and mapping
      if (filters.listingStatus && filters.listingStatus.length > 0) {
        const statusMap: Record<string, string> = {
          active: 'approved',
          pending: 'pending',
          sold: 'sold'
        };

        const mappedStatuses = (filters.listingStatus || [])
          .filter(s => s !== 'new')
          .map(s => statusMap[s] || s);

        if (mappedStatuses.length > 0) {
          query = query.in('status', mappedStatuses);
        }

        // Handle "new listings" as a time-based filter (e.g., last 14 days)
        if ((filters.listingStatus || []).includes('new')) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 14);
          query = query.gte('created_at', cutoffDate.toISOString());
          // If no other status specified, assume active
          if (mappedStatuses.length === 0) {
            query = query.eq('status', 'approved');
          }
        }
      } else {
        // Default to approved/active properties only when no explicit status filter is set
        query = query.eq('status', 'approved');
      }

      // Days on market filtering
      if (filters.daysOnMarket !== undefined) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.daysOnMarket);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      // Boolean filters - these are optional fields that may not exist in the database yet
      // We'll add them as comments for future implementation
      // if (filters.openHouse !== undefined) {
      //   query = query.eq('open_house', filters.openHouse);
      // }

      // if (filters.virtualTour !== undefined) {
      //   query = query.eq('virtual_tour', filters.virtualTour);
      // }

      // if (filters.priceReduced !== undefined) {
      //   query = query.eq('price_reduced', filters.priceReduced);
      // }

      // if (filters.foreclosure !== undefined) {
      //   query = query.eq('foreclosure', filters.foreclosure);
      // }

      // if (filters.shortSale !== undefined) {
      //   query = query.eq('short_sale', filters.shortSale);
      // }

      // Accessibility features filtering - commented out until database field is added
      // if (filters.accessibilityFeatures && filters.accessibilityFeatures.length > 0) {
      //   query = query.overlaps('accessibility_features', filters.accessibilityFeatures);
      // }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data: properties, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Get total count for stats
      const { count: totalCount } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Calculate filter stats
      const filterStats = await this.calculateFilterStats(filters, count || 0, totalCount || 0);

      const result: FilterResult = {
        properties: properties || [],
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: page < Math.ceil((count || 0) / limit),
        appliedFilters: filters,
        filterStats
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Filter service error:', error);
      throw new Error('Failed to apply filters');
    }
  }

  /**
   * Get filter suggestions based on current data
   */
  static async getFilterSuggestions(): Promise<{
    propertyTypes: string[];
    priceRange: { min: number; max: number };
    bedroomOptions: number[];
    bathroomOptions: number[];
    features: string[];
    locations: string[];
  }> {
    try {
      const [propertyTypesResult, priceRangeResult, featuresResult, locationsResult, bedroomsResult, bathroomsResult] = await Promise.all([
        supabase.from('property_listings').select('property_type').eq('status', 'approved'),
        supabase.from('property_listings').select('price').eq('status', 'approved'),
        supabase.from('property_listings').select('features').eq('status', 'approved'),
        supabase.from('property_listings').select('city, state').eq('status', 'approved'),
        supabase.from('property_listings').select('bedrooms').eq('status', 'approved'),
        supabase.from('property_listings').select('bathrooms').eq('status', 'approved')
      ]);

      const propertyTypes = [...new Set(propertyTypesResult.data?.map(p => p.property_type) || [])];
      const prices = priceRangeResult.data?.map(p => p.price) || [];
      const allFeatures = featuresResult.data?.flatMap(p => p.features || []) || [];
      const locations = [...new Set(locationsResult.data?.map(p => `${p.city}, ${p.state}`) || [])];
      const bedrooms = bedroomsResult.data?.map(p => p.bedrooms).filter(Boolean) || [];
      const bathrooms = bathroomsResult.data?.map(p => p.bathrooms).filter(Boolean) || [];

      return {
        propertyTypes,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 1000000
        },
        bedroomOptions: [...new Set(bedrooms)].sort((a, b) => a - b),
        bathroomOptions: [...new Set(bathrooms)].sort((a, b) => a - b),
        features: [...new Set(allFeatures)],
        locations
      };
    } catch (error) {
      console.error('Error getting filter suggestions:', error);
      return {
        propertyTypes: [],
        priceRange: { min: 0, max: 1000000 },
        bedroomOptions: [],
        bathroomOptions: [],
        features: [],
        locations: []
      };
    }
  }

  /**
   * Save a filter set for the current user
   * TODO: Implement after saved_filters table migration is applied
   */
  static async saveFilter(name: string, filters: AdvancedPropertyFilters): Promise<SavedFilter> {
    // Temporary implementation - store in localStorage until migration is applied
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const savedFilter: SavedFilter = {
        id: Date.now().toString(),
        name,
        filters,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store in localStorage temporarily
      const existingFilters = JSON.parse(localStorage.getItem(`saved_filters_${user.id}`) || '[]');
      existingFilters.push(savedFilter);
      localStorage.setItem(`saved_filters_${user.id}`, JSON.stringify(existingFilters));

      return savedFilter;
    } catch (error) {
      console.error('Error saving filter:', error);
      throw new Error('Failed to save filter');
    }
  }

  /**
   * Get saved filters for the current user
   * TODO: Implement after saved_filters table migration is applied
   */
  static async getSavedFilters(): Promise<SavedFilter[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get from localStorage temporarily
      const savedFilters = JSON.parse(localStorage.getItem(`saved_filters_${user.id}`) || '[]');
      return savedFilters;
    } catch (error) {
      console.error('Error getting saved filters:', error);
      return [];
    }
  }

  /**
   * Delete a saved filter
   * TODO: Implement after saved_filters table migration is applied
   */
  static async deleteSavedFilter(filterId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete from localStorage temporarily
      const existingFilters = JSON.parse(localStorage.getItem(`saved_filters_${user.id}`) || '[]');
      const updatedFilters = existingFilters.filter((f: SavedFilter) => f.id !== filterId);
      localStorage.setItem(`saved_filters_${user.id}`, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Error deleting saved filter:', error);
      throw new Error('Failed to delete filter');
    }
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generate cache key from filters
   */
  private static generateCacheKey(filters: AdvancedPropertyFilters): string {
    return JSON.stringify(filters);
  }

  /**
   * Calculate filter statistics
   */
  private static async calculateFilterStats(
    filters: AdvancedPropertyFilters, 
    matchingCount: number, 
    totalCount: number
  ): Promise<FilterResult['filterStats']> {
    try {
      // Get price statistics for matching properties
      let priceQuery = supabase
        .from('property_listings')
        .select('price')
        .eq('status', 'approved');

      // Apply same filters as main query for accurate stats
      if (filters.priceMin !== undefined) {
        priceQuery = priceQuery.gte('price', filters.priceMin);
      }
      if (filters.priceMax !== undefined) {
        priceQuery = priceQuery.lte('price', filters.priceMax);
      }

      const { data: priceData } = await priceQuery;
      const prices = priceData?.map(p => p.price) || [];

      return {
        matchingProperties: matchingCount,
        totalProperties: totalCount,
        averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0
        }
      };
    } catch (error) {
      console.error('Error calculating filter stats:', error);
      return {
        matchingProperties: matchingCount,
        totalProperties: totalCount,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 }
      };
    }
  }
}

export const filterService = new FilterService();
