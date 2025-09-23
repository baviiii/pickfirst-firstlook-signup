import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService } from './auditService';

export interface EnhancedConversation extends Tables<'conversations'> {
  agent_profile?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    avatar_url?: string;
  };
  client_profile?: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  property?: {
    id: string;
    title: string;
    price: number;
    address: string;
    images?: string[];
  };
  inquiry?: {
    id: string;
    message: string;
    created_at: string;
  };
  unread_count?: number;
  last_message_preview?: string;
}

export interface ConversationFilters {
  status?: 'active' | 'archived' | 'all';
  property_id?: string;
  search?: string;
  unread_only?: boolean;
}

class EnhancedConversationService {
  /**
   * Get conversations with enhanced data including property and inquiry context
   */
  async getConversations(filters: ConversationFilters = {}): Promise<{ data: EnhancedConversation[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Build the base query
      let query = supabase
        .from('conversations')
        .select(`
          *,
          agent_profile:profiles!conversations_agent_id_fkey(
            id,
            full_name,
            email,
            phone,
            company,
            avatar_url
          ),
          client_profile:profiles!conversations_client_id_fkey(
            full_name,
            email,
            phone,
            avatar_url
          )
        `);

      // Apply user-specific filters
      if (user) {
        query = query.or(`agent_id.eq.${user.id},client_id.eq.${user.id}`);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply property filter
      if (filters.property_id) {
        query = query.eq('metadata->>property_id', filters.property_id);
      }

      const { data: conversations, error } = await query
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (error) {
        return { data: [], error };
      }

      // Enhance conversations with property and inquiry data
      const enhancedConversations = await Promise.all(
        (conversations || []).map(conv => this.enhanceSingleConversation(conv as Tables<'conversations'>))
      );

      // Apply search filter after enhancement
      let filteredConversations = enhancedConversations;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredConversations = enhancedConversations.filter(conv =>
          conv.subject?.toLowerCase().includes(searchLower) ||
          conv.agent_profile?.full_name?.toLowerCase().includes(searchLower) ||
          conv.client_profile?.full_name?.toLowerCase().includes(searchLower) ||
          conv.property?.title?.toLowerCase().includes(searchLower) ||
          conv.property?.address?.toLowerCase().includes(searchLower) ||
          conv.last_message_preview?.toLowerCase().includes(searchLower)
        );
      }

      // Apply unread filter
      if (filters.unread_only) {
        filteredConversations = filteredConversations.filter(conv => (conv.unread_count || 0) > 0);
      }

      return { data: filteredConversations, error: null };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return { data: [], error };
    }
  }

