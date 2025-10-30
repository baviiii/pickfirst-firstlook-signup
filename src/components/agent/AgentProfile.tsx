import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Camera, 
  Save, 
  Bell, 
  Shield, 
  Settings,
  Star,
  Award,
  TrendingUp,
  Calendar,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AgentSpecialtyManager } from './AgentSpecialtyManager';
import { AnalyticsService } from '@/services/analyticsService';
import type { AgentAnalytics } from '@/services/analyticsService';

export const AgentProfile = () => {
  const { profile, updateProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with actual profile data from database
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    company: '',
    location: '',
    website: '',
    avatar_url: '',
  });

  // Load profile data when component mounts or profile changes
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        company: profile.company || '',
        location: profile.location || '',
        website: profile.website || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const [notifications, setNotifications] = useState({
    email_inquiries: true,
    sms_alerts: true,
    marketing_emails: false,
    system_updates: true,
  });

  const [stats, setStats] = useState<AgentAnalytics>({
    active_listings: 0,
    total_sales: 0,
    monthly_sales: 0,
    weekly_sales: 0,
    monthly_revenue: 0,
    avg_sale_price: 0,
    total_clients: 0,
    total_appointments: 0,
    monthly_appointments: 0,
    total_inquiries: 0,
    monthly_inquiries: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  // Load real analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user?.id) return;
      
      setLoadingStats(true);
      const { data, error } = await AnalyticsService.getAgentAnalytics(user.id);
      
      if (data) {
        setStats(data);
      } else if (error) {
        console.error('Error loading analytics:', error);
      }
      setLoadingStats(false);
    };

    loadAnalytics();
  }, [user?.id]);

  const handleSaveProfile = async () => {
    try {
      const { error } = await updateProfile(profileData);
      if (error) {
        toast.error('Failed to update profile');
      } else {
        toast.success('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!data.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Update profile with new avatar URL
      const updatedData = { ...profileData, avatar_url: data.publicUrl };
      setProfileData(updatedData);
      
      const { error: updateError } = await updateProfile({ avatar_url: data.publicUrl });
      if (updateError) {
        throw updateError;
      }

      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };


  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingUp className="h-5 w-5 text-primary" />;
      case 'service': return <Star className="h-5 w-5 text-yellow-500" />;
      case 'sales': return <Award className="h-5 w-5 text-green-500" />;
      default: return <Award className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        {isEditing ? (
        <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
          </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-background border border-border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="specialties" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Briefcase className="h-4 w-4 mr-2" />
            Specialties
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
              <CardHeader className="text-center">
                <div className="relative mx-auto w-32 h-32">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={profileData.avatar_url || profile?.avatar_url || ''} />
                    <AvatarFallback className="text-2xl">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'AG'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <>
                      <Button 
                        size="sm" 
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={triggerFileInput}
                        disabled={uploading}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                <CardTitle className="mt-4">{profile?.full_name || 'Agent Name'}</CardTitle>
                <CardDescription>Real Estate Agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company:</span>
                    <span>{profileData.company || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{profileData.location || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member since:</span>
                    <span>{new Date(profile?.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>Update your professional details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profileData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Tell clients about your experience and expertise..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center items-center p-12">
              <div className="text-muted-foreground">Loading analytics...</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-primary">{stats.total_sales || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-secondary/20">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-secondary">
                      ${((stats.monthly_revenue || 0) / 1000).toFixed(1)}K
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-accent/20">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-accent">{stats.total_clients || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Clients</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Your key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Listings</span>
                      <span className="font-bold">{stats.active_listings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Monthly Sales</span>
                      <span className="font-bold">{stats.monthly_sales || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Inquiries</span>
                      <span className="font-bold">{stats.total_inquiries || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Appointments</span>
                      <span className="font-bold">{stats.total_appointments || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Sale Price</span>
                      <span className="font-bold">
                        ${stats.avg_sale_price ? (stats.avg_sale_price / 1000).toFixed(0) : 0}K
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your performance this month</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Monthly Sales</h4>
                        <p className="text-xs text-muted-foreground">
                          {stats.monthly_sales || 0} properties sold this month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-secondary" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Appointments</h4>
                        <p className="text-xs text-muted-foreground">
                          {stats.monthly_appointments || 0} appointments this month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Briefcase className="h-5 w-5 text-accent" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">New Inquiries</h4>
                        <p className="text-xs text-muted-foreground">
                          {stats.monthly_inquiries || 0} inquiries this month
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Specialties Tab */}
        <TabsContent value="specialties" className="space-y-6">
          <AgentSpecialtyManager />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_inquiries">Email Inquiries</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for new client inquiries</p>
                </div>
                <Switch
                  id="email_inquiries"
                  checked={notifications.email_inquiries}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_inquiries: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms_alerts">SMS Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get text messages for urgent notifications</p>
                </div>
                <Switch
                  id="sms_alerts"
                  checked={notifications.sms_alerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, sms_alerts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing_emails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about new features and tips</p>
                </div>
                <Switch
                  id="marketing_emails"
                  checked={notifications.marketing_emails}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing_emails: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="system_updates">System Updates</Label>
                  <p className="text-sm text-muted-foreground">Important system and security notifications</p>
                </div>
                <Switch
                  id="system_updates"
                  checked={notifications.system_updates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, system_updates: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};