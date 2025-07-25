import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Search, Download, RefreshCw, User, Database, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SystemLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: 'auth' | 'database' | 'api' | 'system' | 'user';
  message: string;
  source: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  details?: any;
}

export const SystemLogs = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    // Generate mock logs for demonstration
    const mockLogs: SystemLog[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        level: 'info',
        category: 'auth',
        message: 'User successfully logged in',
        source: 'AuthService',
        userId: 'user123',
        userEmail: 'john.doe@example.com',
        ipAddress: '192.168.1.100',
        details: { userAgent: 'Mozilla/5.0 Chrome/91.0' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
        level: 'warning',
        category: 'database',
        message: 'Slow query detected: SELECT * FROM property_listings took 2.3s',
        source: 'DatabaseMonitor',
        details: { queryTime: 2300, query: 'SELECT * FROM property_listings WHERE status = ?', params: ['active'] }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        level: 'error',
        category: 'auth',
        message: 'Failed login attempt - invalid password',
        source: 'AuthService',
        userEmail: 'attacker@malicious.com',
        ipAddress: '45.123.45.67',
        details: { attempts: 5, blocked: true }
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
        level: 'info',
        category: 'api',
        message: 'Property listing created successfully',
        source: 'PropertyAPI',
        userId: 'agent456',
        userEmail: 'agent@realty.com',
        ipAddress: '192.168.1.200',
        details: { propertyId: 'prop789', title: 'Beautiful 3BR Home' }
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
        level: 'debug',
        category: 'system',
        message: 'Background cleanup task completed',
        source: 'SystemScheduler',
        details: { recordsProcessed: 1250, duration: '45s' }
      },
      {
        id: '6',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        level: 'warning',
        category: 'system',
        message: 'High memory usage detected: 85% of available RAM',
        source: 'SystemMonitor',
        details: { memoryUsage: '85%', threshold: '80%' }
      },
      {
        id: '7',
        timestamp: new Date(Date.now() - 1000 * 60 * 35), // 35 minutes ago
        level: 'info',
        category: 'user',
        message: 'New user registration completed',
        source: 'UserService',
        userId: 'user999',
        userEmail: 'newuser@example.com',
        ipAddress: '192.168.1.150',
        details: { role: 'buyer', verificationSent: true }
      }
    ];

    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
    setLoading(false);
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, levelFilter, categoryFilter]);

  const refreshLogs = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setLoading(false);
      toast.success('Logs refreshed');
    }, 1000);
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      category: log.category,
      message: log.message,
      source: log.source,
      userEmail: log.userEmail,
      ipAddress: log.ipAddress
    }));

    const csvContent = [
      Object.keys(logData[0]).join(','),
      ...logData.map(log => Object.values(log).map(val => `"${val || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported successfully');
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Activity className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      case 'debug': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth': return <Shield className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warningCount = logs.filter(l => l.level === 'warning').length;
  const totalEvents = logs.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-pickfirst-yellow/20 flex items-center px-4 py-3 gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-white hover:text-pickfirst-yellow">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <Activity className="h-6 w-6 text-pickfirst-yellow" />
        <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text">System Logs</h1>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Log Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-blue-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-base text-white">Total Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{totalEvents}</div>
              <div className="text-xs text-gray-400">Last 24 hours</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-red-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="text-base text-white">Errors</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{errorCount}</div>
              <div className="text-xs text-gray-400">Needs attention</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-yellow-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <CardTitle className="text-base text-white">Warnings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
              <div className="text-xs text-gray-400">Monitor closely</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-green-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-base text-white">System Health</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">98%</div>
              <div className="text-xs text-gray-400">Uptime</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls and Filters */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-white">Activity Logs</CardTitle>
              <div className="flex gap-2">
                <Button onClick={refreshLogs} disabled={loading} size="sm" variant="outline" className="text-gray-300">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={exportLogs} size="sm" className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white"
                />
              </div>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white"
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white"
              >
                <option value="all">All Categories</option>
                <option value="auth">Auth</option>
                <option value="database">Database</option>
                <option value="api">API</option>
                <option value="system">System</option>
                <option value="user">User</option>
              </select>
            </div>

            {/* Logs Display */}
            {loading ? (
              <div className="text-center text-gray-300 py-8">Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No logs found matching your criteria.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="bg-white/5 border border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getLevelIcon(log.level)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getLevelColor(log.level)}>
                                {log.level.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="border-white/20 text-gray-300">
                                <div className="flex items-center gap-1">
                                  {getCategoryIcon(log.category)}
                                  {log.category.toUpperCase()}
                                </div>
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {log.timestamp.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-white mb-2">{log.message}</div>
                            <div className="text-xs text-gray-400">
                              Source: {log.source}
                              {log.userEmail && ` | User: ${log.userEmail}`}
                              {log.ipAddress && ` | IP: ${log.ipAddress}`}
                            </div>
                            {log.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-pickfirst-yellow cursor-pointer">View Details</summary>
                                <pre className="text-xs text-gray-300 mt-1 bg-black/20 p-2 rounded">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};