import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { conversationService, ConversationWithDetails, Message } from '@/services/conversationService';
import { useAuth } from '@/hooks/useAuth';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'sonner';

interface MessageThreadProps {
  conversation: ConversationWithDetails;
  onMessageSent?: () => void;
}

const MessageThreadComponent = ({ conversation, onMessageSent }: MessageThreadProps) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await conversationService.getConversation(conversation.id);
      if (error) {
        toast.error('Failed to fetch messages');
        return;
      }
      setMessages(data?.messages || []);
    } catch (error) {
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await conversationService.markMessagesAsRead(conversation.id);
    } catch (error) {
      // Silent fail for marking as read
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data, error } = await conversationService.sendMessage(conversation.id, newMessage.trim());
      if (error) {
        toast.error('Failed to send message');
        return;
      }

      setMessages(prev => [...prev, data!]);
      setNewMessage('');
      onMessageSent?.();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOtherParticipant = () => {
    if (profile?.id === conversation.agent_id) {
      return conversation.client;
    }
    return conversation.agent;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString();
  };

  const otherParticipant = getOtherParticipant();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-300">Loading messages...</div>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border-pickfirst-yellow/20 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" />
            <AvatarFallback>
              {otherParticipant?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-white text-lg">
              {otherParticipant?.full_name || 'Unknown User'}
            </CardTitle>
            <div className="text-sm text-gray-400">
              {otherParticipant?.email}
            </div>
            {conversation.subject && (
              <div className="text-xs text-gray-500 mt-1">
                {conversation.subject}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isFromMe = message.sender_id === profile?.id;
                const showDate = index === 0 || 
                  formatMessageDate(message.created_at) !== formatMessageDate(messages[index - 1].created_at);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center">
                        <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                          {formatMessageDate(message.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isFromMe
                            ? 'bg-pickfirst-yellow text-black'
                            : 'bg-pickfirst-yellow text-black'
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            isFromMe ? 'text-black/70' : 'text-black/70'
                          }`}
                        >
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const MessageThread = withErrorBoundary(MessageThreadComponent);