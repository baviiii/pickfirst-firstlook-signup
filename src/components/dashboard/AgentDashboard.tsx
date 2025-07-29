import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Home, Users, MessageSquare, Settings, PlusCircle, BarChart3, Calendar, Phone, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyListingForm } from '@/components/property/PropertyListingForm';
import { PropertyService, PropertyListing } from '@/services/propertyService';

export const AgentDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [myListings, setMyListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [activeComponent, setActiveComponent] = useState<string | null>(null);

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

  const fetchListings = async () => {
    setLoadingListings(true);
    const { data } = await PropertyService.getMyListings();
    setMyListings(data || []);
    setLoadingListings(false);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleListingCreated = () => {
    setShowForm(false);
    fetchListings();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    const { error } = await PropertyService.deleteListing(id);
    if (error) {
      alert(error.message || 'Failed to delete listing');
    } else {
      setMyListings(listings => listings.filter(l => l.id !== id));
    }
  };

  // Agent action cards with navigation
  const agentActions = [
    { icon: PlusCircle, label: 'Add New Listing', description: 'Create a new property listing', color: 'bg-green-500/10 text-green-500', onClick: () => setShowForm(true) },
    { icon: Home, label: 'My Listings', description: 'Manage your properties', color: 'bg-blue-500/10 text-blue-500' },
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

      {/* Property Listing Form (shown when Add New Listing card is clicked) */}
      {showForm && (
        <div className="py-6">
          <PropertyListingForm onSuccess={handleListingCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* My Listings */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">My Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingListings ? (
                <div className="text-gray-300">Loading your listings...</div>
              ) : myListings.length === 0 ? (
                <div className="text-gray-400">You have no property listings yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myListings.map(listing => (
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
                        <div className="flex gap-2 mt-4 flex-wrap">
                          <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10 flex items-center" onClick={() => handleDelete(listing.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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