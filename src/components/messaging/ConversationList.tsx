import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Clock } from 'lucide-react';
import { conversationService, ConversationWithDetails } from '@/services/conversationService';
import { useAuth } from '@/hooks/useAuth';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';

interface ConversationListProps {
  onSelectConversation: (conversation: ConversationWithDetails) => void;
  selectedConversationId?: string;
}

const ConversationListComponent = ({ onSelectConversation, selectedConversationId }: ConversationListProps) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await conversationService.getConversations();
      if (error) {
        toast.error('Failed to fetch conversations');
        return;
      }
      setConversations(data || []);
    } catch (error) {
      toast.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conversation: ConversationWithDetails) => {
    if (profile?.id === conversation.agent_id) {
      return conversation.client;
    }
    return conversation.agent;
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m ago` : 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-300">Loading conversations...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Conversations</h3>
        <p className="text-gray-400">Start conversations with clients from property inquiries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => {
        const otherParticipant = getOtherParticipant(conversation);
        const isSelected = selectedConversationId === conversation.id;
        
        return (
          <Card 
            key={conversation.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isSelected 
                ? 'bg-gradient-to-br from-pickfirst-yellow/20 to-pickfirst-amber/20 border-pickfirst-yellow/40' 
                : 'bg-gradient-to-br from-gray-900/90 to-black/90 border-pickfirst-yellow/20 hover:border-pickfirst-yellow/40'
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {otherParticipant?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-medium truncate">
                      {otherParticipant?.full_name || 'Unknown User'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatLastMessageTime(conversation.last_message_at || conversation.created_at)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {otherParticipant?.email}
                  </div>
                  {conversation.subject && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {conversation.subject}
                    </div>
                  )}
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <Badge variant="secondary" className="mt-2 bg-pickfirst-yellow text-black">
                      {conversation.unread_count} unread
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export const ConversationList = withErrorBoundary(ConversationListComponent);