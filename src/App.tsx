
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
