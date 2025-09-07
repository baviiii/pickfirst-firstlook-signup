import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, MessageSquare, MoreVertical, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AgentProfileView } from '@/components/agent/AgentProfileView';
import { toast } from 'sonner';

export const BuyerMessages = () => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // Mark messages as read
      if (user) {
        supabase.functions.invoke('messaging', {
          body: { action: 'markMessagesAsRead', conversationId: selectedConversation.id }
        }).catch(console.error);
      }
    }
  }, [selectedConversation, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'getConversations' }
      });
      
      if (error) {
        toast.error('Failed to load conversations');
        return;
      }
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'getMessages', conversationId }
      });
      
      if (error) {
        toast.error('Failed to load messages');
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'sendMessage', 
          conversationId: selectedConversation.id,
          content: newMessage.trim()
        }
      });
      
      if (data && !error) {
        setMessages(prev => [...prev, data]);
        setNewMessage('');
        // Refresh conversations to update last message
        loadConversations();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.agent_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.property?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4 lg:gap-6">
      {/* Conversations List */}
      <Card className="w-full lg:w-1/3 flex flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white">Conversations</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="space-y-2 p-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const agent = conv.agent_profile;
                return (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-pickfirst-yellow/20 border-pickfirst-yellow' 
                        : 'border-gray-700 hover:bg-gray-800/50'
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-white">{agent?.full_name || 'Agent'}</div>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <Badge className="bg-pickfirst-yellow text-black text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Property Information */}
                    {conv.property && (
                      <div className="text-sm text-pickfirst-yellow mb-1 bg-pickfirst-yellow/10 px-2 py-1 rounded">
                        🏠 {conv.property.title} - ${conv.property.price?.toLocaleString()}
                      </div>
                    )}
                    
                    <div className="text-sm font-medium mb-1 text-gray-300">
                      {conv.property ? `About ${conv.property.title}` : conv.subject}
                    </div>
                    
                    {conv.last_message_at && (
                      <div className="text-sm text-gray-400 line-clamp-2 mb-2">
                        Last message at {new Date(conv.last_message_at).toLocaleString()}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      {new Date(conv.last_message_at).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                    <AvatarImage src={selectedConversation.agent_profile?.avatar_url} />
                    <AvatarFallback className="bg-pickfirst-yellow text-black">
                      {selectedConversation.agent_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg text-white truncate">{selectedConversation.agent_profile?.full_name || 'Agent'}</CardTitle>
                    <div className="text-sm text-gray-400 truncate">{selectedConversation.agent_profile?.email}</div>
                    {selectedConversation.agent_profile?.phone && (
                      <div className="text-xs text-gray-500">📞 {selectedConversation.agent_profile.phone}</div>
                    )}
                    {selectedConversation.agent_profile?.company && (
                      <div className="text-xs text-gray-500">🏢 {selectedConversation.agent_profile.company}</div>
                    )}
                    {selectedConversation.property && (
                      <div className="text-xs text-pickfirst-yellow mt-1 bg-pickfirst-yellow/10 px-2 py-1 rounded">
                        🏠 {selectedConversation.property.title} - ${selectedConversation.property.price?.toLocaleString()}
                      </div>
                    )}
                    {!selectedConversation.property && (
                      <div className="text-sm text-gray-400 truncate">{selectedConversation.subject}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-pickfirst-yellow"
                    onClick={() => setShowAgentProfile(true)}
                    title="View Agent Profile"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-pickfirst-yellow">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-pickfirst-yellow">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-pickfirst-yellow">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isCurrentUser = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] lg:max-w-[70%] p-3 rounded-lg ${
                          isCurrentUser
                            ? 'bg-pickfirst-yellow text-black'
                            : 'bg-gray-800 text-white'
                        }`}
                      >
                        <div className="text-sm break-words">{msg.content}</div>
                        <div className={`text-xs mt-2 ${
                          isCurrentUser ? 'text-black/70' : 'text-gray-400'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="border-t border-gray-700 p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[60px] resize-none bg-gray-800 border-gray-700 text-white"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!newMessage.trim() || sending}
                    className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <div className="mb-2">Select a conversation to view messages</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Agent Profile Modal */}
      {selectedConversation && (
        <AgentProfileView
          agent={selectedConversation.agent_profile ? {
            id: selectedConversation.agent_profile.id,
            full_name: selectedConversation.agent_profile.full_name,
            email: selectedConversation.agent_profile.email,
            phone: selectedConversation.agent_profile.phone,
            company: selectedConversation.agent_profile.company,
            avatar_url: selectedConversation.agent_profile.avatar_url,
          } : null}
          isOpen={showAgentProfile}
          onClose={() => setShowAgentProfile(false)}
          onStartConversation={() => {
            setShowAgentProfile(false);
            // Conversation is already started, just focus on message input
            const messageInput = document.querySelector('textarea[placeholder="Type your reply..."]') as HTMLTextAreaElement;
            messageInput?.focus();
          }}
        />
      )}
    </div>
  );
};