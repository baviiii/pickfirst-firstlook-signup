
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Users, Building, Shield, Settings, BarChart3, Database, AlertTriangle, Activity } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const { profile } = useAuth();

  const adminActions = [
    { icon: Users, label: 'Manage Users', description: 'View and manage all users', color: 'bg-blue-500/10 text-blue-500' },
    { icon: Building, label: 'Property Management', description: 'Oversee all property listings', color: 'bg-green-500/10 text-green-500' },
    { icon: Shield, label: 'Security & Permissions', description: 'Manage user roles and access', color: 'bg-red-500/10 text-red-500' },
    { icon: BarChart3, label: 'Platform Analytics', description: 'View system-wide metrics', color: 'bg-purple-500/10 text-purple-500' },
    { icon: Database, label: 'Database Management', description: 'Monitor database health', color: 'bg-indigo-500/10 text-indigo-500' },
    { icon: AlertTriangle, label: 'System Alerts', description: 'Monitor critical issues', color: 'bg-orange-500/10 text-orange-500' },
    { icon: Activity, label: 'System Logs', description: 'View platform activity', color: 'bg-cyan-500/10 text-cyan-500' },
    { icon: Settings, label: 'Platform Settings', description: 'Configure system settings', color: 'bg-gray-500/10 text-gray-500' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-300">Welcome to the system administration panel, {profile?.full_name}!</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white">
            <Shield className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
          >
            System Status
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-blue-500/20 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-base text-white">Total Users</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">1,247</div>
            <p className="text-xs text-gray-400">+12% this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-green-500/20 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Building className="h-5 w-5 text-green-500" />
              </div>
              <CardTitle className="text-base text-white">Properties</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">893</div>
            <p className="text-xs text-gray-400">+8% this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-purple-500/20 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <CardTitle className="text-base text-white">Monthly Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">$24.8K</div>
            <p className="text-xs text-gray-400">+15% this month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-orange-500/20 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <CardTitle className="text-base text-white">Active Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">3</div>
            <p className="text-xs text-gray-400">2 critical, 1 warning</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm text-white">{action.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs text-gray-300">
                  {action.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-white">Buyers</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-500">856</div>
                  <div className="text-xs text-gray-400">68.7%</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-green-500" />
                  <span className="text-white">Agents</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-500">389</div>
                  <div className="text-xs text-gray-400">31.2%</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-white">Admins</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-500">2</div>
                  <div className="text-xs text-gray-400">0.1%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <span className="text-white">Database Status</span>
                <Badge className="bg-green-500 text-white">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <span className="text-white">API Response Time</span>
                <Badge className="bg-green-500 text-white">145ms</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                <span className="text-white">Storage Usage</span>
                <Badge className="bg-yellow-500 text-black">78%</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <span className="text-white">Uptime</span>
                <Badge className="bg-green-500 text-white">99.9%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Admin Activity */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Recent System Activity</CardTitle>
            <Button variant="outline" size="sm" className="text-gray-300 hover:text-pickfirst-yellow">
              View All Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'New user registration', user: 'john.doe@email.com', time: '5 minutes ago', type: 'info' },
              { action: 'Property listing approved', user: 'agent.smith@realty.com', time: '15 minutes ago', type: 'success' },
              { action: 'Failed login attempt detected', user: 'suspicious.user@domain.com', time: '1 hour ago', type: 'warning' },
              { action: 'System backup completed', user: 'System', time: '2 hours ago', type: 'info' },
              { action: 'User role updated', user: 'jane.agent@realty.com', time: '3 hours ago', type: 'info' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className={`h-2 w-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' : 
                  activity.type === 'warning' ? 'bg-yellow-500' : 
                  'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{activity.action}</p>
                  <p className="text-xs text-gray-400">{activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
