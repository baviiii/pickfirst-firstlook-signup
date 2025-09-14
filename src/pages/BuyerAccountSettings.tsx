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
import { supabase } from '@/integrations/supabase/client';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { googleMapsService } from '@/services/googleMapsService';

const BuyerAccountSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, user, updateProfile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  
  const [settings, setSettings] = useState({
    fullName: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
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
  const [currentPreferredArea, setCurrentPreferredArea] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const handleLocationSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      // Use our fast location autocomplete service
      const results = await googleMapsService.searchPlaces(query, 'AU');
      const suggestions = results.slice(0, 5).map(result => result.description);
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error searching locations:', error);
      // Fallback to Australian locations
      const australianLocations = [
        'Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA',
        'Gold Coast, QLD', 'Newcastle, NSW', 'Canberra, ACT', 'Sunshine Coast, QLD',
        'Wollongong, NSW', 'Geelong, VIC', 'Hobart, TAS', 'Townsville, QLD'
      ];
      const filtered = australianLocations
        .filter(location => location.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(filtered.length > 0);
    }
  };

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'search', 'favorites', 'appointments', 'notifications', 'privacy'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);


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

  const handleAddPreferredArea = (location: string) => {
    if (!location.trim()) return;
    
    const currentAreas = buyerPreferences.preferred_areas || [];
    if (!currentAreas.includes(location.trim())) {
      setBuyerPreferences(prev => ({
        ...prev,
        preferred_areas: [...currentAreas, location.trim()]
      }));
    }
    setCurrentPreferredArea('');
  };

  const handleRemovePreferredArea = (areaToRemove: string) => {
    setBuyerPreferences(prev => ({
      ...prev,
      preferred_areas: (prev.preferred_areas || []).filter(area => area !== areaToRemove)
    }));
  };

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
        toast.success('Search preferences saved successfully');
      }
    } catch (error) {
      console.error('Error saving search criteria:', error);
      toast.error('Failed to save search preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBuyerPreferences = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update profile information
      const profileUpdates: any = {};
      if (settings.fullName !== profile?.full_name) {
        profileUpdates.full_name = settings.fullName;
      }
      if (settings.phone !== profile?.phone) {
        profileUpdates.phone = settings.phone;
      }

      // Update profile if there are changes
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) {
          throw profileError;
        }

        // Update local auth context
        if (updateProfile) {
          updateProfile(profileUpdates);
        }
      }

      // Save buyer preferences
      const result = await BuyerProfileService.updateBuyerPreferences(user.id, buyerPreferences);
      if (!result.success) {
        toast.error(result.error || 'Failed to update preferences');
        return;
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save profile changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    if (!settings.currentPassword || !settings.newPassword || !settings.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (settings.newPassword !== settings.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (settings.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Supabase Auth to update password
      const { error } = await supabase.auth.updateUser({
        password: settings.newPassword
      });

      if (error) {
        throw error;
      }

      toast.success('Password updated successfully');
      
      // Clear password fields
      setSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password. Please try again.');
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
      } else {
        toast.success('Settings saved successfully');
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

              {/* Password & Security */}
              <Card className="bg-card border border-border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Password & Security
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Change your password and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword" className="text-card-foreground font-medium">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={settings.currentPassword}
                        onChange={(e) => setSettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter your current password"
                        className="bg-input border border-border text-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newPassword" className="text-card-foreground font-medium">New Password</Label>
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={settings.newPassword}
                        onChange={(e) => setSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        className="bg-input border border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-card-foreground font-medium">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={settings.confirmPassword}
                        onChange={(e) => setSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="bg-input border border-border text-foreground"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={isLoading} 
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
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
                      <Label htmlFor="location" className="text-card-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Preferred Suburb/Location
                      </Label>
                      <div className="relative">
                        <Input
                          id="location"
                          value={searchCriteria.location}
                          onChange={(e) => {
                            setSearchCriteria(prev => ({ ...prev, location: e.target.value }));
                            handleLocationSearch(e.target.value);
                          }}
                          onFocus={() => {
                            if (searchCriteria.location) {
                              handleLocationSearch(searchCriteria.location);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding suggestions to allow for click
                            setTimeout(() => setShowLocationSuggestions(false), 150);
                          }}
                          placeholder="Type to search Australian suburbs, cities, or areas..."
                          className="bg-input border border-border text-foreground pr-10 focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        {/* Location Suggestions Dropdown */}
                        {showLocationSuggestions && locationSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {locationSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent blur event
                                  setSearchCriteria(prev => ({ ...prev, location: suggestion }));
                                  setShowLocationSuggestions(false);
                                  toast.success(`Location set to: ${suggestion}`);
                                }}
                              >
                                <MapPin className="h-3 w-3 inline mr-2" />
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {googleMapsLoaded ? (
                          <>Start typing to see location suggestions powered by Google Maps</>
                        ) : (
                          <>Using local location database (Google Maps unavailable)</>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="propertyType" className="text-card-foreground">Property Type</Label>
                      <Select
                        value={searchCriteria.propertyType}
                        onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, propertyType: value }))}
                      >
                        <SelectTrigger className="bg-input border border-border text-foreground">
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
                      <Label htmlFor="minPrice" className="text-card-foreground">Min Price ($)</Label>
                      <Input
                        id="minPrice"
                        type="number"
                        value={searchCriteria.minPrice}
                        onChange={(e) => setSearchCriteria(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                        className="bg-input border border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPrice" className="text-card-foreground">Max Price ($)</Label>
                      <Input
                        id="maxPrice"
                        type="number"
                        value={searchCriteria.maxPrice}
                        onChange={(e) => setSearchCriteria(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 0 }))}
                        className="bg-input border border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="bedrooms" className="text-card-foreground">Bedrooms</Label>
                      <Select
                        value={searchCriteria.bedrooms?.toString()}
                        onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, bedrooms: parseInt(value) }))}
                      >
                        <SelectTrigger className="bg-input border border-border text-foreground">
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
                      <Label htmlFor="bathrooms" className="text-card-foreground">Bathrooms</Label>
                      <Select
                        value={searchCriteria.bathrooms?.toString()}
                        onValueChange={(value) => setSearchCriteria(prev => ({ ...prev, bathrooms: parseInt(value) }))}
                      >
                        <SelectTrigger className="bg-input border border-border text-foreground">
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
                  >
                    {isLoading ? 'Saving...' : 'Save Search Preferences'}
                  </Button>

                  {/* Matching Properties Preview */}
                  {matchingProperties.length > 0 && (
                    <div className="pt-6 border-t border-border">
                      <h3 className="text-lg font-semibold text-card-foreground mb-4">Properties Matching Your Criteria</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {matchingProperties.slice(0, 4).map((property: any) => (
                          <div key={property.id} className="bg-muted/50 p-3 sm:p-4 rounded-lg border border-border">
                            <h4 className="text-card-foreground font-medium">{property.title}</h4>
                            <p className="text-muted-foreground">{property.city}, {property.state}</p>
                            <p className="text-primary font-bold">${property.price?.toLocaleString()}</p>
                            <div className="flex justify-between items-center mt-2 gap-2">
                              <Badge variant="secondary" className="text-xs">{property.bedrooms}br/{property.bathrooms}ba</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleFavorite(property.id)}
                                className="text-muted-foreground hover:text-red-400 px-2 h-8"
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
                    <Button onClick={handleSaveNotificationsPrivacy} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                    <Button onClick={handleSaveNotificationsPrivacy} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {isLoading ? 'Saving...' : 'Save Privacy Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Deletion - Required by Law */}
              <Card className="bg-card border border-destructive/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <X className="h-5 w-5" />
                    Delete Account
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h4 className="text-destructive font-medium mb-2">Warning</h4>
                    <p className="text-sm text-muted-foreground">
                      Deleting your account will permanently remove:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
                      <li>Your profile and personal information</li>
                      <li>All saved properties and preferences</li>
                      <li>Message history with agents</li>
                      <li>Appointment history</li>
                      <li>All account data and settings</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                            toast.error('Account deletion not yet implemented. Please contact support.');
                          }
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete My Account
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