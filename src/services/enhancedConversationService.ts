import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { rateLimitService } from './rateLimitService';
import { auditService } from './auditService';

const formatPropertyPrice = (property?: {
  price?: number | null;
  price_display?: string | null;
  status?: string | null;
  sold_price?: number | null;
}): string => {
  if (!property) return 'Contact Agent';

  const status = property.status?.toLowerCase();
  if (status === 'sold' && property.sold_price && property.sold_price > 0) {
    return `Sold: $${property.sold_price.toLocaleString()}`;
  }

  const display = typeof property.price_display === 'string' ? property.price_display.trim() : '';
  if (display) {
    return display;
  }

  if (property.price && property.price > 0) {
    return `$${property.price.toLocaleString()}`;
  }

  return 'Contact Agent';
};

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
    price: number | null;
    price_display?: string | null;
    status?: string | null;
    sold_price?: number | null;
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
  viewMode?: 'agent' | 'buyer'; // Filter conversations based on current view mode
}

class EnhancedConversationService {
  /**
   * Get conversations with enhanced data including property and inquiry context
   */
  async getConversations(filters: ConversationFilters = {}): Promise<{ data: EnhancedConversation[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Build the base query
      // Note: We don't use foreign key relationships here because RLS blocks direct profile access
      // Profiles will be loaded via public views in enhanceSingleConversation
      let query = supabase
        .from('conversations')
        .select('*');

      // Apply user-specific filters based on view mode
      if (user) {
        // Filter based on view mode: agent mode shows only conversations where user is agent,
        // buyer mode shows only conversations where user is the client
        if (filters.viewMode === 'agent') {
          // In agent mode: only show conversations where this user is the agent AND NOT the client
          // This prevents showing conversations where the agent inquired as a buyer
          // CRITICAL: Use .eq() for agent_id, then filter out client_id matches in pre-filter
          // Supabase's .neq() may not work reliably, so we'll do strict filtering in pre-filter
          console.log('🔍 Filtering conversations for AGENT mode:', {
            userId: user.id,
            filter: 'agent_id = user.id (client_id != user.id will be enforced in pre-filter)'
          });
          // Only filter by agent_id at database level - client_id check happens in pre-filter
          query = query.eq('agent_id', user.id);
        } else if (filters.viewMode === 'buyer') {
          // In buyer mode: only show conversations where this user is the client/buyer AND NOT the agent
          // This prevents showing conversations where the buyer is also an agent
          // CRITICAL: Use .eq() for client_id, then filter out agent_id matches in pre-filter
          // Supabase's .neq() may not work reliably, so we'll do strict filtering in pre-filter
          console.log('🔍 Filtering conversations for BUYER mode:', {
            userId: user.id,
            filter: 'client_id = user.id (agent_id != user.id will be enforced in pre-filter)'
          });
          // Only filter by client_id at database level - agent_id check happens in pre-filter
          query = query.eq('client_id', user.id);
        } else {
          // Default: show all conversations for the user (for backwards compatibility)
          // The post-filter will handle excluding conversations where user is both agent and client
        query = query.or(`agent_id.eq.${user.id},client_id.eq.${user.id}`);
        }
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
        console.error('Error fetching conversations:', error);
        return { data: [], error };
      }

      console.log(`📥 Raw conversations from database (${conversations?.length || 0}):`, {
        viewMode: filters.viewMode,
        userId: user?.id,
        conversations: conversations?.map(c => ({
          id: c.id,
          agent_id: c.agent_id,
          client_id: c.client_id,
          subject: c.subject,
          inquiry_id: c.inquiry_id,
          metadata: c.metadata,
          property_id: (c.metadata as any)?.property_id
        }))
      });

      // CRITICAL: Pre-filter conversations BEFORE enhancement to avoid unnecessary processing
      // This ensures we only enhance conversations that should be shown
      // This is the PRIMARY filtering mechanism since Supabase .neq() may not work reliably
      let preFilteredConversations = (conversations || []).filter(conv => {
        if (!user) {
          console.warn('🚫 No user, filtering out conversation');
          return false;
        }
        
        // Convert IDs to strings for reliable comparison
        const convAgentId = String(conv.agent_id || '');
        const convClientId = String(conv.client_id || '');
        const userId = String(user.id || '');
        
        if (filters.viewMode === 'agent') {
          // In agent mode: ONLY show conversations where user is agent AND NOT client
          const isAgent = convAgentId === userId;
          const isNotClient = convClientId !== userId;
          const isAgentConv = isAgent && isNotClient;
          
          if (!isAgentConv) {
            console.warn('🚫 Pre-filtered out conversation in agent mode:', {
              conversationId: conv.id,
              agentId: convAgentId,
              clientId: convClientId,
              userId: userId,
              matches: {
                isAgent: isAgent,
                isNotClient: isNotClient,
                bothMatch: isAgent && isNotClient
              },
              reason: !isAgent ? 'User is not agent' : (convClientId === userId ? 'User is client (own inquiry - MUST BE FILTERED)' : 'Unknown reason')
            });
          } else {
            console.log('✅ Keeping conversation in agent mode:', {
              conversationId: conv.id,
              agentId: convAgentId,
              clientId: convClientId
            });
          }
          return isAgentConv;
        } else if (filters.viewMode === 'buyer') {
          // In buyer mode: ONLY show conversations where user is client AND NOT agent
          const isClient = convClientId === userId;
          const isNotAgent = convAgentId !== userId;
          const isBuyerConv = isClient && isNotAgent;
          
          if (!isBuyerConv) {
            console.warn('🚫 Pre-filtered out conversation in buyer mode:', {
              conversationId: conv.id,
              agentId: convAgentId,
              clientId: convClientId,
              userId: userId,
              matches: {
                isClient: isClient,
                isNotAgent: isNotAgent,
                bothMatch: isClient && isNotAgent
              },
              reason: !isClient ? 'User is not client' : (convAgentId === userId ? 'User is agent (MUST BE FILTERED)' : 'Unknown reason')
            });
          } else {
            console.log('✅ Keeping conversation in buyer mode:', {
              conversationId: conv.id,
              agentId: convAgentId,
              clientId: convClientId
            });
          }
          return isBuyerConv;
        }
        return true; // No viewMode specified
      });

      console.log(`✅ Pre-filtered conversations (${preFilteredConversations.length}):`, {
        viewMode: filters.viewMode,
        userId: user?.id,
        before: conversations?.length || 0,
        after: preFilteredConversations.length,
        filteredOut: (conversations?.length || 0) - preFilteredConversations.length,
        remainingIds: preFilteredConversations.map(c => ({
          id: c.id,
          agent_id: c.agent_id,
          client_id: c.client_id
        }))
      });
      
      // CRITICAL CHECK: If we're in agent mode and still have conversations where user is client, something is wrong
      if (filters.viewMode === 'agent' && preFilteredConversations.some(c => String(c.client_id) === String(user?.id))) {
        console.error('❌ CRITICAL ERROR: Pre-filter failed! Conversations where user is client still present in agent mode:', 
          preFilteredConversations.filter(c => String(c.client_id) === String(user?.id))
        );
      }
      
      // CRITICAL CHECK: If we're in buyer mode and still have conversations where user is agent, something is wrong
      if (filters.viewMode === 'buyer' && preFilteredConversations.some(c => String(c.agent_id) === String(user?.id))) {
        console.error('❌ CRITICAL ERROR: Pre-filter failed! Conversations where user is agent still present in buyer mode:', 
          preFilteredConversations.filter(c => String(c.agent_id) === String(user?.id))
        );
      }

      // Enhance conversations with property and inquiry data (only the filtered ones)
      const enhancedConversations = await Promise.all(
        preFilteredConversations.map(conv => this.enhanceSingleConversation(conv as Tables<'conversations'>))
      );

      // Additional strict filtering as a safety net (shouldn't filter anything if pre-filter worked)
      let filteredConversations = enhancedConversations.filter(conv => {
        if (!user) return false;
        
        if (filters.viewMode === 'agent') {
          const isAgentConversation = conv.agent_id === user.id && conv.client_id !== user.id;
          if (!isAgentConversation) {
            console.error('❌ CRITICAL: Conversation passed pre-filter but failed safety filter in agent mode:', {
              conversationId: conv.id,
              agentId: conv.agent_id,
              clientId: conv.client_id,
              userId: user.id
            });
          }
          return isAgentConversation;
        } else if (filters.viewMode === 'buyer') {
          const isBuyerConversation = conv.client_id === user.id && conv.agent_id !== user.id;
          if (!isBuyerConversation) {
            console.error('❌ CRITICAL: Conversation passed pre-filter but failed safety filter in buyer mode:', {
              conversationId: conv.id,
              agentId: conv.agent_id,
              clientId: conv.client_id,
              userId: user.id
            });
          }
          return isBuyerConversation;
        }
        return true;
      });
      
      console.log(`Filtered conversations for ${filters.viewMode} mode:`, {
        totalConversations: enhancedConversations.length,
        filteredCount: filteredConversations.length,
        userId: user?.id
      });

      // Apply search filter after enhancement
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
      return `${conversation.property.address} • ${formatPropertyPrice(conversation.property)}`;
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

    // Validate conversation has required IDs
    if (!conversation.agent_id || !conversation.client_id) {
      console.error('Conversation missing required IDs:', conversation.id);
      return {
        ...enhanced,
        agent_profile: {
          id: conversation.agent_id || 'unknown',
          full_name: 'Unknown Agent',
          email: '',
          phone: '',
          company: '',
          avatar_url: ''
        },
        client_profile: {
          full_name: 'Unknown Client',
          email: '',
          phone: '',
          avatar_url: ''
        }
      };
    }

    try {
      // Get agent profile - try view first, then fallback to RPC function
      let agentProfile = null;
      const { data: agentViewData, error: agentViewError } = await supabase
          .from('agent_public_profiles')
          .select('id, full_name, email, phone, company, avatar_url')
          .eq('id', conversation.agent_id)
        .maybeSingle();

      if (agentViewData && !agentViewError) {
        agentProfile = agentViewData;
      } else {
        // Fallback: Use helper function that bypasses RLS
        console.log('Agent view query failed, trying helper function:', agentViewError);
        const { data: agentFunctionData, error: agentFunctionError } = await supabase
          .rpc('get_agent_public_profile', { agent_id: conversation.agent_id });
        
        if (!agentFunctionError && agentFunctionData && agentFunctionData.length > 0) {
          agentProfile = agentFunctionData[0];
        }
      }

      // Handle agent profile with fallback - validate ID matches
      if (agentProfile) {
        // Verify the profile ID matches the conversation agent_id
        if (agentProfile.id !== conversation.agent_id) {
          console.error('Profile ID mismatch for agent!', {
            conversationId: conversation.id,
            expectedAgentId: conversation.agent_id,
            gotProfileId: agentProfile.id
          });
        }
        enhanced.agent_profile = {
          id: agentProfile.id,
          full_name: agentProfile.full_name || 'Unknown Agent',
          email: agentProfile.email || '',
          phone: agentProfile.phone || undefined,
          company: agentProfile.company || undefined,
          avatar_url: agentProfile.avatar_url || undefined
        };
      } else {
        console.warn('Agent profile not found for conversation:', conversation.id, 'agent_id:', conversation.agent_id);
        enhanced.agent_profile = {
          id: conversation.agent_id,
          full_name: 'Agent (Profile Missing)',
          email: '',
          phone: undefined,
          company: undefined,
          avatar_url: undefined
        };
      }

      // Get client profile - try buyer view first, then agent view (since agents can inquire in buyer mode)
      let clientProfile = null;
      const { data: clientViewData, error: clientViewError } = await supabase
        .from('buyer_public_profiles')
        .select('id, full_name, email, phone, avatar_url')
        .eq('id', conversation.client_id)
        .maybeSingle();

      if (clientViewData && !clientViewError) {
        clientProfile = clientViewData;
      } else {
        // SECONDARY: Check if the client is actually an agent (agents can inquire in buyer mode)
        const { data: agentAsClientViewData, error: agentAsClientViewError } = await supabase
          .from('agent_public_profiles')
          .select('id, full_name, email, phone, avatar_url')
          .eq('id', conversation.client_id)
          .maybeSingle();

        if (agentAsClientViewData && !agentAsClientViewError) {
          clientProfile = agentAsClientViewData;
        } else {
          // FALLBACK 1: Use buyer helper function that bypasses RLS
          console.log('Client view query failed, trying helper function:', clientViewError);
          const { data: clientFunctionData, error: clientFunctionError } = await supabase
            .rpc('get_buyer_public_profile', { buyer_id: conversation.client_id });
          
          if (!clientFunctionError && clientFunctionData && clientFunctionData.length > 0) {
            clientProfile = clientFunctionData[0];
          } else {
            // FALLBACK 2: Use agent helper function (since agents can inquire in buyer mode)
            console.log('Buyer RPC failed, trying agent RPC function for client:', conversation.client_id);
            const { data: agentFunctionData, error: agentFunctionError } = await supabase
              .rpc('get_agent_public_profile', { agent_id: conversation.client_id });
            
            if (!agentFunctionError && agentFunctionData && agentFunctionData.length > 0) {
              clientProfile = agentFunctionData[0];
            }
          }
        }
      }

      // Handle client profile with fallback - validate ID matches
      if (clientProfile) {
        // Verify the profile ID matches the conversation client_id
        if (clientProfile.id !== conversation.client_id) {
          console.error('Profile ID mismatch for client!', {
            conversationId: conversation.id,
            expectedClientId: conversation.client_id,
            gotProfileId: clientProfile.id
          });
        }
        enhanced.client_profile = {
          full_name: clientProfile.full_name || 'Unknown Client',
          email: clientProfile.email || '',
          phone: clientProfile.phone || undefined,
          avatar_url: clientProfile.avatar_url || undefined
        };
      } else {
        console.warn('Client profile not found for conversation:', conversation.id, 'client_id:', conversation.client_id);
        // This should never happen for buyers who have inquired or messaged
        // but we'll keep the fallback just in case
        enhanced.client_profile = {
          full_name: 'Client (Profile Missing)',
          email: '',
          phone: undefined,
          avatar_url: undefined
        };
      }
    } catch (error) {
      console.error('Error fetching profiles for conversation:', conversation.id, error);
      // Return with fallback profiles
      enhanced.agent_profile = {
        id: conversation.agent_id,
        full_name: 'Agent (Error Loading)',
        email: '',
        phone: undefined,
        company: undefined,
        avatar_url: undefined
      };
      enhanced.client_profile = {
        full_name: 'Client (Error Loading)',
        email: '',
        phone: undefined,
        avatar_url: undefined
      };
    }

    // Get property if available
    const propertyId = (conversation.metadata as any)?.property_id;
    if (propertyId) {
      const { data: property } = await supabase
        .from('property_listings')
        .select('id, title, price, price_display, status, sold_price, address, images')
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