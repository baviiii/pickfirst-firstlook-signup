import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, User, Bell, Lock, CreditCard, Eye, EyeOff, Heart, Activity, Home, Calendar, Check, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import BuyerProfileService, { BuyerPreferences } from '@/services/buyerProfileService';
import { BuyerPreferencesManager } from '@/components/buyer/BuyerPreferencesManager';
import { appointmentService, AppointmentWithDetails } from '@/services/appointmentService';
import ProfileService from '@/services/profileService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ipDetectionService } from '@/services/ipDetectionService';
import { useSubscription } from '@/hooks/useSubscription';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { PropertyService } from '@/services/propertyService';

const BuyerAccountSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, user, updateProfile } = useAuth();
  const { isFeatureEnabled } = useSubscription();
  
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
      propertyAlerts: true,
      priceChanges: true,
      marketUpdates: false,
      agentMessages: true,
      appointmentReminders: true,
      personalizedPropertyNotifications: false
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

  const [favoriteProperties, setFavoriteProperties] = useState<any[]>([]);
  const [matchingProperties, setMatchingProperties] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);

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
        // Load buyer preferences for display purposes only
        const preferences = await BuyerProfileService.getBuyerPreferences(user.id);
        if (preferences) {
          setBuyerPreferences(preferences);
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
            propertyAlerts: userPrefs?.property_alerts ?? prev.notifications.propertyAlerts,
            priceChanges: userPrefs?.price_changes ?? prev.notifications.priceChanges,
            marketUpdates: userPrefs?.market_updates ?? prev.notifications.marketUpdates,
            agentMessages: userPrefs?.agent_messages ?? prev.notifications.agentMessages,
            appointmentReminders: userPrefs?.appointment_reminders ?? prev.notifications.appointmentReminders,
            personalizedPropertyNotifications: userPrefs?.personalized_property_notifications ?? prev.notifications.personalizedPropertyNotifications
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
    // Check if personalized notifications require premium access
    if (key === 'personalizedPropertyNotifications' && value && !isFeatureEnabled('personalized_property_notifications')) {
      toast.error('Personalized property notifications require a premium subscription');
      return;
    }
    
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
    if (!user) {
      toast.error('You must be logged in to change your password');
      return;
    }
    
    // Input validation
    if (!settings.currentPassword || !settings.newPassword || !settings.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (settings.newPassword !== settings.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (settings.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    // Check if new password is different from current
    if (settings.currentPassword === settings.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }
    
    setIsLoading(true);
    try {
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: settings.currentPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Current password is incorrect');
        }
        throw signInError;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: settings.newPassword
      });

      if (updateError) throw updateError;

      // Log successful password change
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'PASSWORD_CHANGED',
        table_name: 'auth',
        user_agent: navigator.userAgent,
        ip_address: (await ipDetectionService.getClientIP()) || 'unknown',
        new_values: {
          event: 'password_changed',
          timestamp: new Date().toISOString()
        }
      });

      toast.success('Password updated successfully');
      
      // Clear password fields
      setSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error: any) {
      console.error('Password change error:', error);
      
      // Log failed attempt
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'PASSWORD_CHANGE_FAILED',
          table_name: 'auth',
          user_agent: navigator.userAgent,
          ip_address: (await ipDetectionService.getClientIP()) || 'unknown',
          new_values: {
            event: 'password_change_failed',
            timestamp: new Date().toISOString(),
            error: error.message || 'Unknown error'
          }
        });
      }
      
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
        property_alerts: settings.notifications.propertyAlerts,
        price_changes: settings.notifications.priceChanges,
        market_updates: settings.notifications.marketUpdates,
        agent_messages: settings.notifications.agentMessages,
        appointment_reminders: settings.notifications.appointmentReminders,
        personalized_property_notifications: settings.notifications.personalizedPropertyNotifications,
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
      const result = await appointmentService.updateAppointment(id, { status: 'confirmed' } as any);
      if (result.error) {
        console.error('Error confirming appointment:', result.error);
        toast.error(result.error.message || 'Failed to confirm appointment');
        setIsLoading(false);
        return;
      }
      await refreshAppointments();
      toast.success('Appointment confirmed');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to confirm appointment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineAppointment = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await appointmentService.updateAppointment(id, { status: 'declined' } as any);
      
      // Check if the service returned an error
      if (result.error) {
        console.error('Error declining appointment:', result.error);
        toast.error(result.error.message || 'Failed to decline appointment');
        setIsLoading(false);
        return;
      }
      
      await refreshAppointments();
      toast.success('Appointment declined');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to decline appointment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto -mx-2 px-2">
              <TabsList className="bg-card border border-border flex sm:grid sm:grid-cols-6 w-full p-1 gap-1 whitespace-nowrap">
                <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="search" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Preferences</span>
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
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    My Appointments
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    View and respond to your scheduled appointments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No appointments scheduled yet</p>
                      <p className="text-muted-foreground/80 text-sm">Once an agent schedules, it will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((appt: any) => (
                        <div key={appt.id} className="p-4 bg-card/80 rounded-lg border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="uppercase">
                                  {appt.appointment_type?.replace('_',' ') || 'Meeting'}
                                </Badge>
                                <span className="text-foreground font-medium">
                                  {appt.date} @ {appt.time}
                                </span>
                              </div>
                              {(() => {
                                const type = appt.appointment_type;
                                const address = appt.property_address;
                                const genericAddresses = ['Virtual/Office Meeting', 'Online', 'Address Not Specified'];

                                if (type === 'property_showing') {
                                  let detail = 'Property Address Not Available';
                                  if (appt.property?.title) {
                                    detail = appt.property.title;
                                  } else if (address && !genericAddresses.includes(address)) {
                                    detail = address;
                                  }
                                  return <div className="text-muted-foreground text-sm">{detail}</div>;
                                }

                                if (address && !genericAddresses.includes(address)) {
                                  return <div className="text-muted-foreground text-sm">{address}</div>;
                                }

                                return null;
                              })()}
                              {appt.agent && (
                                <div className="text-muted-foreground/80 text-xs">
                                  With: {appt.agent.full_name}
                                </div>
                              )}
                              <div className="text-muted-foreground/80 text-xs">
                                Duration: {appt.duration || 60} min
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {appt.status === 'scheduled' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-500/20 text-green-700 hover:bg-green-500/30 border border-green-500/30" 
                                    onClick={() => handleConfirmAppointment(appt.id)}
                                    disabled={isLoading}
                                  >
                                    <Check className="h-4 w-4 mr-1" /> Confirm
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-600 border-red-500/30 hover:bg-red-500/10" 
                                    onClick={() => handleDeclineAppointment(appt.id)}
                                    disabled={isLoading}
                                  >
                                    <X className="h-4 w-4 mr-1" /> Decline
                                  </Button>
                                </>
                              )}
                              {appt.status && appt.status !== 'scheduled' && (
                                <Badge className={
                                  appt.status === 'confirmed' ? 'bg-green-500/20 text-green-600 border-green-500/30' :
                                  appt.status === 'declined' ? 'bg-red-500/20 text-red-600 border-red-500/30' :
                                  appt.status === 'completed' ? 'bg-purple-500/20 text-purple-600 border-purple-500/30' :
                                  appt.status === 'cancelled' ? 'bg-gray-500/20 text-gray-600 border-gray-500/30' :
                                  appt.status === 'no_show' ? 'bg-orange-500/20 text-orange-600 border-orange-500/30' :
                                  'bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30'
                                }>
                                  {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {appt.notes && (
                            <div className="text-muted-foreground text-sm mt-2">Notes: {appt.notes}</div>
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
                      placeholder="04XX XXX XXX"
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

            {/* Property Preferences Tab */}
            <TabsContent value="search" className="space-y-6">
              <BuyerPreferencesManager 
                showTitle={true}
                onPreferencesUpdate={(prefs) => {
                  // Reload matching properties when preferences are updated
                  if (user) {
                    BuyerProfileService.getMatchingProperties(user.id, 5).then(setMatchingProperties);
                  }
                }}
              />
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="space-y-6">
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Favorite Properties
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Manage your saved properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {favoriteProperties.length === 0 ? (
                    <div className="text-center py-8">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No favorite properties yet</p>
                      <p className="text-muted-foreground/80 text-sm">Start browsing properties to add them to your favorites</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {favoriteProperties.map((property: any) => {
                        const priceDisplay = PropertyService.getDisplayPrice(property);
                        const rentalSuffix =
                          property.status === 'sold'
                            ? ''
                            : property.property_type === 'weekly'
                              ? '/week'
                              : property.property_type === 'monthly'
                                ? '/month'
                                : '';

                        return (
                          <div key={property.id} className="bg-card/80 border border-border p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-foreground font-medium">{property.title}</h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleFavorite(property.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Heart className="h-4 w-4 fill-current" />
                              </Button>
                            </div>
                            <p className="text-muted-foreground">{property.address}</p>
                            <p className="text-muted-foreground">{property.city}, {property.state}</p>
                            <p className="text-primary font-bold text-lg">
                              {priceDisplay}
                              {rentalSuffix && (
                                <span className="text-sm font-normal text-primary/70 ml-1">{rentalSuffix}</span>
                              )}
                            </p>
                            <div className="flex justify-between items-center mt-4">
                              <div className="flex gap-2">
                                <Badge variant="secondary">{property.bedrooms} bed</Badge>
                                <Badge variant="secondary">{property.bathrooms} bath</Badge>
                                <Badge variant="secondary">{property.square_feet} sqft</Badge>
                              </div>
                              <Button size="sm" variant="outline" className="text-foreground border-border hover:bg-muted">
                                View Details
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Preferences  
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.notifications).map(([key, value]) => {
                    const isPersonalizedNotifications = key === 'personalizedPropertyNotifications';
                    const hasFeatureAccess = isFeatureEnabled('personalized_property_notifications');
                    
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-foreground font-medium">
                              {key === 'personalizedPropertyNotifications' ? 'Personalized Property Notifications' :
                               key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </h4>
                            {isPersonalizedNotifications && !hasFeatureAccess && (
                              <Badge variant="outline" className="text-xs text-pickfirst-yellow border-pickfirst-yellow">
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {key === 'propertyAlerts' && 'Get email alerts for new on-market properties matching your criteria. Premium members also receive exclusive off-market alerts! 🔐'}
                            {key === 'priceChanges' && 'Alerts when saved properties change price'}
                            {key === 'marketUpdates' && 'Weekly market trends and insights'}
                            {key === 'agentMessages' && 'Notifications for new messages from agents'}
                            {key === 'appointmentReminders' && 'Reminders for upcoming property viewings'}
                            {key === 'personalizedPropertyNotifications' && 'Enhanced property recommendations based on your search history and location preferences'}
                          </p>
                        </div>
                        {isPersonalizedNotifications && !hasFeatureAccess ? (
                          <FeatureGate 
                            feature="personalized_property_notifications"
                            showUpgrade={false}
                            fallback={
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={false}
                                  disabled={true}
                                  className="opacity-50"
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate('/pricing')}
                                  className="text-pickfirst-yellow border-pickfirst-yellow hover:bg-pickfirst-yellow hover:text-black text-xs px-2 py-1 h-6"
                                >
                                  Upgrade
                                </Button>
                              </div>
                            }
                          >
                            <Switch
                              checked={value}
                              onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                            />
                          </FeatureGate>
                        ) : (
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                          />
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Feature Information Card */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-pickfirst-yellow/10 to-pickfirst-yellow/5 border border-pickfirst-yellow/20 rounded-lg">
                    <h4 className="text-foreground font-medium mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-pickfirst-yellow" />
                      Smart Notification Features
                    </h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">All Users</Badge>
                        <span>On-market property alerts and agent messages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-pickfirst-yellow border-pickfirst-yellow">Premium</Badge>
                        <span>Exclusive off-market property alerts and enhanced insights</span>
                      </div>
                    </div>
                  </div>
                  
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
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Control your privacy and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.privacy).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-card/80 border border-border">
                      <div>
                        <h4 className="text-foreground font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <p className="text-sm text-muted-foreground">
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
                      onClick={async () => {
                        if (!user) {
                          toast.error('You must be logged in to delete your account');
                          return;
                        }

                        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          return;
                        }

                        if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
                          return;
                        }

                        setIsLoading(true);
                        try {
                          // Delete profile (this will cascade delete related data due to foreign keys)
                          const result = await ProfileService.deleteProfile(user.id);
                          
                          if (result.success) {
                            toast.success('Account deleted successfully');
                            // Sign out and redirect
                            await supabase.auth.signOut();
                            navigate('/');
                          } else {
                            toast.error(result.error || 'Failed to delete account');
                          }
                        } catch (error: any) {
                          console.error('Account deletion error:', error);
                          toast.error(error.message || 'Failed to delete account. Please try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isLoading ? 'Deleting...' : 'Delete My Account'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default BuyerAccountSettingsPage;