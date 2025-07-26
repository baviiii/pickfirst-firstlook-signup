import { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

export const PlatformAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sample data - in real app, this would come from your analytics API
  const userGrowthData = [
    { name: 'Jan', users: 400, agents: 50 },
    { name: 'Feb', users: 450, agents: 65 },
    { name: 'Mar', users: 520, agents: 78 },
    { name: 'Apr', users: 600, agents: 89 },
    { name: 'May', users: 720, agents: 103 },
    { name: 'Jun', users: 856, agents: 124 },
    { name: 'Jul', users: 980, agents: 142 },
  ];

  const propertyData = [
    { name: 'House', value: 45, count: 402 },
    { name: 'Apartment', value: 30, count: 267 },
    { name: 'Condo', value: 15, count: 134 },
    { name: 'Townhouse', value: 10, count: 89 },
  ];

  const revenueData = [
    { name: 'Jan', revenue: 12500, subscriptions: 85 },
    { name: 'Feb', revenue: 14200, subscriptions: 92 },
    { name: 'Mar', revenue: 16800, subscriptions: 108 },
    { name: 'Apr', revenue: 18900, subscriptions: 125 },
    { name: 'May', revenue: 21300, subscriptions: 143 },
    { name: 'Jun', revenue: 24800, subscriptions: 167 },
    { name: 'Jul', revenue: 28200, subscriptions: 189 },
  ];

  const activityData = [
    { name: 'Mon', logins: 145, listings: 23, inquiries: 67 },
    { name: 'Tue', logins: 167, listings: 31, inquiries: 82 },
    { name: 'Wed', logins: 189, listings: 28, inquiries: 91 },
    { name: 'Thu', logins: 201, listings: 35, inquiries: 76 },
    { name: 'Fri', logins: 234, listings: 42, inquiries: 98 },
    { name: 'Sat', logins: 198, listings: 38, inquiries: 54 },
    { name: 'Sun', logins: 156, listings: 19, inquiries: 43 },
  ];

  const topPerformers = [
    { name: 'Sarah Johnson', type: 'Agent', listings: 24, inquiries: 156, revenue: '$4,200' },
    { name: 'Mike Wilson', type: 'Agent', listings: 19, inquiries: 134, revenue: '$3,800' },
    { name: 'Emily Chen', type: 'Agent', listings: 16, inquiries: 98, revenue: '$2,900' },
    { name: 'David Brown', type: 'Agent', listings: 14, inquiries: 87, revenue: '$2,400' },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    // Simulate export functionality
    const data = JSON.stringify({ userGrowthData, propertyData, revenueData }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

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
            <div className="text-2xl font-bold text-green-500">1,247</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12%</span>
              <span className="text-gray-400">vs last period</span>
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
            <div className="text-2xl font-bold text-blue-500">892</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-blue-500">+8%</span>
              <span className="text-gray-400">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <CardTitle className="text-base text-white">Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">$28.2K</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-purple-500" />
              <span className="text-purple-500">+15%</span>
              <span className="text-gray-400">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-orange-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Eye className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle className="text-base text-white">Page Views</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">45.2K</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-orange-500" />
              <span className="text-orange-500">+23%</span>
              <span className="text-gray-400">vs last period</span>
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
                  <AreaChart data={activityData}>
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
                      data={propertyData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name} (${value}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {propertyData.map((entry, index) => (
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
                {topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {performer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{performer.name}</div>
                        <Badge variant="secondary">{performer.type}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-500">{performer.listings}</div>
                        <div className="text-xs text-gray-400">Listings</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-500">{performer.inquiries}</div>
                        <div className="text-xs text-gray-400">Inquiries</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-500">{performer.revenue}</div>
                        <div className="text-xs text-gray-400">Revenue</div>
                      </div>
                    </div>
                  </div>
                ))}
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
                <LineChart data={userGrowthData}>
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
                  <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} />
                  <Line type="monotone" dataKey="agents" stroke="#3b82f6" strokeWidth={3} />
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
                <BarChart data={propertyData}>
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
              <CardTitle className="text-white">Revenue & Subscriptions</CardTitle>
              <CardDescription className="text-gray-300">Revenue trends and subscription growth</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
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
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};