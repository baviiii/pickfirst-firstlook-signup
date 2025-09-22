import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, MessageSquare, MoreVertical, User, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AgentProfileView } from '@/components/agent/AgentProfileView';
import { enhancedConversationService } from '@/services/enhancedConversationService';
import type { EnhancedConversation } from '@/services/enhancedConversationService';
import { toast } from 'sonner';

export const BuyerMessages = () => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<EnhancedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EnhancedConversation | null>(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setShowConversations(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Handle mobile conversation selection
  const handleConversationSelect = (conv) => {
    setSelectedConversation(conv);
    if (isMobile) {
      setShowConversations(false);
    }
  };

  // Handle back to conversations on mobile
  const handleBackToConversations = () => {
    setShowConversations(true);
    if (isMobile) {
      setSelectedConversation(null);
    }
  };

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await enhancedConversationService.getConversations({
        search: searchTerm || undefined
      });
      
      if (error) {
        console.error('Error loading conversations:', error);
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

  const loadMessages = async (conversationId) => {
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="bg-gray-900/90 border-b border-pickfirst-yellow/20 p-4 flex items-center justify-between flex-shrink-0">
          {!showConversations && selectedConversation && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToConversations}
                className="text-gray-400 hover:text-pickfirst-yellow p-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 ml-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedConversation.agent_profile?.avatar_url} />
                  <AvatarFallback className="bg-pickfirst-yellow text-black text-xs">
                    {selectedConversation.agent_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium text-sm truncate">
                    {selectedConversation.agent_profile?.full_name || 'Agent'}
                  </div>
                  {selectedConversation.property ? (
                    <div className="text-xs text-pickfirst-yellow truncate">
                      🏠 {selectedConversation.property.title}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 truncate">
                      {selectedConversation.subject}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-pickfirst-yellow p-2"
                  onClick={() => setShowAgentProfile(true)}
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-pickfirst-yellow p-2">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-pickfirst-yellow p-2">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          {showConversations && (
            <div className="flex items-center justify-between w-full">
              <h1 className="text-xl font-bold text-white">Messages</h1>
            </div>
          )}
        </div>
      )}

      {/* Conversations List */}
      <div className={`${
        isMobile 
          ? (showConversations ? 'flex' : 'hidden')
          : 'flex'
      } ${
        isMobile ? 'flex-1' : 'w-80 lg:w-96'
      } flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border-r border-pickfirst-yellow/20`}>
        
        {/* Desktop Header */}
        {!isMobile && (
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        )}

        {/* Mobile Search */}
        {isMobile && showConversations && (
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        )}
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const agent = conv.agent_profile;
                const conversationTitle = enhancedConversationService.getConversationTitle(conv, user?.id || '');
                const conversationSubtitle = enhancedConversationService.getConversationSubtitle(conv);
                
                return (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-pickfirst-yellow/20 border-pickfirst-yellow shadow-md' 
                        : 'border-gray-700 hover:bg-gray-800/50 hover:border-gray-600'
                    }`}
                    onClick={() => handleConversationSelect(conv)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={agent?.avatar_url} />
                        <AvatarFallback className="bg-pickfirst-yellow text-black text-sm">
                          {agent?.full_name?.split(' ').map(n => n[0]).join('') || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-white text-sm truncate">
                            {agent?.full_name || 'Agent'}
                          </div>
                          {conv.unread_count && conv.unread_count > 0 && (
                            <Badge className="bg-pickfirst-yellow text-black text-xs ml-2 flex-shrink-0">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Property Information */}
                        {conv.property && (
                          <div className="text-xs text-pickfirst-yellow mb-2 bg-pickfirst-yellow/10 px-2 py-1 rounded truncate">
                            🏠 {conv.property.title} - ${conv.property.price?.toLocaleString()}
                          </div>
                        )}
                        
                        <div className="text-sm font-medium mb-1 text-gray-300 truncate">
                          {conversationTitle}
                        </div>
                        
                        <div className="text-xs text-gray-500 truncate mb-1">
                          {conversationSubtitle}
                        </div>
                        
                        {conv.last_message_at && (
                          <div className="text-xs text-gray-500">
                            {new Date(conv.last_message_at).toLocaleDateString([], { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`${
        isMobile 
          ? (showConversations ? 'hidden' : 'flex')
          : 'flex'
      } flex-1 flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl`}>
        {selectedConversation ? (
          <>
            {/* Desktop Header */}
            {!isMobile && (
              <div className="border-b border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                      <AvatarImage src={selectedConversation.agent_profile?.avatar_url} />
                      <AvatarFallback className="bg-pickfirst-yellow text-black">
                        {selectedConversation.agent_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white truncate">
                        {selectedConversation.agent_profile?.full_name || 'Agent'}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {selectedConversation.agent_profile?.email}
                      </div>
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
              </div>
            )}
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isCurrentUser = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] lg:max-w-[70%] p-3 rounded-2xl break-words ${
                        isCurrentUser
                          ? 'bg-pickfirst-yellow text-black rounded-br-md'
                          : 'bg-gray-800 text-white rounded-bl-md'
                      }`}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className={`text-xs mt-2 ${
                        isCurrentUser ? 'text-black/70' : 'text-gray-400'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="border-t border-gray-700 p-3 lg:p-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-[44px] max-h-32 resize-none bg-gray-800 border-gray-700 text-white rounded-2xl px-4 py-3"
                    style={{
                      lineHeight: '1.4',
                    }}
                  />
                </div>
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() || sending}
                  className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90 disabled:opacity-50 rounded-full p-3 flex-shrink-0"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">Select a conversation</div>
              <div className="text-sm">Choose a conversation to view messages</div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Profile Modal */}
      {selectedConversation && (
        <AgentProfileView
          agentId={selectedConversation.agent_id}
          isOpen={showAgentProfile}
          onClose={() => setShowAgentProfile(false)}
          onStartConversation={() => {
            setShowAgentProfile(false);
            // Conversation is already started, just focus on message input
            const messageInput = document.querySelector('textarea[placeholder*="Type"]') as HTMLTextAreaElement;
            messageInput?.focus();
          }}
        />
      )}
              'textarea[placeholder="Type your reply..."]'
            ) as HTMLTextAreaElement | null;
            messageInput?.focus();
          }}
        />
      )}
    </div>
  );
};