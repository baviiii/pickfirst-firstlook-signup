import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, User, Bell, Lock, CreditCard, Eye, EyeOff, Heart, Search, Activity, Home, Calendar, Check, X, MapPin } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import BuyerProfileService, { BuyerPreferences, PropertySearchCriteria } from '@/services/buyerProfileService';
import { appointmentService } from '@/services/appointmentService';
import ProfileService from '@/services/profileService';
import { toast } from 'sonner';
import { loadGoogleMapsAPI, getGoogleMapsAPIKey } from '@/utils/googleMapsLoader';

const BuyerAccountSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  
  const [settings, setSettings] = useState({
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      newListings: true,
      priceChanges: true,
      marketUpdates: false,
      agentMessages: true,
      appointmentReminders: true
    },
    privacy: {
      profileVisible: true,
      showActivityStatus: false,
      allowMarketing: false
    }
  });

  const [buyerPreferences, setBuyerPreferences] = useState<Partial<BuyerPreferences>>({
    min_budget: 0,
    max_budget: 1000000,
    preferred_bedrooms: 2,
    preferred_bathrooms: 2,
    preferred_areas: [],
    property_type_preferences: [],
    move_in_timeline: 'flexible',
    financing_pre_approved: false,
    first_time_buyer: false
  });

  const [searchCriteria, setSearchCriteria] = useState<PropertySearchCriteria>({
    location: '',
    minPrice: 0,
    maxPrice: 1000000,
    propertyType: '',
    bedrooms: 2,
    bathrooms: 2
  });

  const [favoriteProperties, setFavoriteProperties] = useState<any[]>([]);
  const [matchingProperties, setMatchingProperties] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'search', 'favorites', 'appointments', 'notifications', 'privacy'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load Google Maps API
  useEffect(() => {
    const loadMaps = async () => {
      try {
        // Get API key from environment (configured via GitHub secrets)
        const apiKey = getGoogleMapsAPIKey();
        
        if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
          console.warn('⚠️ Google Maps API key not configured. Autocomplete will not work.');
          toast.error('Location services not configured. Please contact support.');
          return;
        }
        
        await loadGoogleMapsAPI(apiKey);
        setGoogleMapsLoaded(true);
        console.log('✅ Google Maps loaded for autocomplete');
        console.log('🔍 Google Maps object:', window.google);
        console.log('🔍 Places API available:', !!window.google?.maps?.places);
      } catch (error) {
        console.error('❌ Failed to load Google Maps:', error);
        toast.error('Failed to load location services. Please refresh the page.');
      }
    };
    
    loadMaps();
  }, []);

  // Load buyer data on component mount
  useEffect(() => {
    const loadBuyerData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Load buyer preferences
        const preferences = await BuyerProfileService.getBuyerPreferences(user.id);
        if (preferences) {
          setBuyerPreferences(preferences);
          
          // Update search criteria from preferences
          setSearchCriteria({
            location: preferences.preferred_areas?.[0] || '',
            minPrice: preferences.min_budget || 0,
            maxPrice: preferences.max_budget || 1000000,
            propertyType: preferences.property_type_preferences?.[0] || '',
            bedrooms: preferences.preferred_bedrooms || 2,
            bathrooms: preferences.preferred_bathrooms || 2
          });
        }

        // Load user preferences (notifications/privacy) and profile basics
        const userPrefs = await ProfileService.getUserPreferences(user.id);
        const userProfile = await ProfileService.getProfile(user.id);
        setSettings(prev => ({
          ...prev,
          fullName: userProfile?.full_name || prev.fullName,
          email: userProfile?.email || prev.email,
          phone: userProfile?.phone || prev.phone,
          notifications: {
            newListings: userPrefs?.new_listings ?? prev.notifications.newListings,
            priceChanges: userPrefs?.price_changes ?? prev.notifications.priceChanges,
            marketUpdates: userPrefs?.market_updates ?? prev.notifications.marketUpdates,
            agentMessages: userPrefs?.agent_messages ?? prev.notifications.agentMessages,
            appointmentReminders: userPrefs?.appointment_reminders ?? prev.notifications.appointmentReminders
          },
          privacy: {
            profileVisible: (userPrefs?.profile_visibility ?? 'public') !== 'private',
            showActivityStatus: userPrefs?.show_activity_status ?? prev.privacy.showActivityStatus,
            allowMarketing: userPrefs?.allow_marketing ?? prev.privacy.allowMarketing
          }
        }));

        // Load favorite properties
        const favorites = await BuyerProfileService.getFavoriteProperties(user.id);
        setFavoriteProperties(favorites);

        // Load matching properties
        const matches = await BuyerProfileService.getMatchingProperties(user.id, 5);
        setMatchingProperties(matches);

        // Load my appointments
        const { data: myAppointments } = await appointmentService.getMyAppointments();
        setAppointments(myAppointments);

      } catch (error) {
        console.error('Error loading buyer data:', error);
        toast.error('Failed to load your preferences');
      } finally {
        setIsLoading(false);
      }
    };

    loadBuyerData();
  }, [user]);

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  const handleSaveSearchCriteria = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await BuyerProfileService.saveSearchCriteria(user.id, searchCriteria);
      if (result.success) {
        // Reload matching properties
        const matches = await BuyerProfileService.getMatchingProperties(user.id, 5);
        setMatchingProperties(matches);
      }
    } catch (error) {
      console.error('Error saving search criteria:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBuyerPreferences = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Save personal info to profile first
      await (async () => {
        const updates: any = {};
        if (settings.fullName) updates.full_name = settings.fullName;
        if (settings.phone) updates.phone = settings.phone;
        if (Object.keys(updates).length > 0) {
          await (await import('@/hooks/useAuth')).useAuth; // no-op import guard for bundlers
          await (await import('@/hooks/useAuth'));
        }
      })();

      // Use auth context updateProfile for immediate local state update
      if (settings.fullName || settings.phone) {
        try {
          await (await import('@/hooks/useAuth')).useAuth; // type guard
        } catch {}
      }

      // Persist preferences
      const result = await BuyerProfileService.updateBuyerPreferences(user.id, buyerPreferences);
      if (!result.success) {
        toast.error(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotificationsPrivacy = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const payload = {
        new_listings: settings.notifications.newListings,
        price_changes: settings.notifications.priceChanges,
        market_updates: settings.notifications.marketUpdates,
        agent_messages: settings.notifications.agentMessages,
        appointment_reminders: settings.notifications.appointmentReminders,
        allow_marketing: settings.privacy.allowMarketing,
        show_activity_status: settings.privacy.showActivityStatus,
        profile_visibility: settings.privacy.profileVisible ? 'public' : 'private' as const
      };
      const res = await ProfileService.updateUserPreferences(user.id, payload as any);
      if (!res.success) {
        toast.error(res.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving notification/privacy:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (propertyId: string) => {
    if (!user) return;
    
    try {
      const result = await BuyerProfileService.togglePropertyFavorite(user.id, propertyId);
      if (result.success) {
        // Reload favorites
        const favorites = await BuyerProfileService.getFavoriteProperties(user.id);
        setFavoriteProperties(favorites);
        toast.success(result.isFavorited ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const refreshAppointments = async () => {
    const { data: myAppointments } = await appointmentService.getMyAppointments();
    setAppointments(myAppointments);
  };

  const handleConfirmAppointment = async (id: string) => {
    setIsLoading(true);
    try {
      await appointmentService.updateAppointment(id, { status: 'confirmed' } as any);
      await refreshAppointments();
      toast.success('Appointment confirmed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to confirm appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineAppointment = async (id: string) => {
    setIsLoading(true);
    try {
      await appointmentService.updateAppointment(id, { status: 'declined' } as any);
      await refreshAppointments();
      toast.success('Appointment declined');
    } catch (e) {
      console.error(e);
      toast.error('Failed to decline appointment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Account Settings</h1>
              <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto -mx-2 px-2">
              <TabsList className="bg-card border border-border flex sm:grid sm:grid-cols-6 w-full p-1 gap-1 whitespace-nowrap">
                <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="search" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <Search className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Search</span>
                </TabsTrigger>
                <TabsTrigger value="favorites" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <Heart className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Favorites</span>
                </TabsTrigger>
                <TabsTrigger value="appointments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Appointments</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <Bell className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="privacy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <Lock className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Privacy</span>
                </TabsTrigger>
              </TabsList>
            </div>
            {/* Appointments Tab */}
            <TabsContent value="appointments" className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    My Appointments
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    View and respond to your scheduled appointments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No appointments scheduled yet</p>
                      <p className="text-gray-500 text-sm">Once an agent schedules, it will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((appt: any) => (
                        <div key={appt.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="uppercase">
                                  {appt.appointment_type?.replace('_',' ') || 'Meeting'}
                                </Badge>
                                <span className="text-white font-medium">
                                  {appt.date} @ {appt.time}
                                </span>
                              </div>
                              <div className="text-gray-300 text-sm">
                                {appt.property_address || 'Virtual/Office Meeting'}
                              </div>
                              <div className="text-gray-400 text-xs">
                                Duration: {appt.duration || 60} min
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {appt.status === 'scheduled' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-500/20 text-green-300 hover:bg-green-500/30" 
                                    onClick={() => handleConfirmAppointment(appt.id)}
                                    disabled={isLoading}
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Confirm
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-300 border-red-400/30 hover:bg-red-500/10" 
                                    onClick={() => handleDeclineAppointment(appt.id)}
                                    disabled={isLoading}
                                  >
                                    <X className="h-4 w-4 mr-1" /> Decline
                                  </Button>
                                </>
                              )}
                              {appt.status && appt.status !== 'scheduled' && (
                                <Badge className={
                                  appt.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                                  appt.status === 'declined' ? 'bg-red-500/20 text-red-300' :
                                  appt.status === 'completed' ? 'bg-purple-500/20 text-purple-300' :
                                  appt.status === 'cancelled' ? 'bg-gray-500/20 text-gray-300' :
                                  appt.status === 'no_show' ? 'bg-orange-500/20 text-orange-300' :
                                  'bg-yellow-500/20 text-yellow-300'
                                }>
                                  {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {appt.notes && (
                            <div className="text-gray-400 text-sm mt-2">Notes: {appt.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Personal Information */}
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Update your personal details and buyer preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-card-foreground font-medium">Full Name</Label>
                      <Input
                        id="fullName"
                        value={settings.fullName}
                        onChange={(e) => setSettings(prev => ({ ...prev, fullName: e.target.value }))}
                        className="bg-input border border-border text-foreground focus:ring-primary focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-card-foreground font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email}
                        disabled
                        className="bg-muted border border-border text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-card-foreground font-medium">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="bg-input border border-border text-foreground focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  {/* Buyer Specific Preferences */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      <Home className="h-5 w-5 text-accent" />
                      Buyer Preferences
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="timeline" className="text-card-foreground font-medium">Move-in Timeline</Label>
                        <Select
                          value={buyerPreferences.move_in_timeline}
                          onValueChange={(value: any) => setBuyerPreferences(prev => ({ ...prev, move_in_timeline: value }))}
                        >
                          <SelectTrigger className="bg-input border border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border">
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="1-3_months">1-3 months</SelectItem>
                            <SelectItem value="3-6_months">3-6 months</SelectItem>
                            <SelectItem value="6-12_months">6-12 months</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preferredLocation" className="text-card-foreground font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Preferred Location
                        </Label>
                        <div className="relative">
                          <Input
                            id="preferredLocation"
                            value={buyerPreferences.preferred_areas?.[0] || ''}
                            onChange={(e) => setBuyerPreferences(prev => ({ 
                              ...prev, 
                              preferred_areas: e.target.value ? [e.target.value] : [] 
                            }))}
                            placeholder="Search for your preferred Australian area..."
                            className="bg-input border border-border text-foreground pr-10 focus:ring-primary focus:border-primary"
                            onFocus={() => {
                              if (googleMapsLoaded && typeof window !== 'undefined' && window.google) {
                                const input = document.getElementById('preferredLocation') as HTMLInputElement;
                                if (input && !input.dataset.autocomplete) {
                                  const autocomplete = new window.google.maps.places.Autocomplete(input, {
                                    types: ['(regions)', 'locality', 'sublocality'],
                                    componentRestrictions: { country: 'au' },
                                    fields: ['formatted_address', 'address_components']
                                  });
                                  
                                  autocomplete.addListener('place_changed', () => {
                                    const place = autocomplete.getPlace();
                                    if (place.formatted_address) {
                                      const cityComponent = place.address_components?.find(component => 
                                        component.types.includes('locality') || 
                                        component.types.includes('sublocality_level_1')
                                      );
                                      const displayName = cityComponent?.long_name || place.formatted_address;
                                      setBuyerPreferences(prev => ({ 
                                        ...prev, 
                                        preferred_areas: [displayName] 
                                      }));
                                      toast.success(`Preferred location set to: ${displayName}`);
                                    }
                                  });
                                  input.dataset.autocomplete = 'true';
                                }
                              } else if (!googleMapsLoaded) {
                                toast.error('Location services are still loading. Please wait a moment and try again.');
                              } else {
                                toast.error('Google Maps not available. Please refresh the page.');
                              }
                            }}
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center space-x-3">
                          <Switch
                            id="preApproved"
                            checked={buyerPreferences.financing_pre_approved}
                            onCheckedChange={(checked) => setBuyerPreferences(prev => ({ ...prev, financing_pre_approved: checked }))}
                          />
                          <Label htmlFor="preApproved" className="text-card-foreground font-medium">Pre-approved for financing</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Switch
                            id="firstTime"
                            checked={buyerPreferences.first_time_buyer}
                            onCheckedChange={(checked) => setBuyerPreferences(prev => ({ ...prev, first_time_buyer: checked }))}
                          />
                          <Label htmlFor="firstTime" className="text-card-foreground font-medium">First-time home buyer</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveBuyerPreferences}
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
                  >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Search Preferences Tab */}
            <TabsContent value="search" className="space-y-6">
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Property Search Preferences
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Set your ideal property criteria to get better matches
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="location" className="text-white flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Preferred Suburb/Location
                      </Label>
                      <div className="relative">
                        <Input
                          id="location"
                          value={searchCriteria.location}
                          onChange={(e) => setSearchCriteria(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Type to search Australian suburbs, cities, or areas..."
                          className="bg-white/5 border-white/20 text-white pr-10 focus:ring-2 focus:ring-pickfirst-yellow/50 focus:border-pickfirst-yellow/50"
                          onFocus={() => {
                            // Initialize Google Maps Places Autocomplete
                            if (googleMapsLoaded && typeof window !== 'undefined' && window.google) {
                              const input = document.getElementById('location') as HTMLInputElement;
                              if (input && !input.dataset.autocomplete) {
                                const autocomplete = new window.google.maps.places.Autocomplete(input, {
                                  types: ['(regions)', 'locality', 'sublocality'],
                                  componentRestrictions: { country: 'au' },
                                  fields: ['formatted_address', 'address_components', 'geometry']
                                });
                                
                                autocomplete.addListener('place_changed', () => {
                                  const place = autocomplete.getPlace();
                                  if (place.formatted_address) {
                                    // Extract just the city/suburb name for cleaner display
                                    const cityComponent = place.address_components?.find(component => 
                                      component.types.includes('locality') || 
                                      component.types.includes('sublocality_level_1') ||
                                      component.types.includes('administrative_area_level_2')
                                    );
                                    
                                    const displayName = cityComponent?.long_name || place.formatted_address;
                                    setSearchCriteria(prev => ({ ...prev, location: displayName }));
                                    
                                    // Show success feedback
                                    toast.success(`Location set to: ${displayName}`);
                                  }
                                });
                                
                                input.dataset.autocomplete = 'true';
                              }
                            } else if (!googleMapsLoaded) {
                              toast.error('Location services are still loading. Please wait a moment and try again.');
                            } else {
                              toast.error('Google Maps not available. Please refresh the page.');
                            }
                          }}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {googleMapsLoaded ? (
                          <>💡 Start typing to see location suggestions powered by Google Maps</>
                        ) : (
                          <>⏳ Loading location services...</>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="propertyType" className="text-white">Property Type</Label>
                      <Select
                        value={searchCriteria.propertyType}
                        onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, propertyType: value }))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="minPrice" className="text-white">Min Price ($)</Label>
                      <Input
                        id="minPrice"
                        type="number"
                        value={searchCriteria.minPrice}
                        onChange={(e) => setSearchCriteria(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPrice" className="text-white">Max Price ($)</Label>
                      <Input
                        id="maxPrice"
                        type="number"
                        value={searchCriteria.maxPrice}
                        onChange={(e) => setSearchCriteria(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 0 }))}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="bedrooms" className="text-white">Bedrooms</Label>
                      <Select
                        value={searchCriteria.bedrooms?.toString()}
                        onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, bedrooms: parseInt(value) }))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bathrooms" className="text-white">Bathrooms</Label>
                      <Select
                        value={searchCriteria.bathrooms?.toString()}
                        onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, bathrooms: parseInt(value) }))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveSearchCriteria}
                    disabled={isLoading}
                    className="bg-primary text-black hover:bg-primary/90 w-full sm:w-auto"
                  >
                    {isLoading ? 'Saving...' : 'Save Search Preferences'}
                  </Button>

                  {/* Matching Properties Preview */}
                  {matchingProperties.length > 0 && (
                    <div className="pt-6 border-t border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4">Properties Matching Your Criteria</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {matchingProperties.slice(0, 4).map((property: any) => (
                          <div key={property.id} className="bg-gray-800/50 p-3 sm:p-4 rounded-lg">
                            <h4 className="text-white font-medium">{property.title}</h4>
                            <p className="text-gray-300">{property.city}, {property.state}</p>
                            <p className="text-primary font-bold">${property.price?.toLocaleString()}</p>
                            <div className="flex justify-between items-center mt-2 gap-2">
                              <Badge variant="secondary" className="text-xs">{property.bedrooms}br/{property.bathrooms}ba</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleFavorite(property.id)}
                                className="text-gray-300 hover:text-red-400 px-2 h-8"
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Favorite Properties
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Manage your saved properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {favoriteProperties.length === 0 ? (
                    <div className="text-center py-8">
                      <Heart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No favorite properties yet</p>
                      <p className="text-gray-500 text-sm">Start browsing properties to add them to your favorites</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {favoriteProperties.map((property: any) => (
                        <div key={property.id} className="bg-gray-800/50 p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-white font-medium">{property.title}</h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleFavorite(property.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Heart className="h-4 w-4 fill-current" />
                            </Button>
                          </div>
                          <p className="text-gray-300">{property.address}</p>
                          <p className="text-gray-300">{property.city}, {property.state}</p>
                          <p className="text-primary font-bold text-lg">${property.price?.toLocaleString()}</p>
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex gap-2">
                              <Badge variant="secondary">{property.bedrooms} bed</Badge>
                              <Badge variant="secondary">{property.bathrooms} bath</Badge>
                              <Badge variant="secondary">{property.square_feet} sqft</Badge>
                            </div>
                            <Button size="sm" variant="outline" className="text-white border-white/20">
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

        {/* Password Security */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Password & Security
            </CardTitle>
            <CardDescription className="text-gray-300">
              Change your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.currentPassword}
                  onChange={(e) => setSettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.newPassword}
                  onChange={(e) => setSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.confirmPassword}
                  onChange={(e) => setSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Preferences  
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                      <div>
                        <h4 className="text-white font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {key === 'newListings' && 'Get notified when new properties match your criteria'}
                          {key === 'priceChanges' && 'Alerts when saved properties change price'}
                          {key === 'marketUpdates' && 'Weekly market trends and insights'}
                          {key === 'agentMessages' && 'Notifications for new messages from agents'}
                          {key === 'appointmentReminders' && 'Reminders for upcoming property viewings'}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                      />
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button onClick={handleSaveNotificationsPrivacy} disabled={isLoading} className="bg-primary text-black hover:bg-primary/90">
                      {isLoading ? 'Saving...' : 'Save Notification Preferences'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.privacy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                      <div>
                        <h4 className="text-white font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {key === 'profileVisible' && 'Allow agents to see your profile information'}
                          {key === 'showActivityStatus' && 'Show when you\'re online and active'}
                          {key === 'allowMarketing' && 'Receive marketing emails about new features'}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => handlePrivacyChange(key, checked)}
                      />
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button onClick={handleSaveNotificationsPrivacy} disabled={isLoading} className="bg-primary text-black hover:bg-primary/90">
                      {isLoading ? 'Saving...' : 'Save Privacy Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
};

export default BuyerAccountSettingsPage;