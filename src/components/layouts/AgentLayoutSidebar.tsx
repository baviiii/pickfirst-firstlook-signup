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
      <div className="flex min-h-screen w-full pickfirst-bg relative overflow-hidden">
        {/* Animated Flowing Water Background - Multiple Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50"></div>
        
        {/* Flowing Gradient Waves */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
            style={{
              background: 'radial-gradient(circle at 30% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)',
              animation: 'flow1 25s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute w-[200%] h-[200%] -top-1/2 -right-1/2"
            style={{
              background: 'radial-gradient(circle at 70% 50%, rgba(245, 158, 11, 0.25) 0%, transparent 50%)',
              animation: 'flow2 30s ease-in-out infinite',
              animationDelay: '5s'
            }}
          />
          <div 
            className="absolute w-[200%] h-[200%] -bottom-1/2 -left-1/2"
            style={{
              background: 'radial-gradient(circle at 40% 50%, rgba(249, 115, 22, 0.2) 0%, transparent 50%)',
              animation: 'flow3 35s ease-in-out infinite',
              animationDelay: '10s'
            }}
          />
        </div>

        {/* Floating Liquid Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.2) 40%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'floatBlob1 20s ease-in-out infinite',
              top: '10%',
              left: '20%'
            }}
          />
          <div 
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(249, 115, 22, 0.2) 40%, transparent 70%)',
              filter: 'blur(50px)',
              animation: 'floatBlob2 25s ease-in-out infinite',
              bottom: '15%',
              right: '15%',
              animationDelay: '7s'
            }}
          />
        </div>

        {/* Texture + shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.03) 50%, transparent 70%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 15s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(180,83,9,0.02)_1px,transparent_0)] bg-[length:32px_32px] pointer-events-none" />

        {/* Keyframes for background animation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes flow1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(30%, 20%) rotate(120deg); }
            66% { transform: translate(-20%, 30%) rotate(240deg); }
          }
          @keyframes flow2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(-25%, -15%) rotate(-120deg); }
            66% { transform: translate(25%, -25%) rotate(-240deg); }
          }
          @keyframes flow3 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(20%, -20%) rotate(180deg); }
          }
          @keyframes floatBlob1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(50px, -80px) scale(1.1); }
            66% { transform: translate(-80px, 50px) scale(0.9); }
          }
          @keyframes floatBlob2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-60px, 70px) scale(1.15); }
            66% { transform: translate(70px, -60px) scale(0.95); }
          }
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        ` }} />

        <Sidebar variant="inset" className="pickfirst-glass bg-card/90 backdrop-blur-2xl border-r border-pickfirst-yellow/30 [&>div]:bg-transparent">
          <SidebarHeader className="border-b border-pickfirst-yellow/20 p-4">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/dashboard')}
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-pickfirst-amber to-primary rounded-xl blur-md opacity-50 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative w-10 h-10 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-center overflow-hidden">
                  <Home className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div>
                <span className="font-bold text-foreground text-lg tracking-wide">PickFirst</span>
                <p className="text-xs text-muted-foreground">Agent Portal</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground">Agent Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {agentNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        tooltip={item.description}
                        className="text-muted-foreground hover:text-foreground hover:bg-card/80 hover:border-pickfirst-yellow/40 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border-primary/40"
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
                <Badge className="bg-primary text-primary-foreground">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Real Estate Agent
                </Badge>
              </div>
              
              {/* User Info */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 border border-pickfirst-yellow/30">
                <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
                  {profile?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {profile?.full_name || 'Agent'}
                  </div>
                  <div className="text-xs text-muted-foreground">Agent Account</div>
                </div>
              </div>
              
              {/* Footer Actions */}
              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/about')}
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-card/80 text-sm"
                  size="sm"
                >
                  <Info className="h-4 w-4 mr-2" />
                  About Us
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 text-sm"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1 pickfirst-bg">
          {/* Minimal Header with just trigger and notifications */}
          <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-pickfirst-yellow/20 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <SidebarTrigger className="text-foreground hover:bg-card/80 hover:border-pickfirst-yellow/40" />
              
              {/* Right Side Actions */}
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                
                <Button
                  onClick={() => navigate('/agent-profile')}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-card/80"
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
