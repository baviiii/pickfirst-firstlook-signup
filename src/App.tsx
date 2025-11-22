import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ViewModeProvider } from "@/hooks/useViewMode";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/ComingSoon";
import Auth from "./pages/Auth";
import Registration from "./pages/Registration";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminPropertyManagementPage from './pages/AdminPropertyManagement';
import AdminUserManagementPage from './pages/AdminUserManagement';
import DatabaseManagementPage from './pages/DatabaseManagement';
import SystemAlertsPage from './pages/SystemAlerts';
import SystemLogsPage from './pages/SystemLogs';
import PlatformSettingsPage from './pages/PlatformSettings';
import SecurityPermissionsPage from './pages/SecurityPermissions';
import PlatformAnalyticsPage from './pages/PlatformAnalytics';
import MyClientsPage from './pages/MyClients';
import AppointmentsPage from './pages/Appointments';
import AgentAnalyticsPage from './pages/AgentAnalytics';
import AgentMessagesPage from './pages/AgentMessages';
import AgentLeadsPage from './pages/AgentLeads';
import AgentProfilePage from './pages/AgentProfile';
import MyListingsPage from './pages/MyListings';
import BuyerMessagesPage from './pages/BuyerMessages';
import BrowsePropertiesPage from './pages/BrowsePropertiesSimple';
import SavedPropertiesPage from './pages/SavedProperties';
import PropertyMapPage from './pages/PropertyMap';
import SearchFiltersPage from './pages/SearchFilters';
import BuyerAccountSettingsPage from './pages/BuyerAccountSettings';
import ProfileSettingsPage from './pages/ProfileSettings';
import SubscriptionManagementPage from './pages/SubscriptionManagement';
import PropertyDetails from './pages/PropertyDetails';
import SystemTestingPage from './pages/SystemTesting';
import LoginHistoryManagementPage from './pages/LoginHistoryManagement';
import OffMarketListings from './pages/OffMarketListings';
import NotificationsPage from './pages/Notifications';
import { RoleBasedLayout } from './components/layouts/RoleBasedLayout';
import RealApp from './pages/RealApp';

const queryClient = new QueryClient();

// Ensure Supabase auth hash callbacks land on the dashboard route for onboarding
const AuthHashRedirect = () => {
  useEffect(() => {
    const hasAuthHash = typeof window !== 'undefined' && window.location.hash && (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('refresh_token') ||
      window.location.hash.includes('type=')
    );
    const onRootPath = window.location.pathname === '/' || window.location.pathname === import.meta.env.BASE_URL;
    if (hasAuthHash && onRootPath) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const type = hashParams.get('type');
      const isSignupFlow = type === 'signup' || type === 'invite';
      const base = import.meta.env.BASE_URL || '';
      const basePath = `${base.endsWith('/') ? base.slice(0, -1) : base}`;
      const targetPath = isSignupFlow ? `${basePath}/auth?tab=signin&showConfirm=1` : `${basePath}/dashboard`;
      const newUrl = `${window.location.origin}${targetPath}${isSignupFlow ? '' : window.location.hash}`;
      if (isSignupFlow) {
        supabase.auth.signOut().catch(console.error);
      }
      window.location.replace(newUrl);
    }
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ViewModeProvider>
        <SubscriptionProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthHashRedirect />
            <Routes>
              {/* Public Routes - No Authentication Required */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/signup" element={<Registration />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/browse-properties" element={<RoleBasedLayout><BrowsePropertiesPage /></RoleBasedLayout>} />
              <Route path="/property-map" element={<RoleBasedLayout><PropertyMapPage /></RoleBasedLayout>} />
              <Route path="/property/:id" element={<RoleBasedLayout><PropertyDetails /></RoleBasedLayout>} />
              
              {/* Protected Routes - Authentication Required */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile-settings" element={<ProtectedRoute><RoleBasedLayout><ProfileSettingsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/subscription-management" element={<ProtectedRoute><RoleBasedLayout><SubscriptionManagementPage /></RoleBasedLayout></ProtectedRoute>} />
              
              {/* Admin Routes - Admin Role Required */}
              <Route path="/admin-properties" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><AdminPropertyManagementPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/admin-users" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><AdminUserManagementPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/database-management" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><DatabaseManagementPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/system-alerts" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><SystemAlertsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/system-logs" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><SystemLogsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/platform-settings" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><PlatformSettingsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/security-permissions" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><SecurityPermissionsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/platform-analytics" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><PlatformAnalyticsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/system-testing" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><SystemTestingPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/login-history" element={<ProtectedRoute requiredRole="super_admin"><RoleBasedLayout><LoginHistoryManagementPage /></RoleBasedLayout></ProtectedRoute>} />
              
              {/* Agent Routes - Agent Role Required */}
              <Route path="/my-clients" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><MyClientsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><AppointmentsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/agent-analytics" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><AgentAnalyticsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/agent-messages" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><AgentMessagesPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/agent-leads" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><AgentLeadsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/agent-profile" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><AgentProfilePage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/my-listings" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><MyListingsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/agent-notifications" element={<ProtectedRoute requiredRole="agent"><RoleBasedLayout><NotificationsPage /></RoleBasedLayout></ProtectedRoute>} />
              
              {/* Buyer Routes - Buyer Role Required */}
              <Route path="/buyer-messages" element={<ProtectedRoute requiredRole="buyer"><RoleBasedLayout><BuyerMessagesPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/saved-properties" element={<ProtectedRoute requiredRole="buyer"><RoleBasedLayout><SavedPropertiesPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/search-filters" element={<ProtectedRoute requiredRole="buyer"><RoleBasedLayout><SearchFiltersPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/buyer-account-settings" element={<ProtectedRoute requiredRole="buyer"><RoleBasedLayout><BuyerAccountSettingsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/off-market" element={<ProtectedRoute requiredRole="buyer"><RoleBasedLayout><OffMarketListings /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><RoleBasedLayout><NotificationsPage /></RoleBasedLayout></ProtectedRoute>} />
              <Route path="/home" element={<RealApp />} />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
      </ViewModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
