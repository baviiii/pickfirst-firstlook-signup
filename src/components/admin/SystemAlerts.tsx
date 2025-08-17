import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock, Bell, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { systemAlertsService, SystemAlert, AlertStats } from '@/services/systemAlertsService';

export const SystemAlerts = () => {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({ critical: 0, warning: 0, info: 0, unresolved: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
  const navigate = useNavigate();

  // Check if user is super admin
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied. Super admin privileges required.');
      navigate('/dashboard');
      return;
    }
    fetchAlerts();
  }, [filter, isSuperAdmin, navigate]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error, stats: alertStats } = await systemAlertsService.getAllAlerts({
        filter,
        limit: 50
      });
      
      if (error) {
        toast.error('Failed to fetch system alerts');
        console.error('Error fetching alerts:', error);
      } else {
        setAlerts(data);
        setStats(alertStats);
      }
    } catch (error) {
      toast.error('Failed to fetch system alerts');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      const { error } = await systemAlertsService.acknowledgeAlert(id);
      if (error) {
        toast.error('Failed to acknowledge alert');
        console.error('Error acknowledging alert:', error);
      } else {
        toast.success('Alert acknowledged');
        fetchAlerts(); // Refresh the alerts
      }
    } catch (error) {
      toast.error('Failed to acknowledge alert');
      console.error('Error:', error);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      const { error } = await systemAlertsService.resolveAlert(id);
      if (error) {
        toast.error('Failed to resolve alert');
        console.error('Error resolving alert:', error);
      } else {
        toast.success('Alert resolved');
        fetchAlerts(); // Refresh the alerts
      }
    } catch (error) {
      toast.error('Failed to resolve alert');
      console.error('Error:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await systemAlertsService.deleteAlert(id);
      if (error) {
        toast.error('Failed to delete alert');
        console.error('Error deleting alert:', error);
      } else {
        toast.success('Alert deleted');
        fetchAlerts(); // Refresh the alerts
      }
    } catch (error) {
      toast.error('Failed to delete alert');
      console.error('Error:', error);
    }
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

  // Don't render if not super admin
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
              <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
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
              <div className="text-2xl font-bold text-yellow-500">{stats.warning}</div>
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
              <div className="text-2xl font-bold text-orange-500">{stats.unresolved}</div>
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
              <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
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
                  All ({stats.total})
                </Button>
                <Button 
                  variant={filter === 'unresolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('unresolved')}
                  className={filter === 'unresolved' ? 'bg-pickfirst-yellow text-black' : 'text-gray-300'}
                >
                  Unresolved ({stats.unresolved})
                </Button>
                <Button 
                  variant={filter === 'critical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('critical')}
                  className={filter === 'critical' ? 'bg-pickfirst-yellow text-black' : 'text-gray-300'}
                >
                  Critical ({stats.critical})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-gray-300 py-8">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No alerts found for the selected filter.</div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
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
                          <div>{new Date(alert.created_at).toLocaleString()}</div>
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