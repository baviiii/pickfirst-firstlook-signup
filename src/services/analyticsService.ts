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

export interface AgentAnalytics {
  active_listings: number;
  total_sales: number;
  monthly_sales: number;
  weekly_sales: number;
  monthly_revenue: number;
  avg_sale_price: number;
  total_clients: number;
  total_appointments: number;
  monthly_appointments: number;
  total_inquiries: number;
  monthly_inquiries: number;
}

export interface MonthlyPerformance {
  month: string;
  listings: number;
  showings: number;
  sales: number;
  revenue: number;
}

export interface ClientSource {
  source: string;
  count: number;
  value: number; // percentage
}

export interface PropertyTypeData {
  type: string;
  sold: number;
  avg_price: number;
}

export interface WeeklyActivity {
  day: string;
  calls: number;
  emails: number;
  showings: number;
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
      const monthlyRevenue = 0;
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
        monthlyRevenue: 0,
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
        savedSearches: 0
      };

      return { data: metrics, error: null };
    } catch (error) {
      console.error('Error fetching buyer metrics:', error);
      return { data: null, error };
    }
  }

  static async getAgentAnalytics(agentId: string): Promise<{ data: AgentAnalytics | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_analytics')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching agent analytics:', error);
      return { data: null, error };
    }
  }

  static async getMonthlyPerformance(agentId: string, months: number = 6): Promise<{ data: MonthlyPerformance[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_monthly_performance')
        .select('*')
        .eq('agent_id', agentId)
        .order('month', { ascending: false })
        .limit(months);

      if (error) throw error;

      // Transform data for charts
      const transformedData = (data || []).map(item => ({
        month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' }),
        listings: item.listings || 0,
        showings: item.showings || 0,
        sales: item.sales || 0,
        revenue: item.revenue || 0
      })).reverse();

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error fetching monthly performance:', error);
      return { data: [], error };
    }
  }

  static async getClientSources(agentId: string): Promise<{ data: ClientSource[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_client_sources')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;

      const total = (data || []).reduce((sum, item) => sum + item.count, 0);
      
      const transformedData = (data || []).map(item => ({
        name: item.source,
        source: item.source,
        count: item.count,
        value: total > 0 ? Math.round((item.count / total) * 100) : 0
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error fetching client sources:', error);
      return { data: [], error };
    }
  }

  static async getPropertyTypeAnalytics(agentId: string): Promise<{ data: PropertyTypeData[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('property_listings')
        .select('property_type, sold_price')
        .eq('agent_id', agentId)
        .eq('status', 'sold');

      if (error) throw error;

      // Group by property type
      const typeMap = new Map<string, { sold: number; prices: number[] }>();
      
      (data || []).forEach(item => {
        const type = item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1);
        if (!typeMap.has(type)) {
          typeMap.set(type, { sold: 0, prices: [] });
        }
        const typeData = typeMap.get(type)!;
        typeData.sold++;
        if (item.sold_price) {
          typeData.prices.push(item.sold_price);
        }
      });

      const transformedData = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        sold: data.sold,
        avg_price: data.prices.length > 0 
          ? Math.round(data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length)
          : 0
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error fetching property type analytics:', error);
      return { data: [], error };
    }
  }

  static async getWeeklyActivity(agentId: string): Promise<{ data: WeeklyActivity[]; error: any }> {
    
    const weeklyData: WeeklyActivity[] = [
      { day: 'Mon', calls: 0, emails: 0, showings: 0 },
      { day: 'Tue', calls: 0, emails: 0, showings: 0 },
      { day: 'Wed', calls: 0, emails: 0, showings: 0 },
      { day: 'Thu', calls: 0, emails: 0, showings: 0 },
      { day: 'Fri', calls: 0, emails: 0, showings: 0 },
      { day: 'Sat', calls: 0, emails: 0, showings: 0 },
      { day: 'Sun', calls: 0, emails: 0, showings: 0 },
    ];

    try {
      // Get appointments (showings) by day of week
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('date')
        .eq('agent_id', agentId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (appointmentError) throw appointmentError;

      // Get client interactions for calls/emails (if available)
      const { data: interactionData, error: interactionError } = await supabase
        .from('client_interactions')
        .select('interaction_type, created_at')
        .eq('agent_id', agentId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Initialize weekly data
     

      // Process appointments (showings)
      (appointmentData || []).forEach(appointment => {
        const dayIndex = new Date(appointment.date).getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert Sunday=0 to Sunday=6
        weeklyData[adjustedIndex].showings++;
      });

      // Process interactions (calls/emails)
      (interactionData || []).forEach(interaction => {
        const dayIndex = new Date(interaction.created_at).getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        
        if (interaction.interaction_type === 'call') {
          weeklyData[adjustedIndex].calls++;
        } else if (interaction.interaction_type === 'email') {
          weeklyData[adjustedIndex].emails++;
        }
      });

      return { data: weeklyData, error: null };
    } catch (error) {
      console.error('Error fetching weekly activity:', error);
      // Return mock data if no interactions table exists
      return { data: weeklyData, error: null };
    }
  }

  async calculateAverageResponseTime(agentId: string): Promise<{ averageMinutes: number | null; error: any }> {
    try {
      // Get conversations where the agent is a participant
      const { data: conversations, error: convosError } = await supabase
        .from('conversations')
        .select('id')
        .eq('agent_id', agentId)
        .limit(50); // Limit to recent 50 conversations for performance

      if (convosError) throw convosError;
      if (!conversations || conversations.length === 0) {
        return { averageMinutes: null, error: null };
      }

      const conversationIds = conversations.map(c => c.id);
      let totalResponseMinutes = 0;
      let validResponseCount = 0;

      // For each conversation, get messages and calculate response time
      for (const convoId of conversationIds) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, created_at, sender_id')
          .eq('conversation_id', convoId)
          .order('created_at', { ascending: true });

        if (messagesError || !messages || messages.length < 2) {
          continue; // Not enough messages to calculate a response
        }

        // Find the first message from a non-agent sender
        const firstClientMessage = messages.find(m => m.sender_id !== agentId);
        if (!firstClientMessage) continue;

        // Find the first agent reply after the client's message
        const firstAgentReply = messages.find(m => 
          m.sender_id === agentId && 
          new Date(m.created_at) > new Date(firstClientMessage.created_at)
        );

        if (firstAgentReply) {
          const clientTime = new Date(firstClientMessage.created_at).getTime();
          const agentTime = new Date(firstAgentReply.created_at).getTime();
          const responseMinutes = (agentTime - clientTime) / (1000 * 60);
          
          totalResponseMinutes += responseMinutes;
          validResponseCount++;
        }
      }

      if (validResponseCount === 0) {
        return { averageMinutes: null, error: null };
      }

      const averageMinutes = totalResponseMinutes / validResponseCount;
      return { averageMinutes, error: null };

    } catch (error) {
      console.error('Error calculating average response time:', error);
      return { averageMinutes: null, error };
    }
  }
}

export { AnalyticsService };
export const analyticsService = new AnalyticsService();