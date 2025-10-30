import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'new_message'
  | 'appointment_scheduled'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'property_alert'
  | 'new_listing'
  | 'price_change'
  | 'property_sold'
  | 'inquiry_response'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(limit = 50): Promise<{ data: Notification[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'User not authenticated' };
      }

      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: data as Notification[], error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<{ error: any }> {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { error };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }

      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { error };
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<{ error: any }> {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { error };
    }
  }

  /**
   * Create a notification (typically called by backend/triggers)
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, any>
  ): Promise<{ data: Notification | null; error: any }> {
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          link,
          metadata,
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      return { data: data as Notification, error: null };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { data: null, error };
    }
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(callback: (notification: Notification) => void) {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Generate synthetic notifications from existing data
   * This is a helper method to populate notifications from messages, appointments, etc.
   */
  async generateSyntheticNotifications(): Promise<Notification[]> {
    const notifications: Notification[] = [];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return notifications;

      // Get user profile to determine role
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'buyer';
      const messagesLink = userRole === 'agent' ? '/agent-messages' : '/buyer-messages';

      // Get unread messages
      const { data: conversations } = await (supabase as any)
        .from('conversations')
        .select('*, messages(*)')
        .or(`client_id.eq.${user.id},agent_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (conversations) {
        for (const conv of conversations) {
          const unreadMessages = (conv.messages as any[])?.filter(
            (msg: any) => !msg.read && msg.sender_id !== user.id
          ) || [];
          
          if (unreadMessages.length > 0) {
            notifications.push({
              id: `msg-${conv.id}`,
              user_id: user.id,
              type: 'new_message',
              title: 'New Message',
              message: `You have ${unreadMessages.length} unread message${unreadMessages.length > 1 ? 's' : ''}`,
              link: messagesLink,
              read: false,
              created_at: unreadMessages[0].created_at,
              metadata: { conversation_id: conv.id }
            });
          }
        }
      }

      // Get pending appointments
      const appointmentsLink = userRole === 'agent' ? '/appointments' : '/buyer-account-settings?tab=appointments';
      
      const { data: appointments } = await (supabase as any)
        .from('appointments')
        .select('*, property:property_listings(title), agent:profiles!appointments_agent_id_fkey(full_name)')
        .eq(userRole === 'agent' ? 'agent_id' : 'client_id', user.id)
        .in('status', ['scheduled', 'confirmed'])
        .order('date', { ascending: true })
        .limit(5);

      if (appointments) {
        for (const appt of appointments) {
          notifications.push({
            id: `appt-${appt.id}`,
            user_id: user.id,
            type: appt.status === 'confirmed' ? 'appointment_confirmed' : 'appointment_scheduled',
            title: appt.status === 'confirmed' ? 'Appointment Confirmed' : 'New Appointment',
            message: `${appt.appointment_type?.replace('_', ' ')} on ${appt.date} at ${appt.time}`,
            link: appointmentsLink,
            read: false,
            created_at: appt.created_at,
            metadata: { appointment_id: appt.id, property_title: (appt.property as any)?.title }
          });
        }
      }

      // Get recent property alerts
      const { data: alerts } = await (supabase as any)
        .from('property_alerts')
        .select('*, property:property_listings(title, price)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (alerts) {
        for (const alert of alerts) {
          notifications.push({
            id: `alert-${alert.id}`,
            user_id: user.id,
            type: 'property_alert',
            title: 'Property Alert Match',
            message: `New property matches your criteria: ${(alert.property as any)?.title}`,
            link: `/property/${alert.property_id}`,
            read: false,
            created_at: alert.created_at,
            metadata: { property_id: alert.property_id }
          });
        }
      }

      // Sort by created_at descending
      notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    } catch (error) {
      console.error('Error generating synthetic notifications:', error);
    }

    return notifications;
  }
}

export const notificationService = new NotificationService();
