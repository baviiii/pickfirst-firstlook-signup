import { supabase } from '@/integrations/supabase/client';
import { PropertyListing } from './propertyService';
import { googleMapsService } from './googleMapsService';

// Extended PropertyListing with fuzzy matching properties
export interface PropertyListingWithFuzzyMatch extends PropertyListing {
  similarityScore?: number;
  matchReason?: string;
}

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
  properties: PropertyListingWithFuzzyMatch[];
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
        query = query.or(`title.ilike."%${filters.searchTerm}%",description.ilike."%${filters.searchTerm}%",address.ilike."%${filters.searchTerm}%"`);
      }

      let hasLocationFilter = false;
      if (filters.location) {
        hasLocationFilter = true;
        // Extract potential suburb/city names from the location string
        const locationParts = filters.location.split(',').map(part => part.trim());
        const searchTerms = [];
        
        // Add the full location string
        searchTerms.push(filters.location);
        
        // Add individual parts (suburb, city, state, etc.)
        locationParts.forEach(part => {
          if (part && part.length > 2) {
            // Clean up common suffixes
            const cleanPart = part.replace(/\s*(australia|sa|nsw|vic|qld|wa|tas|nt|act)\s*$/gi, '').trim();
            if (cleanPart && cleanPart.length > 2) {
              searchTerms.push(cleanPart);
              searchTerms.push(part); // Also add original part
            }
          }
        });
        
        // For better matching, also add partial matches
        const mainSuburb = locationParts.find(part => 
          part && !part.toLowerCase().includes('australia') && 
          !part.toLowerCase().match(/\b(sa|nsw|vic|qld|wa|tas|nt|act)\b/i) &&
          part.length > 3
        );
        
        if (mainSuburb) {
          // Add variations of the main suburb
          const suburbWords = mainSuburb.split(' ');
          suburbWords.forEach(word => {
            if (word.length > 2) { // Lowered threshold for better matching
              searchTerms.push(word);
            }
          });
        }
        
        // Remove duplicates and create OR conditions
        const uniqueTerms = [...new Set(searchTerms)];
        const orConditions = uniqueTerms.map(term => 
          `city.ilike."%${term}%",state.ilike."%${term}%",address.ilike."%${term}%"`
        ).join(',');
        
        query = query.or(orConditions);
      }

      if (filters.priceMin !== undefined && filters.priceMin !== null && filters.priceMin > 0) {
        query = query.gte('price', filters.priceMin);
      }

      if (filters.priceMax !== undefined && filters.priceMax !== null && filters.priceMax > 0) {
        query = query.lte('price', filters.priceMax);
      }

      if (filters.bedrooms !== undefined && filters.bedrooms !== null && filters.bedrooms > 0) {
        // UI selects X+ so use gte for better matching
        query = query.gte('bedrooms', filters.bedrooms);
      }

      if (filters.bathrooms !== undefined && filters.bathrooms !== null && filters.bathrooms > 0) {
        // Bathrooms can be fractional; use gte for X+
        query = query.gte('bathrooms', filters.bathrooms);
      }

      if (filters.propertyType) {
        // Property type matching - normalize to lowercase for case-insensitive matching
        const normalizedType = filters.propertyType.toLowerCase();
        // Use or() to match both lowercase and original case
        query = query.or(`property_type.eq.${normalizedType},property_type.eq.${filters.propertyType}`);
      }

      if (filters.squareFootageMin !== undefined && filters.squareFootageMin !== null && filters.squareFootageMin > 0) {
        query = query.gte('square_feet', filters.squareFootageMin);
      }

      if (filters.squareFootageMax !== undefined && filters.squareFootageMax !== null && filters.squareFootageMax > 0) {
        query = query.lte('square_feet', filters.squareFootageMax);
      }

      if (filters.yearBuiltMin !== undefined && filters.yearBuiltMin !== null && filters.yearBuiltMin > 0) {
        query = query.gte('year_built', filters.yearBuiltMin);
      }

      if (filters.yearBuiltMax !== undefined && filters.yearBuiltMax !== null && filters.yearBuiltMax > 0) {
        query = query.lte('year_built', filters.yearBuiltMax);
      }

      if (filters.lotSizeMin !== undefined && filters.lotSizeMin !== null && filters.lotSizeMin > 0) {
        query = query.gte('lot_size', filters.lotSizeMin);
      }

      if (filters.lotSizeMax !== undefined && filters.lotSizeMax !== null && filters.lotSizeMax > 0) {
        query = query.lte('lot_size', filters.lotSizeMax);
      }

      if (filters.garageSpaces !== undefined && filters.garageSpaces !== null && filters.garageSpaces >= 0) {
        query = query.gte('garages', filters.garageSpaces);
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

      let enhancedProperties: PropertyListingWithFuzzyMatch[] = properties || [];

      // Apply fuzzy matching if location filter was used and we have limited results
      if (hasLocationFilter && filters.location && enhancedProperties.length < 10) {
        // Get additional properties without location filter for fuzzy matching
        let fuzzyQuery = supabase
          .from('property_listings')
          .select('*');

        // Apply all filters except location
        if (filters.searchTerm) {
          fuzzyQuery = fuzzyQuery.or(`title.ilike."%${filters.searchTerm}%",description.ilike."%${filters.searchTerm}%",address.ilike."%${filters.searchTerm}%"`);
        }
        if (filters.priceMin !== undefined) {
          fuzzyQuery = fuzzyQuery.gte('price', filters.priceMin);
        }
        if (filters.priceMax !== undefined) {
          fuzzyQuery = fuzzyQuery.lte('price', filters.priceMax);
        }
        if (filters.bedrooms !== undefined) {
          fuzzyQuery = fuzzyQuery.gte('bedrooms', filters.bedrooms);
        }
        if (filters.bathrooms !== undefined) {
          fuzzyQuery = fuzzyQuery.gte('bathrooms', filters.bathrooms);
        }
        if (filters.propertyType) {
          fuzzyQuery = fuzzyQuery.eq('property_type', filters.propertyType);
        }
        
        // Default to approved properties
        fuzzyQuery = fuzzyQuery.eq('status', 'approved');
        
        // Limit to reasonable number for fuzzy matching
        fuzzyQuery = fuzzyQuery.limit(50);

        const { data: fuzzyProperties } = await fuzzyQuery;
        
        if (fuzzyProperties && fuzzyProperties.length > 0) {
          // Apply fuzzy matching to all properties
          const fuzzyMatched = this.applyFuzzyMatching(fuzzyProperties, filters.location, 0.3);
          
          // Filter out properties that don't meet minimum similarity
          const similarProperties = fuzzyMatched.filter(p => p.similarityScore !== undefined);
          
          // Combine exact matches with fuzzy matches, avoiding duplicates
          const exactIds = new Set(enhancedProperties.map(p => p.id));
          const newFuzzyMatches = similarProperties.filter(p => !exactIds.has(p.id));
          
          enhancedProperties = [
            ...enhancedProperties.map(p => ({ ...p })), // Convert exact matches
            ...newFuzzyMatches
          ];
        }
      } else {
        // Convert to enhanced properties without fuzzy matching
        enhancedProperties = enhancedProperties.map(p => ({ ...p }));
      }

      // Get total count for stats
      const { count: totalCount } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Calculate filter stats
      const filterStats = await this.calculateFilterStats(filters, enhancedProperties.length, totalCount || 0);

      const result: FilterResult = {
        properties: enhancedProperties,
        totalCount: enhancedProperties.length,
        page: filters.page || 1,
        totalPages: Math.ceil(enhancedProperties.length / (filters.limit || 20)),
        hasMore: (filters.page || 1) < Math.ceil(enhancedProperties.length / (filters.limit || 20)),
        appliedFilters: filters,
        filterStats
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Filter service error:', error);
      console.error('Filters that caused error:', filters);
      
      // Check for common database type errors
      if (error instanceof Error && error.message.includes('invalid input syntax for type integer')) {
        console.error('Database type error - likely null value passed to integer field');
        console.error('Check filter values:', {
          priceMin: filters.priceMin,
          priceMax: filters.priceMax,
          bedrooms: filters.bedrooms,
          bathrooms: filters.bathrooms,
          garageSpaces: filters.garageSpaces,
          squareFootageMin: filters.squareFootageMin,
          squareFootageMax: filters.squareFootageMax,
          yearBuiltMin: filters.yearBuiltMin,
          yearBuiltMax: filters.yearBuiltMax,
          lotSizeMin: filters.lotSizeMin,
          lotSizeMax: filters.lotSizeMax
        });
      }
      
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

  /**
   * Calculate similarity between two strings using Levenshtein distance and substring matching
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1.0;
    
    // Substring match
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Word-based matching for multi-word locations like "Mawson Lakes"
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    // Check if all words from shorter string are found in longer string
    const [shorter, longer] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
    const matchingWords = shorter.filter(word => 
      longer.some(longerWord => 
        longerWord.includes(word) || word.includes(longerWord) ||
        this.levenshteinSimilarity(word, longerWord) > 0.7
      )
    );
    
    if (matchingWords.length === shorter.length && shorter.length > 0) {
      return 0.85; // High score for word-based match
    }
    
    if (matchingWords.length / shorter.length >= 0.6 && shorter.length > 0) {
      return 0.7; // Good score for partial word match
    }
    
    // Fallback to Levenshtein distance
    return this.levenshteinSimilarity(s1, s2);
  }
  
  private static levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    const distance = matrix[str2.length][str1.length];
    return Math.max(0, (maxLength - distance) / maxLength);
  }

  /**
   * Extract suburb name from full address string
   */
  private static extractSuburb(location: string): string {
    if (!location) return '';
    
    const parts = location.split(',').map(part => part.trim());
    
    // Find the main suburb (usually the part that's not a state or country)
    const suburb = parts.find(part => 
      part && 
      !part.toLowerCase().includes('australia') && 
      !part.toLowerCase().match(/\b(sa|nsw|vic|qld|wa|tas|nt|act)\b/) &&
      part.length > 2
    );
    
    return suburb || parts[0] || location;
  }

  /**
   * Apply fuzzy matching to properties when exact matches are limited
   */
  private static applyFuzzyMatching(
    properties: PropertyListing[], 
    searchLocation: string, 
    minSimilarity: number = 0.3
  ): PropertyListingWithFuzzyMatch[] {
    if (!searchLocation || properties.length === 0) {
      return properties.map(p => ({ ...p }));
    }

    const searchSuburb = this.extractSuburb(searchLocation);
    
    return properties.map(property => {
      const propertyLocation = `${property.city}, ${property.state}`;
      const propertySuburb = this.extractSuburb(propertyLocation);
      
      // Calculate similarity scores
      const cityScore = this.calculateSimilarity(searchSuburb, property.city);
      const fullLocationScore = this.calculateSimilarity(searchLocation, propertyLocation);
      const suburbScore = this.calculateSimilarity(searchSuburb, propertySuburb);
      
      // Use the highest similarity score
      const similarityScore = Math.max(cityScore, fullLocationScore, suburbScore);
      
      let matchReason = '';
      if (similarityScore >= 0.8) {
        matchReason = `Strong match in ${property.city}`;
      } else if (similarityScore >= 0.5) {
        matchReason = `Good match near ${property.city}`;
      } else if (similarityScore >= minSimilarity) {
        matchReason = `Similar area to your search`;
      }

      const result: PropertyListingWithFuzzyMatch = {
        ...property,
        similarityScore: similarityScore >= minSimilarity ? similarityScore : undefined,
        matchReason: similarityScore >= minSimilarity ? matchReason : undefined
      };

      return result;
    });
  }
}

export const filterService = new FilterService();
