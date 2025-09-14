import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, MapPin, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ConversationWithDetails {
  id: string;
  agent_id: string | null;
  client_id: string | null;
  inquiry_id?: string | null;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  metadata?: any;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  agent_profile?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  client_profile?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  property?: {
    id: string;
    title: string;
    address: string;
    price?: number;
  } | null;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count?: number;
}

interface ConversationListProps {
  onSelectConversation: (conversation: ConversationWithDetails) => void;
  selectedConversationId?: string;
}

export const ConversationList = ({ onSelectConversation, selectedConversationId }: ConversationListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch conversations with all related data
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          agent_profile:profiles!conversations_agent_id_fkey(id, full_name, email, avatar_url, phone, company_name),
          client_profile:profiles!conversations_client_id_fkey(id, full_name, email, avatar_url),
          property_inquiries!conversations_inquiry_id_fkey(
            property_id,
            property_listings!inner(id, title, address, price, images)
          )
        `)
        .or(`agent_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include property information
      const transformedConversations = (data || []).map(conv => {
        let property = null;
        
        // Get property from inquiry if available
        if (conv.property_inquiries && Array.isArray(conv.property_inquiries) && conv.property_inquiries.length > 0) {
          const inquiry = conv.property_inquiries[0];
          if (inquiry.property_listings) {
            property = inquiry.property_listings;
          }
        }
        
        // Get property from metadata if available (fallback)
        if (!property && conv.metadata && typeof conv.metadata === 'object' && !Array.isArray(conv.metadata)) {
          const metadata = conv.metadata as Record<string, any>;
          if (metadata.property_id) {
            property = { id: metadata.property_id, title: 'Property', address: 'Address not available' };
          }
        }

        return {
          id: conv.id,
          agent_id: conv.agent_id,
          client_id: conv.client_id,
          inquiry_id: conv.inquiry_id,
          subject: conv.subject,
          status: conv.status,
          priority: conv.priority,
          tags: conv.tags,
          metadata: typeof conv.metadata === 'object' && !Array.isArray(conv.metadata) 
            ? conv.metadata as Record<string, any> 
            : {},
          last_message_at: conv.last_message_at,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          agent_profile: null,
          client_profile: null,
          property: property || null,
          unread_count: 0 // TODO: Calculate unread count
        } as ConversationWithDetails;
      });

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.client_profile?.full_name?.toLowerCase().includes(searchLower) ||
      conv.client_profile?.email?.toLowerCase().includes(searchLower) ||
      conv.agent_profile?.full_name?.toLowerCase().includes(searchLower) ||
      conv.agent_profile?.email?.toLowerCase().includes(searchLower) ||
      conv.property?.title?.toLowerCase().includes(searchLower) ||
      conv.property?.address?.toLowerCase().includes(searchLower) ||
      conv.subject?.toLowerCase().includes(searchLower)
    );
  });

  const getConversationTitle = (conversation: ConversationWithDetails) => {
    if (conversation.property) {
      return `${conversation.property.title} - ${conversation.property.address}`;
    }
    
    if (conversation.subject) {
      return conversation.subject;
    }
    
    const otherUser = user?.id === conversation.agent_id 
      ? conversation.client_profile 
      : conversation.agent_profile;
    
    return otherUser?.full_name || otherUser?.email || 'Unknown User';
  };

  const getConversationSubtitle = (conversation: ConversationWithDetails) => {
    const otherUser = user?.id === conversation.agent_id 
      ? conversation.client_profile 
      : conversation.agent_profile;
    
    if (conversation.property) {
      return `$${conversation.property.price.toLocaleString()} • ${otherUser?.full_name || otherUser?.email}`;
    }
    
    return otherUser?.full_name || otherUser?.email || 'Unknown User';
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/5 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
        />
      </div>

      {/* Conversations */}
      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations found</p>
            {searchTerm && (
              <p className="text-sm mt-2">Try adjusting your search terms</p>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                selectedConversationId === conversation.id 
                  ? 'bg-pickfirst-yellow/10 border-pickfirst-yellow/30' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white truncate">
                        {getConversationTitle(conversation)}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <Badge className="bg-pickfirst-yellow text-black text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-400 truncate">
                      {getConversationSubtitle(conversation)}
                    </p>
                    
                    {conversation.last_message && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {conversation.last_message.content}
                      </p>
                    )}
                    
                    {/* Property and inquiry badges */}
                    <div className="flex items-center gap-2 mt-2">
                      {conversation.property && (
                        <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
                          <MapPin className="h-3 w-3 mr-1" />
                          Property
                        </Badge>
                      )}
                      {conversation.inquiry_id && (
                        <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Inquiry
                        </Badge>
                      )}
                      {conversation.status && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            conversation.status === 'active' 
                              ? 'border-green-400/30 text-green-400'
                              : 'border-gray-400/30 text-gray-400'
                          }`}
                        >
                          {conversation.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatLastMessageTime(conversation.last_message_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};