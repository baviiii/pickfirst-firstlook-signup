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
    city?: string;
    state?: string;
    price?: number;
    images?: string[];
    property_type?: string;
  } | null;
  agent?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    company?: string;
    bio?: string;
    location?: string;
    website?: string;
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
   * For agents in buyer mode, shows appointments where they are the client
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

      const userEmail = user.email?.toLowerCase() || profile?.email?.toLowerCase();

      // Check if agent is in buyer mode (check localStorage)
      let isInBuyerMode = false;
      if (profile?.role === 'agent' && typeof window !== 'undefined') {
        const savedViewMode = localStorage.getItem('viewMode');
        isInBuyerMode = savedViewMode === 'buyer';
      }

      // Enhanced query with property and agent details
      // Use direct property_listings join for property info
      const selectQuery = `
        *,
        property:property_listings!appointments_property_id_fkey (
          id,
          title,
          address,
          city,
          state,
          price,
          images,
          property_type
        )
      `;

      // Agents in agent mode: show all their agent-owned appointments
      if (profile?.role === 'agent' && !isInBuyerMode) {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(selectQuery)
          .eq('agent_id', user.id)
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        // Enhance with agent profile details
        const enhancedData = await this.enhanceAppointmentsWithAgentDetails(appointments || []);
        return { data: enhancedData, error };
      }

      // Buyers (including agents in buyer mode): show appointments where they are the client
      // IMPORTANT: appointments.client_id references profiles.id, NOT clients.id
      // So we need to match by profile ID directly
      const conditions: string[] = [];
      
      // Primary: Match by client_id (profile ID) - this is the correct way now
      if (profile?.id) {
        conditions.push(`client_id.eq.${profile.id}`);
      }
      
      // Fallback: Match by email (for appointments created before the schema change)
      if (userEmail) {
        conditions.push(`client_email.eq.${userEmail}`);
      }
      
      let data: AppointmentWithDetails[] | null = null;
      let error: any = null;

      if (conditions.length > 0) {
        const orExpr = conditions.join(',');
        const res = await supabase
          .from('appointments')
          .select(selectQuery)
          .or(orExpr)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        data = res.data as any;
        error = res.error;
      }

      // Additional fallback: attempt email ilike if nothing returned and email present
      if ((!data || data.length === 0) && userEmail) {
        const res2 = await supabase
          .from('appointments')
          .select(selectQuery)
          .ilike('client_email', `%${userEmail}%`)
          .order('date', { ascending: true })
          .order('time', { ascending: true });
        
        // Merge results if any found
        if (res2.data && res2.data.length > 0) {
          data = data ? [...data, ...(res2.data as any)] : (res2.data as any);
          // Remove duplicates based on appointment ID
          const uniqueData = Array.from(new Map((data || []).map((item: any) => [item.id, item])).values());
          data = uniqueData as any;
        }
        error = error || res2.error;
      }

      // Enhance with agent profile details using public profile views
      const enhancedData = await this.enhanceAppointmentsWithAgentDetails(data || []);
      return { data: enhancedData, error };
    } catch (error) {
      return { data: [], error };
    }
  }

  /**
   * Enhance appointments with agent profile details from public views
   * This ensures buyers can see agent information even with RLS restrictions
   */
  private async enhanceAppointmentsWithAgentDetails(
    appointments: any[]
  ): Promise<AppointmentWithDetails[]> {
    if (!appointments || appointments.length === 0) {
      return [];
    }

    // Get unique agent IDs from appointments
    const agentIds = [...new Set(appointments.map(apt => apt.agent_id).filter(Boolean))];

    if (agentIds.length === 0) {
      return appointments.map(apt => ({
        ...apt,
        agent: null
      }));
    }

    // Fetch agent profiles from public views (bypasses RLS)
    const agentProfiles = new Map<string, any>();

    // Try to fetch from agent_public_profiles view first
    for (const agentId of agentIds) {
      try {
        // PRIMARY: Try agent_public_profiles view
        const { data: agentProfile } = await supabase
          .from('agent_public_profiles')
          .select('id, full_name, email, phone, avatar_url, company, bio, location, website')
          .eq('id', agentId)
          .maybeSingle();

        if (agentProfile) {
          agentProfiles.set(agentId, agentProfile);
        } else {
          // FALLBACK: Try RPC function if view doesn't have the agent
          const { data: rpcProfile } = await supabase
            .rpc('get_agent_public_profile', { agent_id: agentId });

          if (rpcProfile && rpcProfile.length > 0) {
            agentProfiles.set(agentId, rpcProfile[0]);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch agent profile for ${agentId}:`, error);
      }
    }

    // Enhance each appointment with agent details
    return appointments.map(apt => ({
      ...apt,
      agent: apt.agent_id && agentProfiles.has(apt.agent_id)
        ? {
            id: agentProfiles.get(apt.agent_id).id,
            full_name: agentProfiles.get(apt.agent_id).full_name || 'Unknown Agent',
            email: agentProfiles.get(apt.agent_id).email,
            phone: agentProfiles.get(apt.agent_id).phone,
            avatar_url: agentProfiles.get(apt.agent_id).avatar_url,
            company: agentProfiles.get(apt.agent_id).company,
            bio: agentProfiles.get(apt.agent_id).bio,
            location: agentProfiles.get(apt.agent_id).location,
            website: agentProfiles.get(apt.agent_id).website,
          }
        : apt.agent || null
    }));
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

      // Get inquiry details with property type
      const { data: inquiry, error: inquiryError } = await supabase
        .from('property_inquiries')
        .select(`
          *,
          property_listings!property_inquiries_property_id_fkey(title, address, property_type)
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
      // This is the primary method to avoid RLS issues when fetching buyer data
      // Also check agent_public_profiles since agents can act as buyers too
      let buyerEmail: string | undefined;
      let buyerName: string | undefined;

      if (inquiry.buyer_id) {
        // PRIMARY: Use buyer_public_profiles view - agents can access this without RLS issues
        const { data: buyerProfile } = await supabase
          .from('buyer_public_profiles')
          .select('email, full_name')
          .eq('id', inquiry.buyer_id)
          .maybeSingle();

        if (buyerProfile) {
          buyerEmail = buyerProfile.email || undefined;
          buyerName = buyerProfile.full_name || undefined;
        } else {
          // SECONDARY: Check if the buyer is actually an agent (agents can inquire in buyer mode)
          const { data: agentProfile } = await supabase
            .from('agent_public_profiles')
            .select('email, full_name')
            .eq('id', inquiry.buyer_id)
            .maybeSingle();

          if (agentProfile) {
            buyerEmail = agentProfile.email || undefined;
            buyerName = agentProfile.full_name || undefined;
          }
        }

        // FALLBACK 1: use RPC helper for buyer if view didn't return data
        if (!buyerEmail) {
          const { data: rpcProfile } = await supabase
            .rpc('get_buyer_public_profile', { buyer_id: inquiry.buyer_id });

          if (rpcProfile && rpcProfile.length > 0) {
            buyerEmail = rpcProfile[0].email || undefined;
            buyerName = rpcProfile[0].full_name || buyerName;
          }
        }

        // FALLBACK 2: use RPC helper for agent if buyer RPC didn't return data
        if (!buyerEmail) {
          const { data: agentRpcProfile } = await supabase
            .rpc('get_agent_public_profile', { agent_id: inquiry.buyer_id });

          if (agentRpcProfile && agentRpcProfile.length > 0) {
            buyerEmail = agentRpcProfile[0].email || undefined;
            buyerName = agentRpcProfile[0].full_name || buyerName;
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

      const normalizedBuyerEmail = buyerEmail.trim().toLowerCase();
      const finalBuyerName = (buyerName || (inquiry as any)?.buyer?.full_name || 'Unknown').trim();

      // Check if the buyer exists in the clients table
      // The client_id in appointments should reference profiles.id (user_id), not clients.id
      let clientId: string | null = null; // This should be the profile ID (user_id), not client record ID
      let clientName = finalBuyerName || 'Unknown';
      
      // Verify the buyer_id exists in profiles table first (required for foreign key)
      // Check both buyer and agent profiles since agents can inquire in buyer mode
      let buyerProfileId: string | null = null;
      if (inquiry.buyer_id) {
        // PRIMARY: Check buyer_public_profiles view
        const { data: buyerProfileCheck } = await supabase
          .from('buyer_public_profiles')
          .select('id')
          .eq('id', inquiry.buyer_id)
          .maybeSingle();
        
        if (buyerProfileCheck) {
          buyerProfileId = inquiry.buyer_id;
        } else {
          // SECONDARY: Check agent_public_profiles view (agents can inquire in buyer mode)
          const { data: agentProfileCheck } = await supabase
            .from('agent_public_profiles')
            .select('id')
            .eq('id', inquiry.buyer_id)
            .maybeSingle();
          
          if (agentProfileCheck) {
            buyerProfileId = inquiry.buyer_id;
          } else {
            // FALLBACK: Check profiles table directly
            const { data: profileCheck } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', inquiry.buyer_id)
              .maybeSingle();
            
            if (profileCheck) {
              buyerProfileId = inquiry.buyer_id;
            }
          }
        }
      }
      
      if (buyerProfileId) {
        // Check if buyer is already a client
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, name, user_id')
          .eq('user_id', buyerProfileId)
          .eq('agent_id', user.id)
          .maybeSingle();
        
        if (existingClient) {
          clientName = existingClient.name || finalBuyerName || 'Unknown';
          // Use user_id (profile ID) for appointments.client_id, not client record ID
          clientId = buyerProfileId;
        } else {
          // Client doesn't exist, create one automatically with property details
          console.log('Buyer not found in clients table, creating client automatically...');
          
          // Get property type from the inquiry's property (already fetched in query)
          const propertyType = (inquiry.property_listings as any)?.property_type;
          
          // Try to create client directly using buyer_id first (more reliable)
          let newClient = null;
          let clientError = null;
          
          if (inquiry.buyer_id && finalBuyerName && normalizedBuyerEmail) {
            // Create client directly using buyer_id and data from buyer_public_profiles view
            // This avoids RLS issues because:
            // 1. We fetched buyer data from buyer_public_profiles view (which agents can access)
            // 2. We're using that data to create the client record
            // 3. The INSERT works because agents have RLS permission to insert clients where agent_id = their own id
            const clientInsert = {
              agent_id: user.id,
              user_id: inquiry.buyer_id, // Buyer ID from inquiry (we have this from the inquiry itself)
              name: finalBuyerName, // From buyer_public_profiles view
              email: normalizedBuyerEmail, // From buyer_public_profiles view
              status: 'lead' as const,
              property_type: propertyType || undefined,
              notes: `Auto-created from property inquiry for ${(inquiry.property_listings as any)?.title || 'property'}`
            };
            
            const { data: directClient, error: directError } = await supabase
              .from('clients')
              .insert(clientInsert)
              .select()
              .single();
            
            if (!directError && directClient) {
              newClient = directClient;
              console.log('✅ Client created directly using buyer_id:', {
                clientId: newClient.id,
                clientName: newClient.name,
                email: newClient.email,
                agentId: user.id
              });
            } else {
              clientError = directError;
              console.warn('Direct client creation failed, trying email lookup method:', directError);
            }
          }
          
          // Fallback to email-based creation if direct creation failed
          if (!newClient && !clientError) {
            const { data: emailClient, error: emailError } = await clientService.createClientByEmail(
              normalizedBuyerEmail,
              {
                status: 'lead', // Default status for leads converted to appointments
                property_type: propertyType, // Pre-fill with property type from inquiry
                notes: `Auto-created from property inquiry for ${(inquiry.property_listings as any)?.title || 'property'}`
              }
            );
            
            newClient = emailClient;
            clientError = emailError;
          }
          
          if (clientError) {
            console.error('Error creating client automatically:', clientError);
            // Log detailed error for debugging
            console.error('Client creation error details:', {
              error: clientError,
              buyerEmail: normalizedBuyerEmail,
              buyerId: inquiry.buyer_id,
              agentId: user.id,
              propertyType: propertyType
            });
            // Don't fail the appointment creation if client creation fails
            // The appointment can still be created without a client_id
            // Error will be logged but appointment will proceed
          } else if (newClient) {
            clientName = newClient.name || finalBuyerName || 'Unknown';
            // Use the profile ID (buyerProfileId) for appointments.client_id, not client record ID
            // The foreign key constraint expects profiles(id), not clients(id)
            // buyerProfileId is already validated to exist in profiles table
            clientId = buyerProfileId; // Always use the validated profile ID
            console.log('✅ Client created successfully:', {
              clientRecordId: newClient.id,
              clientName: newClient.name,
              email: newClient.email,
              agentId: user.id,
              profileId: newClient.user_id,
              appointmentClientId: clientId
            });
          } else {
            console.warn('Client creation returned no error but also no client data');
            // Even if client creation failed, if we have a valid profile ID, we can still create the appointment
            // The appointment can reference the profile directly
            if (buyerProfileId) {
              clientId = buyerProfileId;
            }
          }
        }
      } else {
        // buyer_id doesn't exist in profiles table, can't set client_id
        console.warn(`Buyer ID ${inquiry.buyer_id} not found in profiles table, setting client_id to null`);
        clientId = null;
      }

      const newAppointment: AppointmentInsert = {
        agent_id: user.id,
        inquiry_id: inquiryId,
        client_id: clientId, // Use profile ID (references profiles.id), or null if not found
        client_name: clientName,
        client_email: normalizedBuyerEmail,
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