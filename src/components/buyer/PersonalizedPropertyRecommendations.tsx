import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { BuyerProfileService } from '@/services/buyerProfileService';
import { FilterService, AdvancedPropertyFilters, PropertyListingWithFuzzyMatch } from '@/services/filterService';
import { PropertyService } from '@/services/propertyService';
import { 
  Home, 
  MapPin, 
  Heart, 
  MessageSquare, 
  Bed, 
  Bath, 
  Square, 
  DollarSign,
  Target,
  TrendingUp,
  CheckCircle,
  Settings,
  Car
} from 'lucide-react';
import { toast } from 'sonner';

interface MatchCriteria {
  priceMatch: boolean;
  bedroomsMatch: boolean;
  bathroomsMatch: boolean;
  garagesMatch: boolean;
  featuresMatch: boolean;
  locationMatch: boolean;
  propertyTypeMatch: boolean;
  score: number;
  matchedCriteria: string[];
}

interface RecommendedProperty extends PropertyListingWithFuzzyMatch {
  matchCriteria: MatchCriteria;
  matchPercentage: number;
}

export const PersonalizedPropertyRecommendations: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendedProperty[]>([]);
  const [buyerPreferences, setBuyerPreferences] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Get buyer preferences
        const preferences = await BuyerProfileService.getBuyerPreferences(user.id);
        setBuyerPreferences(preferences);
        
        if (!preferences) {
          setIsLoading(false);
          return;
        }

        // Build advanced filters from preferences - filter out null values
        // Don't apply price filters if budget is "any" (0 or very high default values)
        // This allows properties with text prices to show
        const isBudgetAny = (!preferences.min_budget || preferences.min_budget === 0) && 
                           (!preferences.max_budget || preferences.max_budget >= 10000000);
        
        const filters: AdvancedPropertyFilters = {
          // Only set price filters if user explicitly set a budget (not "any")
          priceMin: !isBudgetAny && preferences.min_budget && preferences.min_budget > 0 ? preferences.min_budget : undefined,
          priceMax: !isBudgetAny && preferences.max_budget && preferences.max_budget < 10000000 ? preferences.max_budget : undefined,
          bedrooms: preferences.preferred_bedrooms && preferences.preferred_bedrooms > 0 ? preferences.preferred_bedrooms : undefined,
          bathrooms: preferences.preferred_bathrooms && preferences.preferred_bathrooms > 0 ? preferences.preferred_bathrooms : undefined,
          garageSpaces: preferences.preferred_garages && preferences.preferred_garages >= 0 ? preferences.preferred_garages : undefined,
          // Normalize property type to lowercase for consistent matching
          propertyType: preferences.property_type_preferences?.[0]?.toLowerCase() || undefined,
          sortBy: 'price',
          sortOrder: 'asc',
          limit: 12
        };

        // Add location filtering if preferred areas exist
        // Note: FilterService will handle multiple areas through fuzzy matching
        if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
          // Pass all preferred areas - fuzzy matching will find properties in any of them
          filters.location = preferences.preferred_areas.join(', ');
        }

        // Clean filters to remove any null/undefined values that could cause database errors
        const cleanFilters = Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined)
        ) as AdvancedPropertyFilters;
        
        console.log('Original filters:', filters);
        console.log('Cleaned filters:', cleanFilters);
        
        // Get filtered properties
        const result = await FilterService.applyFilters(cleanFilters);
        
        if (result.properties) {
          // Calculate match criteria for each property
          const enhancedProperties = result.properties.map(property => {
            // Check if this property has fuzzy matching data
            const hasFuzzyMatch = property.similarityScore !== undefined;
            
            let matchCriteria: MatchCriteria;
            let matchPercentage: number;
            
            if (hasFuzzyMatch) {
              // Use fuzzy matching data
              matchPercentage = Math.round(property.similarityScore * 100);
              
              // Parse price from price_display or price field (handles ranges, text, etc.)
              const parsePropertyPrice = (prop: any): { min: number | null; max: number | null } => {
                const parseNumericPrice = (value: string | number | null | undefined): number | null => {
                  if (value === null || value === undefined) return null;
                  if (typeof value === 'number') return isFinite(value) && value > 0 ? value : null;
                  const cleaned = value.toString().replace(/[,$\s]/g, '').toLowerCase();
                  if (cleaned.includes('k')) {
                    const num = parseFloat(cleaned.replace('k', ''));
                    return isNaN(num) ? null : num * 1000;
                  }
                  if (cleaned.includes('m')) {
                    const num = parseFloat(cleaned.replace('m', ''));
                    return isNaN(num) ? null : num * 1000000;
                  }
                  const num = parseFloat(cleaned);
                  return isNaN(num) ? null : num;
                };
                
                const priceDisplay = typeof prop.price_display === 'string' ? prop.price_display.trim() : '';
                if (priceDisplay) {
                  const rangeMatch = priceDisplay.match(/^[\$]?\s*([\d,k.m]+)\s*[-–—]\s*[\$]?\s*([\d,k.m]+)/i);
                  if (rangeMatch) {
                    return {
                      min: parseNumericPrice(rangeMatch[1]),
                      max: parseNumericPrice(rangeMatch[2])
                    };
                  }
                  const singlePrice = parseNumericPrice(priceDisplay);
                  if (singlePrice !== null) {
                    return { min: singlePrice, max: singlePrice };
                  }
                }
                
                const price = parseNumericPrice(prop.price);
                return price !== null ? { min: price, max: price } : { min: null, max: null };
              };
              
              const propertyPrice = parsePropertyPrice(property);
              // Check if budget is "any" (no budget filter)
              const isBudgetAny = (!preferences.min_budget || preferences.min_budget === 0) && 
                                 (!preferences.max_budget || preferences.max_budget >= 10000000);
              
              // Check if property price range overlaps with budget range
              let priceMatch = false;
              if (isBudgetAny) {
                // Budget is "any" - always include all properties regardless of price
                priceMatch = true;
              } else {
                const minBudget = preferences.min_budget || 0;
                const maxBudget = preferences.max_budget || 10000000;
                
                if (propertyPrice.min !== null && propertyPrice.max !== null) {
                  // Property has a price range
                  priceMatch = (propertyPrice.min >= minBudget && propertyPrice.min <= maxBudget) ||
                              (propertyPrice.max >= minBudget && propertyPrice.max <= maxBudget) ||
                              (propertyPrice.min <= minBudget && propertyPrice.max >= maxBudget);
                } else if (propertyPrice.min !== null) {
                  // Single price
                  priceMatch = propertyPrice.min >= minBudget && propertyPrice.min <= maxBudget;
                } else {
                  // No price (Contact Agent, etc.) - always include
                  priceMatch = true;
                }
              }
              
              matchCriteria = {
                priceMatch,
                bedroomsMatch: !preferences.preferred_bedrooms || (() => {
                  const bedrooms = typeof property.bedrooms === 'string' ? parseFloat(property.bedrooms) : property.bedrooms;
                  return bedrooms && bedrooms >= preferences.preferred_bedrooms;
                })(),
                bathroomsMatch: !preferences.preferred_bathrooms || (() => {
                  const bathrooms = typeof property.bathrooms === 'string' ? parseFloat(property.bathrooms) : property.bathrooms;
                  return bathrooms && bathrooms >= preferences.preferred_bathrooms;
                })(),
                garagesMatch: !preferences.preferred_garages || (() => {
                  const garages = typeof (property as any).garages === 'string' ? parseFloat((property as any).garages) : (property as any).garages;
                  return garages && garages >= preferences.preferred_garages;
                })(),
                featuresMatch: !preferences.preferred_features || preferences.preferred_features.length === 0,
                locationMatch: true, // Fuzzy match already found location similarity
                propertyTypeMatch: !preferences.property_type_preferences || preferences.property_type_preferences.some((prefType: string) => prefType.toLowerCase() === property.property_type.toLowerCase()),
                score: property.similarityScore,
                matchedCriteria: [property.matchReason || 'Location similarity']
              };
            } else {
              // Use traditional matching
              matchCriteria = calculateMatchCriteria(property, preferences);
              matchPercentage = Math.round(matchCriteria.score * 100);
            }
            
            return {
              ...property,
              matchCriteria,
              matchPercentage
            };
          });

          // Sort by match percentage and relevance - lower threshold for fuzzy matches
          const sortedProperties = enhancedProperties
            .filter(p => p.matchPercentage >= 30) // Show matches with 30%+ similarity
            .sort((a, b) => {
              // First sort by match percentage
              if (b.matchPercentage !== a.matchPercentage) {
                return b.matchPercentage - a.matchPercentage;
              }
              // Then by price preference (closer to budget middle is better)
              const midBudget = (preferences.min_budget + preferences.max_budget) / 2;
              const aDiff = Math.abs(a.price - midBudget);
              const bDiff = Math.abs(b.price - midBudget);
              return aDiff - bDiff;
            })
            .slice(0, 6);

          setRecommendations(sortedProperties);
          setTotalMatches(result.totalCount);
        }
      } catch (error) {
        console.error('Error loading recommendations:', error);
        toast.error('Failed to load property recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [user]);

  const calculateMatchCriteria = (property: PropertyListingWithFuzzyMatch, preferences: any): MatchCriteria => {
    const criteria: MatchCriteria = {
      priceMatch: false,
      bedroomsMatch: false,
      bathroomsMatch: false,
      garagesMatch: false,
      featuresMatch: false,
      locationMatch: false,
      propertyTypeMatch: false,
      score: 0,
      matchedCriteria: []
    };

    let matches = 0;
    let totalCriteria = 0;

    // Price matching - handle text prices, ranges, etc.
    totalCriteria++;
    
    // Parse price from price_display or price field (handles ranges, text, etc.)
    const parsePropertyPrice = (prop: any): { min: number | null; max: number | null } => {
      const parseNumericPrice = (value: string | number | null | undefined): number | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return isFinite(value) && value > 0 ? value : null;
        const cleaned = value.toString().replace(/[,$\s]/g, '').toLowerCase();
        if (cleaned.includes('k')) {
          const num = parseFloat(cleaned.replace('k', ''));
          return isNaN(num) ? null : num * 1000;
        }
        if (cleaned.includes('m')) {
          const num = parseFloat(cleaned.replace('m', ''));
          return isNaN(num) ? null : num * 1000000;
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };
      
      const priceDisplay = typeof prop.price_display === 'string' ? prop.price_display.trim() : '';
      if (priceDisplay) {
        const rangeMatch = priceDisplay.match(/^[\$]?\s*([\d,k.m]+)\s*[-–—]\s*[\$]?\s*([\d,k.m]+)/i);
        if (rangeMatch) {
          return {
            min: parseNumericPrice(rangeMatch[1]),
            max: parseNumericPrice(rangeMatch[2])
          };
        }
        const singlePrice = parseNumericPrice(priceDisplay);
        if (singlePrice !== null) {
          return { min: singlePrice, max: singlePrice };
        }
      }
      
      const price = parseNumericPrice(prop.price);
      return price !== null ? { min: price, max: price } : { min: null, max: null };
    };
    
    const propertyPrice = parsePropertyPrice(property);
    // Check if budget is "any" (no budget filter)
    const isBudgetAny = (!preferences.min_budget || preferences.min_budget === 0) && 
                       (!preferences.max_budget || preferences.max_budget >= 10000000);
    
    // Check if property price range overlaps with budget range
    let priceMatch = false;
    if (isBudgetAny) {
      // Budget is "any" - always include all properties regardless of price
      priceMatch = true;
    } else {
      const minBudget = preferences.min_budget || 0;
      const maxBudget = preferences.max_budget || 10000000;
      
      if (propertyPrice.min !== null && propertyPrice.max !== null) {
        // Property has a price range
        priceMatch = (propertyPrice.min >= minBudget && propertyPrice.min <= maxBudget) ||
                    (propertyPrice.max >= minBudget && propertyPrice.max <= maxBudget) ||
                    (propertyPrice.min <= minBudget && propertyPrice.max >= maxBudget);
      } else if (propertyPrice.min !== null) {
        // Single price
        priceMatch = propertyPrice.min >= minBudget && propertyPrice.min <= maxBudget;
      } else {
        // No price (Contact Agent, etc.) - always include
        priceMatch = true;
      }
    }
    
    if (priceMatch) {
      criteria.priceMatch = true;
      criteria.matchedCriteria.push('Price Range');
      matches++;
    }

    // Bedrooms matching
    if (preferences.preferred_bedrooms) {
      totalCriteria++;
      const bedrooms = typeof property.bedrooms === 'string' ? parseFloat(property.bedrooms) : property.bedrooms;
      if (bedrooms && bedrooms >= preferences.preferred_bedrooms) {
        criteria.bedroomsMatch = true;
        criteria.matchedCriteria.push('Bedrooms');
        matches++;
      }
    }

    // Bathrooms matching
    if (preferences.preferred_bathrooms) {
      totalCriteria++;
      const bathrooms = typeof property.bathrooms === 'string' ? parseFloat(property.bathrooms) : property.bathrooms;
      if (bathrooms && bathrooms >= preferences.preferred_bathrooms) {
        criteria.bathroomsMatch = true;
        criteria.matchedCriteria.push('Bathrooms');
        matches++;
      }
    }

    // Garages matching
    if (preferences.preferred_garages) {
      totalCriteria++;
      const garages = typeof (property as any).garages === 'string' ? parseFloat((property as any).garages) : (property as any).garages;
      if (garages && garages >= preferences.preferred_garages) {
        criteria.garagesMatch = true;
        criteria.matchedCriteria.push('Garages');
        matches++;
      }
    }

    // Property features matching
    if (preferences.preferred_features && preferences.preferred_features.length > 0) {
      totalCriteria++;
      const propertyFeatures = (property as any).features || [];
      const matchedFeatures = preferences.preferred_features.filter((feature: string) => 
        propertyFeatures.some((propFeature: string) => 
          propFeature.toLowerCase().includes(feature.toLowerCase()) ||
          feature.toLowerCase().includes(propFeature.toLowerCase())
        )
      );
      
      if (matchedFeatures.length > 0) {
        criteria.featuresMatch = true;
        criteria.matchedCriteria.push(`${matchedFeatures.length} Features`);
        matches++;
      }
    }

    // Location matching (improved fuzzy matching)
    if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
      totalCriteria++;
      const propertyLocation = `${property.city}, ${property.state}`.toLowerCase();
      const propertyCity = property.city.toLowerCase();
      const propertyAddress = (property as any).address?.toLowerCase() || '';
      
      // Filter out non-location preferences
      const locationAreas = preferences.preferred_areas.filter((area: string) => 
        !area.startsWith('bedrooms:') && 
        !area.startsWith('bathrooms:') && 
        !area.startsWith('garages:')
      );
      
      const hasLocationMatch = locationAreas.some((area: string) => {
        const areaLower = area.toLowerCase().trim();
        
        // Remove common suffixes like ", australia", ", sa", etc.
        const cleanArea = areaLower
          .replace(/,?\s*(australia|sa|nsw|vic|qld|wa|tas|nt|act)\s*$/g, '')
          .trim();
        
        // Exact match - check city, full location, and address
        if (propertyLocation.includes(cleanArea) || 
            propertyCity.includes(cleanArea) ||
            cleanArea.includes(propertyCity) ||
            propertyAddress.includes(cleanArea)) {
          return true;
        }
        
        // Word-based fuzzy matching
        const areaWords = cleanArea.split(/\s+/).filter(word => word.length > 2);
        const cityWords = propertyCity.split(/\s+/).filter(word => word.length > 2);
        
        // Check if all area words are found in city
        const allWordsMatch = areaWords.length > 0 && areaWords.every(word => 
          cityWords.some(cityWord => 
            cityWord.includes(word) || word.includes(cityWord)
          )
        );
        
        if (allWordsMatch) {
          return true;
        }
        
        // Check for partial matches (at least 70% of words match)
        const matchingWords = areaWords.filter(word => 
          cityWords.some(cityWord => 
            cityWord.includes(word) || word.includes(cityWord)
          )
        );
        
        return areaWords.length > 0 && (matchingWords.length / areaWords.length) >= 0.7;
      });
      
      if (hasLocationMatch) {
        criteria.locationMatch = true;
        criteria.matchedCriteria.push('Preferred Area');
        matches++;
      }
    }

    // Property type matching (case-insensitive)
    if (preferences.property_type_preferences && preferences.property_type_preferences.length > 0) {
      totalCriteria++;
      const propertyTypeLower = property.property_type.toLowerCase();
      const hasTypeMatch = preferences.property_type_preferences.some((prefType: string) => 
        prefType.toLowerCase() === propertyTypeLower
      );
      
      if (hasTypeMatch) {
        criteria.propertyTypeMatch = true;
        criteria.matchedCriteria.push('Property Type');
        matches++;
      }
    }

    criteria.score = totalCriteria > 0 ? matches / totalCriteria : 0;
    return criteria;
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  const handleToggleFavorite = async (propertyId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;
    
    try {
      const result = await BuyerProfileService.togglePropertyFavorite(user.id, propertyId);
      if (result.success) {
        toast.success(result.isFavorited ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500/90 text-white';
    if (percentage >= 80) return 'bg-blue-500/90 text-white';
    if (percentage >= 70) return 'bg-yellow-500/90 text-white';
    return 'bg-gray-500/90 text-white';
  };

  if (!buyerPreferences) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
        <CardHeader className="text-center py-8">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="text-foreground">Set Your Preferences</CardTitle>
          <CardDescription className="text-muted-foreground">
            To see personalized property recommendations, please set up your search preferences first.
          </CardDescription>
          <Button 
            onClick={() => navigate('/buyer-account-settings?tab=search')}
            className="mt-4 mx-auto"
          >
            Set Preferences
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
      <CardHeader className="space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base lg:text-lg text-foreground">Recommended for You</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Properties matching your preferences
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-7 sm:ml-0">
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs whitespace-nowrap">
              {recommendations.length} matches
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/browse-properties')}
              className="hover:bg-accent text-xs sm:text-sm h-8 sm:h-9 whitespace-nowrap"
            >
              View All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted/10 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">
              No properties match your current preferences
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Try adjusting your search criteria to see more options
            </div>
            <Button 
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/buyer-account-settings?tab=search')}
            >
              Update Preferences
            </Button>
          </div>
        ) : (
          <>
            {/* Preferences Summary */}
            <div className="mb-6 p-4 bg-muted/5 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Your Search Criteria:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${(buyerPreferences.min_budget || 0).toLocaleString()} - ${(buyerPreferences.max_budget || 10000000).toLocaleString()}
                </Badge>
                {buyerPreferences.preferred_bedrooms && (
                  <Badge variant="outline" className="text-xs">
                    <Bed className="h-3 w-3 mr-1" />
                    {buyerPreferences.preferred_bedrooms}+ beds
                  </Badge>
                )}
                {buyerPreferences.preferred_bathrooms && (
                  <Badge variant="outline" className="text-xs">
                    <Bath className="h-3 w-3 mr-1" />
                    {buyerPreferences.preferred_bathrooms}+ baths
                  </Badge>
                )}
                {buyerPreferences.preferred_garages && (
                  <Badge variant="outline" className="text-xs">
                    <Car className="h-3 w-3 mr-1" />
                    {buyerPreferences.preferred_garages}+ garages
                  </Badge>
                )}
                {buyerPreferences.preferred_areas && buyerPreferences.preferred_areas.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {buyerPreferences.preferred_areas[0]}
                  </Badge>
                )}
                {buyerPreferences.property_type_preferences && buyerPreferences.property_type_preferences.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Home className="h-3 w-3 mr-1" />
                    {buyerPreferences.property_type_preferences[0]}
                  </Badge>
                )}
              </div>
            </div>

            {/* Property Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recommendations.map((property) => {
                // Parse string values like BrowseProperties does
                const numericBedrooms = typeof property.bedrooms === 'string' ? parseFloat(property.bedrooms) : property.bedrooms;
                const numericBathrooms = typeof property.bathrooms === 'string' ? parseFloat(property.bathrooms) : property.bathrooms;
                const numericSquareFeet = typeof property.square_feet === 'string' ? parseFloat(property.square_feet) : property.square_feet;
                const numericGarages = typeof (property as any).garages === 'string' ? parseFloat((property as any).garages) : (property as any).garages;
                
                // Handle images as string or array (database might return JSON string)
                let imagesArray: string[] = [];
                if (Array.isArray(property.images)) {
                  imagesArray = property.images;
                } else if (typeof property.images === 'string') {
                  try {
                    imagesArray = JSON.parse(property.images);
                  } catch {
                    imagesArray = [property.images];
                  }
                }
                const hasImages = imagesArray && imagesArray.length > 0;
                
                return (
                <Card 
                  key={property.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur-sm flex flex-col h-full"
                  onClick={() => handlePropertyClick(property.id)}
                >
                  <CardHeader className="p-0 relative flex-1 flex flex-col">
                    <div className="aspect-video bg-muted rounded-t-md overflow-hidden relative flex-shrink-0">
                      {hasImages ? (
                        <img
                          src={imagesArray[0]}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-muted flex items-center justify-center ${hasImages ? 'hidden' : ''}`}>
                        <Home className="h-12 w-12 text-muted-foreground" />
                      </div>
                      
                      {/* Match percentage badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`px-2 py-1 rounded-md text-xs font-bold ${getMatchColor(property.matchPercentage)} shadow-md`}>
                          {property.matchPercentage}% Match
                        </div>
                      </div>
                      
                      {/* Favorite button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/90 backdrop-blur-sm hover:bg-background rounded-full flex items-center justify-center"
                        onClick={(e) => handleToggleFavorite(property.id, e)}
                      >
                        <Heart className="h-4 w-4" fill="currentColor" />
                      </Button>
                    </div>
                    
                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <CardTitle className="text-sm sm:text-base text-foreground line-clamp-1 flex-1">
                          {property.title}
                        </CardTitle>
                        <div className="text-primary font-bold text-sm sm:text-base whitespace-nowrap">
                          {PropertyService.getDisplayPrice(property)}
                        </div>
                      </div>
                      
                      <CardDescription className="text-muted-foreground text-xs sm:text-sm line-clamp-1 mb-2 sm:mb-3">
                        <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 inline mr-1" />
                        {property.address}, {property.city}, {property.state}
                      </CardDescription>
                      
                      {/* Property details - more compact on mobile */}
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                        {numericBedrooms !== null && numericBedrooms !== undefined && !Number.isNaN(numericBedrooms) && (
                          <div className="flex items-center text-[10px] sm:text-xs bg-blue-500/10 text-blue-300 px-1.5 sm:px-2 py-0.5 rounded">
                            <Bed className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                            {numericBedrooms} bd
                          </div>
                        )}
                        {numericBathrooms !== null && numericBathrooms !== undefined && !Number.isNaN(numericBathrooms) && (
                          <div className="flex items-center text-[10px] sm:text-xs bg-purple-500/10 text-purple-300 px-1.5 sm:px-2 py-0.5 rounded">
                            <Bath className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                            {numericBathrooms} ba
                          </div>
                        )}
                        {numericSquareFeet !== null && numericSquareFeet !== undefined && !Number.isNaN(numericSquareFeet) && (
                          <div className="flex items-center text-[10px] sm:text-xs bg-green-500/10 text-green-300 px-1.5 sm:px-2 py-0.5 rounded">
                            <Square className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                            {Math.round(numericSquareFeet / 100) / 10}k sqft
                          </div>
                        )}
                        {numericGarages !== null && numericGarages !== undefined && !Number.isNaN(numericGarages) && (
                          <div className="flex items-center text-[10px] sm:text-xs bg-orange-500/10 text-orange-300 px-1.5 sm:px-2 py-0.5 rounded">
                            <Car className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                            {numericGarages} gr
                          </div>
                        )}
                      </div>
                      
                      {/* Match criteria - simplified on mobile */}
                      <div className="mb-2 sm:mb-3">
                        <div className="text-xs text-muted-foreground mb-1 hidden sm:block">
                          Matches: {property.matchCriteria.matchedCriteria.join(', ')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {property.matchCriteria.matchedCriteria.slice(0, 3).map((criteria) => (
                            <Badge 
                              key={criteria} 
                              variant="secondary" 
                              className="text-[10px] sm:text-xs bg-primary/10 text-primary h-5 sm:h-6 px-1.5 sm:px-2"
                            >
                              <CheckCircle className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-1" />
                              {criteria}
                            </Badge>
                          ))}
                          {property.matchCriteria.matchedCriteria.length > 3 && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2"
                            >
                              +{property.matchCriteria.matchedCriteria.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="pt-0 px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="mt-auto pt-3 flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full sm:flex-1 text-xs sm:text-sm h-8 sm:h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePropertyClick(property.id);
                          }}
                        >
                          View Details
                        </Button>
                        <Button 
                          size="sm" 
                          className="w-full sm:flex-1 text-xs sm:text-sm h-8 sm:h-9 bg-primary hover:bg-primary/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/property/${property.id}?action=contact`);
                          }}
                        >
                          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Contact Agent
                        </Button>
                      </div>
                    </CardContent>
                  </CardHeader>
                </Card>
              );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};