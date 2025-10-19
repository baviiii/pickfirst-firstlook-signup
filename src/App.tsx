import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              {/* Public Routes - No Authentication Required */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/signup" element={<Registration />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/browse-properties" element={<BrowsePropertiesPage />} />
              <Route path="/property-map" element={<PropertyMapPage />} />
              <Route path="/property/:id" element={<PropertyDetails />} />
              
              {/* Protected Routes - Authentication Required */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
              <Route path="/subscription-management" element={<ProtectedRoute><SubscriptionManagementPage /></ProtectedRoute>} />
              
              {/* Admin Routes - Admin Role Required */}
              <Route path="/admin-properties" element={<ProtectedRoute requiredRole="super_admin"><AdminPropertyManagementPage /></ProtectedRoute>} />
              <Route path="/admin-users" element={<ProtectedRoute requiredRole="super_admin"><AdminUserManagementPage /></ProtectedRoute>} />
              <Route path="/database-management" element={<ProtectedRoute requiredRole="super_admin"><DatabaseManagementPage /></ProtectedRoute>} />
              <Route path="/system-alerts" element={<ProtectedRoute requiredRole="super_admin"><SystemAlertsPage /></ProtectedRoute>} />
              <Route path="/system-logs" element={<ProtectedRoute requiredRole="super_admin"><SystemLogsPage /></ProtectedRoute>} />
              <Route path="/platform-settings" element={<ProtectedRoute requiredRole="super_admin"><PlatformSettingsPage /></ProtectedRoute>} />
              <Route path="/security-permissions" element={<ProtectedRoute requiredRole="super_admin"><SecurityPermissionsPage /></ProtectedRoute>} />
              <Route path="/platform-analytics" element={<ProtectedRoute requiredRole="super_admin"><PlatformAnalyticsPage /></ProtectedRoute>} />
              <Route path="/system-testing" element={<ProtectedRoute requiredRole="super_admin"><SystemTestingPage /></ProtectedRoute>} />
              <Route path="/login-history" element={<ProtectedRoute requiredRole="super_admin"><LoginHistoryManagementPage /></ProtectedRoute>} />
              
              {/* Agent Routes - Agent Role Required */}
              <Route path="/my-clients" element={<ProtectedRoute requiredRole="agent"><MyClientsPage /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute requiredRole="agent"><AppointmentsPage /></ProtectedRoute>} />
              <Route path="/agent-analytics" element={<ProtectedRoute requiredRole="agent"><AgentAnalyticsPage /></ProtectedRoute>} />
              <Route path="/agent-messages" element={<ProtectedRoute requiredRole="agent"><AgentMessagesPage /></ProtectedRoute>} />
              <Route path="/agent-leads" element={<ProtectedRoute requiredRole="agent"><AgentLeadsPage /></ProtectedRoute>} />
              <Route path="/agent-profile" element={<ProtectedRoute requiredRole="agent"><AgentProfilePage /></ProtectedRoute>} />
              <Route path="/my-listings" element={<ProtectedRoute requiredRole="agent"><MyListingsPage /></ProtectedRoute>} />
              
              {/* Buyer Routes - Buyer Role Required */}
              <Route path="/buyer-messages" element={<ProtectedRoute requiredRole="buyer"><BuyerMessagesPage /></ProtectedRoute>} />
              <Route path="/saved-properties" element={<ProtectedRoute requiredRole="buyer"><SavedPropertiesPage /></ProtectedRoute>} />
              <Route path="/search-filters" element={<ProtectedRoute requiredRole="buyer"><SearchFiltersPage /></ProtectedRoute>} />
              <Route path="/buyer-account-settings" element={<ProtectedRoute requiredRole="buyer"><BuyerAccountSettingsPage /></ProtectedRoute>} />
              <Route path="/off-market" element={<ProtectedRoute requiredRole="buyer"><OffMarketListings /></ProtectedRoute>} />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
