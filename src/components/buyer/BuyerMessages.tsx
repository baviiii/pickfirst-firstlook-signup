import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, MessageSquare, MoreVertical, User, ArrowLeft, Loader2, Clock } from 'lucide-react';
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
  const { getMessageHistoryDays } = useSubscription();
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

  const messageHistoryDays = getMessageHistoryDays();

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
      feature="agent_messaging"
      title="Agent Messaging"
      description="Connect directly with agents through messaging to discuss properties and get responses."
      fallback={
        <div className="h-screen flex flex-col bg-background">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md p-8">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-medium text-foreground">Messaging Not Available</h3>
              <p className="text-sm text-muted-foreground">
                Agent messaging is not available on your current plan.
              </p>
              <Button onClick={() => window.location.href = '/properties'} className="mt-4">
                Browse Properties
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="h-screen flex flex-col bg-background">
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Sidebar */}
          <div className={`${showConversations || !isMobile ? 'flex' : 'hidden'} flex-col w-full lg:w-80 border-r bg-card`}>
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Messages</h2>
              {messageHistoryDays !== -1 && messageHistoryDays > 0 && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {messageHistoryDays} Days History - Upgrade for Full Access
                </Badge>
              )}
            </div>
            
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
                    selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleConversationSelect(conversation)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.agent_profile?.avatar_url} />
                      <AvatarFallback>
                        {conversation.agent_profile?.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {conversation.agent_profile?.full_name || 'Agent'}
                        </p>
                        {conversation.status === 'pending' && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.property?.title || conversation.subject || 'New conversation'}
                      </p>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${!showConversations || !isMobile ? 'flex' : 'hidden'} flex-col flex-1`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-card flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={handleBackToConversations}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-8 w-8">
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
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowAgentProfile(true)}
                      title="View Profile"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages Container */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {/* Pending Conversation Notice */}
                  {selectedConversation?.status === 'pending' && messages.length <= 1 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2">
                          <h4 className="font-medium text-yellow-500">Awaiting Agent Response</h4>
                          <p className="text-sm text-muted-foreground">
                            Your inquiry has been sent to {selectedConversation.agent_profile?.full_name || 'the agent'}. 
                            The agent will review your message and activate the conversation. You'll be notified when they respond.
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Typically, agents respond within 24 hours during business days.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                
                  {messageHistoryDays === -1 ? (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            msg.sender_id === user?.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-sm">{msg.content}</div>
                          <div className="text-xs opacity-70 mt-1">
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
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.sender_id === user?.id 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <div className="text-sm">{msg.content}</div>
                            <div className="text-xs opacity-70 mt-1">
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
                  {selectedConversation?.status === 'pending' && messages.length <= 1 ? (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      <p>The agent will activate this conversation when they respond to your inquiry.</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }} className="flex items-end space-x-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1"
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
                  )}
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
