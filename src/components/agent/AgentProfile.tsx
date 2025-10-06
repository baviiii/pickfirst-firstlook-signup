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
  CreditCard, 
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

  const [achievements] = useState([
    { title: 'Top Performer', description: 'Top 10% of agents this quarter', date: '2024-01-15', type: 'performance' },
    { title: 'Client Satisfaction', description: '5-star average rating', date: '2024-01-10', type: 'service' },
    { title: 'Million Dollar Club', description: 'Exceeded $1M in sales', date: '2023-12-20', type: 'sales' },
  ]);

  const [stats] = useState({
    total_sales: 42,
    total_revenue: 2450000,
    client_satisfaction: 4.9,
    listings_sold: 38,
    average_sale_time: 24,
    referral_rate: 85
  });

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
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user?.id}-${Math.random()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const updatedData = { ...profileData, avatar_url: data.publicUrl };
      setProfileData(updatedData);
      
      const { error: updateError } = await updateProfile({ avatar_url: data.publicUrl });
      if (updateError) {
        throw updateError;
      }

      toast.success('Avatar updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getSubscriptionBadge = () => {
    const tier = profile?.subscription_tier || 'free';
    const colors = {
      free: 'bg-gray-500/10 text-gray-500',
      basic: 'bg-blue-500/10 text-blue-500',
      premium: 'bg-purple-500/10 text-purple-500',
      pro: 'bg-amber-500/10 text-amber-500'
    };
    
    return (
      <Badge className={colors[tier as keyof typeof colors]}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
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
          <TabsTrigger value="subscription" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
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
                {getSubscriptionBadge()}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary">{stats.total_sales}</div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-secondary/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-secondary">${(stats.total_revenue / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-accent/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-accent">{stats.client_satisfaction}</div>
                <div className="text-sm text-muted-foreground">Client Rating</div>
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
                  <span className="text-sm">Listings Sold</span>
                  <span className="font-bold">{stats.listings_sold}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Sale Time</span>
                  <span className="font-bold">{stats.average_sale_time} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Referral Rate</span>
                  <span className="font-bold">{stats.referral_rate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Your recent accomplishments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      {getAchievementIcon(achievement.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(achievement.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Manage your PickFirst subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <h3 className="font-semibold">
                    {(profile?.subscription_tier || 'free').charAt(0).toUpperCase() + (profile?.subscription_tier || 'free').slice(1)} Plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profile?.subscription_tier === 'free' ? 'Basic features included' : 'All premium features included'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {profile?.subscription_tier === 'free' ? '$0' : '$49'}/month
                  </div>
                  <Button size="sm" className="mt-2">
                    {profile?.subscription_tier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};