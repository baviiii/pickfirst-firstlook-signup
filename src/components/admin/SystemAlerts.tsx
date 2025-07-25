import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock, Bell, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'security' | 'performance' | 'database' | 'system' | 'user';
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  source: string;
}

export const SystemAlerts = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
  const navigate = useNavigate();

  useEffect(() => {
    // Generate mock alerts for demonstration
    const mockAlerts: SystemAlert[] = [
      {
        id: '1',
        title: 'High Database Connection Usage',
        description: 'Database connections are at 89% capacity. Consider scaling or optimizing queries.',
        severity: 'warning',
        category: 'database',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        acknowledged: false,
        resolved: false,
        source: 'Database Monitor'
      },
      {
        id: '2',
        title: 'Multiple Failed Login Attempts',
        description: 'User account john.doe@example.com has 5 failed login attempts in the last 10 minutes.',
        severity: 'critical',
        category: 'security',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        acknowledged: true,
        resolved: false,
        source: 'Auth System'
      },
      {
        id: '3',
        title: 'API Response Time Degradation',
        description: 'Average API response time has increased to 2.3 seconds over the last hour.',
        severity: 'warning',
        category: 'performance',
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        acknowledged: false,
        resolved: false,
        source: 'Performance Monitor'
      },
      {
        id: '4',
        title: 'Storage Space Warning',
        description: 'Database storage is at 78% capacity. Consider archiving old data or expanding storage.',
        severity: 'warning',
        category: 'system',
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        acknowledged: true,
        resolved: true,
        source: 'System Monitor'
      },
      {
        id: '5',
        title: 'Unusual User Activity Pattern',
        description: 'Detected unusually high registration rate: 50 new users in the last hour.',
        severity: 'info',
        category: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        acknowledged: false,
        resolved: false,
        source: 'User Analytics'
      }
    ];

    setAlerts(mockAlerts);
    setLoading(false);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'critical') return alert.severity === 'critical';
    if (filter === 'unresolved') return !alert.resolved;
    return true;
  });

  const acknowledgeAlert = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
    toast.success('Alert acknowledged');
  };

  const resolveAlert = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, resolved: true, acknowledged: true } : alert
    ));
    toast.success('Alert resolved');
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
    toast.success('Alert deleted');
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'performance': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'database': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'system': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'user': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.resolved).length;
  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-pickfirst-yellow/20 flex items-center px-4 py-3 gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-white hover:text-pickfirst-yellow">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <AlertTriangle className="h-6 w-6 text-pickfirst-yellow" />
        <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text">System Alerts</h1>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-red-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="text-base text-white">Critical</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
              <div className="text-xs text-gray-400">Immediate attention</div>
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
              <div className="text-xs text-gray-400">Requires attention</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-orange-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle className="text-base text-white">Unresolved</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{unresolvedCount}</div>
              <div className="text-xs text-gray-400">Total pending</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-green-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-base text-white">Resolved</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{alerts.filter(a => a.resolved).length}</div>
              <div className="text-xs text-gray-400">Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Alert Dashboard</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'bg-pickfirst-yellow text-black' : 'text-gray-300'}
                >
                  All ({alerts.length})
                </Button>
                <Button 
                  variant={filter === 'unresolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('unresolved')}
                  className={filter === 'unresolved' ? 'bg-pickfirst-yellow text-black' : 'text-gray-300'}
                >
                  Unresolved ({unresolvedCount})
                </Button>
                <Button 
                  variant={filter === 'critical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('critical')}
                  className={filter === 'critical' ? 'bg-pickfirst-yellow text-black' : 'text-gray-300'}
                >
                  Critical ({criticalCount})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-gray-300 py-8">Loading alerts...</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No alerts found for the selected filter.</div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <Card key={alert.id} className={`bg-white/5 border ${alert.resolved ? 'border-green-500/20' : alert.acknowledged ? 'border-yellow-500/20' : 'border-red-500/20'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(alert.severity)}
                          <div>
                            <CardTitle className="text-lg text-pickfirst-yellow mb-1">{alert.title}</CardTitle>
                            <CardDescription className="text-gray-300">{alert.description}</CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <Badge className={`border ${getCategoryColor(alert.category)}`} variant="outline">
                                {alert.category.toUpperCase()}
                              </Badge>
                              {alert.acknowledged && !alert.resolved && (
                                <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" variant="outline">
                                  ACKNOWLEDGED
                                </Badge>
                              )}
                              {alert.resolved && (
                                <Badge className="bg-green-500 text-white">
                                  RESOLVED
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          <div>{alert.timestamp.toLocaleString()}</div>
                          <div className="text-xs">Source: {alert.source}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {!alert.acknowledged && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10"
                          >
                            Acknowledge
                          </Button>
                        )}
                        {!alert.resolved && (
                          <Button 
                            size="sm" 
                            className="bg-green-500 text-white hover:bg-green-600"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            Resolve
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteAlert(alert.id)}
                          className="text-red-500 border-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
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