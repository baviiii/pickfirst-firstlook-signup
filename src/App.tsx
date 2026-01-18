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
import FAQ from "./pages/FAQ";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
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
// Also handles email verification links to force manual login
const AuthHashRedirect = () => {
  useEffect(() => {
    const hasAuthHash = typeof window !== 'undefined' && window.location.hash && (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('refresh_token') ||
      window.location.hash.includes('type=')
    );
    
    // Check on any path, not just root (Supabase can redirect to different paths)
    if (hasAuthHash) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const type = hashParams.get('type');
      
      // Email verification, signup, and invite flows should force login (no auto-login)
      const isVerificationFlow = type === 'signup' || type === 'invite' || type === 'email';
      const isRecoveryFlow = type === 'recovery';
      
      const base = import.meta.env.BASE_URL || '';
      const basePath = `${base.endsWith('/') ? base.slice(0, -1) : base}`;
      
      // For verification flows, always redirect to login page and sign out
      if (isVerificationFlow) {
        // Sign out immediately to prevent auto-login (synchronous if possible)
        supabase.auth.signOut().then(() => {
          const targetPath = `${basePath}/auth?tab=signin&showConfirm=1`;
          // Clear hash to prevent Supabase from processing it
          window.location.replace(`${window.location.origin}${targetPath}`);
        }).catch((error) => {
          console.error('Error signing out:', error);
          // Still redirect even if sign out fails
          const targetPath = `${basePath}/auth?tab=signin&showConfirm=1`;
          window.location.replace(`${window.location.origin}${targetPath}`);
        });
      } else if (isRecoveryFlow) {
        // Password reset flow - prevent auto-login by signing out first
        // Sign out immediately to prevent Supabase from creating a session from hash tokens
        supabase.auth.signOut().then(() => {
          const targetPath = `${basePath}/reset-password`;
          // Keep hash in URL so ResetPasswordForm can extract tokens
          window.location.replace(`${window.location.origin}${targetPath}${window.location.hash}`);
        }).catch((error) => {
          console.error('Error signing out before password reset:', error);
          // Still redirect even if sign out fails
          const targetPath = `${basePath}/reset-password`;
          window.location.replace(`${window.location.origin}${targetPath}${window.location.hash}`);
        });
      } else {
        // Other auth flows (e.g., magic link) - redirect to dashboard
        const targetPath = `${basePath}/dashboard`;
        window.location.replace(`${window.location.origin}${targetPath}${window.location.hash}`);
      }
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
              <Route path="/about" element={<RoleBasedLayout><About /></RoleBasedLayout>} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
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