  /**
   * Create or get conversation with property context
   */
  async getOrCreateConversationWithContext(
    agentId: string, 
    clientId: string, 
    options: {
      propertyId?: string;
      inquiryId?: string;
      subject?: string;
    } = {}
  ): Promise<{ data: EnhancedConversation | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Check for existing conversation with same context
      let existingQuery = supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('client_id', clientId);

      // If we have a property ID, look for conversations about the same property
      if (options.propertyId) {
        existingQuery = existingQuery.eq('metadata->>property_id', options.propertyId);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        // Update the conversation if we have new context
        if (options.inquiryId && !existing.inquiry_id) {
          const { data: updated } = await supabase
            .from('conversations')
            .update({ inquiry_id: options.inquiryId })
            .eq('id', existing.id)
            .select()
            .single();
          
          if (updated) {
            const enhancedData = await this.enhanceSingleConversation(updated);
            return { data: enhancedData, error: null };
          }
        }

        const enhancedData = await this.enhanceSingleConversation(existing);
        return { data: enhancedData, error: null };
      }

      // Create new conversation with context
      const metadata: any = {};
      if (options.propertyId) {
        metadata.property_id = options.propertyId;
      }

      const newConversation: TablesInsert<'conversations'> = {
        agent_id: agentId,
        client_id: clientId,
        inquiry_id: options.inquiryId || null,
        subject: options.subject || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      const { data, error } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      if (data) {
        await auditService.log(user.id, 'CREATE', 'conversations', {
          recordId: data.id,
          newValues: { 
            agent_id: agentId, 
            client_id: clientId, 
            property_id: options.propertyId,
            inquiry_id: options.inquiryId,
            subject: options.subject 
          }
        });

        const enhancedData = await this.enhanceSingleConversation(data);
        return { data: enhancedData, error: null };
      }

      return { data: null, error: { message: 'Failed to create conversation' } };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get conversation title with context
   */
  getConversationTitle(conversation: EnhancedConversation, currentUserId: string): string {
    // If there's a property, use property-based title
    if (conversation.property) {
      return `About ${conversation.property.title}`;
    }

    // If there's a custom subject, use that
    if (conversation.subject) {
      return conversation.subject;
    }

    // Default to participant names
    if (conversation.agent_id === currentUserId) {
      return `Chat with ${conversation.client_profile?.full_name || 'Client'}`;
    } else {
      return `Chat with ${conversation.agent_profile?.full_name || 'Agent'}`;
    }
  }

  /**
   * Get conversation subtitle with context
   */
  getConversationSubtitle(conversation: EnhancedConversation): string {
    if (conversation.property) {
      return `${conversation.property.address} • $${conversation.property.price.toLocaleString()}`;
    }

    if (conversation.inquiry) {
      return conversation.inquiry.message.substring(0, 100) + '...';
    }

    if (conversation.last_message_preview) {
      return conversation.last_message_preview;
    }

    return 'No messages yet';
  }

  /**
   * Enhance a single conversation with related data
   */
  private async enhanceSingleConversation(conversation: Tables<'conversations'>): Promise<EnhancedConversation> {
    const enhanced: EnhancedConversation = { ...conversation };

    // Get profiles
    const [agentProfile, clientProfile] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, phone, company, avatar_url')
        .eq('id', conversation.agent_id)
        .single()
        .then(({ data }) => data || null),
      supabase
        .from('profiles')
        .select('full_name, email, phone, avatar_url')
        .eq('id', conversation.client_id)
        .single()
        .then(({ data }) => data || null)
    ]);

    // Set agent profile with required fields
    if (agentProfile && agentProfile.id) {
      enhanced.agent_profile = {
        id: agentProfile.id,
        full_name: agentProfile.full_name || 'Unknown Agent',
        email: agentProfile.email || '',
        phone: agentProfile.phone,
        company: agentProfile.company,
        avatar_url: agentProfile.avatar_url
      };
    } else {
      // Fallback for missing agent profile
      enhanced.agent_profile = {
        id: conversation.agent_id || 'unknown',
        full_name: 'Unknown Agent',
        email: '',
        phone: '',
        company: '',
        avatar_url: ''
      };
    }

    // Set client profile
    if (clientProfile) {
      enhanced.client_profile = {
        full_name: clientProfile.full_name || 'Unknown Client',
        email: clientProfile.email || '',
        phone: clientProfile.phone,
        avatar_url: clientProfile.avatar_url
      };
    } else {
      // Fallback for missing client profile
      enhanced.client_profile = {
        full_name: 'Unknown Client',
        email: '',
        phone: '',
        avatar_url: ''
      };
    }

    // Get property if available
    const propertyId = (conversation.metadata as any)?.property_id;
    if (propertyId) {
      const { data: property } = await supabase
        .from('property_listings')
        .select('id, title, price, address, images')
        .eq('id', propertyId)
        .single();
      
      if (property) {
        enhanced.property = property;
      }
    }

    // Get inquiry if available
    if (conversation.inquiry_id) {
      const { data: inquiry } = await supabase
        .from('property_inquiries')
        .select('id, message, created_at')
        .eq('id', conversation.inquiry_id)
        .single();
      
      if (inquiry) {
        enhanced.inquiry = inquiry;
      }
    }

    // Get unread count for current user
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation.id)
      .neq('sender_id', conversation.agent_id)
      .is('read_at', null);

    enhanced.unread_count = unreadCount || 0;

    // Get last message preview
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMessage) {
      enhanced.last_message_preview = lastMessage.content.substring(0, 100);
    }

    return enhanced;
  }
}

export const enhancedConversationService = new EnhancedConversationService();