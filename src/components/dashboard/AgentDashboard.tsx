import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Home, Users, MessageSquare, Settings, PlusCircle, BarChart3, Calendar, Phone, FileText, Edit3, Trash2, Eye, UserPlus, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyListingModal } from '@/components/property/PropertyListingModal';
import { analyticsService, AgentMetrics } from '@/services/analyticsService';
import { AgentSpecialtyManager } from '@/components/agent/AgentSpecialtyManager';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { supabase } from '@/integrations/supabase/client';

export const AgentDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingMetrics(true);
      const { data } = await analyticsService.getAgentMetrics();
      setMetrics(data);
      setLoadingMetrics(false);
    };
    fetchMetrics();
  }, []);

  const handleListingCreated = () => {
    setShowModal(false);
  };

  const agentActions = [
    { icon: PlusCircle, label: 'Add New Listing', description: 'Create a new property listing', color: 'bg-green-500/10 text-green-500', onClick: () => setShowModal(true) },
    { icon: Home, label: 'My Listings', description: 'Manage your properties', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/my-listings') },
    { icon: Users, label: 'My Clients', description: 'Manage client relationships', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/my-clients') },
    { icon: Calendar, label: 'Appointments', description: 'View scheduled showings', color: 'bg-orange-500/10 text-orange-500', onClick: () => navigate('/appointments') },
    { icon: BarChart3, label: 'Analytics', description: 'View performance metrics', color: 'bg-indigo-500/10 text-indigo-500', onClick: () => navigate('/agent-analytics') },
    { icon: MessageSquare, label: 'Messages', description: 'Client communications', color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', onClick: () => navigate('/agent-messages') },
    { icon: Phone, label: 'Leads', description: 'Follow up with prospects', color: 'bg-pink-500/10 text-pink-500', onClick: () => navigate('/agent-leads') },
    { icon: Settings, label: 'Profile Settings', description: 'Update your profile', color: 'bg-gray-500/10 text-gray-500', onClick: () => navigate('/agent-profile') }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Welcome back, Agent {profile?.full_name?.split(' ')[0] || 'Smith'}!
          </h1>
          <p className="text-gray-300">Ready to help your clients find their dream home?</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <Badge className="bg-pickfirst-amber text-black">Real Estate Agent</Badge>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agentActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card
              key={index}
              className={`hover:shadow-md transition-all bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105 cursor-pointer`}
              onClick={action.onClick}
            >
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

      {/* Property Listing Modal */}
      <PropertyListingModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        onSuccess={handleListingCreated} 
      />

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">This Month's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-500">
                  {loadingMetrics ? '...' : metrics?.activeListings || 0}
                </div>
                <div className="text-sm text-gray-300">Active Listings</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-500">
                  {loadingMetrics ? '...' : metrics?.totalListings || 0}
                </div>
                <div className="text-sm text-gray-300">Total Listings</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-500/10">
                <div className="text-2xl font-bold text-purple-500">
                  {loadingMetrics ? '...' : metrics?.totalClients || 0}
                </div>
                <div className="text-sm text-gray-300">Total Clients</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-500/10">
                <div className="text-2xl font-bold text-orange-500">
                  {loadingMetrics ? '...' : metrics?.totalAppointments || 0}
                </div>
                <div className="text-sm text-gray-300">Appointments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingMetrics ? (
                <div className="text-gray-300">Loading activity...</div>
              ) : metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
                metrics.recentActivity.map((activity) => {
                  // Parse user-friendly messages
                  const getActivityDetails = () => {
                    const action = activity.action.toUpperCase();
                    const table = activity.table_name;
                    
                    // Check for custom messages in details
                    if (activity.details) {
                      return {
                        message: activity.details,
                        icon: Eye,
                        color: 'text-blue-400'
                      };
                    }
                    
                    // Map technical actions to user-friendly messages
                    if (action === 'CREATE' || action === 'INSERT') {
                      if (table === 'property_listings') return { message: 'Added a new property listing', icon: PlusCircle, color: 'text-green-400' };
                      if (table === 'clients') return { message: 'Added a new client', icon: UserPlus, color: 'text-green-400' };
                      if (table === 'appointments') return { message: 'Scheduled a new appointment', icon: Calendar, color: 'text-green-400' };
                      if (table === 'messages') return { message: 'Sent a message', icon: Mail, color: 'text-green-400' };
                      return { message: `Created new ${table.replace('_', ' ')}`, icon: PlusCircle, color: 'text-green-400' };
                    }
                    
                    if (action === 'UPDATE') {
                      if (table === 'property_listings') return { message: 'Updated a property listing', icon: Edit3, color: 'text-blue-400' };
                      if (table === 'profiles') return { message: 'Updated profile information', icon: Edit3, color: 'text-blue-400' };
                      if (table === 'appointments') return { message: 'Modified an appointment', icon: Calendar, color: 'text-blue-400' };
                      if (table === 'clients') return { message: 'Updated client information', icon: Edit3, color: 'text-blue-400' };
                      return { message: `Updated ${table.replace('_', ' ')}`, icon: Edit3, color: 'text-blue-400' };
                    }
                    
                    if (action === 'DELETE') {
                      if (table === 'property_listings') return { message: 'Removed a property listing', icon: Trash2, color: 'text-red-400' };
                      if (table === 'clients') return { message: 'Removed a client', icon: Trash2, color: 'text-red-400' };
                      if (table === 'appointments') return { message: 'Cancelled an appointment', icon: Trash2, color: 'text-red-400' };
                      return { message: `Deleted ${table.replace('_', ' ')}`, icon: Trash2, color: 'text-red-400' };
                    }
                    
                    if (action === 'VIEW') {
                      if (table === 'property_listings') return { message: 'Viewed property listings', icon: Eye, color: 'text-purple-400' };
                      return { message: `Viewed ${table.replace('_', ' ')}`, icon: Eye, color: 'text-purple-400' };
                    }
                    
                    return { message: `${action.toLowerCase()} on ${table.replace('_', ' ')}`, icon: FileText, color: 'text-gray-400' };
                  };
                  
                  const { message, icon: Icon, color } = getActivityDetails();
                  const timeAgo = (() => {
                    const now = new Date();
                    const activityDate = new Date(activity.timestamp);
                    const diffMs = now.getTime() - activityDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
                    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                    return activityDate.toLocaleDateString();
                  })();
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <div className="text-gray-400 text-sm">No recent activity</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-pickfirst-yellow/10">
                <div className="text-2xl font-bold text-pickfirst-yellow">
                  {loadingMetrics ? '...' : `$${(metrics?.monthlyRevenue || 0).toLocaleString()}`}
                </div>
                <div className="text-sm text-gray-300">This Month</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-pickfirst-amber/10">
                <div className="text-xl font-bold text-pickfirst-amber">
                  {loadingMetrics ? '...' : `$${((metrics?.monthlyRevenue || 0) * 3).toLocaleString()}`}
                </div>
                <div className="text-sm text-gray-300">This Quarter (Est.)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Upcoming Appointments</CardTitle>
            <Button variant="outline" size="sm" className="text-gray-300 hover:text-pickfirst-yellow">
              View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingMetrics ? (
              <div className="text-gray-300">Loading appointments...</div>
            ) : metrics?.upcomingAppointments && metrics.upcomingAppointments.length > 0 ? (
              metrics.upcomingAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-center min-w-[80px]">
                    <div className="text-sm font-bold text-pickfirst-yellow">{appointment.time}</div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{appointment.client_name}</h4>
                    <p className="text-sm text-gray-400">{appointment.appointment_type} - {appointment.property_address}</p>
                    <p className="text-xs text-gray-500">{new Date(appointment.date).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-gray-300 hover:text-pickfirst-yellow">
                    View Details
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No upcoming appointments</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Specialties */}
      <AgentSpecialtyManager />
    </div>
  );
};