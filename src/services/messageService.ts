import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Conversation {
  id: string;
  agent_id: string;
  client_id: string;
  inquiry_id?: string;
  subject: string;
  status?: string;
  priority?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  agent_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  client_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    content_type: string;
  };
  unread_count?: number;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'system';
  read_at: string | null;
  delivered_at: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  sender_profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  };
}

export interface ConversationFilters {
  search?: string;
  status?: string;
}

class MessageService {
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();

  // Get conversations for the current user with filtering
  async getConversations(filters?: ConversationFilters): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'getConversations', 
          filters 
        }
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  // Get messages for a specific conversation
  async getMessages(conversationId: string, limit: number = 100, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'getMessages', 
          conversationId,
          limit,
          offset
        }
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  // Send a new message
  async sendMessage(
    conversationId: string, 
    content: string, 
    contentType: 'text' | 'image' | 'file' | 'system' = 'text',
    metadata?: Record<string, any>
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'sendMessage', 
          conversationId, 
          content,
          contentType,
          metadata
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Create or get existing conversation
  async getOrCreateConversation(
    clientId: string, 
    subject?: string,
    inquiryId?: string,
    propertyId?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'createConversation', 
          clientId, 
          subject,
          inquiryId,
          propertyId
        }
      });

      if (error) {
        throw error;
      }
      
      return data?.id || null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'markMessagesAsRead', 
          conversationId
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  // Search messages
  async searchMessages(query: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'searchMessages', 
          query, 
          limit 
        }
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      throw new Error('Failed to search messages');
    }
  }

  // Subscribe to real-time messages for a conversation
  subscribeToMessages(
    conversationId: string, 
    callback: (message: Message) => void,
    onError?: (error: Error) => void
  ) {
    try {
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            callback(payload.new as Message);
          }
        )
        .on('system', 'error', (error) => {
          console.error('Realtime error:', error);
          onError?.(new Error('Realtime connection error'));
        })
        .subscribe();

      this.realtimeChannels.set(conversationId, channel);

      return {
        unsubscribe: () => {
          channel.unsubscribe();
          this.realtimeChannels.delete(conversationId);
        }
      };
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      throw new Error('Failed to subscribe to messages');
    }
  }

  // Subscribe to conversation updates
  subscribeToConversations(
    callback: (conversation: Conversation) => void,
    onError?: (error: Error) => void
  ) {
    try {
      const channel = supabase
        .channel(`conversations`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations'
          },
          (payload) => {
            callback(payload.new as Conversation);
          }
        )
        .on('system', 'error', (error) => {
          console.error('Realtime error:', error);
          onError?.(new Error('Realtime connection error'));
        })
        .subscribe();

      this.realtimeChannels.set(`conversations`, channel);

      return {
        unsubscribe: () => {
          channel.unsubscribe();
          this.realtimeChannels.delete(`conversations`);
        }
      };
    } catch (error) {
      console.error('Error subscribing to conversations:', error);
      throw new Error('Failed to subscribe to conversations');
    }
  }

  // Unsubscribe from all real-time channels
  unsubscribeAll() {
    this.realtimeChannels.forEach(channel => {
      channel.unsubscribe();
    });
    this.realtimeChannels.clear();
  }

  // Get conversation statistics
  async getConversationStats(): Promise<{
    total: number;
    unread: number;
  }> {
    try {
      const conversations = await this.getConversations();
      
      const stats = {
        total: conversations.length,
        unread: conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0),
      };

      return stats;
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      throw new Error('Failed to get conversation statistics');
    }
  }
}

export const messageService = new MessageService();