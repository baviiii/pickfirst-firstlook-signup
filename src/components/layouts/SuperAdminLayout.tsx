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
  Settings, 
  Database,
  Shield,
  BarChart3,
  Bell,
  LogOut,
  User,
  FileText,
  AlertTriangle,
  Lock,
  Server,
  TestTube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Super Admin navigation items
  const adminNavItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      description: "Overview and metrics"
    },
    {
      title: "User Management",
      url: "/admin-users",
      icon: Users,
      description: "Manage all users"
    },
    {
      title: "Property Management",
      url: "/admin-properties",
      icon: FileText,
      description: "Manage all properties"
    },
    {
      title: "Platform Settings",
      url: "/platform-settings",
      icon: Settings,
      description: "System configuration"
    },
    {
      title: "Feature Gates",
      url: "/platform-settings#features",
      icon: Shield,
      description: "Manage feature flags"
    },
    {
      title: "Security & Permissions",
      url: "/security-permissions",
      icon: Lock,
      description: "Security settings"
    },
    {
      title: "Database Management",
      url: "/database-management",
      icon: Database,
      description: "Database operations"
    },
    {
      title: "System Logs",
      url: "/system-logs",
      icon: FileText,
      description: "View system logs"
    },
    {
      title: "System Alerts",
      url: "/system-alerts",
      icon: AlertTriangle,
      description: "System alerts"
    },
    {
      title: "Platform Analytics",
      url: "/platform-analytics",
      icon: BarChart3,
      description: "Platform metrics"
    },
    {
      title: "Login History",
      url: "/login-history",
      icon: Server,
      description: "User login history"
    },
    {
      title: "System Testing",
      url: "/system-testing",
      icon: TestTube,
      description: "System tests"
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <Sidebar variant="inset" className="bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-r border-red-500/20 [&>div]:bg-gradient-to-b [&>div]:from-gray-900/95 [&>div]:to-black/95">
          <SidebarHeader className="border-b border-red-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Shield className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">Super Admin</h2>
                <p className="text-xs text-gray-400 truncate">{profile?.email || 'Admin'}</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-red-400">Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        tooltip={item.description}
                        className="text-gray-300 hover:text-white hover:bg-red-500/10 data-[active=true]:bg-red-500/20 data-[active=true]:text-red-400"
                      >
                        <a 
                          href={item.url} 
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.url.includes('#')) {
                              navigate(item.url.split('#')[0]);
                              // Small delay to ensure page loads before scrolling
                              setTimeout(() => {
                                const hash = item.url.split('#')[1];
                                const element = document.getElementById(hash);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth' });
                                }
                              }, 100);
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
          
          <SidebarFooter className="border-t border-red-500/20 p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10">
                <User className="h-4 w-4 text-red-400" />
                <span className="text-sm text-white truncate">{profile?.full_name || 'Admin'}</span>
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="sticky top-0 z-10 bg-black/50 backdrop-blur border-b border-red-500/20 px-4 py-3 flex items-center gap-4">
            <SidebarTrigger className="text-red-400 hover:bg-red-500/10" />
            <div className="flex-1" />
            <NotificationDropdown />
            <Badge className="bg-red-500 text-white">Super Admin</Badge>
          </div>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

