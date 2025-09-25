import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, MessageSquare, MoreVertical, User, ArrowLeft, Loader2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';

export const BuyerMessages = () => {
  const { user, profile } = useAuth();
  const { isFeatureEnabled } = useSubscription();
  const [conversations, setConversations] = useState<EnhancedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EnhancedConversation | null>(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAgentProfile, setShowAgentProfile] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth < 1024;
      setIsMobile(nowMobile);
      
      // Reset conversation view when resizing to desktop
      if (wasMobile && !nowMobile) {
        setShowConversations(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

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

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
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

  // Check if live messaging is enabled
  const hasLiveMessaging = isFeatureEnabled('live_messaging');
  const hasPropertyInquiry = isFeatureEnabled('property_inquiry_messaging');
  const hasMessageHistory = isFeatureEnabled('message_history_access');

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
    <FeatureGate 
      feature="live_messaging"
      title="Live Messaging"
      description="Connect directly with agents through real-time messaging to discuss properties and get instant responses."
      fallback={
        <FeatureGate 
          feature="property_inquiry_messaging"
          title="Property Inquiries"
          description="Send inquiries about properties to agents. Upgrade to premium for full live messaging capabilities."
          showUpgrade={false}
        >
          <div className="h-screen flex flex-col bg-background">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md p-8">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-medium text-foreground">Basic Contact Available</h3>
                <p className="text-sm text-muted-foreground">
                  You can contact agents through property inquiry forms. Upgrade to premium for full live messaging.
                </p>
                <Button onClick={() => window.location.href = '/properties'} className="mt-4">
                  Browse Properties
                </Button>
              </div>
            </div>
          </div>
        </FeatureGate>
      }
    >
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Conversations List */}
          <div 
            className={`${showConversations ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r bg-card`}
          >
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Messages</h2>
              {!hasMessageHistory && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Limited History - Upgrade for Full Access
                </Badge>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${
                    selectedConversation?.id === conv.id ? 'active' : ''
                  } m-2`}
                  onClick={() => handleConversationSelect(conv)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={conv.agent_profile?.avatar_url} />
                      <AvatarFallback>
                        {conv.agent_profile?.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-foreground text-sm truncate">
                          {conv.agent_profile?.full_name || 'Agent'}
                        </div>
                        {conv.unread_count && conv.unread_count > 0 && (
                          <Badge className="bg-pickfirst-yellow text-black text-xs ml-2 flex-shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground truncate">
                        {conv.subject}
                      </div>
                      {conv.last_message_at && (
                        <div className="text-xs text-muted-foreground">
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
              ))}
            </div>
          </div>

          {/* Main Content - Messages */}
          <div className={`${!showConversations ? 'flex' : 'hidden'} lg:flex flex-col flex-1 bg-background`}>
            {selectedConversation ? (
              <>
                <div className="border-b p-4 flex items-center justify-between bg-card">
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleBackToConversations}
                      className="lg:hidden"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedConversation.agent_profile?.avatar_url} />
                        <AvatarFallback>
                          {selectedConversation.agent_profile?.full_name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {selectedConversation.agent_profile?.full_name || 'Agent'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedConversation.property?.title || 'New conversation'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowAgentProfile(true)}
                      title="View Profile"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      title="Call Agent"
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar smooth-scroll"
                >
                  {hasMessageHistory ? (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`message-bubble ${
                            msg.sender_id === user?.id ? 'self' : 'other'
                          }`}
                        >
                          <div className="text-sm">
                            {msg.content}
                          </div>
                          <div className="message-time">
                            {new Date(msg.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {messages.slice(-5).map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`message-bubble ${
                              msg.sender_id === user?.id ? 'self' : 'other'
                            }`}
                          >
                            <div className="text-sm">
                              {msg.content}
                            </div>
                            <div className="message-time">
                              {new Date(msg.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                      {messages.length > 5 && (
                        <div className="text-center py-4">
                          <Badge variant="outline" className="text-xs">
                            Showing recent messages only - Upgrade for full history
                          </Badge>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-4 bg-card">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }} className="flex items-end space-x-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={hasLiveMessaging ? "Type a message..." : "Send a property inquiry..."}
                      className="message-input flex-1"
                      rows={1}
                    />
                    <Button 
                      type="submit"
                      size="icon" 
                      disabled={!newMessage.trim() || sending}
                      className="bg-pickfirst-yellow hover:bg-pickfirst-yellow/90 text-foreground"
                    >
                      {sending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2 max-w-md p-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium text-foreground">No conversation selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a conversation to start messaging
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 lg:hidden"
                    onClick={() => setShowConversations(true)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    View Conversations
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent Profile Dialog */}
        {selectedConversation?.agent_profile && (
          <AgentProfileView 
            isOpen={showAgentProfile}
            onClose={() => setShowAgentProfile(false)}
            agentId={selectedConversation.agent_id}
          />
        )}
      </div>
    </FeatureGate>
  );
};