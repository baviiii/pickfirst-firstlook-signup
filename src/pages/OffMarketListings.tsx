import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MessageSquare, 
  Heart,
  Bed,
  Bath, 
  Square,
  MapPin,
  Camera,
  Eye,
  Lock,
  Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { PageWrapper } from '@/components/ui/page-wrapper';

const OffMarketListings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { canAccessOffMarketListings, subscriptionTier } = useSubscription();
  
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!canAccessOffMarketListings()) {
      // Don't show error, just show upgrade prompt
      setLoading(false);
      return;
    }
    fetchOffMarketListings();
    if (profile?.role === 'buyer') {
      fetchFavorites();
    }
  }, [profile, canAccessOffMarketListings]);

  const fetchOffMarketListings = async () => {
    setLoading(true);
    try {
      // Fetch only agent-posted listings (off-market)
      const { data } = await PropertyService.getApprovedListings();
      const offMarketOnly = data?.filter(listing => 
        (listing as any).listing_source === 'agent_posted'
      ) || [];
      setListings(offMarketOnly);
    } catch (error) {
      toast.error('Failed to load off-market properties');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data } = await PropertyService.getFavorites();
      setFavorites(new Set(data?.map(fav => fav.id) || []));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleToggleFavorite = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!profile) {
      toast.error('Please log in to save properties');
      navigate('/auth');
      return;
    }

    try {
      const isFavorited = favorites.has(propertyId);
      
      if (isFavorited) {
        await PropertyService.removeFromFavorites(propertyId);
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(propertyId);
          return newFavorites;
        });
        toast.success('Property removed from favorites');
      } else {
        await PropertyService.addToFavorites(propertyId);
        setFavorites(prev => new Set(prev).add(propertyId));
        toast.success('Property saved to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  // If user doesn't have access, show upgrade prompt
  if (!canAccessOffMarketListings()) {
    return (
      <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-yellow-400 hover:text-amber-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-yellow-400/10 rounded-full">
                  <Lock className="w-12 h-12 text-yellow-400" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Exclusive Off-Market Listings
              </CardTitle>
              <p className="text-gray-300">
                Access to agent-posted off-market properties requires a Premium subscription
              </p>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  Premium Benefits
                </h3>
                <ul className="space-y-3 text-left max-w-md mx-auto text-gray-300">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2"></div>
                    <span>Direct chat with agents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2"></div>
                    <span>Schedule appointments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2"></div>
                    <span>Exclusive off-market listings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2"></div>
                    <span>View vendor details (ownership duration, special conditions)</span>
                  </li>
                </ul>
              </div>
              <Button
                size="lg"
                className="bg-yellow-400 hover:bg-amber-500 text-black font-bold px-8"
                onClick={() => navigate('/pricing')}
              >
                Upgrade to Premium - $19.99/month
              </Button>
            </CardContent>
          </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-yellow-400 hover:text-amber-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Lock className="w-8 h-8 text-yellow-400" />
                Off-Market Listings
              </h1>
              <p className="text-gray-300 mt-1">Exclusive properties from our agent network</p>
            </div>
          </div>
          <Badge className="bg-yellow-400 text-black px-4 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Premium Access
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
                <div className="aspect-video bg-white/5"></div>
                <CardContent className="p-6">
                  <div className="h-6 bg-white/5 rounded mb-4"></div>
                  <div className="h-4 bg-white/5 rounded mb-2"></div>
                  <div className="h-4 bg-white/5 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 p-12 text-center">
            <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Off-Market Properties Yet</h3>
            <p className="text-gray-400">Check back soon for exclusive listings from our agent network</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const hasImages = listing.images && listing.images.length > 0;
              const isFavorited = favorites.has(listing.id);

              return (
                <Card 
                  key={listing.id}
                  className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => navigate(`/property/${listing.id}`)}
                >
                  <div className="relative aspect-video overflow-hidden rounded-t-lg">
                    {hasImages ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-gray-500" />
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-yellow-400 text-black">
                      Off-Market
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleToggleFavorite(listing.id, e)}
                      className={`absolute top-3 right-3 rounded-full bg-black/50 hover:bg-black/70 ${isFavorited ? 'text-yellow-400' : 'text-white'}`}
                    >
                      <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{listing.title}</h3>
                    <div className="flex items-center text-yellow-400/80 mb-3">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="text-sm line-clamp-1">{listing.address}, {listing.city}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl font-bold text-yellow-400">
                        ${listing.price.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {listing.bedrooms !== null && (
                          <div className="flex items-center gap-1">
                            <Bed className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300">{listing.bedrooms}</span>
                          </div>
                        )}
                        {listing.bathrooms !== null && (
                          <div className="flex items-center gap-1">
                            <Bath className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300">{listing.bathrooms}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      size="sm"
                      className="w-full bg-yellow-400 hover:bg-amber-500 text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/property/${listing.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
};

export default OffMarketListings;