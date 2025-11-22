import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { AdvancedSearchDropdown } from '@/components/search/AdvancedSearchDropdown';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Settings, 
  PlusCircle, 
  BarChart3, 
  Calendar, 
  Phone, 
  LogOut,
  CreditCard,
  Info,
  Menu,
  X,
  ShoppingBag,
  UserCog
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AgentLayoutSidebarProps {
  children: ReactNode;
}

export const AgentLayoutSidebar = ({ children }: AgentLayoutSidebarProps) => {
  const { profile, signOut } = useAuth();
  const { viewMode, toggleViewMode, canSwitchToBuyer } = useViewMode();
  const navigate = useNavigate();
  
  // State management - Start with sidebar closed for cleaner look
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Agent navigation items configuration
  const agentActions = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      description: 'Overview and metrics', 
      color: 'bg-yellow-600/10 text-yellow-700', 
      onClick: () => navigate('/dashboard') 
    },
    { 
      icon: PlusCircle, 
      label: 'Add New Listing', 
      description: 'Create property listing', 
      color: 'bg-green-600/10 text-green-700', 
      onClick: () => {
        navigate('/dashboard#add-listing');
        window.dispatchEvent(new CustomEvent('openAddListingModal'));
      }
    },
    { 
      icon: Home, 
      label: 'My Listings', 
      description: 'Manage your properties', 
      color: 'bg-blue-600/10 text-blue-700', 
      onClick: () => navigate('/my-listings') 
    },
    { 
      icon: Users, 
      label: 'My Clients', 
      description: 'Client relationships', 
      color: 'bg-purple-600/10 text-purple-700', 
      onClick: () => navigate('/my-clients') 
    },
    { 
      icon: Calendar, 
      label: 'Appointments', 
      description: 'Scheduled showings', 
      color: 'bg-orange-600/10 text-orange-700', 
      onClick: () => navigate('/appointments') 
    },
    { 
      icon: BarChart3, 
      label: 'Analytics', 
      description: 'Performance metrics', 
      color: 'bg-indigo-600/10 text-indigo-700', 
      onClick: () => navigate('/agent-analytics') 
    },
    { 
      icon: MessageSquare, 
      label: 'Messages', 
      description: 'Client communications', 
      color: 'bg-pickfirst-yellow/10 text-yellow-700', 
      onClick: () => navigate('/agent-messages') 
    },
    { 
      icon: Phone, 
      label: 'Leads', 
      description: 'Follow up prospects', 
      color: 'bg-pink-600/10 text-pink-700', 
      onClick: () => navigate('/agent-leads') 
    },
    { 
      icon: Settings, 
      label: 'Profile Settings', 
      description: 'Update your profile', 
      color: 'bg-gray-500/10 text-gray-600', 
      onClick: () => navigate('/agent-profile') 
    }
  ];

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-white">

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Floating Sidebar with Lighter Glass Effect */}
      <aside className={`${
        sidebarOpen ? 'lg:w-80' : 'lg:w-0'
      } ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } 
      w-80 transition-all duration-500 ease-out flex flex-col h-screen fixed lg:relative top-0 z-40 overflow-hidden`}>
        {/* Sidebar background */}
        <div className="absolute inset-0 bg-white border-r border-gray-200"></div>
        
        <div className="relative z-10 flex flex-col h-full">
        
        {/* Elegant Sidebar Header */}
        <div className="p-6 border-b border-border/60">
          <div className="flex items-center justify-between">
            {/* Premium Logo Design */}
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-all duration-300"
              onClick={() => navigate('/dashboard')}
            >
              <div className="relative group">
                {/* Animated glow ring */}
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition duration-700 animate-[pulse_4s_ease-in-out_infinite]"></div>
                
                {/* Logo container */}
                <div className="relative w-12 h-12 rounded-2xl bg-card shadow-2xl shadow-yellow-600/20 flex items-center justify-center overflow-hidden ring-2 ring-pickfirst-yellow/40 group-hover:ring-pickfirst-yellow/60 transition-all duration-300 p-1">
                  <div className="w-full h-full rounded-xl bg-card flex items-center justify-center overflow-hidden">
                    <img 
                      src="/logo.jpg" 
                      alt="PickFirst Logo" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div>
                <span className="font-bold text-foreground text-xl tracking-tight">PickFirst</span>
                <div className="text-xs text-muted-foreground font-medium">Agent Portal</div>
              </div>
            </div>
            
            {/* Elegant Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSidebarOpen(false);
                setMobileMenuOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-xl transition-all duration-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Beautiful Navigation Items */}
        <nav className="flex-1 p-5 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-pickfirst-yellow/30 scrollbar-track-transparent">
          {agentActions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setSidebarOpen(false);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 rounded-2xl transition-all duration-300 justify-start px-4 py-4 hover:bg-card/80 hover:shadow-lg hover:shadow-yellow-600/10 border border-transparent hover:border-pickfirst-yellow/40 group relative hover:-translate-y-0.5"
              >
                {/* Icon with floating effect */}
                <div className={`p-3 rounded-xl ${action.color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg shadow-yellow-600/10`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                {/* Text content */}
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {action.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Luxurious Sidebar Footer */}
        <div className="p-5 border-t border-gray-200 space-y-4 bg-white">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Your Account</span>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                Real Estate Agent
              </Badge>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <Button
              onClick={() => navigate('/about')}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted text-sm rounded-xl transition-all duration-300"
              size="sm"
            >
              <Info className="h-4 w-4 mr-2" />
              About PickFirst
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-500/10 text-sm rounded-xl transition-all duration-300"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        </div>
      </aside>

      {/* Main Content with Floating Card Effect */}
      <main className="flex-1 transition-all duration-500 ease-out overflow-y-auto h-screen flex flex-col relative">
        {/* Elegant Floating Header */}
        <header className="sticky top-0 z-50 mx-4 mt-4 mb-2 rounded-2xl bg-white shadow-md border border-gray-200">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            {/* Left: Logo (when sidebar collapsed) + Menu Toggle */}
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-all duration-300"
                  onClick={() => navigate('/dashboard')}
                >
                  <img 
                    src="/logo.jpg" 
                    alt="PickFirst Logo" 
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                  <span className="hidden md:inline font-bold text-foreground text-lg tracking-tight">PickFirst</span>
                </div>
              )}
              <Button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileMenuOpen(!mobileMenuOpen);
                  } else {
                    setSidebarOpen(!sidebarOpen);
                  }
                }}
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-muted rounded-xl transition-all duration-300"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Center: Premium Search (desktop only) */}
            <div className="hidden lg:flex flex-1 max-w-2xl">
              <AdvancedSearchDropdown />
            </div>

            {/* Right: Buyer Mode Toggle, Notifications & Profile */}
            <div className="flex items-center gap-3">
              {/* Beautiful Buyer Mode Toggle Button */}
              {canSwitchToBuyer && (
                <Button
                  onClick={() => {
                    toggleViewMode();
                  }}
                  variant="outline"
                  size="sm"
                  className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300/50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-400/70 hover:text-blue-800 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 group"
                >
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="relative flex items-center gap-2">
                    {viewMode === 'agent' ? (
                      <>
                        <ShoppingBag className="h-4 w-4 transition-transform group-hover:scale-110" />
                        <span className="hidden sm:inline font-medium">Buyer Mode</span>
                      </>
                    ) : (
                      <>
                        <UserCog className="h-4 w-4 transition-transform group-hover:scale-110" />
                        <span className="hidden sm:inline font-medium">Agent Mode</span>
                      </>
                    )}
                  </div>
                </Button>
              )}

              <NotificationDropdown />

              <div
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/80 border border-border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                onClick={() => navigate('/agent-profile')}
                role="button"
                tabIndex={0}
              >
                <div className="relative">
                  {/* Avatar */}
                  <div className="relative h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm ring-2 ring-primary/20">
                    {profile?.full_name?.charAt(0) || 'A'}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-foreground">{profile?.full_name || 'Agent'}</div>
                  <div className="text-xs text-muted-foreground font-medium">Real Estate Agent</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Search Bar */}
        <div className="lg:hidden px-4 mb-2 z-40">
          <AdvancedSearchDropdown />
        </div>

        {/* Content Area - Floating Card Style */}
        <div className="flex-1 px-4 pb-4">
          <div className="h-full rounded-2xl bg-white shadow-sm border border-gray-200 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
