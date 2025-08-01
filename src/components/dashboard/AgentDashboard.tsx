import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Home, Users, MessageSquare, Settings, PlusCircle, BarChart3, Calendar, Phone, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyListingModal } from '@/components/property/PropertyListingModal';

export const AgentDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const getSubscriptionBadge = () => {
    const tier = profile?.subscription_tier || 'free';
    const colors = {
      free: 'bg-gray-500',
      basic: 'bg-pickfirst-yellow',
      premium: 'bg-pickfirst-amber',
      pro: 'bg-pickfirst-yellow'
    };
    
    return (
      <Badge className={`${colors[tier as keyof typeof colors]} text-black`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  const handleListingCreated = () => {
    setShowModal(false);
  };

  // Agent action cards with navigation
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
        <div className="flex items-center gap-2">
          <Badge className="bg-pickfirst-amber text-black">Real Estate Agent</Badge>
          {getSubscriptionBadge()}
          <Button 
            variant="outline" 
            size="sm"
            className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
          >
            Upgrade Tools
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agentActions.map((action, index) => {
          const Icon = action.icon;
          const isClickable = action.onClick;
          const isAddListing = action.label === 'Add New Listing';
          return (
            <Card
              key={index}
              className={`hover:shadow-md transition-all bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105 ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              } ${isAddListing ? 'ring-2 ring-pickfirst-yellow/40' : ''}`}
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
                    <div className="text-2xl font-bold text-green-500">7</div>
                    <div className="text-sm text-gray-300">Active Listings</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-500/10">
                    <div className="text-2xl font-bold text-blue-500">3</div>
                    <div className="text-sm text-gray-300">Sales Closed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-500/10">
                    <div className="text-2xl font-bold text-purple-500">15</div>
                    <div className="text-sm text-gray-300">New Clients</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-500/10">
                    <div className="text-2xl font-bold text-orange-500">28</div>
                    <div className="text-sm text-gray-300">Showings</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">New listing created</p>
                      <p className="text-xs text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Client meeting scheduled</p>
                      <p className="text-xs text-gray-400">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Property inquiry received</p>
                      <p className="text-xs text-gray-400">1 day ago</p>
                    </div>
                  </div>
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
                    <div className="text-2xl font-bold text-pickfirst-yellow">$42,500</div>
                    <div className="text-sm text-gray-300">This Month</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-pickfirst-amber/10">
                    <div className="text-xl font-bold text-pickfirst-amber">$156,800</div>
                    <div className="text-sm text-gray-300">This Quarter</div>
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
                {[
                  { time: '10:00 AM', client: 'Sarah Johnson', property: '123 Oak Street', type: 'Property Showing' },
                  { time: '2:30 PM', client: 'Mike & Lisa Chen', property: '456 Pine Avenue', type: 'Initial Consultation' },
                  { time: '4:00 PM', client: 'Robert Davis', property: '789 Maple Drive', type: 'Contract Review' }
                ].map((appointment, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-center min-w-[80px]">
                      <div className="text-sm font-bold text-pickfirst-yellow">{appointment.time}</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{appointment.client}</h4>
                      <p className="text-sm text-gray-400">{appointment.type} - {appointment.property}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-gray-300 hover:text-pickfirst-yellow">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
    </div>
  );
};