import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService } from './auditService';
import { CalendarService } from './calendarService';
import { EmailService } from './emailService';
import { notificationService } from './notificationService';
import { clientService } from './clientService';

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
    id: string;
    title: string;
    address: string;
  } | null;
  agent?: {
    id: string;
    full_name: string;
  } | null;
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
  async getMyAppointments(): Promise<{ data: AppointmentWithDetails[]; error: any }> {
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
      const selectQuery = `
        *,
        property:property_listings (id, title, address),
        agent:profiles (id, full_name)
      `;
      let data: AppointmentWithDetails[] | null = null;
      let error: any = null;

      if (profile?.email) {
        const orExpr = `client_id.eq.${user.id},client_email.eq.${profile.email}`;
        const res = await supabase
          .from('appointments')
          .select(selectQuery)
          .or(orExpr)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        data = res.data as any;
        error = res.error;
      } else {
        const res = await supabase
          .from('appointments')
          .select(selectQuery)
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
          .select(selectQuery)
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
        property_id: appointmentData.property_id || null,
        property_address: appointmentData.property_address 
          ? sanitizeInput(appointmentData.property_address) 
          : (appointmentData.appointment_type === 'property_showing' ? 'Address Not Specified' : 'Virtual/Office Meeting'),
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

        // Create notification for the buyer/client
        if (data.client_id) {
          await notificationService.createNotification(
            data.client_id,
            'appointment_scheduled',
            'New Appointment Scheduled',
            `Appointment scheduled for ${data.date} at ${data.time}`,
            '/buyer-account-settings?tab=appointments',
            { appointment_id: data.id, property_id: data.property_id }
          ).catch(err => console.error('Failed to create notification:', err));
        }

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
        throw new Error('User not authenticated');
      }

      // Get the current appointment to check permissions and send notifications
      const { data: currentAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentAppointment) {
        throw new Error('Appointment not found');
      }

      // Check permissions - agents can update their appointments, buyers can only confirm/decline
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      const isAgent = profile?.role === 'agent';
      const isBuyer = profile?.role === 'buyer';
      const isAppointmentOwner = currentAppointment.agent_id === user.id;
      const isAppointmentClient = currentAppointment.client_id === user.id || 
                                 currentAppointment.client_email === profile?.email;

      // Validate permissions based on status change
      if (updates.status) {
        if (isBuyer && isAppointmentClient) {
          // Buyers can only confirm or decline scheduled appointments
          if (!['confirmed', 'declined'].includes(updates.status) || 
              currentAppointment.status !== 'scheduled') {
            throw new Error('Invalid status change for buyer');
          }
        } else if (isAgent && isAppointmentOwner) {
          // Agents can manage all statuses except buyer-specific actions
          if (!['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(updates.status)) {
            throw new Error('Invalid status for agent');
          }
        } else {
          throw new Error('Unauthorized to update this appointment');
        }
      } else if (!isAgent || !isAppointmentOwner) {
        throw new Error('Unauthorized to update this appointment');
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        await auditService.log(user.id, 'UPDATE', 'appointments', {
          recordId: id,
          newValues: updates,
          oldValues: { status: currentAppointment.status }
        });

        // Create notifications for status changes
        if (updates.status && updates.status !== currentAppointment.status) {
          // Notify buyer/client about status changes
          if (data.client_id && updates.status === 'confirmed') {
            await notificationService.createNotification(
              data.client_id,
              'appointment_confirmed',
              'Appointment Confirmed',
              `Your appointment on ${data.date} at ${data.time} has been confirmed`,
              '/buyer-account-settings?tab=appointments',
              { appointment_id: data.id }
            ).catch(err => console.error('Failed to create notification:', err));
          } else if (data.client_id && updates.status === 'cancelled') {
            await notificationService.createNotification(
              data.client_id,
              'appointment_cancelled',
              'Appointment Cancelled',
              `Your appointment on ${data.date} at ${data.time} has been cancelled`,
              '/buyer-account-settings?tab=appointments',
              { appointment_id: data.id }
            ).catch(err => console.error('Failed to create notification:', err));
          }

          // Send email notifications for status changes
          await this.sendStatusChangeNotifications(data, currentAppointment.status, updates.status as string, profile?.role as string);
        }
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
          property_listings!property_inquiries_property_id_fkey(title, address)
        `)
        .eq('id', inquiryId)
        .single();

      if (inquiryError) {
        console.error('Error fetching inquiry:', inquiryError);
        return { data: null, error: { message: inquiryError.message || 'Inquiry not found' } };
      }

      if (!inquiry) {
        console.error('Inquiry not found for ID:', inquiryId);
        return { data: null, error: { message: 'Inquiry not found' } };
      }

      // Get buyer information using public profile view (bypasses RLS)
      let buyerEmail: string | undefined;
      let buyerName: string | undefined;

      if (inquiry.buyer_id) {
        const { data: buyerProfile } = await supabase
          .from('buyer_public_profiles')
          .select('email, full_name')
          .eq('id', inquiry.buyer_id)
          .maybeSingle();

        if (buyerProfile) {
          buyerEmail = buyerProfile.email || undefined;
          buyerName = buyerProfile.full_name || undefined;
        }

        // Fallback: use RPC helper if view didn't return data
        if (!buyerEmail) {
          const { data: rpcProfile } = await supabase
            .rpc('get_buyer_public_profile', { buyer_id: inquiry.buyer_id });

          if (rpcProfile && rpcProfile.length > 0) {
            buyerEmail = rpcProfile[0].email || undefined;
            buyerName = rpcProfile[0].full_name || buyerName;
          }
        }

        // Final fallback: direct profiles table (may still be blocked by RLS)
        if (!buyerEmail) {
          const { data: directProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', inquiry.buyer_id)
            .maybeSingle();

          if (directProfile) {
            buyerEmail = directProfile.email || undefined;
            buyerName = directProfile.full_name || buyerName;
          }
        }
      }

      if (!buyerEmail) {
        return { data: null, error: { message: 'Buyer email not found in inquiry' } };
      }

      // Check if the buyer exists in the clients table
      let clientId: string | null = null;
      let clientName = buyerName || 'Unknown';
      
      if (inquiry.buyer_id) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', inquiry.buyer_id)
          .eq('agent_id', user.id)
          .single();
        
        if (existingClient) {
          clientId = existingClient.id;
          clientName = existingClient.name || buyerName || 'Unknown';
        } else {
          // Client doesn't exist, create one automatically
          console.log('Buyer not found in clients table, creating client automatically...');
          
          const { data: newClient, error: clientError } = await clientService.createClientByEmail(
            buyerEmail,
            {
              status: 'lead', // Default status for leads converted to appointments
              notes: `Auto-created from property inquiry for ${(inquiry.property_listings as any)?.title || 'property'}`
            }
          );
          
          if (clientError) {
            console.error('Error creating client automatically:', clientError);
            // Continue without client_id - appointment can still be created
          } else if (newClient) {
            clientId = newClient.id;
            clientName = newClient.name || buyerName || 'Unknown';
            console.log('Client created successfully:', newClient.id);
          }
        }
      }

      const newAppointment: AppointmentInsert = {
        agent_id: user.id,
        inquiry_id: inquiryId,
        client_id: clientId, // Set if client exists or was just created
        client_name: clientName,
        client_email: buyerEmail,
        property_id: inquiry.property_id,
        property_address: (inquiry.property_listings as any)?.address || '',
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
   * Send email notifications for appointment status changes
   */
  private async sendStatusChangeNotifications(
    appointment: Appointment,
    oldStatus: string,
    newStatus: string,
    userRole?: string
  ): Promise<void> {
    try {
      // Get agent information
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', appointment.agent_id)
        .single();

      if (!agentProfile) {
        console.error('Agent profile not found for status change notifications');
        return;
      }
      // Determine who should receive the notification based on who made the change
      const isAgentMakingChange = userRole === 'agent';
      const isBuyerMakingChange = userRole === 'buyer';
      // Send appropriate email based on status change
      switch (newStatus) {
        case 'confirmed':
          if (isBuyerMakingChange) {
            // Buyer confirmed - notify agent
            await EmailService.sendAppointmentStatusUpdate(
              agentProfile.email,
              agentProfile.full_name,
              {
                clientName: appointment.client_name,
                clientEmail: appointment.client_email,
                appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
                date: appointment.date,
                time: appointment.time,
                location: appointment.property_address,
                status: 'confirmed',
                statusMessage: 'Your client has confirmed the appointment'
              }
            );
          } else if (isAgentMakingChange) {
            // Agent confirmed - notify client
            await EmailService.sendAppointmentStatusUpdate(
              appointment.client_email,
              appointment.client_name,
              {
                clientName: appointment.client_name,
                agentName: agentProfile.full_name,
                appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
                date: appointment.date,
                time: appointment.time,
                location: appointment.property_address,
                status: 'confirmed',
                statusMessage: 'Your appointment has been confirmed'
              }
            );
          }
          break;

        case 'declined':
          // Notify agent that buyer declined
          await EmailService.sendAppointmentStatusUpdate(
            agentProfile.email,
            agentProfile.full_name,
            {
              clientName: appointment.client_name,
              clientEmail: appointment.client_email,
              appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
              date: appointment.date,
              time: appointment.time,
              location: appointment.property_address,
              status: 'declined',
              statusMessage: 'Your client has declined the appointment'
            }
          );
          break;

        case 'scheduled':
          // Rescheduled: notify both client and agent
          // Notify client
          await EmailService.sendAppointmentStatusUpdate(
            appointment.client_email,
            appointment.client_name,
            {
              clientName: appointment.client_name,
              agentName: agentProfile.full_name,
              appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
              date: appointment.date,
              time: appointment.time,
              location: appointment.property_address,
              status: 'rescheduled',
              statusMessage: 'Your appointment has been rescheduled'
            }
          );
          // Notify agent
          await EmailService.sendAppointmentStatusUpdate(
            agentProfile.email,
            agentProfile.full_name,
            {
              clientName: appointment.client_name,
              clientEmail: appointment.client_email,
              appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
              date: appointment.date,
              time: appointment.time,
              location: appointment.property_address,
              status: 'rescheduled',
              statusMessage: isBuyerMakingChange ? 'Client rescheduled the appointment' : 'You rescheduled the appointment'
            }
          );
          break;

        case 'cancelled':
          // Notify client that appointment was cancelled
          await EmailService.sendAppointmentStatusUpdate(
            appointment.client_email,
            appointment.client_name,
            {
              clientName: appointment.client_name,
              agentName: agentProfile.full_name,
              appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
              date: appointment.date,
              time: appointment.time,
              location: appointment.property_address,
              status: 'cancelled',
              statusMessage: 'Your appointment has been cancelled'
            }
          );
          break;

        case 'completed':
          // Send completion confirmation to client
          await EmailService.sendAppointmentStatusUpdate(
            appointment.client_email,
            appointment.client_name,
            {
              clientName: appointment.client_name,
              agentName: agentProfile.full_name,
              appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
              date: appointment.date,
              time: appointment.time,
              location: appointment.property_address,
              status: 'completed',
              statusMessage: 'Your appointment has been completed'
            }
          );
          break;

        case 'no_show':
          // Notify agent about no-show
          await EmailService.sendAppointmentStatusUpdate(
            agentProfile.email,
            agentProfile.full_name,
            {
              clientName: appointment.client_name,
              clientEmail: appointment.client_email,
              appointmentType: appointment.appointment_type.replace('_', ' ').toUpperCase(),
              date: appointment.date,
              time: appointment.time,
              location: appointment.property_address,
              status: 'no_show',
              statusMessage: 'Client did not show up for the appointment'
            }
          );
          break;
      }
    } catch (error) {
      console.error('Error sending status change notifications:', error);
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