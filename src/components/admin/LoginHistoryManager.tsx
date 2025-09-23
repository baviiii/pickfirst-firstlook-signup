import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ipTrackingService } from '@/services/ipTrackingService';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Tablet, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

interface LoginRecord {
  id: string;
  user_id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  location_info: any;
  login_type: string;
  success: boolean;
  failure_reason?: string;
  session_id?: string;
  referer?: string;
  origin?: string;
  created_at: string;
  full_name?: string;
  role?: string;
}

export const LoginHistoryManager: React.FC = () => {
  const { profile } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');

  // Check if user has admin access
  const isAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      loadLoginHistory();
      loadSuspiciousLogins();
    }
  }, [isAdmin, timeRange]);

  const loadLoginHistory = async () => {
    setLoading(true);
    try {
      const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('login_history')
        .select(`
          *,
          profiles!login_history_user_id_fkey(full_name, role)
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const enrichedData = data?.map(record => ({
        ...record,
        full_name: record.profiles?.full_name,
        role: record.profiles?.role
      })) || [];

      setLoginHistory(enrichedData);
    } catch (error) {
      console.error('Failed to load login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuspiciousLogins = async () => {
    try {
      const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const suspiciousData = await ipTrackingService.getSuspiciousLogins(hours);
      setSuspiciousLogins(suspiciousData);
    } catch (error) {
      console.error('Failed to load suspicious logins:', error);
    }
  };

  const getDeviceIcon = (deviceInfo: any) => {
    if (deviceInfo?.isMobile) return <Smartphone className="h-4 w-4" />;
    if (deviceInfo?.isTablet) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const getStatusBadge = (success: boolean, loginType: string) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  const getLocationString = (locationInfo: any) => {
    if (!locationInfo) return 'Unknown';
    const parts = [locationInfo.city, locationInfo.region, locationInfo.country].filter(Boolean);
    return parts.join(', ') || 'Unknown';
  };

  const filteredHistory = loginHistory.filter(record => {
    const matchesSearch = !searchTerm || 
      record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.ip_address.includes(searchTerm) ||
      (record.full_name && record.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || record.login_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Email', 'Name', 'IP Address', 'Location', 'Device', 'Browser', 'OS', 'Type', 'Status', 'Failure Reason'];
    const csvData = filteredHistory.map(record => [
      new Date(record.created_at).toLocaleString(),
      record.email,
      record.full_name || '',
      record.ip_address,
      getLocationString(record.location_info),
      record.device_info?.device || 'Unknown',
      record.device_info?.browser || 'Unknown',
      record.device_info?.os || 'Unknown',
      record.login_type,
      record.success ? 'Success' : 'Failed',
      record.failure_reason || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access login history. This feature is only available to super administrators.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Login History & Security</h2>
          <p className="text-muted-foreground">Monitor user authentication activities and detect suspicious behavior</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={loadLoginHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by email, name, or IP address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Login Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="signin">Sign In</SelectItem>
                <SelectItem value="signup">Sign Up</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Login History</TabsTrigger>
          <TabsTrigger value="suspicious">
            Suspicious Activity
            {suspiciousLogins.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {suspiciousLogins.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Login Activity</CardTitle>
              <CardDescription>
                Showing {filteredHistory.length} records from the last {timeRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{record.email}</span>
                            {record.full_name && (
                              <span className="text-sm text-muted-foreground">({record.full_name})</span>
                            )}
                            {getStatusBadge(record.success, record.login_type)}
                            <Badge variant="outline">{record.login_type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{new Date(record.created_at).toLocaleString()}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {getLocationString(record.location_info)}
                            </span>
                            <span className="flex items-center gap-1">
                              {getDeviceIcon(record.device_info)}
                              {record.device_info?.device || 'Unknown'} - {record.device_info?.browser || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-mono">{record.ip_address}</div>
                          {record.failure_reason && (
                            <div className="text-red-600 text-xs mt-1">{record.failure_reason}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No login records found for the selected criteria.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Suspicious Login Attempts
              </CardTitle>
              <CardDescription>
                Login attempts that may indicate security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousLogins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  No suspicious activity detected in the selected time range.
                </div>
              ) : (
                <div className="space-y-4">
                  {suspiciousLogins.map((record) => (
                    <div key={record.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{record.email}</span>
                            <Badge variant="destructive">Suspicious</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Multiple failed attempts from {record.ip_address}
                          </div>
                          <div className="text-sm">
                            Location: {getLocationString(record.location_info)}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div>{new Date(record.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
