import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
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
  Bell,
  User,
  CreditCard,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AgentLayoutSidebarProps {
  children: ReactNode;
}

export const AgentLayoutSidebar = ({ children }: AgentLayoutSidebarProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Agent navigation items
  const agentNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      description: "Overview and metrics"
    },
    {
      title: "Add New Listing",
      url: "#",
      icon: PlusCircle,
      description: "Create property listing",
      onClick: () => {
        // Navigate to dashboard and trigger modal via URL hash
        navigate('/dashboard#add-listing');
        // Dispatch custom event for dashboard to open modal
        window.dispatchEvent(new CustomEvent('openAddListingModal'));
      }
    },
    {
      title: "My Listings",
      url: "/my-listings",
      icon: Home,
      description: "Manage your properties"
    },
    {
      title: "My Clients",
      url: "/my-clients",
      icon: Users,
      description: "Client relationships"
    },
    {
      title: "Appointments",
      url: "/appointments",
      icon: Calendar,
      description: "Scheduled showings"
    },
    {
      title: "Analytics",
      url: "/agent-analytics",
      icon: BarChart3,
      description: "Performance metrics"
    },
    {
      title: "Messages",
      url: "/agent-messages",
      icon: MessageSquare,
      description: "Client communications"
    },
    {
      title: "Leads",
      url: "/agent-leads",
      icon: Phone,
      description: "Follow up prospects"
    },
    {
      title: "Profile Settings",
      url: "/agent-profile",
      icon: Settings,
      description: "Update your profile"
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-black">
        <Sidebar variant="inset" className="bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-r border-pickfirst-yellow/20 [&>div]:bg-gradient-to-b [&>div]:from-gray-900/95 [&>div]:to-black/95">
          <SidebarHeader className="border-b border-pickfirst-yellow/20 p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pickfirst-yellow via-amber-500 to-pickfirst-yellow rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-[pulse_3s_ease-in-out_infinite]"></div>
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo.jpg" 
                    alt="PickFirst Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-wide">PickFirst</span>
                <p className="text-xs text-pickfirst-yellow">Agent Portal</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-pickfirst-yellow">Agent Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {agentNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        tooltip={item.description}
                        className="text-gray-300 hover:text-white hover:bg-pickfirst-yellow/10 data-[active=true]:bg-pickfirst-yellow/20 data-[active=true]:text-pickfirst-yellow"
                      >
                        <a 
                          href={item.url} 
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.onClick) {
                              item.onClick();
                            } else {
                              navigate(item.url);
                            }
                          }}
                          className="flex items-center gap-3"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-pickfirst-yellow/20 p-4">
            <div className="space-y-3">
              {/* Agent Badge */}
              <div className="flex items-center justify-center">
                <Badge className="bg-pickfirst-amber text-black">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Real Estate Agent
                </Badge>
              </div>
              
              {/* User Info */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-pickfirst-yellow/20">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pickfirst-yellow to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                  {profile?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'Agent'}
                  </div>
                  <div className="text-xs text-gray-400">Agent Account</div>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/about')}
                  variant="ghost"
                  className="w-full justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 text-sm"
                  size="sm"
                >
                  <Info className="h-4 w-4 mr-2" />
                  About Us
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1 bg-gradient-to-br from-black via-gray-900 to-black">
          {/* Minimal Header with just trigger and notifications */}
          <header className="sticky top-0 z-10 bg-gradient-to-r from-gray-900/95 to-black/95 backdrop-blur-xl border-b border-pickfirst-yellow/20 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <SidebarTrigger className="text-pickfirst-yellow hover:bg-pickfirst-yellow/10" />
              
              {/* Right Side Actions */}
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                
                <Button
                  onClick={() => navigate('/agent-profile')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </div>
            </div>
          </header>
          
          {/* Main Content - Pages will have their own headers */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
