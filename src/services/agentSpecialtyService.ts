import { supabase } from '@/integrations/supabase/client';

export interface AgentSpecialty {
  id: string;
  user_id: string;
  specialty: string;
  created_at: string;
  updated_at?: string;
}

export class AgentSpecialtyService {
  /**
   * Get all specialties for an agent
   */
  static async getAgentSpecialties(userId: string): Promise<{ data: AgentSpecialty[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_specialties')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error fetching agent specialties:', error);
      return { data: null, error };
    }
  }

  /**
   * Add a new specialty for an agent
   */
  static async addSpecialty(userId: string, specialty: string): Promise<{ data: AgentSpecialty | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_specialties')
        .insert({
          user_id: userId,
          specialty: specialty.trim()
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error adding specialty:', error);
      return { data: null, error };
    }
  }

  /**
   * Remove a specialty for an agent
   */
  static async removeSpecialty(specialtyId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('agent_specialties')
        .delete()
        .eq('id', specialtyId);

      return { error };
    } catch (error) {
      console.error('Error removing specialty:', error);
      return { error };
    }
  }

  /**
   * Update a specialty for an agent
   */
  static async updateSpecialty(specialtyId: string, newSpecialty: string): Promise<{ data: AgentSpecialty | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_specialties')
        .update({
          specialty: newSpecialty.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', specialtyId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error updating specialty:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if a specialty already exists for an agent
   */
  static async specialtyExists(userId: string, specialty: string): Promise<{ exists: boolean; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_specialties')
        .select('id')
        .eq('user_id', userId)
        .eq('specialty', specialty.trim())
        .single();

      return { exists: !!data, error };
    } catch (error) {
      console.error('Error checking specialty existence:', error);
      return { exists: false, error };
    }
  }

  /**
   * Get all available specialties (for suggestions)
   */
  static async getAllSpecialties(): Promise<{ data: string[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('agent_specialties')
        .select('specialty')
        .order('specialty', { ascending: true });

      if (error) return { data: null, error };

      // Get unique specialties
      const uniqueSpecialties = [...new Set(data?.map(item => item.specialty) || [])];
      return { data: uniqueSpecialties, error: null };
    } catch (error) {
      console.error('Error fetching all specialties:', error);
      return { data: null, error };
    }
  }
}
