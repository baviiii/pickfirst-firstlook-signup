import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService } from './auditService';

export type Conversation = Tables<'conversations'>;
export type ConversationInsert = TablesInsert<'conversations'>;
export type Message = Tables<'messages'>;
export type MessageInsert = TablesInsert<'messages'>;

export interface ConversationWithDetails extends Conversation {
  agent?: {
    full_name: string;
    email: string;
  };
  client?: {
    full_name: string;
    email: string;
  };
  messages?: Message[];
  unread_count?: number;
}

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

class ConversationService {
  async getConversations(): Promise<{ data: ConversationWithDetails[]; error: any }> {
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
        .from('conversations')
        .select(`
          *,
          agent:profiles!conversations_agent_id_fkey(full_name, email),
          client:profiles!conversations_client_id_fkey(full_name, email)
        `)
        .order('last_message_at', { ascending: false });

      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  async getConversation(id: string): Promise<{ data: ConversationWithDetails | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          agent:profiles!conversations_agent_id_fkey(full_name, email),
          client:profiles!conversations_client_id_fkey(full_name, email),
          messages(*)
        `)
        .eq('id', id)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getOrCreateConversation(agentId: string, clientId: string, subject?: string): Promise<{ data: Conversation | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Check if conversation already exists
      const { data: existing, error: existingError } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('client_id', clientId)
        .maybeSingle();

      if (existing) {
        return { data: existing, error: null };
      }

      // Create new conversation
      const newConversation: ConversationInsert = {
        agent_id: agentId,
        client_id: clientId,
        subject: subject ? sanitizeInput(subject) : null,
      };

      const { data, error } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'conversations', {
          recordId: data.id,
          newValues: { agent_id: agentId, client_id: clientId, subject }
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async sendMessage(conversationId: string, content: string): Promise<{ data: Message | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'message:send');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      if (!content.trim()) {
        return { data: null, error: { message: 'Message content is required' } };
      }

      const newMessage: MessageInsert = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: sanitizeInput(content),
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'messages', {
          recordId: data.id,
          newValues: { conversation_id: conversationId, content_length: content.length }
        });
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  async markMessagesAsRead(conversationId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'User not authenticated' } };
      }

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getUnreadCount(): Promise<{ data: number; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: 0, error: { message: 'User not authenticated' } };
      }

      // First get conversation IDs for this user
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`agent_id.eq.${user.id},client_id.eq.${user.id}`);

      if (!userConversations || userConversations.length === 0) {
        return { data: 0, error: null };
      }

      const conversationIds = userConversations.map(c => c.id);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null)
        .in('conversation_id', conversationIds);

      return { data: count || 0, error };
    } catch (error) {
      return { data: 0, error };
    }
  }
}

export const conversationService = new ConversationService();