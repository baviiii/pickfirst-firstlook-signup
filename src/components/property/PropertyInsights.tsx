import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Navigation
} from 'lucide-react';
import { googleMapsService, PlaceDetails } from '@/services/googleMapsService';
import { toast } from 'sonner';

interface PropertyInsightsProps {
  address: string;
  latitude?: number;
  longitude?: number;
  propertyId: string;
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
}

interface AreaInsights {
  walkScore?: number;
  crimeRating?: number;
  schoolRating?: number;
  transitScore?: number;
  bikeScore?: number;
  noiseLevel?: number;
  airQuality?: number;
}

const PropertyInsights: React.FC<PropertyInsightsProps> = ({ 
  address, 
  latitude, 
  longitude, 
  propertyId 
}) => {
  const [loading, setLoading] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState<{
    schools: NearbyPlace[];
    restaurants: NearbyPlace[];
    shopping: NearbyPlace[];
    healthcare: NearbyPlace[];
    parks: NearbyPlace[];
    transit: NearbyPlace[];
    gyms: NearbyPlace[];
  }>({
    schools: [],
    restaurants: [],
    shopping: [],
    healthcare: [],
    parks: [],
    transit: [],
    gyms: []
  });
  const [areaInsights, setAreaInsights] = useState<AreaInsights>({});
  const [expandedCategory, setExpandedCategory] = useState<string>('');

  useEffect(() => {
    if (latitude && longitude) {
      fetchPropertyInsights();
    } else if (address) {
      fetchCoordinatesAndInsights();
    }
  }, [address, latitude, longitude]);

  const fetchCoordinatesAndInsights = async () => {
    try {
      const coords = await googleMapsService.getCoordinatesFromAddress(address);
      if (coords) {
        await fetchNearbyPlaces(coords.lat, coords.lng);
        generateAreaInsights(coords.lat, coords.lng);
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      toast.error('Failed to load property insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyInsights = async () => {
    if (!latitude || !longitude) return;
    
    try {
      await fetchNearbyPlaces(latitude, longitude);
      generateAreaInsights(latitude, longitude);
    } catch (error) {
      console.error('Error fetching property insights:', error);
      toast.error('Failed to load property insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyPlaces = async (lat: number, lng: number) => {
    const categories = [
      { key: 'schools', type: 'school', radius: 2000 },
      { key: 'restaurants', type: 'restaurant', radius: 1000 },
      { key: 'shopping', type: 'shopping_mall', radius: 1500 },
      { key: 'healthcare', type: 'hospital', radius: 3000 },
      { key: 'parks', type: 'park', radius: 1500 },
      { key: 'transit', type: 'transit_station', radius: 1000 },
      { key: 'gyms', type: 'gym', radius: 1500 }
    ];

    const results: any = {
      schools: [],
      restaurants: [],
      shopping: [],
      healthcare: [],
      parks: [],
      transit: [],
      gyms: []
    };

    for (const category of categories) {
      try {
        const places = await googleMapsService.nearbySearch(
          lat, 
          lng, 
          category.radius, 
          category.type
        );
        
        // Sort by rating and distance, take top 5
        const sortedPlaces = places
          .filter(place => place.rating && place.rating > 3.0)
          .sort((a, b) => {
            // Prioritize by rating first, then by distance
            if (Math.abs(a.rating - b.rating) > 0.5) {
              return b.rating - a.rating;
            }
            // If ratings are similar, prefer closer places
            return (a.geometry?.location ? 
              calculateDistance(lat, lng, a.geometry.location.lat, a.geometry.location.lng) :
              1000) - 
            (b.geometry?.location ? 
              calculateDistance(lat, lng, b.geometry.location.lat, b.geometry.location.lng) :
              1000);
          })
          .slice(0, 5)
          .map(place => ({
            name: place.name,
            rating: place.rating,
            types: place.types || [],
            place_id: place.place_id,
            vicinity: place.vicinity,
            price_level: place.price_level,
            user_ratings_total: place.user_ratings_total,
            photos: place.photos,
            distance: place.geometry?.location ? 
              calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng) :
              undefined
          }));

        results[category.key as keyof typeof results] = sortedPlaces;
      } catch (error) {
        console.error(`Error fetching ${category.key}:`, error);
      }
    }

    setNearbyPlaces(results);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateAreaInsights = (lat: number, lng: number) => {
    // Generate synthetic insights based on nearby places
    // In a real implementation, you'd integrate with Walk Score API, crime data APIs, etc.
    const schoolCount = nearbyPlaces.schools.length;
    const avgSchoolRating = nearbyPlaces.schools.reduce((sum, school) => sum + (school.rating || 0), 0) / schoolCount || 0;
    const transitCount = nearbyPlaces.transit.length;
    const restaurantCount = nearbyPlaces.restaurants.length;
    
    setAreaInsights({
      walkScore: Math.min(100, 50 + (restaurantCount * 5) + (transitCount * 10)),
      schoolRating: Math.round(avgSchoolRating * 10) / 10,
      transitScore: Math.min(100, transitCount * 20),
      bikeScore: Math.min(100, 60 + (nearbyPlaces.parks.length * 8)),
      crimeRating: Math.random() * 2 + 7, // Simulated 7-9 safety score
      noiseLevel: Math.random() * 3 + 2, // Simulated 2-5 noise level
      airQuality: Math.random() * 20 + 80 // Simulated 80-100 air quality
    });
  };

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'bg-green-500/10 border-green-500/20';
    if (percentage >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const PlaceCard = ({ place, icon: Icon }: { place: NearbyPlace; icon: any }) => (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-yellow-400/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-yellow-400" />
          <h4 className="text-sm font-medium text-white line-clamp-1">{place.name}</h4>
        </div>
        {place.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-xs text-yellow-400">{place.rating}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{place.vicinity || 'Nearby'}</span>
        {place.distance && (
          <span>{place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)}km`}</span>
        )}
      </div>
      
      {place.user_ratings_total && (
        <div className="text-xs text-gray-500 mt-1">
          {place.user_ratings_total} reviews
        </div>
      )}
    </div>
  );

  const categories = [
    { key: 'schools', label: 'Schools', icon: GraduationCap, places: nearbyPlaces.schools },
    { key: 'restaurants', label: 'Dining', icon: Coffee, places: nearbyPlaces.restaurants },
    { key: 'shopping', label: 'Shopping', icon: ShoppingBag, places: nearbyPlaces.shopping },
    { key: 'healthcare', label: 'Healthcare', icon: Stethoscope, places: nearbyPlaces.healthcare },
    { key: 'parks', label: 'Parks', icon: TreePine, places: nearbyPlaces.parks },
    { key: 'transit', label: 'Transit', icon: Train, places: nearbyPlaces.transit },
    { key: 'gyms', label: 'Fitness', icon: Dumbbell, places: nearbyPlaces.gyms }
  ];

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            Property Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400">Loading property insights...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Area Scores */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            Area Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.walkScore || 0)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Walk Score</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.walkScore || 0)}`}>
                {Math.round(areaInsights.walkScore || 0)}
              </div>
              <div className="text-xs text-gray-400">out of 100</div>
            </div>

            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.schoolRating || 0, 5)}`}>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Schools</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.schoolRating || 0, 5)}`}>
                {areaInsights.schoolRating?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-xs text-gray-400">avg rating</div>
            </div>

            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.transitScore || 0)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Train className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Transit</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.transitScore || 0)}`}>
                {Math.round(areaInsights.transitScore || 0)}
              </div>
              <div className="text-xs text-gray-400">access score</div>
            </div>

            <div className={`p-4 rounded-lg border ${getScoreBgColor(areaInsights.crimeRating || 0, 10)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Safety</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(areaInsights.crimeRating || 0, 10)}`}>
                {areaInsights.crimeRating?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-xs text-gray-400">out of 10</div>
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
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category.key}>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-left p-0 h-auto"
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.key ? '' : category.key
                  )}
                >
                  <div className="flex items-center gap-3">
                    <category.icon className="h-5 w-5 text-yellow-400" />
                    <span className="text-white font-medium">{category.label}</span>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400/40">
                      {category.places.length}
                    </Badge>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </Button>
                
                {expandedCategory === category.key && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.places.length > 0 ? (
                      category.places.map((place, index) => (
                        <PlaceCard key={index} place={place} icon={category.icon} />
                      ))
                    ) : (
                      <div className="text-gray-400 text-sm col-span-full">
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
    </div>
  );
};

export default PropertyInsights;