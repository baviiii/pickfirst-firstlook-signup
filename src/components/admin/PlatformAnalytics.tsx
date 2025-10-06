import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building, 
  DollarSign, 
  Eye, 
  Calendar,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analyticsService } from '@/services/analyticsService';

interface PlatformData {
  totalUsers: number;
  totalAgents: number;
  totalBuyers: number;
  totalListings: number;
  activeListings: number;
  totalInquiries: number;
  totalRevenue: number;
  pageViews: number;
  userGrowth: Array<{ month: string; users: number; agents: number }>;
  propertyTypes: Array<{ name: string; value: number; count: number }>;
  weeklyActivity: Array<{ day: string; logins: number; listings: number; inquiries: number }>;
  topAgents: Array<{ id: string; name: string; listings: number; inquiries: number; revenue: number }>;
}

export const PlatformAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [platformData, setPlatformData] = useState<PlatformData | null>(null);
  const { toast } = useToast();

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const fetchPlatformData = async () => {
    try {
      setIsLoading(true);

      // Fetch all required data in parallel
      const [
        { data: profiles },
        { data: listings },
        { data: inquiries },
        { data: loginHistory },
        { data: agentAnalytics }
      ] = await Promise.all([
        supabase.from('profiles').select('role, created_at'),
        supabase.from('property_listings').select('status, property_type, price, agent_id, created_at'),
        supabase.from('property_inquiries').select('created_at, property_id'),
        supabase.from('login_history').select('created_at, success').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('agent_analytics').select('*')
      ]);

      // Calculate metrics
      const totalUsers = profiles?.length || 0;
      const totalAgents = profiles?.filter(p => p.role === 'agent').length || 0;
      const totalBuyers = profiles?.filter(p => p.role === 'buyer').length || 0;
      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter(l => l.status === 'approved').length || 0;
      const totalInquiries = inquiries?.length || 0;

      // Calculate revenue from sold properties
      const totalRevenue = listings
        ?.filter(l => l.status === 'sold' && l.price)
        .reduce((sum, l) => sum + Number(l.price), 0) || 0;

      // Calculate page views (successful logins as proxy)
      const pageViews = loginHistory?.filter(l => l.success).length || 0;

      // User growth by month (last 6 months)
      const userGrowth = calculateMonthlyGrowth(profiles || []);

      // Property types distribution
      const propertyTypes = calculatePropertyTypes(listings || []);

      // Weekly activity (last 7 days)
      const weeklyActivity = calculateWeeklyActivity(loginHistory || [], listings || [], inquiries || []);

      // Top performing agents
      const topAgents = await calculateTopAgents(agentAnalytics || [], profiles || []);

      setPlatformData({
        totalUsers,
        totalAgents,
        totalBuyers,
        totalListings,
        activeListings,
        totalInquiries,
        totalRevenue,
        pageViews,
        userGrowth,
        propertyTypes,
        weeklyActivity,
        topAgents
      });

    } catch (error) {
      console.error('Error fetching platform data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMonthlyGrowth = (profiles: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentDate = new Date();
    const monthlyData: { [key: string]: { users: number; agents: number } } = {};

    months.forEach((month, index) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - index), 1);
      monthlyData[month] = { users: 0, agents: 0 };
    });

    profiles.forEach(profile => {
      const createdDate = new Date(profile.created_at);
      const monthIndex = createdDate.getMonth();
      const monthName = months[monthIndex];
      
      if (monthlyData[monthName]) {
        monthlyData[monthName].users++;
        if (profile.role === 'agent') {
          monthlyData[monthName].agents++;
        }
      }
    });

    return months.map(month => ({
      month,
      users: monthlyData[month].users,
      agents: monthlyData[month].agents
    }));
  };

  const calculatePropertyTypes = (listings: any[]) => {
    const typeCounts: { [key: string]: number } = {};
    
    listings.forEach(listing => {
      const type = listing.property_type || 'Other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = listings.length || 1;
    return Object.entries(typeCounts).map(([name, count]) => ({
      name,
      count,
      value: Math.round((count / total) * 100)
    }));
  };

  const calculateWeeklyActivity = (logins: any[], listings: any[], inquiries: any[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyData: { [key: string]: { logins: number; listings: number; inquiries: number } } = {};

    days.forEach(day => {
      weeklyData[day] = { logins: 0, listings: 0, inquiries: 0 };
    });

    const getDayName = (date: Date) => days[date.getDay() === 0 ? 6 : date.getDay() - 1];

    logins.forEach(login => {
      const day = getDayName(new Date(login.created_at));
      weeklyData[day].logins++;
    });

    listings.forEach(listing => {
      const day = getDayName(new Date(listing.created_at));
      weeklyData[day].listings++;
    });

    inquiries.forEach(inquiry => {
      const day = getDayName(new Date(inquiry.created_at));
      weeklyData[day].inquiries++;
    });

    return days.map(day => ({
      day,
      ...weeklyData[day]
    }));
  };

  const calculateTopAgents = async (analytics: any[], profiles: any[]) => {
    const agentData = analytics
      .sort((a, b) => (b.active_listings || 0) - (a.active_listings || 0))
      .slice(0, 4)
      .map(agent => {
        const profile = profiles.find(p => p.id === agent.agent_id);
        return {
          id: agent.agent_id,
          name: profile?.full_name || 'Unknown Agent',
          listings: agent.active_listings || 0,
          inquiries: agent.total_inquiries || 0,
          revenue: agent.monthly_revenue || 0
        };
      });

    return agentData;
  };

  useEffect(() => {
    fetchPlatformData();
  }, [timeRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPlatformData();
    setIsRefreshing(false);
  };

  const handleExport = () => {
    if (!platformData) return;
    
    const data = JSON.stringify(platformData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported Successfully",
      description: "Analytics data has been downloaded"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!platformData) {
    return (
      <div className="text-center text-gray-400 py-12">
        Failed to load analytics data. Please try refreshing.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-500" />
            Platform Analytics
          </h1>
          <p className="text-gray-300 mt-2">Comprehensive insights into platform performance and user behavior</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-black/50 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} className="bg-purple-500 text-white hover:bg-purple-600">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-green-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <CardTitle className="text-base text-white">Total Users</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{platformData.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">{platformData.totalAgents} agents, {platformData.totalBuyers} buyers</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-blue-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-base text-white">Active Listings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{platformData.activeListings}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">of {platformData.totalListings} total</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <CardTitle className="text-base text-white">Total Sales Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">${(platformData.totalRevenue / 1000).toFixed(1)}K</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">from sold properties</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-orange-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Eye className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle className="text-base text-white">Total Inquiries</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{platformData.totalInquiries}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-400">property inquiries</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="properties" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Building className="h-4 w-4 mr-2" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">User Activity (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={platformData.weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Area type="monotone" dataKey="logins" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="listings" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="inquiries" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Property Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData.propertyTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name} (${value}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformData.propertyTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Agents</CardTitle>
              <CardDescription className="text-gray-300">Agents with highest activity and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {platformData.topAgents.length > 0 ? (
                  platformData.topAgents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{agent.name}</div>
                          <Badge variant="secondary">Agent</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-8 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-500">{agent.listings}</div>
                          <div className="text-xs text-gray-400">Listings</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-500">{agent.inquiries}</div>
                          <div className="text-xs text-gray-400">Inquiries</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-500">${(agent.revenue / 1000).toFixed(1)}K</div>
                          <div className="text-xs text-gray-400">Revenue</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">No agent data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">User Growth Trend</CardTitle>
              <CardDescription className="text-gray-300">User registration over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={platformData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} name="Users" />
                  <Line type="monotone" dataKey="agents" stroke="#3b82f6" strokeWidth={3} name="Agents" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Property Analytics</CardTitle>
              <CardDescription className="text-gray-300">Property type breakdown and counts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={platformData.propertyTypes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Total Sales Revenue</CardTitle>
              <CardDescription className="text-gray-300">Revenue from sold properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl font-bold text-purple-500 mb-4">
                  ${(platformData.totalRevenue / 1000).toFixed(1)}K
                </div>
                <p className="text-gray-400 text-lg">Total revenue from sold properties</p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-white/5 rounded-lg border border-gray-700">
                    <div className="text-2xl font-bold text-blue-500">{platformData.totalListings}</div>
                    <div className="text-sm text-gray-400">Total Listings</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-gray-700">
                    <div className="text-2xl font-bold text-green-500">{platformData.activeListings}</div>
                    <div className="text-sm text-gray-400">Active Listings</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-gray-700">
                    <div className="text-2xl font-bold text-orange-500">{platformData.totalInquiries}</div>
                    <div className="text-sm text-gray-400">Total Inquiries</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};