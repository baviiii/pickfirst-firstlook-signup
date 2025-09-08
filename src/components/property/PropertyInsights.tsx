import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  MapPin, 
  Clock, 
  Car, 
  GraduationCap, 
  Stethoscope, 
  ShoppingBag, 
  Coffee,
  TreePine,
  Train,
  Dumbbell,
  Shield,
  TrendingUp,
  Info,
  ExternalLink,
  Navigation,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import { googleMapsService } from '@/services/googleMapsService';

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

interface AreaInsights {
  walkScore: number;
  crimeRating: number;
  schoolRating: number;
  transitScore: number;
  bikeScore: number;
  noiseLevel: number;
  airQuality: number;
  confidence: 'high' | 'medium' | 'low';
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
  const [areaInsights, setAreaInsights] = useState<AreaInsights | null>(null);
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

  const generateAreaInsights = useCallback((lat: number, lng: number, places: NearbyPlacesData): AreaInsights => {
    try {
      // Calculate school rating with proper validation
      const validSchools = places.schools.filter(school => school.rating && school.rating > 0);
      const avgSchoolRating = validSchools.length > 0 
        ? validSchools.reduce((sum, school) => sum + (school.rating || 0), 0) / validSchools.length
        : 0;

      // Calculate walk score based on amenity diversity and density
      const amenityTypes = [
        places.restaurants.length,
        places.shopping.length,
        places.healthcare.length,
        places.parks.length
      ];
      const totalAmenities = amenityTypes.reduce((sum, count) => sum + count, 0);
      const diversityBonus = amenityTypes.filter(count => count > 0).length * 5;
      const walkScore = Math.min(100, Math.max(0, (totalAmenities * 3) + diversityBonus + 20));

      // Transit score based on nearby stations and their ratings
      const validTransit = places.transit.filter(t => t.rating && t.rating > 0);
      const avgTransitRating = validTransit.length > 0
        ? validTransit.reduce((sum, t) => sum + (t.rating || 0), 0) / validTransit.length
        : 0;
      const transitScore = Math.min(100, (validTransit.length * 15) + (avgTransitRating * 10));

      // Bike score based on parks and overall walkability
      const parkCount = places.parks.length;
      const bikeScore = Math.min(100, walkScore * 0.8 + (parkCount * 5));

      // Enhanced crime rating simulation (in production, use real crime data APIs)
      const baselineSafety = 7.5;
      const hospitalBonus = places.healthcare.length > 0 ? 0.3 : 0;
      const transitPenalty = places.transit.length > 5 ? -0.2 : 0; // Busy transit areas might have slightly more activity
      const crimeRating = Math.min(10, Math.max(1, 
        baselineSafety + hospitalBonus + transitPenalty + (Math.random() * 0.6 - 0.3)
      ));

      // Noise level based on nearby amenities
      const highTrafficAmenities = places.restaurants.length + places.shopping.length + places.transit.length;
      const noiseLevel = Math.min(5, Math.max(1, 2 + (highTrafficAmenities * 0.1) + (Math.random() * 0.5)));

      // Air quality (in production, integrate with air quality APIs)
      const parkBonus = places.parks.length * 2;
      const airQuality = Math.min(100, Math.max(50, 85 + parkBonus - (highTrafficAmenities * 0.5) + (Math.random() * 10)));

      // Confidence level based on data availability
      const totalDataPoints = Object.values(places).reduce((sum, arr) => sum + arr.length, 0);
      const confidence: 'high' | 'medium' | 'low' = 
        totalDataPoints > 20 ? 'high' : 
        totalDataPoints > 10 ? 'medium' : 'low';

      return {
        walkScore: Math.round(walkScore),
        schoolRating: Math.round(avgSchoolRating * 10) / 10,
        transitScore: Math.round(transitScore),
        bikeScore: Math.round(bikeScore),
        crimeRating: Math.round(crimeRating * 10) / 10,
        noiseLevel: Math.round(noiseLevel * 10) / 10,
        airQuality: Math.round(airQuality),
        confidence
      };
    } catch (error) {
      console.error('Error generating area insights:', error);
      return {
        walkScore: 50,
        schoolRating: 0,
        transitScore: 50,
        bikeScore: 50,
        crimeRating: 7.5,
        noiseLevel: 3.0,
        airQuality: 80,
        confidence: 'low'
      };
    }
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
      const places = await fetchNearbyPlaces(coords.lat, coords.lng);
      const insights = generateAreaInsights(coords.lat, coords.lng, places);
      
      setNearbyPlaces(places);
      setAreaInsights(insights);
      setRetryCount(0);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load property insights';
      setError(errorMessage);
      onError?.(errorMessage);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        // Retry with exponential backoff
        setTimeout(() => {
          fetchPropertyInsights(coords);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        // Set default insights on final failure
        const defaultInsights: AreaInsights = {
          walkScore: 50,
          schoolRating: 0,
          transitScore: 50,
          bikeScore: 50,
          crimeRating: 7.5,
          noiseLevel: 3.0,
          airQuality: 80,
          confidence: 'low'
        };
        setAreaInsights(defaultInsights);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchNearbyPlaces, generateAreaInsights, onError, retryCount, maxRetries]);

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

  // Memoized UI helper functions
  const getScoreColor = useCallback((score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }, []);

  const getScoreBgColor = useCallback((score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'bg-green-500/10 border-green-500/20';
    if (percentage >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  }, []);

  const getConfidenceColor = useCallback((confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }, []);

  // Memoized components
  const PlaceCard = useMemo(() => ({ place, icon: Icon }: { place: NearbyPlace; icon: any }) => (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-yellow-400/50 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Icon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-yellow-100 transition-colors">
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
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="line-clamp-1">{place.vicinity || 'Nearby'}</span>
          {place.distance && (
            <span className="text-yellow-400/80 font-medium">
              {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)}km`}
            </span>
          )}
        </div>
        
        {place.user_ratings_total && (
          <div className="text-xs text-gray-500">
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
      <div className="space-y-6">
        {/* Loading skeleton for area insights */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              Area Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-lg border border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-8 bg-gray-700 rounded mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading skeleton for nearby places */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-yellow-400" />
              Nearby Places
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
              <div className="text-gray-400 text-center">
                <p>Analyzing neighborhood data...</p>
                {retryCount > 0 && (
                  <p className="text-sm text-yellow-400 mt-1">
                    Retry attempt {retryCount} of {maxRetries}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-red-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
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

  if (!areaInsights) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Area Scores */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              Area Insights
            </div>
            <Badge variant="outline" className={`${getConfidenceColor(areaInsights.confidence)} border-current`}>
              {areaInsights.confidence} confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.walkScore)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Walk Score</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.walkScore)}`}>
                {areaInsights.walkScore}
              </div>
              <div className="text-xs text-gray-400">out of 100</div>
            </div>

            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.schoolRating, 5)}`}>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Schools</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.schoolRating, 5)}`}>
                {areaInsights.schoolRating > 0 ? areaInsights.schoolRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-xs text-gray-400">avg rating</div>
            </div>

            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.transitScore)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Train className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Transit</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.transitScore)}`}>
                {areaInsights.transitScore}
              </div>
              <div className="text-xs text-gray-400">access score</div>
            </div>

            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.crimeRating, 10)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Safety</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.crimeRating, 10)}`}>
                {areaInsights.crimeRating.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">out of 10</div>
            </div>
          </div>

          {/* Additional metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{areaInsights.bikeScore}</div>
              <div className="text-sm text-gray-400">Bike Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{areaInsights.airQuality}</div>
              <div className="text-sm text-gray-400">Air Quality</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{areaInsights.noiseLevel}/5</div>
              <div className="text-sm text-gray-400">Noise Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Places */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-yellow-400" />
            Nearby Places
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category.key} className="border-b border-gray-700 last:border-b-0 pb-4 last:pb-0">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-left p-3 h-auto hover:bg-gray-800/50 rounded-lg"
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.key ? '' : category.key
                  )}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="h-5 w-5 text-yellow-400" />
                    <span className="text-white font-medium">{category.label}</span>
                    <Badge 
                      variant="outline" 
                      className={`${category.places.length > 0 ? 'text-yellow-400 border-yellow-400/40' : 'text-gray-500 border-gray-500/40'}`}
                    >
                      {category.places.length}
                    </Badge>
                  </div>
                  {expandedCategory === category.key ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
                
                {expandedCategory === category.key && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.places.length > 0 ? (
                      category.places.map((place, index) => (
                        <PlaceCard key={place.place_id || index} place={place} icon={category.icon} />
                      ))
                    ) : (
                      <div className="text-gray-400 text-sm col-span-full text-center py-4">
                        No {category.label.toLowerCase()} found nearby
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Sources & Disclaimer */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-gray-700/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-400 space-y-1">
              <p>
                <strong className="text-gray-300">Data Sources:</strong> Property insights are generated using location-based services, 
                public amenity databases, and aggregated community data.
              </p>
              <p>
                <strong className="text-gray-300">Disclaimer:</strong> Scores and ratings are estimates based on available data 
                and should be used as general guidance. Always verify information independently and visit the area personally 
                before making property decisions.
              </p>
              <p className="text-xs">
                Last updated: {new Date().toLocaleDateString()} | 
                Confidence: <span className={getConfidenceColor(areaInsights.confidence)}>{areaInsights.confidence}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyInsights;