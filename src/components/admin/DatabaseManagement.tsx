import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  HardDrive,
  Users,
  MessageSquare,
  Home,
  Heart,
  Wrench,
  TrendingUp,
  Zap,
  Shield,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { databaseService, type DatabaseStats, type TableInfo, type DatabaseHealth } from '@/services/databaseService';
import { monitoringService, type SystemHealthMetrics } from '@/services/monitoringService';

export const DatabaseManagement = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const [optimizationRunning, setOptimizationRunning] = useState(false);

  // Check if user is super admin
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      navigate('/dashboard');
      return;
    }
    
    fetchAllData();
    
    // Start real-time monitoring
    monitoringService.startMonitoring();
    
    return () => {
      monitoringService.stopMonitoring();
    };
  }, [isSuperAdmin, navigate]);

  const getDatabaseHealth = () => {
    if (!health) return { status: 'unknown', color: 'bg-gray-500' };
    
    if (health.score > 80) return { status: 'excellent', color: 'bg-green-500' };
    if (health.score > 60) return { status: 'good', color: 'bg-yellow-500' };
    return { status: 'fair', color: 'bg-orange-500' };
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsResult, tablesResult, healthResult, metricsResult, systemHealthResult, securityResult] = await Promise.all([
        databaseService.getDatabaseStats(),
        databaseService.getTableStatistics(),
        databaseService.analyzeHealth(),
        databaseService.getPerformanceMetrics(),
        monitoringService.getSystemHealthMetrics(),
        monitoringService.getRecentSecurityEvents()
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (tablesResult.data) setTables(tablesResult.data);
      if (healthResult.data) setHealth(healthResult.data);
      if (metricsResult.data) setPerformanceMetrics(metricsResult.data);
      if (systemHealthResult.data) setSystemHealth(systemHealthResult.data);
      if (securityResult.data) setSecurityEvents(securityResult.data);
    } catch (error) {
      console.error('Error fetching database data:', error);
      toast.error('Failed to fetch database information');
    } finally {
      setLoading(false);
    }
  };

  const runMaintenance = async () => {
    setMaintenanceRunning(true);
    try {
      const { error } = await databaseService.runMaintenance();
      if (error) {
        toast.error('Database maintenance failed');
        console.error('Maintenance error:', error);
      } else {
        toast.success('Database maintenance completed successfully');
        await fetchAllData(); // Refresh data
      }
    } catch (error) {
      toast.error('Database maintenance failed');
      console.error('Maintenance error:', error);
    } finally {
      setMaintenanceRunning(false);
    }
  };

  const runOptimization = async () => {
    setOptimizationRunning(true);
    try {
      const { error } = await databaseService.optimizeDatabase();
      if (error) {
        toast.error('Database optimization failed');
        console.error('Optimization error:', error);
      } else {
        toast.success('Database optimization completed successfully');
        await fetchAllData(); // Refresh data
      }
    } catch (error) {
      toast.error('Database optimization failed');
      console.error('Optimization error:', error);
    } finally {
      setOptimizationRunning(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-pickfirst-yellow/20 flex items-center px-4 py-3 gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-white hover:text-pickfirst-yellow">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <Database className="h-6 w-6 text-pickfirst-yellow" />
        <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text">Database Management</h1>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardContent className="py-12 text-center text-gray-300 text-lg">Loading database information...</CardContent>
          </Card>
        ) : (
          <>
            {/* Database Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-green-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <CardTitle className="text-base text-white">Health Status</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getDatabaseHealth().color} text-white`}>
                      {getDatabaseHealth().status.toUpperCase()}
                    </Badge>
                  </div>
                  {health && (
                    <div className="text-xs text-gray-400 mt-2">Score: {health.score}/100</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-blue-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Database className="h-5 w-5 text-blue-500" />
                    </div>
                    <CardTitle className="text-base text-white">Total Records</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    {stats ? (stats.totalProfiles + stats.totalProperties + stats.totalMessages).toLocaleString() : 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-purple-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Activity className="h-5 w-5 text-purple-500" />
                    </div>
                    <CardTitle className="text-base text-white">Database Size</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">{stats?.databaseSize || 'N/A'}</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-orange-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Clock className="h-5 w-5 text-orange-500" />
                    </div>
                    <CardTitle className="text-base text-white">Last Backup</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-orange-500">{stats?.lastBackup || 'N/A'}</div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceMetrics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-white font-semibold">Connection Pool</span>
                      </div>
                      <div className="text-2xl font-bold text-green-500">{performanceMetrics.connectionPool.available}%</div>
                      <div className="text-sm text-gray-400">Available connections</div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        <span className="text-white font-semibold">Query Performance</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-500">{performanceMetrics.queryPerformance.avgResponseTime}ms</div>
                      <div className="text-sm text-gray-400">Average response time</div>
                    </div>

                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="text-white font-semibold">Storage Usage</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-500">{performanceMetrics.storageUsage.used}%</div>
                      <div className="text-sm text-gray-400">Of allocated space</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Table Statistics */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Table Statistics</CardTitle>
                  <Button 
                    onClick={runMaintenance}
                    disabled={maintenanceRunning}
                    className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
                  >
                    {maintenanceRunning ? 'Running...' : 'Run Maintenance'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {tables.map((table) => (
                    <Card key={table.table_name} className="bg-white/5 border border-white/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-pickfirst-yellow">{table.table_name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Records:</span>
                          <span className="text-white font-semibold">{table.row_count.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Size:</span>
                          <span className="text-white font-semibold">{table.table_size}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Real-time System Health</CardTitle>
              </CardHeader>
              <CardContent>
                {systemHealth && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-white" />
                        <span className="font-medium text-white">Database</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Connection Pool</span>
                          <span className="text-white">{systemHealth.databaseHealth.connectionPool}%</span>
                        </div>
                        <Progress value={systemHealth.databaseHealth.connectionPool} className="h-2" />
                        <p className="text-xs text-gray-400">
                          {systemHealth.databaseHealth.activeConnections} active connections
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-white" />
                        <span className="font-medium text-white">Authentication</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Success Rate</span>
                          <span className="text-white">{(100 - systemHealth.authHealth.errorRate).toFixed(1)}%</span>
                        </div>
                        <Progress value={100 - systemHealth.authHealth.errorRate} className="h-2" />
                        <p className="text-xs text-gray-400">
                          {systemHealth.authHealth.activeUsers} active users
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-white" />
                        <span className="font-medium text-white">Application</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Uptime</span>
                          <span className="text-white">{systemHealth.applicationHealth.uptime}%</span>
                        </div>
                        <Progress value={systemHealth.applicationHealth.uptime} className="h-2" />
                        <p className="text-xs text-gray-400">
                          {systemHealth.applicationHealth.totalRequests} total requests
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Events */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                {securityEvents.length > 0 ? (
                  <div className="space-y-3">
                    {securityEvents.slice(0, 5).map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-white/10 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <div>
                            <p className="text-sm font-medium text-white">{event.event_message}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(event.timestamp / 1000).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={event.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {event.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">No security events detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Actions */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
              <CardHeader>
                <CardTitle className="text-white">Database Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={runMaintenance}
                    disabled={maintenanceRunning}
                    className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber flex items-center gap-2"
                  >
                    {maintenanceRunning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wrench className="h-4 w-4" />
                    )}
                    {maintenanceRunning ? 'Running Maintenance...' : 'Run Maintenance'}
                  </Button>

                  <Button
                    onClick={runOptimization}
                    disabled={optimizationRunning}
                    variant="outline"
                    className="border-pickfirst-yellow text-pickfirst-yellow hover:bg-pickfirst-yellow hover:text-black flex items-center gap-2"
                  >
                    {optimizationRunning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {optimizationRunning ? 'Optimizing...' : 'Optimize Database'}
                  </Button>
                </div>

                <div className="text-sm text-gray-400">
                  <p>• <strong className="text-white">Maintenance:</strong> Cleans up temporary data and updates statistics</p>
                  <p>• <strong className="text-white">Optimization:</strong> Rebuilds indexes and optimizes query performance</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};