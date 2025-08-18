import { supabase } from '@/integrations/supabase/client';

export interface DashboardMetrics {
  totalUsers: number;
  totalProperties: number;
  totalRevenue: number;
  totalAlerts: number;
  usersByRole: { [key: string]: number };
  propertiesByStatus: { [key: string]: number };
  recentActivity: ActivityItem[];
  monthlyRevenue: number;
  quarterlyRevenue: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  user_name: string;
  timestamp: string;
  table_name: string;
  details?: string;
}

export interface AgentMetrics {
  totalListings: number;
  totalClients: number;
  totalAppointments: number;
  totalInquiries: number;
  monthlyRevenue: number;
  activeListings: number;
  pendingListings: number;
  approvedListings: number;
  recentActivity: ActivityItem[];
  upcomingAppointments: any[];
}

export interface BuyerMetrics {
  totalInquiries: number;
  totalFavorites: number;
  totalConversations: number;
  recentActivity: ActivityItem[];
  recommendedProperties: any[];
  savedSearches: number;
}

class AnalyticsService {
  async getAdminMetrics(): Promise<{ data: DashboardMetrics | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Get user counts by role
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('role');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      const usersByRole = profiles?.reduce((acc, profile) => {
        acc[profile.role] = (acc[profile.role] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }) || {};

      // Get property counts by status
      const { data: properties, error: propertiesError } = await supabase
        .from('property_listings')
        .select('status');

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
      }

      const propertiesByStatus = properties?.reduce((acc, property) => {
        acc[property.status] = (acc[property.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }) || {};

      // Get system alerts count
      const { count: alertsCount } = await supabase
        .from('system_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      // Get recent activity from audit logs
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          table_name,
          created_at,
          new_values,
          profiles:user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const formattedActivity: ActivityItem[] = recentActivity?.map(activity => ({
        id: activity.id,
        action: activity.action,
        user_name: (activity.profiles as any)?.full_name || 'Unknown User',
        timestamp: activity.created_at,
        table_name: activity.table_name,
        details: typeof activity.new_values === 'object' && activity.new_values ? (activity.new_values as any)?.action || '' : ''
      })) || [];

      // Calculate revenue (mock for now, replace with real billing data)
      const monthlyRevenue = Math.floor(Math.random() * 50000) + 25000;
      const quarterlyRevenue = monthlyRevenue * 3;

      const metrics: DashboardMetrics = {
        totalUsers: profiles?.length || 0,
        totalProperties: properties?.length || 0,
        totalRevenue: quarterlyRevenue,
        totalAlerts: alertsCount || 0,
        usersByRole,
        propertiesByStatus,
        recentActivity: formattedActivity,
        monthlyRevenue,
        quarterlyRevenue
      };

      return { data: metrics, error: null };
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      return { data: null, error };
    }
  }

  async getAgentMetrics(): Promise<{ data: AgentMetrics | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Get agent's property listings
      const { data: listings, error: listingsError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('agent_id', user.id);

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
      }

      // Get agent's clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.id);

      // Get agent's appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('agent_id', user.id);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      }

      // Get property inquiries for agent's properties
      const { count: inquiriesCount } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .in('property_id', listings?.map(l => l.id) || []);

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedActivity: ActivityItem[] = recentActivity?.map(activity => ({
        id: activity.id,
        action: activity.action,
        user_name: 'You',
        timestamp: activity.created_at,
        table_name: activity.table_name,
        details: typeof activity.new_values === 'object' && activity.new_values ? (activity.new_values as any)?.action || '' : ''
      })) || [];

      // Get upcoming appointments
      const today = new Date().toISOString().split('T')[0];
      const upcomingAppointments = appointments?.filter(apt => apt.date >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5) || [];

      const metrics: AgentMetrics = {
        totalListings: listings?.length || 0,
        totalClients: clientsCount || 0,
        totalAppointments: appointments?.length || 0,
        totalInquiries: inquiriesCount || 0,
        monthlyRevenue: Math.floor(Math.random() * 15000) + 5000,
        activeListings: listings?.filter(l => l.status === 'approved').length || 0,
        pendingListings: listings?.filter(l => l.status === 'pending').length || 0,
        approvedListings: listings?.filter(l => l.status === 'approved').length || 0,
        recentActivity: formattedActivity,
        upcomingAppointments
      };

      return { data: metrics, error: null };
    } catch (error) {
      console.error('Error fetching agent metrics:', error);
      return { data: null, error };
    }
  }

  async getBuyerMetrics(): Promise<{ data: BuyerMetrics | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Get buyer's inquiries
      const { count: inquiriesCount } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id);

      // Get buyer's favorites
      const { count: favoritesCount } = await supabase
        .from('property_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', user.id);

      // Get buyer's conversations
      const { count: conversationsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id);

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedActivity: ActivityItem[] = recentActivity?.map(activity => ({
        id: activity.id,
        action: activity.action,
        user_name: 'You',
        timestamp: activity.created_at,
        table_name: activity.table_name,
        details: typeof activity.new_values === 'object' && activity.new_values ? (activity.new_values as any)?.action || '' : ''
      })) || [];

      // Get recommended properties (approved listings)
      const { data: recommendedProperties } = await supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(6);

      const metrics: BuyerMetrics = {
        totalInquiries: inquiriesCount || 0,
        totalFavorites: favoritesCount || 0,
        totalConversations: conversationsCount || 0,
        recentActivity: formattedActivity,
        recommendedProperties: recommendedProperties || [],
        savedSearches: Math.floor(Math.random() * 5) + 1 // Mock data
      };

      return { data: metrics, error: null };
    } catch (error) {
      console.error('Error fetching buyer metrics:', error);
      return { data: null, error };
    }
  }
}

export const analyticsService = new AnalyticsService();