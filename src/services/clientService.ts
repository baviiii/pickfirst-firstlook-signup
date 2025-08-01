import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService, AuditAction } from './auditService';

export type Client = Tables<'clients'>;
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

  // Create a new client by linking to an existing user
  async createClientByEmail(email: string, clientData: Omit<ClientInsert, 'agent_id' | 'id' | 'name' | 'email'>): Promise<{ data: Client | null; error: any }> {
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

      // First, find the user profile by email
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('email', sanitizedEmail)
        .single();

      if (profileError || !userProfile) {
        return { data: null, error: { message: 'User not found. Please ensure the email is registered in the system.' } };
      }

      // Check if user is a buyer
      if (userProfile.role !== 'buyer') {
        return { data: null, error: { message: 'Only registered buyers can be added as clients.' } };
      }

      // Check if client relationship already exists
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', user.id)
        .eq('id', userProfile.id)
        .single();

      if (existingClient) {
        return { data: null, error: { message: 'This user is already your client.' } };
      }

      // Create the client relationship
      const newClient: ClientInsert = {
        id: userProfile.id, // Use the user's profile ID as client ID
        agent_id: user.id,
        name: userProfile.full_name || 'Unknown',
        email: userProfile.email,
        phone: sanitizedPhone,
        status: clientData.status || 'lead',
        budget_range: sanitizedBudgetRange,
        preferred_areas: clientData.preferred_areas,
        property_type: sanitizedPropertyType,
        rating: clientData.rating || 0,
        notes: sanitizedNotes,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(newClient)
        .select()
        .single();

      // Log the action
      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'clients', {
          recordId: data.id,
          newValues: { email: sanitizedEmail, status: clientData.status }
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('email', sanitizedEmail)
        .eq('role', 'buyer')
        .single();

      // Log the search action
      await auditService.log(user.id, 'SEARCH', 'profiles', {
        newValues: { searchEmail: sanitizedEmail, found: !!data }
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
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

      // Log the action
      if (!error && clientData) {
        await auditService.log(user.id, 'DELETE', 'clients', {
          recordId: id,
          oldValues: clientData
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

  // Delete a client interaction
  async deleteClientInteraction(interactionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('client_interactions')
        .delete()
        .eq('id', interactionId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Get client statistics
  async getClientStats(): Promise<{ data: any; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Get total clients
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.id);

      // Get clients by status
      const { data: statusCounts } = await supabase
        .from('clients')
        .select('status')
        .eq('agent_id', user.id);

      const statusStats = statusCounts?.reduce((acc: any, client) => {
        acc[client.status] = (acc[client.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentInteractions } = await supabase
        .from('client_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      return {
        data: {
          totalClients: totalClients || 0,
          statusStats,
          recentInteractions: recentInteractions || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }
}

export const clientService = new ClientService(); 