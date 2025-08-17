import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  agent_id: string;
  client_id: string;
  subject: string;
  created_at: string;
  updated_at: string;
  agent_profile?: {
    full_name: string;
    avatar_url?: string;
  };
  client_profile?: {
    full_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url?: string;
    user_type: string;
  };
}

class MessageService {
  // Get conversations for the current user
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'getConversations', userId }
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // Get messages for a specific conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'getMessages', conversationId }
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Send a new message
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'sendMessage', conversationId, senderId, content }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  // Create or get existing conversation
  async getOrCreateConversation(agentId: string, clientId: string, subject?: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'createConversation', agentId, clientId, subject }
      });

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase.functions.invoke('messaging', {
        body: { action: 'markMessagesAsRead', conversationId, userId }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Subscribe to new messages (using simple polling for now)
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    let lastMessageId = '';
    
    const checkForNewMessages = async () => {
      const messages = await this.getMessages(conversationId);
      const latestMessage = messages[messages.length - 1];
      
      if (latestMessage && latestMessage.id !== lastMessageId) {
        lastMessageId = latestMessage.id;
        callback(latestMessage);
      }
    };

    const interval = setInterval(checkForNewMessages, 2000);
    
    return {
      unsubscribe: () => clearInterval(interval)
    };
  }

  // Subscribe to conversation updates (using simple polling for now)
  subscribeToConversations(userId: string, callback: () => void) {
    const interval = setInterval(callback, 5000);
    
    return {
      unsubscribe: () => clearInterval(interval)
    };
  }
}

export const messageService = new MessageService();