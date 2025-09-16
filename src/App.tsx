
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import BrowsePropertiesPage from './pages/BrowseProperties';
import SavedPropertiesPage from './pages/SavedProperties';
import PropertyMapPage from './pages/PropertyMap';
import SearchFiltersPage from './pages/SearchFilters';
import BuyerAccountSettingsPage from './pages/BuyerAccountSettings';
import ProfileSettingsPage from './pages/ProfileSettings';
import PropertyDetails from './pages/PropertyDetails';
import SystemTestingPage from './pages/SystemTesting';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Registration />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin-properties" element={<AdminPropertyManagementPage />} />
            <Route path="/admin-users" element={<AdminUserManagementPage />} />
            <Route path="/database-management" element={<DatabaseManagementPage />} />
            <Route path="/system-alerts" element={<SystemAlertsPage />} />
            <Route path="/system-logs" element={<SystemLogsPage />} />
            <Route path="/platform-settings" element={<PlatformSettingsPage />} />
            <Route path="/security-permissions" element={<SecurityPermissionsPage />} />
            <Route path="/platform-analytics" element={<PlatformAnalyticsPage />} />
            <Route path="/my-clients" element={<MyClientsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/agent-analytics" element={<AgentAnalyticsPage />} />
            <Route path="/agent-messages" element={<AgentMessagesPage />} />
            <Route path="/agent-leads" element={<AgentLeadsPage />} />
            <Route path="/agent-profile" element={<AgentProfilePage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/buyer-messages" element={<BuyerMessagesPage />} />
            <Route path="/browse-properties" element={<BrowsePropertiesPage />} />
            <Route path="/saved-properties" element={<SavedPropertiesPage />} />
            <Route path="/property-map" element={<PropertyMapPage />} />
            <Route path="/search-filters" element={<SearchFiltersPage />} />
            <Route path="/buyer-account-settings" element={<BuyerAccountSettingsPage />} />
            <Route path="/profile-settings" element={<ProfileSettingsPage />} />
            <Route path="/property/:id" element={<PropertyDetails />} />
            <Route path="/system-testing" element={<SystemTestingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
