import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Heart, HeartOff, Home, MapPin, DollarSign, Bed, Bath, Square, Star, Lock } from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';

interface FavoritesManagerProps {
  className?: string;
}

export const FavoritesManager: React.FC<FavoritesManagerProps> = ({ className }) => {
  const { user } = useAuth();
  const { isFeatureEnabled } = useSubscription();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  const FREE_TIER_LIMIT = 5;
  const hasUnlimitedFavorites = isFeatureEnabled('unlimited_favorites');
  const canAddMore = hasUnlimitedFavorites || favorites.length < FREE_TIER_LIMIT;

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await PropertyService.getFavorites();
      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorite properties');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    if (!user) return;
    
    try {
      const { error } = await PropertyService.removeFromFavorites(propertyId);
      if (error) throw error;
      
      setFavorites(prev => prev.filter(p => p.id !== propertyId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    }
  };

  const handleViewProperty = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center">Loading favorites...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-red-500" />
              <div>
                <CardTitle className="text-foreground">My Favorites</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Properties you've saved for later
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {favorites.length} {hasUnlimitedFavorites ? 'saved' : `of ${FREE_TIER_LIMIT}`}
              </Badge>
              {!hasUnlimitedFavorites && (
                <FeatureGate 
                  feature="unlimited_favorites" 
                  showUpgrade={false}
                >
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                    <Star className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </FeatureGate>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Free Tier Limit Warning */}
          {!hasUnlimitedFavorites && favorites.length >= FREE_TIER_LIMIT - 1 && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Lock className="h-4 w-4" />
                <span className="font-medium">Favorites Limit</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {favorites.length >= FREE_TIER_LIMIT 
                  ? "You've reached your limit of 5 favorite properties. Upgrade to save unlimited favorites."
                  : `You can save ${FREE_TIER_LIMIT - favorites.length} more favorite${FREE_TIER_LIMIT - favorites.length !== 1 ? 's' : ''} on the free plan.`
                }
              </p>
              <Button 
                size="sm" 
                onClick={() => navigate('/pricing')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Upgrade to Premium
              </Button>
            </div>
          )}

          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <HeartOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Start browsing properties and save your favorites here
              </p>
              <Button onClick={() => navigate('/browse-properties')}>
                Browse Properties
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((property) => (
                <Card 
                  key={property.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur-sm"
                  onClick={() => handleViewProperty(property.id)}
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
                      
                      {/* Remove from favorites button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(property.id);
                        }}
                      >
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
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
                      <div className="flex flex-wrap gap-2">
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
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Features Showcase */}
      <FeatureGate 
        feature="unlimited_favorites"
        title="Unlimited Favorites"
        description="Save as many properties as you want and never lose track of your dream homes"
      >
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-green-600 fill-current" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Unlimited Favorites Active</h3>
                <p className="text-sm text-green-600">Save as many properties as you want!</p>
              </div>
            </div>
            <p className="text-sm text-green-700">
              You can now save unlimited properties to your favorites list. Never worry about hitting limits again!
            </p>
          </CardContent>
        </Card>
      </FeatureGate>
    </div>
  );
};
