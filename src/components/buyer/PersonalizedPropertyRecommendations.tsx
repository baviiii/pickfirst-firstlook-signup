import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PropertyListing } from '@/services/propertyService';
import { BuyerProfileService } from '@/services/buyerProfileService';
import { FilterService, AdvancedPropertyFilters } from '@/services/filterService';
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
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface MatchCriteria {
  priceMatch: boolean;
  bedroomsMatch: boolean;
  bathroomsMatch: boolean;
  locationMatch: boolean;
  propertyTypeMatch: boolean;
  score: number;
  matchedCriteria: string[];
}

interface RecommendedProperty extends PropertyListing {
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

        // Build advanced filters from preferences
        const filters: AdvancedPropertyFilters = {
          priceMin: preferences.min_budget || 0,
          priceMax: preferences.max_budget || 10000000,
          bedrooms: preferences.preferred_bedrooms,
          bathrooms: preferences.preferred_bathrooms,
          propertyType: preferences.property_type_preferences?.[0],
          sortBy: 'price',
          sortOrder: 'asc',
          limit: 12
        };

        // Add location filtering if preferred areas exist
        if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
          // Use the first preferred area as primary location filter
          filters.location = preferences.preferred_areas[0];
        }

        // Get filtered properties
        const result = await FilterService.applyFilters(filters);
        
        if (result.properties) {
          // Calculate match criteria for each property
          const enhancedProperties = result.properties.map(property => {
            const matchCriteria = calculateMatchCriteria(property, preferences);
            return {
              ...property,
              matchCriteria,
              matchPercentage: Math.round(matchCriteria.score * 100)
            };
          });

          // Sort by match percentage and relevance
          const sortedProperties = enhancedProperties
            .filter(p => p.matchPercentage >= 60) // Only show good matches
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

  const calculateMatchCriteria = (property: PropertyListing, preferences: any): MatchCriteria => {
    const criteria: MatchCriteria = {
      priceMatch: false,
      bedroomsMatch: false,
      bathroomsMatch: false,
      locationMatch: false,
      propertyTypeMatch: false,
      score: 0,
      matchedCriteria: []
    };

    let matches = 0;
    let totalCriteria = 0;

    // Price matching
    totalCriteria++;
    if (property.price >= (preferences.min_budget || 0) && 
        property.price <= (preferences.max_budget || 10000000)) {
      criteria.priceMatch = true;
      criteria.matchedCriteria.push('Price Range');
      matches++;
    }

    // Bedrooms matching
    if (preferences.preferred_bedrooms) {
      totalCriteria++;
      if (property.bedrooms && property.bedrooms >= preferences.preferred_bedrooms) {
        criteria.bedroomsMatch = true;
        criteria.matchedCriteria.push('Bedrooms');
        matches++;
      }
    }

    // Bathrooms matching
    if (preferences.preferred_bathrooms) {
      totalCriteria++;
      if (property.bathrooms && property.bathrooms >= preferences.preferred_bathrooms) {
        criteria.bathroomsMatch = true;
        criteria.matchedCriteria.push('Bathrooms');
        matches++;
      }
    }

    // Location matching
    if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
      totalCriteria++;
      const propertyLocation = `${property.city}, ${property.state}`.toLowerCase();
      const hasLocationMatch = preferences.preferred_areas.some((area: string) => 
        propertyLocation.includes(area.toLowerCase()) || 
        property.city.toLowerCase().includes(area.toLowerCase())
      );
      
      if (hasLocationMatch) {
        criteria.locationMatch = true;
        criteria.matchedCriteria.push('Preferred Area');
        matches++;
      }
    }

    // Property type matching
    if (preferences.property_type_preferences && preferences.property_type_preferences.length > 0) {
      totalCriteria++;
      if (preferences.property_type_preferences.includes(property.property_type)) {
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
    if (percentage >= 90) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (percentage >= 80) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (percentage >= 70) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-foreground">Recommended for You</CardTitle>
              <CardDescription className="text-muted-foreground">
                Properties matching your preferences
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {recommendations.length} matches
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/browse-properties')}
              className="hover:bg-accent"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((property) => (
                <Card 
                  key={property.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur-sm"
                  onClick={() => handlePropertyClick(property.id)}
                >
                  <CardHeader className="p-0 relative">
                    <div className="aspect-video bg-muted rounded-t-md overflow-hidden relative">
                      {property.images && property.images.length > 0 ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-muted flex items-center justify-center ${property.images && property.images.length > 0 ? 'hidden' : ''}`}>
                        <Home className="h-12 w-12 text-muted-foreground" />
                      </div>
                      
                      {/* Match percentage badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={`${getMatchColor(property.matchPercentage)} border`}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {property.matchPercentage}% match
                        </Badge>
                      </div>
                      
                      {/* Favorite button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={(e) => handleToggleFavorite(property.id, e)}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-base text-foreground line-clamp-1">
                          {property.title}
                        </CardTitle>
                        <div className="text-primary font-bold text-lg">
                          ${property.price.toLocaleString()}
                        </div>
                      </div>
                      <CardDescription className="text-muted-foreground text-sm line-clamp-1 mb-3">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {property.address}, {property.city}, {property.state}
                      </CardDescription>
                      
                      {/* Property details */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {property.bedrooms !== null && (
                          <div className="flex items-center text-xs bg-blue-500/10 text-blue-300 px-2 py-1 rounded">
                            <Bed className="h-3 w-3 mr-1" />
                            {property.bedrooms} beds
                          </div>
                        )}
                        {property.bathrooms !== null && (
                          <div className="flex items-center text-xs bg-purple-500/10 text-purple-300 px-2 py-1 rounded">
                            <Bath className="h-3 w-3 mr-1" />
                            {property.bathrooms} baths
                          </div>
                        )}
                        {property.square_feet !== null && (
                          <div className="flex items-center text-xs bg-green-500/10 text-green-300 px-2 py-1 rounded">
                            <Square className="h-3 w-3 mr-1" />
                            {property.square_feet.toLocaleString()} sq ft
                          </div>
                        )}
                      </div>
                      
                      {/* Match criteria */}
                      <div className="mb-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Matches: {property.matchCriteria.matchedCriteria.join(', ')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {property.matchCriteria.matchedCriteria.map((criteria) => (
                            <Badge key={criteria} variant="secondary" className="text-xs bg-primary/10 text-primary">
                              <CheckCircle className="h-2 w-2 mr-1" />
                              {criteria}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePropertyClick(property.id);
                        }}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/property/${property.id}?action=inquiry`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};