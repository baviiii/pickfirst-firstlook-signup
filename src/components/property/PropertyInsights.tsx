import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  MapPin, 
  GraduationCap, 
  Stethoscope, 
  ShoppingBag, 
  Coffee,
  TreePine,
  Train,
  Dumbbell,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import { googleMapsService } from '@/services/googleMapsService';
import { supabase } from '@/integrations/supabase/client';

interface PropertyInsightsProps {
  address: string;
  latitude?: number;
  longitude?: number;
  propertyId: string;
  onError?: (error: string) => void;
}

interface NearbyPlace {
  name: string;
  rating?: number;
  types: string[];
  distance?: number;
  place_id: string;
  vicinity?: string;
  price_level?: number;
  user_ratings_total?: number;
  photos?: any[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}


interface NearbyPlacesData {
  schools: NearbyPlace[];
  restaurants: NearbyPlace[];
  shopping: NearbyPlace[];
  healthcare: NearbyPlace[];
  parks: NearbyPlace[];
  transit: NearbyPlace[];
  gyms: NearbyPlace[];
}

interface AirQualityData {
  aqi?: number;
  category?: string;
  dominantPollutant?: string;
  healthRecommendations?: {
    generalPopulation?: string;
  };
}

const PropertyInsights: React.FC<PropertyInsightsProps> = ({ 
  address, 
  latitude, 
  longitude, 
  propertyId,
  onError 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlacesData>({
    schools: [],
    restaurants: [],
    shopping: [],
    healthcare: [],
    parks: [],
    transit: [],
    gyms: []
  });
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = 3;

  // Memoized calculation functions
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);


  const fetchNearbyPlaces = useCallback(async (lat: number, lng: number): Promise<NearbyPlacesData> => {
    const categories = [
      { key: 'schools', type: 'school', radius: 2000 },
      { key: 'restaurants', type: 'restaurant', radius: 1000 },
      { key: 'shopping', type: 'shopping_mall', radius: 1500 },
      { key: 'healthcare', type: 'hospital', radius: 3000 },
      { key: 'parks', type: 'park', radius: 1500 },
      { key: 'transit', type: 'transit_station', radius: 1000 },
      { key: 'gyms', type: 'gym', radius: 1500 }
    ];

    const results: NearbyPlacesData = {
      schools: [],
      restaurants: [],
      shopping: [],
      healthcare: [],
      parks: [],
      transit: [],
      gyms: []
    };

    const promises = categories.map(async (category) => {
      try {
        const places = await googleMapsService.nearbySearch(
          lat, 
          lng, 
          category.radius, 
          category.type
        );
        
        // Enhanced sorting and filtering
        const processedPlaces = places
          .filter(place => {
            // More strict filtering
            return place.name && 
                   place.rating && 
                   place.rating >= 3.0 && 
                   place.user_ratings_total && 
                   place.user_ratings_total >= 10;
          })
          .map(place => ({
            ...place,
            distance: place.geometry?.location ? 
              calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng) :
              undefined
          }))
          .sort((a, b) => {
            // Enhanced sorting algorithm
            const ratingWeight = 0.7;
            const distanceWeight = 0.3;
            
            const aScore = (a.rating || 0) * ratingWeight - 
                          ((a.distance || 1000) / 1000) * distanceWeight;
            const bScore = (b.rating || 0) * ratingWeight - 
                          ((b.distance || 1000) / 1000) * distanceWeight;
            
            return bScore - aScore;
          })
          .slice(0, 6); // Take top 6 instead of 5

        return { key: category.key, places: processedPlaces };
      } catch (error) {
        console.error(`Error fetching ${category.key}:`, error);
        return { key: category.key, places: [] };
      }
    });

    const categoryResults = await Promise.allSettled(promises);
    
    categoryResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { key, places } = result.value;
        results[key as keyof NearbyPlacesData] = places as any;
      }
    });

    return results;
  }, [calculateDistance]);

  const fetchPropertyInsights = useCallback(async (coords: { lat: number; lng: number }) => {
    setLoading(true);
    setError('');
    
    try {
      // Check cache first
      const cacheKey = address.toLowerCase().trim();
      const { data: cachedData } = await supabase
        .from('area_insights')
        .select('*')
        .ilike('address', cacheKey)
        .maybeSingle();
      
      // Check if cache is valid (less than 30 days old)
      const cacheValid = cachedData && 
        new Date().getTime() - new Date(cachedData.fetched_at).getTime() < 30 * 24 * 60 * 60 * 1000;
      
      if (cacheValid && cachedData) {
        setNearbyPlaces(cachedData.nearby_places as unknown as NearbyPlacesData);
        setAirQuality(cachedData.air_quality as AirQualityData | null);
        setRetryCount(0);
        setLoading(false);
        return;
      }
      
      // Fetch nearby places first (required)
      const places = await fetchNearbyPlaces(coords.lat, coords.lng);
      setNearbyPlaces(places);
      
      // Try to fetch air quality (optional - fails silently if API not enabled)
      let airQualityData = null;
      try {
        const aqResponse = await googleMapsService.getAirQuality(coords.lat, coords.lng);
        if (aqResponse?.indexes?.[0]) {
          const aqiData = aqResponse.indexes[0];
          airQualityData = {
            aqi: aqiData.aqi,
            category: aqiData.category,
            dominantPollutant: aqiData.dominantPollutant,
            healthRecommendations: aqResponse.healthRecommendations
          };
          setAirQuality(airQualityData);
        }
      } catch (aqError) {
        setAirQuality(null);
      }
      
      // Store in cache
      const cachePayload = {
        address: address.toLowerCase().trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        nearby_places: places as unknown as any,
        air_quality: airQualityData as unknown as any,
        fetched_at: new Date().toISOString()
      };
      
      if (cachedData) {
        // Update existing cache
        await supabase
          .from('area_insights')
          .update(cachePayload)
          .eq('id', cachedData.id);
      } else {
        // Insert new cache entry
        await supabase
          .from('area_insights')
          .insert(cachePayload);
      }
      
      setRetryCount(0);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load property insights';
      setError(errorMessage);
      onError?.(errorMessage);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchPropertyInsights(coords);
        }, Math.pow(2, retryCount) * 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [address, fetchNearbyPlaces, onError, retryCount, maxRetries]);

  const initializeComponent = useCallback(async () => {
    if (latitude && longitude) {
      await fetchPropertyInsights({ lat: latitude, lng: longitude });
    } else if (address?.trim()) {
      try {
        const coords = await googleMapsService.getCoordinatesFromAddress(address);
        if (coords) {
          await fetchPropertyInsights(coords);
        } else {
          throw new Error('Unable to geocode address');
        }
      } catch (error: any) {
        const errorMessage = `Failed to geocode address: ${error?.message || 'Unknown error'}`;
        setError(errorMessage);
        onError?.(errorMessage);
        setLoading(false);
      }
    } else {
      setError('No valid address or coordinates provided');
      setLoading(false);
    }
  }, [address, latitude, longitude, fetchPropertyInsights, onError]);

  useEffect(() => {
    initializeComponent();
  }, [initializeComponent]);


  // Memoized components
  const PlaceCard = useMemo(() => ({ place, icon: Icon }: { place: NearbyPlace; icon: any }) => (
  <div className="p-4 pickfirst-glass bg-card/95 rounded-lg border-2 border-pickfirst-yellow/40 hover:border-pickfirst-yellow/60 transition-all duration-200 group shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Icon className="h-5 w-5 text-pickfirst-yellow flex-shrink-0" />
          <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-pickfirst-yellow transition-colors">
            {place.name}
          </h4>
        </div>
        {place.rating && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2 bg-pickfirst-yellow/20 px-2 py-1 rounded-full">
            <Star className="h-3.5 w-3.5 text-pickfirst-yellow fill-current" />
            <span className="text-xs text-pickfirst-yellow font-bold">{place.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground line-clamp-1">{place.vicinity || 'Nearby'}</span>
          {place.distance && (
            <span className="text-xs text-pickfirst-yellow font-bold bg-pickfirst-yellow/10 px-2 py-0.5 rounded">
              {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)}km`}
            </span>
          )}
        </div>
        
        {place.user_ratings_total && (
          <div className="text-xs text-foreground/90 font-semibold">
            {place.user_ratings_total.toLocaleString()} reviews
            {place.price_level && (
              <span className="ml-2 text-pickfirst-yellow font-bold">
                {'$'.repeat(place.price_level)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  ), []);

  const categories = useMemo(() => [
    { key: 'schools', label: 'Schools', icon: GraduationCap, places: nearbyPlaces.schools },
    { key: 'restaurants', label: 'Dining', icon: Coffee, places: nearbyPlaces.restaurants },
    { key: 'shopping', label: 'Shopping', icon: ShoppingBag, places: nearbyPlaces.shopping },
    { key: 'healthcare', label: 'Healthcare', icon: Stethoscope, places: nearbyPlaces.healthcare },
    { key: 'parks', label: 'Parks & Recreation', icon: TreePine, places: nearbyPlaces.parks },
    { key: 'transit', label: 'Public Transit', icon: Train, places: nearbyPlaces.transit },
    { key: 'gyms', label: 'Fitness & Gyms', icon: Dumbbell, places: nearbyPlaces.gyms }
  ], [nearbyPlaces]);

  if (loading) {
    return (
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2 font-bold">
            <MapPin className="h-5 w-5 text-pickfirst-yellow" />
            Neighborhood Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-pickfirst-yellow animate-spin" />
            <div className="text-muted-foreground text-center">
              <p className="font-medium">Loading real data from Google Maps...</p>
              {retryCount > 0 && (
                <p className="text-sm text-pickfirst-yellow mt-1 font-semibold">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-red-400/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200 text-sm">
              {error}
              {retryCount < maxRetries && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 ml-0 text-red-400 border-red-400/40 hover:bg-red-500/10"
                  onClick={() => initializeComponent()}
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totalPlaces = Object.values(nearbyPlaces).reduce((sum, places) => sum + places.length, 0);

  // Calculate real metrics from Google Maps data
  const avgSchoolRating = nearbyPlaces.schools.length > 0
    ? nearbyPlaces.schools.reduce((sum, s) => sum + (s.rating || 0), 0) / nearbyPlaces.schools.length
    : 0;
  
  const topRatedRestaurants = nearbyPlaces.restaurants.filter(r => r.rating && r.rating >= 4.0).length;
  const transitOptions = nearbyPlaces.transit.length;
  const parksNearby = nearbyPlaces.parks.length;

  // Get air quality color and label
  const getAirQualityInfo = (category?: string) => {
    switch (category) {
      case 'EXCELLENT':
        return { color: 'text-green-400', bgColor: 'bg-green-500/10', label: 'Excellent', icon: '😊' };
      case 'GOOD':
        return { color: 'text-blue-400', bgColor: 'bg-blue-500/10', label: 'Good', icon: '🙂' };
      case 'MODERATE':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', label: 'Moderate', icon: '😐' };
      case 'UNHEALTHY_FOR_SENSITIVE_GROUPS':
        return { color: 'text-orange-400', bgColor: 'bg-orange-500/10', label: 'Unhealthy for Sensitive', icon: '😷' };
      case 'UNHEALTHY':
        return { color: 'text-red-400', bgColor: 'bg-red-500/10', label: 'Unhealthy', icon: '😨' };
      case 'VERY_UNHEALTHY':
        return { color: 'text-red-600', bgColor: 'bg-red-600/10', label: 'Very Unhealthy', icon: '🤢' };
      case 'HAZARDOUS':
        return { color: 'text-purple-600', bgColor: 'bg-purple-600/10', label: 'Hazardous', icon: '☠️' };
      default:
        return { color: 'text-gray-400', bgColor: 'bg-gray-500/10', label: 'Unknown', icon: '❓' };
    }
  };

  const aqInfo = getAirQualityInfo(airQuality?.category);

  return (
    <div className="space-y-4">
      {/* Quick Stats - Compact Row Layout */}
      <div className="p-4 rounded-lg border border-pickfirst-yellow/30 bg-card/90">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-pickfirst-yellow" />
          <h3 className="text-base font-bold text-foreground">Neighborhood at a Glance</h3>
        </div>
        
        {/* Stats Row */}
        <div className="flex flex-wrap gap-3">
          {/* Schools */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-pickfirst-yellow/30 bg-card/80">
            <GraduationCap className="h-5 w-5 text-pickfirst-yellow flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-pickfirst-yellow">{avgSchoolRating > 0 ? avgSchoolRating.toFixed(1) : 'N/A'}</div>
              <div className="text-xs text-foreground">{nearbyPlaces.schools.length} schools</div>
            </div>
          </div>

          {/* Dining */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-pickfirst-yellow/30 bg-card/80">
            <Coffee className="h-5 w-5 text-pickfirst-yellow flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-pickfirst-yellow">{topRatedRestaurants}</div>
              <div className="text-xs text-foreground">top dining</div>
            </div>
          </div>

          {/* Transit */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-pickfirst-yellow/30 bg-card/80">
            <Train className="h-5 w-5 text-pickfirst-yellow flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-pickfirst-yellow">{transitOptions}</div>
              <div className="text-xs text-foreground">transit</div>
            </div>
          </div>

          {/* Parks */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-pickfirst-yellow/30 bg-card/80">
            <TreePine className="h-5 w-5 text-pickfirst-yellow flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-pickfirst-yellow">{parksNearby}</div>
              <div className="text-xs text-foreground">parks</div>
            </div>
          </div>

          {/* Air Quality */}
          {airQuality && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-border ${aqInfo.bgColor}`}>
              <span className="text-lg flex-shrink-0">{aqInfo.icon}</span>
              <div>
                <div className={`text-xl font-bold ${aqInfo.color}`}>{airQuality.aqi || 'N/A'}</div>
                <div className={`text-xs ${aqInfo.color}`}>{aqInfo.label}</div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Nearby Places */}
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-pickfirst-yellow" />
              Nearby Places
            </div>
            <Badge variant="outline" className="text-pickfirst-yellow border-pickfirst-yellow/40 bg-pickfirst-yellow/10">
              {totalPlaces} verified places
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalPlaces === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-60" />
              <p>No nearby places found in this area.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map(category => (
                <div key={category.key} className="border-b border-pickfirst-yellow/20 last:border-b-0 pb-4 last:pb-0">
                    <Button
                    variant="ghost"
                    className="w-full justify-between text-left p-3 h-auto hover:bg-pickfirst-yellow/10 rounded-lg border border-transparent hover:border-pickfirst-yellow/30 transition-all"
                    onClick={() => setExpandedCategory(
                      expandedCategory === category.key ? '' : category.key
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="h-5 w-5 text-pickfirst-yellow" />
                      <span className="text-foreground font-semibold">{category.label}</span>
                      <Badge 
                        variant="outline" 
                        className={`${category.places.length > 0 ? 'text-pickfirst-yellow border-pickfirst-yellow/40 bg-pickfirst-yellow/10' : 'text-muted-foreground border-border'}`}
                      >
                        {category.places.length}
                      </Badge>
                    </div>
                    {expandedCategory === category.key ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  
                  {expandedCategory === category.key && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.places.length > 0 ? (
                        category.places.map((place, index) => (
                          <PlaceCard key={place.place_id || index} place={place} icon={category.icon} />
                        ))
                      ) : (
                        <div className="text-muted-foreground text-sm col-span-full text-center py-4">
                          No {category.label.toLowerCase()} found nearby
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyInsights;