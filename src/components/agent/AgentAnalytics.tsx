import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  Pencil
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { AnalyticsService } from '@/services/analyticsService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const AgentAnalytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Real analytics data state
  const [analytics, setAnalytics] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [clientSourceData, setClientSourceData] = useState<any[]>([]);
  const [propertyTypeData, setPropertyTypeData] = useState<any[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
  const [isRevenueGoalDialogOpen, setIsRevenueGoalDialogOpen] = useState(false);
  const [revenueGoalInput, setRevenueGoalInput] = useState('');
  const [savingRevenueGoal, setSavingRevenueGoal] = useState(false);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const fetchAnalyticsData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch all analytics data in parallel
      const [
        analyticsResponse,
        performanceResponse,
        clientSourceResponse,
        propertyTypeResponse,
        weeklyActivityResponse
      ] = await Promise.all([
        AnalyticsService.getAgentAnalytics(user.id),
        AnalyticsService.getMonthlyPerformance(user.id, 6),
        AnalyticsService.getClientSources(user.id),
        AnalyticsService.getPropertyTypeAnalytics(user.id),
        AnalyticsService.getWeeklyActivity(user.id)
      ]);

      if (analyticsResponse.error) {
        console.error('Analytics error:', analyticsResponse.error);
      } else {
        setAnalytics(analyticsResponse.data);
      }

      if (performanceResponse.error) {
        console.error('Performance error:', performanceResponse.error);
      } else {
        setPerformanceData(performanceResponse.data);
      }

      if (clientSourceResponse.error) {
        console.error('Client source error:', clientSourceResponse.error);
      } else {
        setClientSourceData(clientSourceResponse.data);
      }

      if (propertyTypeResponse.error) {
        console.error('Property type error:', propertyTypeResponse.error);
      } else {
        setPropertyTypeData(propertyTypeResponse.data);
      }

      if (weeklyActivityResponse.error) {
        console.error('Weekly activity error:', weeklyActivityResponse.error);
      } else {
        setWeeklyActivity(weeklyActivityResponse.data);
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user?.id, timeRange]);

  useEffect(() => {
    if (analytics?.monthly_revenue_goal !== undefined && analytics?.monthly_revenue_goal !== null) {
      setRevenueGoalInput(String(Math.round(analytics.monthly_revenue_goal)));
    }
  }, [analytics?.monthly_revenue_goal]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalyticsData();
    setIsRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const revenueGoal = analytics?.monthly_revenue_goal ?? 60000;
  const safeRevenueGoal = revenueGoal > 0 ? revenueGoal : 1;
  const handleOpenRevenueGoalDialog = () => {
    setRevenueGoalInput(String(Math.round(revenueGoal)));
    setIsRevenueGoalDialogOpen(true);
  };

  const handleSaveRevenueGoal = async () => {
    const parsedGoal = Number(String(revenueGoalInput).replace(/,/g, '').trim());
    if (Number.isNaN(parsedGoal) || parsedGoal <= 0) {
      toast.error('Please enter a valid revenue goal greater than zero.');
      return;
    }

    setSavingRevenueGoal(true);
    const { error, data } = await AnalyticsService.updateMonthlyRevenueGoal(parsedGoal);
    setSavingRevenueGoal(false);

    if (error) {
      console.error('Failed to update revenue goal:', error);
      toast.error('Failed to update revenue goal.');
      return;
    }

    const updatedGoal = data?.monthly_revenue_goal ?? parsedGoal;
    setAnalytics((prev: any) => (prev ? { ...prev, monthly_revenue_goal: updatedGoal } : prev));
    setRevenueGoalInput(String(Math.round(updatedGoal)));
    setIsRevenueGoalDialogOpen(false);
    toast.success('Revenue goal updated.');
  };

  const handleExport = () => {
    const data = JSON.stringify({ 
      analytics, 
      performanceData, 
      clientSourceData, 
      propertyTypeData,
      weeklyActivity,
      exportedAt: new Date().toISOString(),
      timeRange 
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Analytics data exported');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-end gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-background/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
          <Button onClick={handleExport} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Active Listings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics?.active_listings || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-primary">Live</span>
              <span className="text-muted-foreground">properties</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-secondary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <CardTitle className="text-base">Total Clients</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{analytics?.total_clients || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-secondary">{analytics?.monthly_appointments || 0}</span>
              <span className="text-muted-foreground">appointments this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-accent/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-base">Monthly Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${(analytics?.monthly_revenue || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-accent">{analytics?.monthly_sales || 0}</span>
              <span className="text-muted-foreground">sales this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-orange-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Eye className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle className="text-base">Total Sales</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{analytics?.total_sales || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-orange-500">
                ${(analytics?.avg_sale_price || 0).toLocaleString()}
              </span>
              <span className="text-muted-foreground">avg price</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Monthly performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="sales" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="showings" stackId="2" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
          <CardHeader>
            <CardTitle>Client Sources</CardTitle>
            <CardDescription>Where your clients come from</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, value}) => `${name} (${value}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {clientSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
          <CardHeader>
            <CardTitle>Property Sales by Type</CardTitle>
            <CardDescription>Revenue breakdown by property category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="sold" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Your daily activity pattern</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={3} />
                <Line type="monotone" dataKey="showings" stroke="hsl(var(--secondary))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-gradient-to-br from-background/90 to-muted/90 border border-primary/20">
        <CardHeader>
          <CardTitle>Performance Goals</CardTitle>
          <CardDescription>Track your progress against monthly targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sales Goal</span>
                <span>{analytics?.monthly_sales || 0}/10</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${Math.min(((analytics?.monthly_sales || 0) / 10) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Listings Goal</span>
                <span>{analytics?.active_listings || 0}/30</span>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div 
                  className="bg-secondary h-2 rounded-full" 
                  style={{ width: `${Math.min(((analytics?.active_listings || 0) / 30) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Revenue Goal</span>
                <div className="flex items-center gap-2">
                  <span>
                    ${(analytics?.monthly_revenue || 0).toLocaleString()}/
                    ${Math.round(revenueGoal).toLocaleString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleOpenRevenueGoalDialog}
                    aria-label="Edit revenue goal"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div 
                  className="bg-accent h-2 rounded-full" 
                  style={{ width: `${Math.min(((analytics?.monthly_revenue || 0) / safeRevenueGoal) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRevenueGoalDialogOpen} onOpenChange={setIsRevenueGoalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Monthly Revenue Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Enter the revenue target you want to reach this month.
              </p>
              <Input
                type="number"
                min={0}
                value={revenueGoalInput}
                onChange={(event) => setRevenueGoalInput(event.target.value)}
                placeholder="60000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevenueGoalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRevenueGoal} disabled={savingRevenueGoal}>
              {savingRevenueGoal ? 'Saving...' : 'Save Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};