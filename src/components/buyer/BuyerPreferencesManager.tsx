import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { BuyerProfileService, BuyerPreferences } from '@/services/buyerProfileService';
import { 
  MapPin, 
  Home, 
  DollarSign, 
  Bed, 
  Bath, 
  Plus, 
  X, 
  Settings,
  Target,
  Check,
  Bell,
  Mail,
  Crown,
  Car
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface BuyerPreferencesManagerProps {
  onPreferencesUpdate?: (preferences: BuyerPreferences) => void;
  showTitle?: boolean;
  compact?: boolean;
}

export const BuyerPreferencesManager: React.FC<BuyerPreferencesManagerProps> = ({
  onPreferencesUpdate,
  showTitle = true,
  compact = false
}) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Partial<BuyerPreferences>>({
    min_budget: 0,
    max_budget: 1000000,
    preferred_bedrooms: 2,
    preferred_bathrooms: 2,
    preferred_garages: 0,
    preferred_areas: [],
    property_type_preferences: [],
    preferred_features: [],
    move_in_timeline: 'flexible',
    financing_pre_approved: false,
    first_time_buyer: false,
    // Email notification settings
    email_notifications: true,
    property_alerts: true,
    new_listings: true,
    price_changes: false,
    market_updates: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Property types
  const PROPERTY_TYPES = [
    'House', 'Apartment', 'Townhouse', 'Villa', 'Unit', 
    'Studio', 'Duplex', 'Penthouse', 'Terrace', 'Land'
  ];

  // Move-in timeline options
  const TIMELINE_OPTIONS = [
    { value: 'immediate', label: 'Immediately' },
    { value: '1-3_months', label: '1-3 months' },
    { value: '3-6_months', label: '3-6 months' },
    { value: '6-12_months', label: '6-12 months' },
    { value: 'flexible', label: 'Flexible' }
  ];

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const buyerPrefs = await BuyerProfileService.getBuyerPreferences(user.id);
      if (buyerPrefs) {
        setPreferences(buyerPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handlePreferenceChange = (field: keyof BuyerPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAddLocation = (location: string) => {
    if (!location.trim()) return;
    
    const currentAreas = preferences.preferred_areas || [];
    if (!currentAreas.includes(location.trim())) {
      const newAreas = [...currentAreas, location.trim()];
      handlePreferenceChange('preferred_areas', newAreas);
    }
    setCurrentLocation('');
  };

  const handleRemoveLocation = (location: string) => {
    const newAreas = (preferences.preferred_areas || []).filter(area => area !== location);
    handlePreferenceChange('preferred_areas', newAreas);
  };

  const handleAddPropertyType = (type: string) => {
    const currentTypes = preferences.property_type_preferences || [];
    if (!currentTypes.includes(type)) {
      const newTypes = [...currentTypes, type];
      handlePreferenceChange('property_type_preferences', newTypes);
    }
  };

  const handleRemovePropertyType = (type: string) => {
    const newTypes = (preferences.property_type_preferences || []).filter(t => t !== type);
    handlePreferenceChange('property_type_preferences', newTypes);
  };

  const handleSave = async () => {
    if (!user) return;
    
    console.log('Saving preferences:', preferences);
    setIsLoading(true);
    try {
      const result = await BuyerProfileService.updateBuyerPreferences(user.id, preferences);
      console.log('Save result:', result);
      if (result.success) {
        toast.success('Preferences updated successfully');
        setHasChanges(false);
        onPreferencesUpdate?.(preferences as BuyerPreferences);
        // Reload preferences to confirm save
        await loadPreferences();
      } else {
        console.error('Save failed:', result.error);
        toast.error(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBudget = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000)}K`;
    return `$${value}`;
  };

  const formatNumberWithCommas = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString();
  };

  const parseNumberFromCommas = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  return (
    <Card className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 ${compact ? 'p-4' : ''}`}>
      {showTitle && (
        <CardHeader className={compact ? 'pb-4' : ''}>
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-foreground">Search Preferences</CardTitle>
              <CardDescription className="text-muted-foreground">
                Set your ideal property criteria for personalized recommendations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className={`space-y-6 ${compact ? 'pt-0' : ''}`}>
        {/* Budget Range */}
        <div className="space-y-4">
          <Label className="text-foreground font-medium">Budget Range</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min-budget" className="text-sm text-muted-foreground">Minimum</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="min-budget"
                  type="text"
                  value={preferences.min_budget ? formatNumberWithCommas(preferences.min_budget) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value.toLowerCase() === 'any') {
                      handlePreferenceChange('min_budget', 0);
                    } else {
                      handlePreferenceChange('min_budget', parseNumberFromCommas(value));
                    }
                  }}
                  placeholder="Any or 0"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="max-budget" className="text-sm text-muted-foreground">Maximum</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="max-budget"
                  type="text"
                  value={preferences.max_budget && preferences.max_budget < 10000000 ? formatNumberWithCommas(preferences.max_budget) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value.toLowerCase() === 'any') {
                      handlePreferenceChange('max_budget', 10000000);
                    } else {
                      handlePreferenceChange('max_budget', parseNumberFromCommas(value));
                    }
                  }}
                  placeholder="Any or 1,000,000"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Budget: {formatBudget(preferences.min_budget || 0)} - {formatBudget(preferences.max_budget || 1000000)}
          </div>
        </div>

        {/* Bedrooms, Bathrooms & Garages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-foreground font-medium flex items-center gap-2">
              <Bed className="h-4 w-4" />
              Minimum Bedrooms
            </Label>
            <Select
              value={preferences.preferred_bedrooms?.toString() || 'any'}
              onValueChange={(value) => handlePreferenceChange('preferred_bedrooms', value === 'any' ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="0">Studio</SelectItem>
                <SelectItem value="1">1+ bedroom</SelectItem>
                <SelectItem value="2">2+ bedrooms</SelectItem>
                <SelectItem value="3">3+ bedrooms</SelectItem>
                <SelectItem value="4">4+ bedrooms</SelectItem>
                <SelectItem value="5">5+ bedrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-foreground font-medium flex items-center gap-2">
              <Bath className="h-4 w-4" />
              Minimum Bathrooms
            </Label>
            <Select
              value={preferences.preferred_bathrooms?.toString() || 'any'}
              onValueChange={(value) => handlePreferenceChange('preferred_bathrooms', value === 'any' ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1+ bathroom</SelectItem>
                <SelectItem value="2">2+ bathrooms</SelectItem>
                <SelectItem value="3">3+ bathrooms</SelectItem>
                <SelectItem value="4">4+ bathrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-foreground font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Minimum Garages
            </Label>
            <Select
              value={preferences.preferred_garages?.toString() || 'any'}
              onValueChange={(value) => handlePreferenceChange('preferred_garages', value === 'any' ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="0">No preference</SelectItem>
                <SelectItem value="1">1+ garage</SelectItem>
                <SelectItem value="2">2+ garages</SelectItem>
                <SelectItem value="3">3+ garages</SelectItem>
                <SelectItem value="4">4+ garages</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preferred Areas */}
        <div className="space-y-4">
          <Label className="text-foreground font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Preferred Areas
          </Label>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <LocationAutocomplete
                value={currentLocation}
                onChange={setCurrentLocation}
                onLocationSelect={(location) => {
                  handleAddLocation(location.description);
                }}
                placeholder="Add suburb, city, or area..."
                countryCode="AU"
              />
            </div>
            <Button
              type="button"
              onClick={() => handleAddLocation(currentLocation)}
              disabled={!currentLocation.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {preferences.preferred_areas && preferences.preferred_areas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_areas.map((area, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {area}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveLocation(area)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Property Types */}
        <div className="space-y-4">
          <Label className="text-foreground font-medium flex items-center gap-2">
            <Home className="h-4 w-4" />
            Property Types
          </Label>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {PROPERTY_TYPES.map((type) => {
              const isSelected = preferences.property_type_preferences?.includes(type);
              return (
                <Button
                  key={type}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => 
                    isSelected 
                      ? handleRemovePropertyType(type)
                      : handleAddPropertyType(type)
                  }
                  className="text-xs h-8"
                >
                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                  {type}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Property Features */}
        <div className="space-y-4">
          <Label className="text-foreground font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Property Features
          </Label>
          <p className="text-sm text-muted-foreground">
            Select features you'd like in your ideal property (used for recommendations and alerts)
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {['Pool', 'Air Conditioning', 'Dishwasher', 'Garden', 'Balcony', 'Study', 'Fireplace', 'Solar Panels', 'Security System', 'Outdoor Entertainment', 'Ensuite', 'Walk-in Closet'].map((feature) => {
              const isSelected = preferences.preferred_features?.includes(feature);
              return (
                <Button
                  key={feature}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const currentFeatures = preferences.preferred_features || [];
                    const newFeatures = isSelected 
                      ? currentFeatures.filter((f: string) => f !== feature)
                      : [...currentFeatures, feature];
                    handlePreferenceChange('preferred_features', newFeatures);
                  }}
                  className="text-xs h-8"
                >
                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                  {feature}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Move-in Timeline */}
        <div>
          <Label className="text-foreground font-medium">Move-in Timeline</Label>
          <Select
            value={preferences.move_in_timeline || 'flexible'}
            onValueChange={(value) => handlePreferenceChange('move_in_timeline', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMELINE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Email Notification Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <Label className="text-foreground font-medium">Email Notifications</Label>
          </div>
          
          <div className="space-y-4 pl-7">
            {/* Property Alerts */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="font-medium">Property Alerts</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Unlimited
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when new on-market properties match your criteria. Premium members also get exclusive off-market alerts! 🔐
                </p>
              </div>
              <Switch
                checked={preferences.property_alerts || false}
                onCheckedChange={(checked) => handlePreferenceChange('property_alerts', checked)}
              />
            </div>

            {/* New Listings */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="font-medium">New Listings</span>
                  <Badge variant="outline" className="text-xs">Free + Premium</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Weekly digest of new properties in your preferred areas
                </p>
              </div>
              <Switch
                checked={preferences.new_listings || false}
                onCheckedChange={(checked) => handlePreferenceChange('new_listings', checked)}
              />
            </div>

            {/* Price Changes */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-medium">Price Changes</span>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when saved properties change price
                </p>
              </div>
              <Switch
                checked={preferences.price_changes || false}
                onCheckedChange={(checked) => handlePreferenceChange('price_changes', checked)}
              />
            </div>

            {/* Market Updates */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">Market Updates</span>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Monthly market insights and trends for your areas
                </p>
              </div>
              <Switch
                checked={preferences.market_updates || false}
                onCheckedChange={(checked) => handlePreferenceChange('market_updates', checked)}
              />
            </div>

            {/* Master Email Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-medium">All Email Notifications</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Master toggle for all email notifications
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications || false}
                onCheckedChange={(checked) => handlePreferenceChange('email_notifications', checked)}
              />
            </div>
          </div>
        </div>

        {/* Save and Reset Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setPreferences({
                  min_budget: null,
                  max_budget: null,
                  preferred_bedrooms: null,
                  preferred_bathrooms: null,
                  preferred_garages: null,
                  preferred_areas: [],
                  property_type_preferences: [],
                  preferred_features: [],
                  move_in_timeline: null,
                  property_alerts: true,
                  new_listings: true,
                  price_changes: false,
                  market_updates: false,
                  email_notifications: true
                });
                setHasChanges(true);
              }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Reset All
            </Button>
            <div className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};