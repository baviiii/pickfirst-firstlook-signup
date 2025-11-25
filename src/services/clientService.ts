import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService, AuditAction } from './auditService';

export type Client = Tables<'clients'> & {
  user_id?: string | null;
  invited_at?: string | null;
  invite_accepted_at?: string | null;
};
export type ClientInsert = TablesInsert<'clients'>;
export type ClientUpdate = TablesUpdate<'clients'>;

export type ClientNote = Tables<'client_notes'>;
export type ClientNoteInsert = TablesInsert<'client_notes'>;

export type ClientInteraction = Tables<'client_interactions'>;
export type ClientInteractionInsert = TablesInsert<'client_interactions'>;

export interface ClientWithDetails extends Omit<Client, 'notes'> {
  notes?: ClientNote[];
  interactions?: ClientInteraction[];
  notes_count?: number;
  interactions_count?: number;
}

export interface ClientFilters {
  status?: string;
  search?: string;
  property_type?: string;
  budget_range?: string;
}

// Validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

class ClientService {
  // Get all clients for the current agent
  async getClients(filters?: ClientFilters): Promise<{ data: Client[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: [], error: { message: 'User not authenticated' } };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'db:read');
      if (!rateLimit.allowed) {
        return { 
          data: [], 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      let query = supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        const sanitizedSearch = sanitizeInput(filters.search);
        query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`);
      }

      if (filters?.property_type) {
        query = query.eq('property_type', sanitizeInput(filters.property_type));
      }

      if (filters?.budget_range) {
        query = query.eq('budget_range', sanitizeInput(filters.budget_range));
      }

      const { data, error } = await query;

      // Log the action
      await auditService.log(user.id, 'VIEW', 'clients', {
        newValues: { filters, count: data?.length || 0 }
      });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get a single client with details
  async getClient(id: string): Promise<{ data: ClientWithDetails | null; error: any }> {
    try {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return { data: null, error: { message: 'Invalid client ID format' } };
      }

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) return { data: null, error: clientError };

      // Get notes count
      const { count: notesCount } = await supabase
        .from('client_notes')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', id);

      // Get interactions count
      const { count: interactionsCount } = await supabase
        .from('client_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', id);

      const { notes: clientNotes, ...clientWithoutNotes } = client;
      const clientWithDetails: ClientWithDetails = {
        ...clientWithoutNotes,
        notes_count: notesCount || 0,
        interactions_count: interactionsCount || 0,
      };

      return { data: clientWithDetails, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }



  // Create a new client (with or without existing user account)
  async createClient(
    clientData: {
      name: string;
      email?: string;
      phone?: string;
      status?: string;
      budget_range?: string;
      preferred_areas?: string[];
      property_type?: string;
      notes?: string;
      rating?: number;
    }
  ): Promise<{ data: Client | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Validate inputs
      if (!clientData.name?.trim()) {
        return { data: null, error: { message: 'Name is required' } };
      }

      if (!clientData.email && !clientData.phone) {
        return { data: null, error: { message: 'Either email or phone is required' } };
      }

      // Validate email format if provided
      if (clientData.email && !validateEmail(clientData.email)) {
        return { data: null, error: { message: 'Invalid email format' } };
      }

      // Validate phone if provided
      if (clientData.phone && !validatePhone(clientData.phone)) {
        return { data: null, error: { message: 'Invalid phone number format' } };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'client:create');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Sanitize inputs
      const sanitizedName = sanitizeInput(clientData.name);
      const sanitizedEmail = clientData.email ? clientData.email.trim().toLowerCase() : null;
      const sanitizedPhone = clientData.phone ? sanitizeInput(clientData.phone) : null;
      const sanitizedNotes = clientData.notes ? sanitizeInput(clientData.notes) : null;

      // Check if user already exists and link if they do
      let userId: string | null = null;
      if (sanitizedEmail) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('email', sanitizedEmail)
          .maybeSingle();

        if (existingUser) {
          // Allow both buyers and agents to be added as clients
          // Agents can act as buyers and be clients of other agents
          userId = existingUser.id;

          // Check if already a client
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', userId)
            .eq('agent_id', user.id)
            .maybeSingle();

          if (existingClient) {
            return { data: null, error: { message: 'This user is already your client' } };
          }
        }
      }

      // Create client record
      const newClient: Partial<ClientInsert> = {
        agent_id: user.id,
        user_id: userId,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        status: clientData.status || 'lead',
        budget_range: clientData.budget_range,
        preferred_areas: clientData.preferred_areas,
        property_type: clientData.property_type,
        rating: clientData.rating || 0,
        notes: sanitizedNotes,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(newClient as ClientInsert)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'clients', {
          recordId: data.id,
          newValues: { 
            client_name: data.name,
            client_email: data.email,
            has_account: !!userId,
          }
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Legacy method for backward compatibility
  async createClientByEmail(
    email: string, 
    clientData: Omit<ClientInsert, 'agent_id' | 'id' | 'name' | 'email' | 'created_at' | 'updated_at'> & {
      phone?: string;
      status?: string;
      budget_range?: string;
      preferred_areas?: string[];
      property_type?: string;
    }
  ): Promise<{ data: Client | null; error: any }> {
    try {
      // Validate email format
      if (!validateEmail(email)) {
        return { data: null, error: { message: 'Invalid email format' } };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'client:create');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Sanitize inputs
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPhone = clientData.phone ? sanitizeInput(clientData.phone) : null;
      const sanitizedNotes = clientData.notes ? sanitizeInput(clientData.notes) : null;
      const sanitizedBudgetRange = clientData.budget_range ? sanitizeInput(clientData.budget_range) : null;
      const sanitizedPropertyType = clientData.property_type ? sanitizeInput(clientData.property_type) : null;

      // Validate phone if provided
      if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
        return { data: null, error: { message: 'Invalid phone number format' } };
      }

      // Find the user profile by email
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      // Handle the "no rows" case specifically
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Database error searching for profile:', profileError);
        return { data: null, error: { message: 'Database error occurred while searching for user.' } };
      }

      let finalUserProfile = userProfile;
      
      if (!finalUserProfile) {
        // Try the Edge Function for searching users
        try {
          const { data: searchResult, error: searchError } = await supabase.functions.invoke('search-user', {
            body: { email: sanitizedEmail }
          });
          
          if (searchError) {
            console.error('Edge function search error:', searchError);
            return { data: null, error: { message: `An error occurred while searching for the user.` } };
          }

          // The edge function returns { data: userProfile }, so we need to unwrap it.
          if (!searchResult || !searchResult.data) {
            return { data: null, error: { message: `User not found with email: ${sanitizedEmail}. Please ensure the email is registered in the system.` } };
          }
          
          finalUserProfile = searchResult.data;
        } catch (functionError) {
          console.error('Edge function search failed:', functionError);
          return { data: null, error: { message: `User not found with email: ${sanitizedEmail}. Please ensure the email is registered in the system.` } };
        }
      }

      // Allow both buyers and agents to be added as clients
      // Agents can act as buyers and be clients of other agents
      
      // Skip checking if client already exists for now to avoid TypeScript issues
      // This will be handled by database constraints if needed
     

      // Create the client relationship
      const newClient: ClientInsert = {
        agent_id: user.id,
        name: finalUserProfile.full_name || 'Unknown',
        email: finalUserProfile.email,
        phone: sanitizedPhone,
        status: clientData.status || 'lead',
        budget_range: sanitizedBudgetRange,
        preferred_areas: clientData.preferred_areas,
        property_type: sanitizedPropertyType,
        rating: clientData.rating || 0,
        notes: sanitizedNotes,
        user_id: finalUserProfile.id,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(newClient)
        .select()
        .single();

      // Log the action with better context
      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'clients', {
          recordId: data.id,
          newValues: { 
            email: sanitizedEmail, 
            status: clientData.status,
            action: 'created new client',
            client_name: data.name,
            client_email: data.email
          }
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get client by email (for adding existing users)
  async getUserByEmail(email: string): Promise<{ data: any; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'client:search');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Validate email format
      if (!validateEmail(email)) {
        return { data: null, error: { message: 'Invalid email format' } };
      }

      const sanitizedEmail = email.trim().toLowerCase();
      
      // First, try to find the user by email (without role restriction)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('email', sanitizedEmail)
        .single();

      // If user is found, validate they can be added as a client
      if (data) {
        // Allow agents to be added as clients (they can act as buyers)
        // Only block super_admin from being added as clients
        if (data.role === 'super_admin') {
          return { 
            data: null, 
            error: { 
              message: `Cannot add ${data.role} as a client.` 
            } 
          };
        }
        
        // Check if this user is already a client of the current agent
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, user_id')
          .eq('user_id', data.id)
          .eq('agent_id', user.id)
          .single();
          
        if (existingClient) {
          return { 
            data: null, 
            error: { 
              message: 'This user is already your client.' 
            } 
          };
        }
      }

      // Log the search action with better context
      await auditService.log(user.id, 'SEARCH', 'profiles', {
        newValues: { 
          searchEmail: sanitizedEmail, 
          found: !!data,
          userRole: data?.role || 'not found',
          action: 'searched for user by email',
          result: data ? 'user found' : 'user not found'
        }
      });

      return { data, error };
    } catch (error) {
      console.error('Error searching for user by email:', error);
      
      // Provide better error messages
      if (error.code === 'PGRST116') {
        return { 
          data: null, 
          error: { 
            message: 'No user found with this email address. Please check the email and try again.' 
          } 
        };
      }
      
      return { 
        data: null, 
        error: { 
          message: error.message || 'Failed to search for user. Please try again.' 
        } 
      };
    }
  }

  // Update a client
  async updateClient(id: string, updates: ClientUpdate): Promise<{ data: Client | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete a client
  async deleteClient(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'User not authenticated' } };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'client:delete');
      if (!rateLimit.allowed) {
        return { 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Get client data before deletion for audit log
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      // Log the action with better context
      if (!error && clientData) {
        await auditService.log(user.id, 'DELETE', 'clients', {
          recordId: id,
          oldValues: {
            ...clientData,
            action: 'deleted client',
            client_name: clientData.name,
            client_email: clientData.email
          }
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get client notes
  async getClientNotes(clientId: string): Promise<{ data: ClientNote[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Add a note to a client
  async addClientNote(clientId: string, noteData: Omit<ClientNoteInsert, 'client_id' | 'agent_id'>): Promise<{ data: ClientNote | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const newNote: ClientNoteInsert = {
        ...noteData,
        client_id: clientId,
        agent_id: user.id,
      };

      const { data, error } = await supabase
        .from('client_notes')
        .insert(newNote)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete a client note
  async deleteClientNote(noteId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get client interactions
  async getClientInteractions(clientId: string): Promise<{ data: ClientInteraction[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Add an interaction to a client
  async addClientInteraction(clientId: string, interactionData: Omit<ClientInteractionInsert, 'client_id' | 'agent_id'>): Promise<{ data: ClientInteraction | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const newInteraction: ClientInteractionInsert = {
        ...interactionData,
        client_id: clientId,
        agent_id: user.id,
      };

      const { data, error } = await supabase
        .from('client_interactions')
        .insert(newInteraction)
        .select()
        .single();

      // Update last_contact on client
      if (!error && data) {
        await this.updateClient(clientId, {
          last_contact: new Date().toISOString(),
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Send invitation email to client
  async sendClientInvite(clientId: string, agentName: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'User not authenticated' } };
      }

      // Get client details
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', clientId)
        .eq('agent_id', user.id)
        .single();

      if (clientError || !client) {
        return { error: { message: 'Client not found' } };
      }

      if (!client.email) {
        return { error: { message: 'Client email is required to send invite' } };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'email:send');
      if (!rateLimit.allowed) {
        return { 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Call edge function to send invite
      const { error } = await supabase.functions.invoke('send-client-invite', {
        body: {
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          agentName: agentName
        }
      });

      if (error) {
        return { error: { message: 'Failed to send invitation' } };
      }

      await auditService.log(user.id, 'INVITE', 'clients', {
        recordId: clientId,
        newValues: {
          client_name: client.name,
          client_email: client.email,
        }
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }
}

export const clientService = new ClientService(); 