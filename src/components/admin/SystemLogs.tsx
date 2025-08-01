import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Search, Download, RefreshCw, User, Database, Shield, AlertTriangle, Calendar, Filter, Loader2, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { auditService, AuditAction } from '@/services/auditService';
import { withErrorBoundary } from '@/components/ui/error-boundary';

interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  user_email?: string;
  user_full_name?: string;
}

const SystemLogsComponent = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const options: any = {};
      
      if (actionFilter !== 'all') {
        options.action = actionFilter as AuditAction;
      }
      
      if (tableFilter !== 'all') {
        options.tableName = tableFilter;
      }
      
      if (dateFilter !== 'all') {
        const now = new Date();
        switch (dateFilter) {
          case 'today':
            options.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            break;
          case 'week':
            options.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'month':
            options.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            break;
        }
      }

      const { data, error } = await auditService.getAllAuditLogs({
        ...options,
        limit: 100
      });

      if (error) {
        toast.error('Failed to load audit logs');
        console.error('Error loading audit logs:', error);
      } else {
        setLogs(data);
        setFilteredLogs(data);
      }
    } catch (error) {
      toast.error('Failed to load audit logs');
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Apply table filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, tableFilter]);

  const refreshLogs = async () => {
    await fetchAuditLogs();
    toast.success('Audit logs refreshed');
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: new Date(log.created_at).toISOString(),
      action: log.action,
      table: log.table_name,
      user: log.user_email || log.user_full_name || 'Unknown',
      record_id: log.record_id || '',
      ip_address: log.ip_address || '',
      user_agent: log.user_agent || ''
    }));

    const csvContent = [
      Object.keys(logData[0]).join(','),
      ...logData.map(log => Object.values(log).map(val => `"${val || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported successfully');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus className="h-4 w-4 text-green-500" />;
      case 'UPDATE': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'DELETE': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'VIEW': return <Eye className="h-4 w-4 text-gray-500" />;
      case 'SEARCH': return <Search className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500 text-white';
      case 'UPDATE': return 'bg-blue-500 text-white';
      case 'DELETE': return 'bg-red-500 text-white';
      case 'VIEW': return 'bg-gray-500 text-white';
      case 'SEARCH': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTableIcon = (table: string) => {
    switch (table) {
      case 'clients': return <User className="h-4 w-4" />;
      case 'profiles': return <User className="h-4 w-4" />;
      case 'property_listings': return <Database className="h-4 w-4" />;
      case 'audit_logs': return <Shield className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const getActionDescription = (log: AuditLogEntry) => {
    // Try to get user info from multiple sources
    let user = 'Unknown User';
    
    // First try the joined profile data
    if (log.user_full_name) {
      user = log.user_full_name;
    } else if (log.user_email) {
      user = log.user_email;
    }
    
    // If still unknown, try to extract from new_values.user_context
    if (user === 'Unknown User' && log.new_values?.user_context) {
      const context = log.new_values.user_context;
      if (context.full_name) {
        user = context.full_name;
      } else if (context.email) {
        user = context.email;
      }
    }
    
    const table = log.table_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    switch (log.action) {
      case 'CREATE':
        return `${user} created a new ${table} record`;
      case 'UPDATE':
        return `${user} updated a ${table} record`;
      case 'DELETE':
        return `${user} deleted a ${table} record`;
      case 'VIEW':
        return `${user} viewed ${table} data`;
      case 'SEARCH':
        return `${user} searched ${table} data`;
      default:
        return `${user} performed ${log.action} on ${table}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
              <p className="text-gray-400">Monitor all user activities and system events</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={refreshLogs}
              disabled={loading}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              onClick={exportLogs}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm">Total Actions</p>
                  <p className="text-2xl font-bold text-white">{logs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm">Today's Actions</p>
                  <p className="text-2xl font-bold text-white">
                    {logs.filter(log => {
                      const today = new Date();
                      const logDate = new Date(log.created_at);
                      return logDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-300 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-white">
                    {new Set(logs.filter(log => {
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      return new Date(log.created_at) > weekAgo;
                    }).map(log => log.user_id)).size}
                  </p>
                </div>
                <User className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm">Tables Monitored</p>
                  <p className="text-2xl font-bold text-white">
                    {new Set(logs.map(log => log.table_name)).size}
                  </p>
                </div>
                <Database className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Action</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="VIEW">View</SelectItem>
                    <SelectItem value="SEARCH">Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Table</label>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    <SelectItem value="clients">Clients</SelectItem>
                    <SelectItem value="profiles">Profiles</SelectItem>
                    <SelectItem value="property_listings">Property Listings</SelectItem>
                    <SelectItem value="audit_logs">Audit Logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Date Range</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Audit Logs ({filteredLogs.length})</CardTitle>
            <CardDescription className="text-gray-400">
              Real-time monitoring of all user activities and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-300">Loading audit logs...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No audit logs found</h3>
                <p className="text-gray-400">No activity matches your current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                            <div className="flex items-center space-x-1 text-gray-400">
                              {getTableIcon(log.table_name)}
                              <span className="text-sm">{log.table_name.replace('_', ' ')}</span>
                            </div>
                          </div>
                          <p className="text-white font-medium mb-1">
                            {getActionDescription(log)}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>User: {getActionDescription(log).split(' ')[0]}</span>
                            {log.record_id && (
                              <span>Record ID: {log.record_id}</span>
                            )}
                            {log.ip_address && (
                              <span>IP: {log.ip_address}</span>
                            )}
                            <span>{formatTimestamp(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Export with error boundary
export const SystemLogs = withErrorBoundary(SystemLogsComponent);