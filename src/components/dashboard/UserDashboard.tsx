
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Home, Search, MessageSquare, Settings, Crown, Users, Building, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

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
        {tier === 'pro' && <Crown className="w-3 h-3 ml-1" />}
      </Badge>
    );
  };

  const getRoleBadge = () => {
    const role = profile?.role || 'buyer';
    const roleConfig = {
      buyer: { color: 'bg-pickfirst-yellow', icon: Users, label: 'Buyer' },
      agent: { color: 'bg-pickfirst-amber', icon: Building, label: 'Agent' },
      super_admin: { color: 'bg-pickfirst-yellow', icon: Shield, label: 'Super Admin' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-black`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getQuickActions = () => {
    const role = profile?.role || 'buyer';
    
    const commonActions = [
      { icon: MessageSquare, label: 'Messages', description: 'Chat with agents and sellers' },
      { icon: Settings, label: 'Account Settings', description: 'Update your preferences' }
    ];

    const roleSpecificActions = {
      buyer: [
        { icon: Search, label: 'Browse Properties', description: 'Find your perfect home' },
        { icon: Home, label: 'Saved Properties', description: 'View your saved listings' }
      ],
      agent: [
        { icon: Home, label: 'My Listings', description: 'Manage your property listings' },
        { icon: Search, label: 'Browse Properties', description: 'Find properties for clients' }
      ],
      super_admin: [
        { icon: Users, label: 'Manage Users', description: 'View and manage all users' },
        { icon: Building, label: 'Manage Properties', description: 'Oversee all property listings' }
      ]
    };

    return [...(roleSpecificActions[role as keyof typeof roleSpecificActions] || []), ...commonActions];
  };

  const getWelcomeMessage = () => {
    const role = profile?.role || 'buyer';
    const roleMessages = {
      buyer: 'Ready to find your next property?',
      agent: 'Ready to help your clients find their dream home?',
      super_admin: 'Welcome to the admin dashboard!'
    };
    
    return roleMessages[role as keyof typeof roleMessages];
  };

  const quickActions = getQuickActions();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Welcome back, {profile?.full_name || 'User'}!
          </h1>
          <p className="text-gray-300">
            {getWelcomeMessage()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getRoleBadge()}
          {getSubscriptionBadge()}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/about')}
            className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
          >
            About Us
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-white/20 hover:border-pickfirst-yellow/30"
          >
            Upgrade Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pickfirst-yellow/10">
                    <Icon className="h-5 w-5 text-pickfirst-yellow" />
                  </div>
                  <CardTitle className="text-base text-white">{action.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm text-gray-300">
                  {action.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="h-2 w-2 rounded-full bg-pickfirst-yellow"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {profile?.role === 'agent' ? 'New listing created' : 'Property search saved'}
                  </p>
                  <p className="text-xs text-gray-400">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="h-2 w-2 rounded-full bg-pickfirst-amber"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {profile?.role === 'super_admin' ? 'User profile updated' : 'Message from agent'}
                  </p>
                  <p className="text-xs text-gray-400">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Your Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-pickfirst-yellow/10">
                <div className="text-2xl font-bold text-pickfirst-yellow">
                  {profile?.role === 'agent' ? '5' : profile?.role === 'super_admin' ? '150' : '12'}
                </div>
                <div className="text-sm text-gray-300">
                  {profile?.role === 'agent' ? 'Active Listings' : profile?.role === 'super_admin' ? 'Total Users' : 'Properties Viewed'}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-pickfirst-amber/10">
                <div className="text-2xl font-bold text-pickfirst-amber">
                  {profile?.role === 'agent' ? '23' : profile?.role === 'super_admin' ? '89' : '3'}
                </div>
                <div className="text-sm text-gray-300">
                  {profile?.role === 'agent' ? 'Inquiries' : profile?.role === 'super_admin' ? 'Active Listings' : 'Saved Searches'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
