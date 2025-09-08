import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService } from './auditService';
import { CalendarService } from './calendarService';
import { EmailService } from './emailService';

export type Appointment = Tables<'appointments'>;
export type AppointmentInsert = TablesInsert<'appointments'>;
export type AppointmentUpdate = TablesUpdate<'appointments'>;

export interface AppointmentWithDetails extends Appointment {
  client?: {
    name: string;
    email: string;
    phone?: string;
  };
  property?: {
    title: string;
    address: string;
  };
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

class AppointmentService {
  async getAppointments(): Promise<{ data: Appointment[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: [], error: { message: 'User not authenticated' } };
      }

      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'db:read');
      if (!rateLimit.allowed) {
        return { 
          data: [], 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      await auditService.log(user.id, 'VIEW', 'appointments', {
        newValues: { count: data?.length || 0 }
      });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * Get appointments visible to the current user (buyer sees their own, agent sees all)
   */
  async getMyAppointments(): Promise<{ data: Appointment[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: [], error: { message: 'User not authenticated' } };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', user.id)
        .maybeSingle();

      // Agents: show all their agent-owned appointments
      if (profile?.role === 'agent') {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('agent_id', user.id)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        return { data: data || [], error };
      }

      // Buyers: show only appointments for this client (by user id or email)
      let data: Appointment[] | null = null;
      let error: any = null;

      if (profile?.email) {
        const orExpr = `client_id.eq.${user.id},client_email.eq.${profile.email}`;
        const res = await supabase
          .from('appointments')
          .select('*')
          .or(orExpr)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        data = res.data as any;
        error = res.error;
      } else {
        const res = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', user.id)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        data = res.data as any;
        error = res.error;
      }

      // Fallback: attempt email ilike if nothing returned and email present
      if ((!data || data.length === 0) && profile?.email) {
        const res2 = await supabase
          .from('appointments')
          .select('*')
          .ilike('client_email', profile.email)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        data = res2.data as any;
        error = error || res2.error;
      }

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  async createAppointment(appointmentData: Omit<AppointmentInsert, 'agent_id'>): Promise<{ data: Appointment | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'appointment:create');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Validate required fields
      if (!appointmentData.client_name || !appointmentData.client_email) {
        return { data: null, error: { message: 'Client name and email are required' } };
      }

      if (!validateEmail(appointmentData.client_email)) {
        return { data: null, error: { message: 'Invalid email format' } };
      }

      if (!appointmentData.date || !appointmentData.time) {
        return { data: null, error: { message: 'Date and time are required' } };
      }

      // Sanitize inputs
      const newAppointment: AppointmentInsert = {
        ...appointmentData,
        agent_id: user.id,
        client_name: sanitizeInput(appointmentData.client_name),
        client_email: appointmentData.client_email.trim().toLowerCase(),
        client_phone: appointmentData.client_phone ? sanitizeInput(appointmentData.client_phone) : null,
        property_address: appointmentData.property_address ? sanitizeInput(appointmentData.property_address) : 'Virtual/Office Meeting',
        notes: appointmentData.notes ? sanitizeInput(appointmentData.notes) : null,
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(newAppointment)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'appointments', {
          recordId: data.id,
          newValues: { 
            client_name: data.client_name,
            client_email: data.client_email,
            date: data.date,
            time: data.time,
            appointment_type: data.appointment_type
          }
        });

        // Send email notifications and sync to calendar
        await this.sendAppointmentNotifications(data);
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Buyer creates an appointment with a specific agent
   */
  async createAppointmentAsBuyer(
    agentId: string,
    appointmentData: Omit<AppointmentInsert, 'agent_id' | 'client_id' | 'client_name' | 'client_email'>
  ): Promise<{ data: Appointment | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, id')
        .eq('id', user.id)
        .single();

      if (!profile?.email) {
        return { data: null, error: { message: 'Buyer email not found' } };
      }

      if (!appointmentData.date || !appointmentData.time) {
        return { data: null, error: { message: 'Date and time are required' } };
      }

      const newAppointment: AppointmentInsert = {
        ...appointmentData,
        agent_id: agentId,
        client_id: user.id,
        client_name: profile.full_name || 'Buyer',
        client_email: profile.email,
      } as AppointmentInsert;

      const { data, error } = await supabase
        .from('appointments')
        .insert(newAppointment)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'appointments', {
          recordId: data.id,
          newValues: { buyer_created: true, agent_id: agentId }
        });

        await this.sendAppointmentNotifications(data);
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateAppointment(id: string, updates: AppointmentUpdate): Promise<{ data: Appointment | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'UPDATE', 'appointments', {
          recordId: id,
          newValues: updates
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async deleteAppointment(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'User not authenticated' } };
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (!error) {
        await auditService.log(user.id, 'DELETE', 'appointments', {
          recordId: id
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async createAppointmentFromInquiry(
    inquiryId: string,
    appointmentData: {
      date: string;
      time: string;
      appointment_type: string;
      duration?: number;
      notes?: string;
    }
  ): Promise<{ data: Appointment | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Get inquiry details
      const { data: inquiry, error: inquiryError } = await supabase
        .from('property_inquiries')
        .select(`
          *,
          property_listings!inner(title, address),
          profiles!inner(full_name, email, id)
        `)
        .eq('id', inquiryId)
        .single();

      if (inquiryError || !inquiry) {
        return { data: null, error: { message: 'Inquiry not found' } };
      }

      // Check if the buyer exists in the clients table
      let clientId: string | null = null;
      if (inquiry.buyer_id) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('id', inquiry.buyer_id)
          .single();
        
        if (existingClient) {
          clientId = existingClient.id;
        }
      }

      const newAppointment: AppointmentInsert = {
        agent_id: user.id,
        inquiry_id: inquiryId,
        client_id: clientId, // Only set if client exists in clients table
        client_name: inquiry.profiles.full_name || 'Unknown',
        client_email: inquiry.profiles.email,
        property_id: inquiry.property_id,
        property_address: inquiry.property_listings.address,
        appointment_type: appointmentData.appointment_type as any,
        date: appointmentData.date,
        time: appointmentData.time,
        duration: appointmentData.duration || 60,
        notes: appointmentData.notes ? sanitizeInput(appointmentData.notes) : null,
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(newAppointment)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'appointments', {
          recordId: data.id,
          newValues: { 
            created_from_inquiry: inquiryId,
            client_name: data.client_name,
            appointment_type: data.appointment_type
          }
        });

        // Send email notifications and sync to calendar
        await this.sendAppointmentNotifications(data);
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Send appointment notifications (email and calendar sync)
   */
  private async sendAppointmentNotifications(appointment: Appointment): Promise<void> {
    try {
      // Get agent information
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', appointment.agent_id)
        .single();

      if (!agentProfile) {
        console.error('Agent profile not found for appointment notifications');
        return;
      }

      // Send email notifications
      await this.sendEmailNotifications(appointment, agentProfile);

      // Sync to calendar
      await this.syncToCalendar(appointment, agentProfile);
    } catch (error) {
      console.error('Error sending appointment notifications:', error);
    }
  }

  /**
   * Send email notifications for appointment
   */
  private async sendEmailNotifications(
    appointment: Appointment,
    agentProfile: { full_name: string; email: string; phone?: string }
  ): Promise<void> {
    try {
      // Send confirmation email to client
      await EmailService.sendAppointmentConfirmation(
        appointment.client_email,
        appointment.client_name,
        {
          propertyTitle: appointment.property_address,
          date: appointment.date,
          time: appointment.time,
          agentName: agentProfile.full_name || 'Your Agent',
          agentPhone: agentProfile.phone || ''
        }
      );

      // Send notification email to agent
      await EmailService.sendAppointmentNotification(
        agentProfile.email,
        agentProfile.full_name,
        {
          clientName: appointment.client_name,
          clientEmail: appointment.client_email,
          clientPhone: appointment.client_phone || 'Not provided',
          appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
          date: appointment.date,
          time: appointment.time,
          duration: appointment.duration,
          location: appointment.property_address,
          notes: appointment.notes || 'No additional notes',
          appointmentId: appointment.id
        }
      );
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  }

  /**
   * Sync appointment to calendar
   */
  private async syncToCalendar(
    appointment: Appointment,
    agentProfile: { full_name: string; email: string; phone?: string }
  ): Promise<void> {
    try {
      await CalendarService.createCalendarEvent(
        appointment,
        agentProfile.full_name || 'Your Agent',
        agentProfile.email,
        agentProfile.phone
      );
    } catch (error) {
      console.error('Error syncing to calendar:', error);
    }
  }
}

export const appointmentService = new AppointmentService();