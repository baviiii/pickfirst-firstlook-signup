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
  const [showMethodology, setShowMethodology] = useState(false);

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
  <div className="p-4 pickfirst-glass bg-card/90 rounded-lg border border-border hover:border-pickfirst-yellow/50 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
          <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {place.name}
          </h4>
        </div>
        {place.rating && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-xs text-yellow-400 font-medium">{place.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="line-clamp-1">{place.vicinity || 'Nearby'}</span>
          {place.distance && (
            <span className="text-primary/80 font-medium">
              {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)}km`}
            </span>
          )}
        </div>
        
        {place.user_ratings_total && (
          <div className="text-xs text-muted-foreground/80">
            {place.user_ratings_total.toLocaleString()} reviews
            {place.price_level && (
              <span className="ml-2">
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
          <CardTitle className="text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Neighborhood Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="text-muted-foreground text-center">
              <p>Loading real data from Google Maps...</p>
              {retryCount > 0 && (
                <p className="text-sm text-yellow-400 mt-1">
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
    <div className="space-y-6">
      {/* Quick Stats from Real Data */}
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Neighborhood at a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Schools */}
            <div className="p-4 rounded-lg border border-border bg-card/80">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Schools</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {avgSchoolRating > 0 ? avgSchoolRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">
                {nearbyPlaces.schools.length > 0 ? `${nearbyPlaces.schools.length} nearby` : 'avg rating'}
              </div>
            </div>

            {/* Restaurants */}
            <div className="p-4 rounded-lg border border-border bg-card/80">
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Dining</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {topRatedRestaurants}
              </div>
              <div className="text-xs text-muted-foreground">top-rated spots</div>
            </div>

            {/* Transit */}
            <div className="p-4 rounded-lg border border-border bg-card/80">
              <div className="flex items-center gap-2 mb-2">
                <Train className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Transit</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {transitOptions}
              </div>
              <div className="text-xs text-muted-foreground">stations nearby</div>
            </div>

            {/* Parks */}
            <div className="p-4 rounded-lg border border-border bg-card/80">
              <div className="flex items-center gap-2 mb-2">
                <TreePine className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Parks</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {parksNearby}
              </div>
              <div className="text-xs text-muted-foreground">green spaces</div>
            </div>

            {/* Air Quality */}
            {airQuality && (
              <div className={`p-4 rounded-lg border border-border ${aqInfo.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{aqInfo.icon}</span>
                  <span className="text-sm font-medium text-white">Air Quality</span>
                </div>
                <div className={`text-2xl font-bold ${aqInfo.color}`}>
                  {airQuality.aqi || 'N/A'}
                </div>
                <div className={`text-xs ${aqInfo.color}`}>
                  {aqInfo.label}
                </div>
              </div>
            )}
          </div>

          {/* Air Quality Details */}
          {airQuality && airQuality.aqi && (
            <div className={`mt-4 p-3 rounded-lg border ${aqInfo.bgColor} border-gray-700`}>
              <div className="flex items-start gap-2">
                <Info className={`h-4 w-4 ${aqInfo.color} flex-shrink-0 mt-0.5`} />
                <div className="text-sm space-y-1">
                  <p className={`font-medium ${aqInfo.color}`}>
                    Air Quality Index: {airQuality.aqi} ({aqInfo.label})
                  </p>
                  {airQuality.dominantPollutant && (
                    <p className="text-muted-foreground text-xs">
                      Primary pollutant: {airQuality.dominantPollutant}
                    </p>
                  )}
                  {airQuality.healthRecommendations?.generalPopulation && (
                    <p className="text-muted-foreground/80 text-xs mt-2">
                      {airQuality.healthRecommendations.generalPopulation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Source Notice */}
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="text-foreground font-medium">
                100% Real Data from Google (Cached for 30 Days)
              </p>
              <p className="text-muted-foreground">
                All information is sourced from <strong>Google Maps Places API</strong> and <strong>Google Air Quality API</strong>. 
                Data is cached for 30 days to optimize performance. First-time views fetch fresh data, subsequent views use cached results for instant loading.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80 p-0 h-auto font-normal"
                onClick={() => setShowMethodology(!showMethodology)}
              >
                {showMethodology ? <ChevronUp className="h-4 w-4 inline mr-1" /> : <ChevronDown className="h-4 w-4 inline mr-1" />}
                How we calculate this data
              </Button>
              {showMethodology && (
                <div className="mt-3 p-4 bg-card/80 rounded-lg border border-border space-y-2 text-muted-foreground">
                  <p className="font-medium text-foreground">Calculation Methodology:</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li><strong>Distance:</strong> Calculated using the Haversine formula, which determines the great-circle distance between two points on Earth using their latitude and longitude coordinates.</li>
                    <li><strong>Ratings:</strong> Pulled directly from Google Maps user reviews (out of 5 stars).</li>
                    <li><strong>Filtering:</strong> We only show places with at least a 3.0 rating and 10+ reviews to ensure quality.</li>
                    <li><strong>Sorting:</strong> Places are ranked by a weighted score: 70% rating quality + 30% proximity to property.</li>
                    <li><strong>Search Radius:</strong> Schools (2km), Restaurants (1km), Shopping (1.5km), Healthcare (3km), Parks (1.5km), Transit (1km), Gyms (1.5km).</li>
                    <li><strong>Air Quality:</strong> Real-time AQI (Air Quality Index) from Google's Air Quality API, based on official monitoring stations. Scale: 0-50 (Good), 51-100 (Moderate), 101-150 (Unhealthy for Sensitive), 151-200 (Unhealthy), 201-300 (Very Unhealthy), 301+ (Hazardous).</li>
                    <li><strong>Caching:</strong> Data is stored in our database and refreshed every 30 days. This means instant loading for cached properties and zero duplicate API calls.</li>
                    <li><strong>Data Freshness:</strong> First-time property views fetch fresh data from Google APIs. Subsequent views use cached data (max 30 days old) for instant performance.</li>
                  </ul>
                  <p className="text-xs text-muted-foreground/80 italic mt-2">
                    Note: Air Quality data is from official monitoring stations. We do NOT use estimated metrics for noise levels or crime data. Cached data ensures fast, cost-effective insights.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Places */}
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Nearby Places
            </div>
            <Badge variant="outline" className="text-primary border-primary/40 bg-primary/10">
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
                <div key={category.key} className="border-b border-border/60 last:border-b-0 pb-4 last:pb-0">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-left p-3 h-auto hover:bg-card/80 rounded-lg"
                    onClick={() => setExpandedCategory(
                      expandedCategory === category.key ? '' : category.key
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className="h-5 w-5 text-primary" />
                      <span className="text-foreground font-medium">{category.label}</span>
                      <Badge 
                        variant="outline" 
                        className={`${category.places.length > 0 ? 'text-primary border-primary/40 bg-primary/5' : 'text-muted-foreground border-border'}`}
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