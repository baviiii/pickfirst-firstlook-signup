import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, MessageSquare, MoreVertical, User, ArrowLeft, Loader2, Clock, ChevronLeft } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();


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
        search: searchTerm || undefined,
        viewMode: 'buyer' // Buyers always see conversations where they are the client
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

  const filteredConversations = conversations.filter(conv => {
    // Filter out conversations with missing agent profiles
    if (!conv.agent_profile || !conv.agent_profile.full_name || 
        conv.agent_profile.full_name.includes('Profile Missing') ||
        conv.agent_profile.full_name.includes('(Profile Missing)')) {
      return false;
    }

    // Apply search filter
    const matchesSearch = !searchTerm || 
      conv.agent_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.property?.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const messageHistoryDays = getMessageHistoryDays();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center pickfirst-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading conversations...</p>
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
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
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
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Conversations Sidebar */}
          <div className={`${isMobile ? (showConversations ? 'flex' : 'hidden') : 'flex'} flex-col w-full lg:w-80 border-r bg-white min-w-0 h-full`}>
            <div className="px-3 sm:px-4 py-3 sm:py-4 border-b flex-shrink-0 bg-white sticky top-0 z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Messages</h2>
              {messageHistoryDays !== -1 && messageHistoryDays > 0 && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {messageHistoryDays} Days History - Upgrade for Full Access
                </Badge>
              )}
            </div>
            
            <div className="px-3 sm:px-4 py-3 border-b flex-shrink-0 bg-white sticky top-[73px] sm:top-[81px] z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm bg-card border-border"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs mt-1">Start a conversation by inquiring about a property</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 sm:p-4 cursor-pointer active:bg-muted/70 transition-colors touch-manipulation ${
                        selectedConversation?.id === conversation.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => handleConversationSelect(conversation)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12 sm:h-10 sm:w-10 flex-shrink-0">
                          <AvatarImage src={conversation.agent_profile?.avatar_url} />
                          <AvatarFallback className="text-base">
                            {conversation.agent_profile?.full_name?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm sm:text-base text-foreground truncate">
                              {conversation.agent_profile?.full_name || 'Agent'}
                            </p>
                            {conversation.status === 'pending' && (
                              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20 flex-shrink-0">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1">
                            {conversation.property?.title || conversation.subject || 'New conversation'}
                          </p>
                          {conversation.last_message_at && (
                            <p className="text-xs text-muted-foreground/70">
                              {new Date(conversation.last_message_at).toLocaleDateString([], { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${isMobile ? (!showConversations ? 'flex' : 'hidden') : 'flex'} flex-col flex-1 min-h-0 min-w-0 h-full`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b bg-white flex items-center justify-between flex-shrink-0 shadow-sm min-h-[56px] sm:min-h-[64px] sticky top-0 z-10">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden flex-shrink-0 h-10 w-10 touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBackToConversations();
                      }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div
                      className="flex items-center space-x-2 sm:space-x-3 cursor-pointer flex-1 min-w-0 active:opacity-70 transition-opacity"
                      onClick={() => navigate('/buyer-account-settings')}
                    >
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 ring-2 ring-primary/10">
                        <AvatarImage src={selectedConversation.agent_profile?.avatar_url} />
                        <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                          {selectedConversation.agent_profile?.full_name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {selectedConversation.agent_profile?.full_name || 'Agent'}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {selectedConversation.property?.title || 'New conversation'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation"
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
                  className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 min-h-0 bg-gradient-to-b from-gray-50/30 to-white"
                  style={{ WebkitOverflowScrolling: 'touch' }}
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
                          className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl break-words shadow-sm ${
                            msg.sender_id === user?.id 
                              ? 'bg-primary text-primary-foreground rounded-br-md' 
                              : 'bg-white text-foreground rounded-bl-md border border-border'
                          }`}
                        >
                          <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                          <div className={`text-[10px] sm:text-xs mt-1.5 ${
                            msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
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
                <div className="border-t px-3 sm:px-4 py-3 bg-white flex-shrink-0 safe-area-inset-bottom">
                  {selectedConversation?.status === 'pending' && messages.length <= 1 ? (
                    <div className="text-center py-2 text-xs sm:text-sm text-muted-foreground">
                      <p>The agent will activate this conversation when they respond to your inquiry.</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }} className="flex items-end gap-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 min-h-[44px] max-h-32 resize-none text-sm sm:text-base rounded-xl border-border focus:ring-2 focus:ring-primary/20 bg-card px-4 py-2.5"
                        rows={1}
                      />
                      <Button 
                        type="submit"
                        size="icon" 
                        disabled={!newMessage.trim() || sending}
                        className="bg-primary hover:bg-pickfirst-amber text-primary-foreground flex-shrink-0 h-11 w-11 sm:h-10 sm:w-10 rounded-xl shadow-sm touch-manipulation"
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
