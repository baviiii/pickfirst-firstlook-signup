import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService } from './auditService';

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

      const newAppointment: AppointmentInsert = {
        agent_id: user.id,
        inquiry_id: inquiryId,
        client_id: inquiry.buyer_id,
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
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const appointmentService = new AppointmentService();