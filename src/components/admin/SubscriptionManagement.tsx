import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, DollarSign, Calendar, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FeatureManagement } from './FeatureManagement';

interface UserSubscription {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_expires_at: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  created_at: string;
}

export const SubscriptionManagement = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    freeUsers: 0
  });

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      fetchUsers();
      fetchStats();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          subscription_tier,
          subscription_status,
          subscription_expires_at,
          stripe_customer_id,
          stripe_subscription_id,
          created_at
        `)
        .eq('role', 'buyer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch user subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('role', 'buyer');

      if (error) throw error;

      const totalUsers = data?.length || 0;
      const activeSubscriptions = data?.filter(u => u.subscription_status === 'active').length || 0;
      const freeUsers = data?.filter(u => u.subscription_tier === 'free').length || 0;
      
      // For demo purposes, calculate estimated revenue (in production, get from Stripe)
      const totalRevenue = activeSubscriptions * 29.99;

      setStats({
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        freeUsers
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateUserSubscription = async (userId: string, tier: 'free' | 'premium', status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: tier,
          subscription_status: status,
          subscription_expires_at: status === 'inactive' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User subscription updated to ${tier} (${status})`);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update user subscription');
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600">You don't have permission to access subscription management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Subscription Management</h2>
        <p className="text-muted-foreground">
          Monitor and manage user subscriptions and feature access across your platform
        </p>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
          <TabsTrigger value="features">Feature Gates</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              All registered buyers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Premium subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.freeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Free tier users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              From premium plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Subscriptions
          </CardTitle>
          <CardDescription>
            View and manage individual user subscription status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No users found</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.subscription_tier === 'premium' ? 'default' : 'secondary'}
                      >
                        {user.subscription_tier || 'free'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.subscription_status === 'active' ? 'default' : 'secondary'}
                      >
                        {user.subscription_status || 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.subscription_expires_at ? 
                        new Date(user.subscription_expires_at).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserSubscription(user.id, 'premium', 'active')}
                        >
                          Grant Premium
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserSubscription(user.id, 'free', 'inactive')}
                        >
                          Set Free
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="features">
          <FeatureManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};