
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Users, Building, Shield, Settings, BarChart3, Database, AlertTriangle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';

export const SuperAdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      setLoadingListings(true);
      const { data } = await PropertyService.getAllListings();
      setListings(data || []);
      setLoadingListings(false);
    };
    fetchListings();
  }, []);

  const handleApprove = async (id: string) => {
    const { error } = await PropertyService.approveListing(id);
    if (error) {
      toast.error(error.message || 'Failed to approve listing');
    } else {
      toast.success('Listing approved!');
      setListings(listings => listings.map(l => l.id === id ? { ...l, status: 'approved' } : l));
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    const { error } = await PropertyService.rejectListing(id, reason);
    if (error) {
      toast.error(error.message || 'Failed to reject listing');
    } else {
      toast.success('Listing rejected.');
      setListings(listings => listings.map(l => l.id === id ? { ...l, status: 'rejected', rejection_reason: reason } : l));
    }
  };

  const adminActions = [
    { icon: Users, label: 'Manage Users', description: 'View and manage all users', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/admin-users') },
    { icon: Building, label: 'Property Management', description: 'Oversee all property listings', color: 'bg-green-500/10 text-green-500', onClick: () => navigate('/admin-properties') },
    { icon: Shield, label: 'Security & Permissions', description: 'Manage user roles and access', color: 'bg-red-500/10 text-red-500', onClick: () => navigate('/security-permissions') },
    { icon: BarChart3, label: 'Platform Analytics', description: 'View system-wide metrics', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/platform-analytics') },
    { icon: Database, label: 'Database Management', description: 'Monitor database health', color: 'bg-indigo-500/10 text-indigo-500', onClick: () => navigate('/database-management') },
    { icon: AlertTriangle, label: 'System Alerts', description: 'Monitor critical issues', color: 'bg-orange-500/10 text-orange-500', onClick: () => navigate('/system-alerts') },
    { icon: Activity, label: 'System Logs', description: 'View platform activity', color: 'bg-cyan-500/10 text-cyan-500', onClick: () => navigate('/system-logs') },
    { icon: Settings, label: 'Platform Settings', description: 'Configure system settings', color: 'bg-gray-500/10 text-gray-500', onClick: () => navigate('/platform-settings') }
  ];

  // Only show pending listings in the management section
  const pendingListings = listings.filter(l => l.status === 'pending');

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

      {/* Pending Property Listings Management */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardHeader>
          <CardTitle className="text-white">Pending Property Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingListings ? (
            <div className="text-gray-300">Loading property listings...</div>
          ) : pendingListings.length === 0 ? (
            <div className="text-gray-400">No pending property listings.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingListings.map(listing => (
                <Card key={listing.id} className="bg-white/5 border border-pickfirst-yellow/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-pickfirst-yellow">{listing.title}</CardTitle>
                    <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white font-bold text-xl mb-2">${listing.price.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm mb-2">{listing.property_type.replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {listing.bedrooms !== null && <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded">{listing.bedrooms} Bed</span>}
                      {listing.bathrooms !== null && <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{listing.bathrooms} Bath</span>}
                      {listing.square_feet !== null && <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded">{listing.square_feet} Sq Ft</span>}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">Status: <span className="text-yellow-400">Pending</span></div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="bg-green-500 text-white hover:bg-green-600" onClick={() => handleApprove(listing.id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10" onClick={() => handleReject(listing.id)}>
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105" onClick={action.onClick}>
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

      {/* All Listings Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20 rounded-xl shadow-2xl max-w-5xl w-full p-8 relative">
            <button className="absolute top-4 right-4 text-white text-2xl" onClick={() => setShowAllModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold text-pickfirst-yellow mb-6">All Property Listings</h2>
            {loadingListings ? (
              <div className="text-gray-300">Loading property listings...</div>
            ) : listings.length === 0 ? (
              <div className="text-gray-400">No property listings found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map(listing => (
                  <Card key={listing.id} className="bg-white/5 border border-pickfirst-yellow/10">
                    <CardHeader>
                      <CardTitle className="text-lg text-pickfirst-yellow">{listing.title}</CardTitle>
                      <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-white font-bold text-xl mb-2">${listing.price.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm mb-2">{listing.property_type.replace(/\b\w/g, l => l.toUpperCase())}</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {listing.bedrooms !== null && <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded">{listing.bedrooms} Bed</span>}
                        {listing.bathrooms !== null && <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{listing.bathrooms} Bath</span>}
                        {listing.square_feet !== null && <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded">{listing.square_feet} Sq Ft</span>}
                      </div>
                      <div className="text-xs text-gray-400 mb-2">Status: <span className={
                        listing.status === 'approved' ? 'text-green-400' :
                        listing.status === 'pending' ? 'text-yellow-400' :
                        listing.status === 'rejected' ? 'text-red-400' :
                        'text-gray-400'
                      }>{listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}</span></div>
                      {listing.status === 'rejected' && listing.rejection_reason && (
                        <div className="text-xs text-red-400">Reason: {listing.rejection_reason}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
