import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  User, 
  Mail, 
  Phone, 
  Bell, 
  Shield, 
  CreditCard, 
  Key,
  Camera,
  Save,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import ProfileService, { UserPreferences } from '@/services/profileService';

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  avatar_url: string;
  location: string;
  company: string;
  website: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  propertyAlerts: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts_only';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
}

export const ProfileSettings = () => {
  const { user, profile } = useAuth();
  
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: profile?.full_name || '',
    email: user?.email || '',
    phone: (profile as any)?.phone || '',
    bio: (profile as any)?.bio || '',
    avatar_url: profile?.avatar_url || '',
    location: (profile as any)?.location || '',
    company: (profile as any)?.company || '',
    website: (profile as any)?.website || ''
  });

  // Update profile data when profile changes
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        email: user?.email || '',
        phone: (profile as any)?.phone || '',
        bio: (profile as any)?.bio || '',
        avatar_url: profile.avatar_url || '',
        location: (profile as any)?.location || '',
        company: (profile as any)?.company || '',
        website: (profile as any)?.website || ''
      });
    }
  }, [profile, user]);

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    propertyAlerts: true
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load user preferences when component mounts
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (user) {
        const preferences = await ProfileService.getUserPreferences(user.id);
        if (preferences) {
          setNotifications({
            emailNotifications: preferences.email_notifications,
            pushNotifications: preferences.push_notifications,
            marketingEmails: preferences.marketing_emails,
            propertyAlerts: preferences.property_alerts
          });
          
          setPrivacy({
            profileVisibility: preferences.profile_visibility,
            showEmail: preferences.show_email,
            showPhone: preferences.show_phone,
            showLocation: preferences.show_location
          });
        }
      }
    };

    loadUserPreferences();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    
    setIsLoading(true);
    try {
      const { success } = await ProfileService.updateProfile(user.id, profileData);
      
      if (success) {
        // Refresh the profile data in auth context
        window.location.reload(); // Simple refresh to update auth context
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { success, error } = await ProfileService.updateUserPreferences(user.id, {
        email_notifications: notifications.emailNotifications,
        push_notifications: notifications.pushNotifications,
        marketing_emails: notifications.marketingEmails,
        property_alerts: notifications.propertyAlerts
      });

      if (!success) {
        toast.error(error || 'Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { success, error } = await ProfileService.updateUserPreferences(user.id, {
        profile_visibility: privacy.profileVisibility,
        show_email: privacy.showEmail,
        show_phone: privacy.showPhone,
        show_location: privacy.showLocation
      });

      if (!success) {
        toast.error(error || 'Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = () => {
    // Simulate file upload
    toast.success('Avatar uploaded successfully');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="profile" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Key className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Section */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Profile Picture</CardTitle>
                <CardDescription className="text-gray-300">Update your profile photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profileData.avatar_url} />
                    <AvatarFallback className="bg-pickfirst-yellow text-black text-xl font-bold">
                      {profileData.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    onClick={handleAvatarUpload}
                    variant="outline" 
                    className="text-white border-white/20 hover:bg-white/5"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Personal Information</CardTitle>
                <CardDescription className="text-gray-300">Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name" className="text-white">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-white/5 border-white/20 text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-white">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-white">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="City, State"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company" className="text-white">Company</Label>
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) => setProfileData(prev => ({ ...prev, company: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Real Estate Agency"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website" className="text-white">Website</Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio" className="text-white">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isLoading}
                  className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
              <CardDescription className="text-gray-300">Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Email Notifications</Label>
                    <p className="text-sm text-gray-400">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Push Notifications</Label>
                    <p className="text-sm text-gray-400">Receive browser push notifications</p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Marketing Emails</Label>
                    <p className="text-sm text-gray-400">Receive promotional emails and updates</p>
                  </div>
                  <Switch
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketingEmails: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Property Alerts</Label>
                    <p className="text-sm text-gray-400">Get notified about new properties matching your criteria</p>
                  </div>
                  <Switch
                    checked={notifications.propertyAlerts}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, propertyAlerts: checked }))}
                  />
                </div>
              </div>
              <Button 
                onClick={handleSaveNotifications} 
                disabled={isLoading}
                className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Privacy Settings</CardTitle>
              <CardDescription className="text-gray-300">Control who can see your information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-white">Profile Visibility</Label>
                <Select 
                  value={privacy.profileVisibility} 
                  onValueChange={(value: any) => setPrivacy(prev => ({ ...prev, profileVisibility: value }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can view</SelectItem>
                    <SelectItem value="contacts_only">Contacts Only</SelectItem>
                    <SelectItem value="private">Private - Only you</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Show Email Address</Label>
                    <p className="text-sm text-gray-400">Allow others to see your email</p>
                  </div>
                  <Switch
                    checked={privacy.showEmail}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showEmail: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Show Phone Number</Label>
                    <p className="text-sm text-gray-400">Display your phone number on profile</p>
                  </div>
                  <Switch
                    checked={privacy.showPhone}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showPhone: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Show Location</Label>
                    <p className="text-sm text-gray-400">Display your location on profile</p>
                  </div>
                  <Switch
                    checked={privacy.showLocation}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, showLocation: checked }))}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSavePrivacy} 
                disabled={isLoading}
                className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Privacy Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Change Password</CardTitle>
                <CardDescription className="text-gray-300">Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password" className="text-white">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password" className="text-white">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="text-white">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
                <Button className="w-full bg-red-500 text-white hover:bg-red-600">
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Account Security</CardTitle>
                <CardDescription className="text-gray-300">Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <div className="text-white font-medium">Two-Factor Authentication</div>
                      <div className="text-sm text-gray-400">Not enabled</div>
                    </div>
                    <Button variant="outline" size="sm" className="text-white border-white/20">
                      Enable
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <div className="text-white font-medium">Login History</div>
                      <div className="text-sm text-gray-400">View recent login activity</div>
                    </div>
                    <Button variant="outline" size="sm" className="text-white border-white/20">
                      View
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <div className="text-white font-medium">Active Sessions</div>
                      <div className="text-sm text-gray-400">Manage active sessions</div>
                    </div>
                    <Button variant="outline" size="sm" className="text-white border-white/20">
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};