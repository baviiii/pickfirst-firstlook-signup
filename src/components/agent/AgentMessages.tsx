import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, Archive, Plus, Send, Paperclip, Filter, MoreVertical, Phone, Video, MessageSquare, ArrowLeft, Menu, X, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/hooks/useViewMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BuyerProfileView } from '@/components/buyer/BuyerProfileView';
import { AgentProfileView } from '@/components/agent/AgentProfileView';
import { enhancedConversationService } from '@/services/enhancedConversationService';
import type { EnhancedConversation } from '@/services/enhancedConversationService';
import { useSearchParams } from 'react-router-dom';

export const AgentMessages = () => {
  const { user, profile } = useAuth();
  const { viewMode } = useViewMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<EnhancedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EnhancedConversation | null>(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newMessageForm, setNewMessageForm] = useState({
    clientEmail: '',
    subject: '',
    content: ''
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConversations, setShowConversations] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showBuyerProfile, setShowBuyerProfile] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);


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

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleConversationSelect = (conv) => {
    setSelectedConversation(conv);
    if (isMobile) {
      setShowConversations(false);
    }
  };

  const handleBackToConversations = () => {
    setShowConversations(true);
    if (isMobile) {
      setSelectedConversation(null);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const { data, error } = await supabase.functions.invoke('messaging', {
        body: { action: 'getMessages', conversationId }
      });
      
      if (error) {
        if (error.code === 'CONVERSATION_EXISTS') {
          toast.info('Continuing existing conversation');
        } else {
          toast.error('Unable to load conversation history');
        }
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Connection issue - please try again');
    }
  };

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await enhancedConversationService.getConversations({
        search: searchTerm || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus as 'active' | 'archived',
        unread_only: filterStatus === 'unread',
        viewMode: viewMode // Filter conversations based on current view mode
      });
      
      if (error) {
        toast.error('Unable to sync conversations');
        return;
      }
      setConversations(data || []);
      
      // Check if we have a conversation ID in URL params
      const conversationId = searchParams.get('conversation');
      if (conversationId && data) {
        const conv = data.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
          if (isMobile) {
            setShowConversations(false);
          }
          // Clear the URL param
          setSearchParams({});
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Connection issue - please refresh');
    } finally {
      setLoading(false);
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
      toast.error('Connection issue - please try again');
    } finally {
      setSending(false);
    }
  };

  const handleNewMessage = async () => {
    if (!user || !newMessageForm.clientEmail || !newMessageForm.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newMessageForm.clientEmail)
        .eq('role', 'buyer')
        .single();

      if (!clientData) {
        toast.error('Client not found - check email address');
        return;
      }

      const { data: conversation, error: conversationError } = await supabase.functions.invoke('messaging', {
        body: { 
          action: 'createConversation',
          agentId: user.id,
          clientId: clientData.id,
          subject: newMessageForm.subject
        }
      });

      if (conversationError) {
        if (conversationError.code === 'CONVERSATION_EXISTS') {
          toast.info('Conversation already exists - opening existing chat');
          loadConversations();
          setIsNewMessageOpen(false);
          return;
        }
        toast.error('Unable to start conversation');
        return;
      }

      const conversationId = conversation.id;

      if (conversationId) {
        await supabase.functions.invoke('messaging', {
          body: { 
            action: 'sendMessage',
            conversationId,
            content: newMessageForm.content
          }
        });

        setIsNewMessageOpen(false);
        setNewMessageForm({ clientEmail: '', subject: '', content: '' });
        loadConversations();
        toast.success('Message sent successfully');
      }
    } catch (error) {
      console.error('Error sending new message:', error);
      toast.error('Unable to send message - please try again');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const conversationTitle = enhancedConversationService.getConversationTitle(conv, user?.id || '');
    const conversationSubtitle = enhancedConversationService.getConversationSubtitle(conv);
    
    const matchesSearch = !searchTerm || 
      conversationTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversationSubtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.client_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.client_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'unread' && (conv.unread_count || 0) > 0) ||
      (filterStatus === 'recent' && new Date(conv.last_message_at) > new Date(Date.now() - 24 * 60 * 60 * 1000));

    return matchesSearch && matchesFilter;
  });

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getClientInquiryCount = (clientName: string | undefined) => {
    const clientConversations = conversations.filter(conv => conv.client_profile?.full_name === clientName);
    return clientConversations.length;
  };

  // Get the other party's profile based on view mode
  const getOtherPartyProfile = (conv: EnhancedConversation) => {
    if (viewMode === 'agent') {
      // In agent mode: show the client/buyer profile
      return conv.client_profile;
    } else {
      // In buyer mode: show the agent profile
      return conv.agent_profile;
    }
  };

  // Get the other party's ID based on view mode
  const getOtherPartyId = (conv: EnhancedConversation) => {
    if (viewMode === 'agent') {
      // In agent mode: return client_id (the buyer)
      return conv.client_id;
    } else {
      // In buyer mode: return agent_id (the agent)
      return conv.agent_id;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - Conversations List */}
        <div 
          className={`${isMobile ? (showConversations ? 'flex' : 'hidden') : 'flex'} flex-col w-full lg:w-80 border-r bg-white min-w-0 h-full`}
        >
          <div className="p-3 sm:p-4 border-b border-border flex-shrink-0 bg-white">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1">Messages from buyers will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 sm:p-4 cursor-pointer active:bg-muted/70 transition-colors touch-manipulation ${
                      selectedConversation?.id === conv.id 
                        ? 'bg-primary/5 border-l-2 border-l-primary' 
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => handleConversationSelect(conv)}
                  >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={getOtherPartyProfile(conv)?.avatar_url} />
                    <AvatarFallback>
                      {getOtherPartyProfile(conv)?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-foreground text-sm truncate">
                        {getOtherPartyProfile(conv)?.full_name || 'Unknown User'}
                      </div>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs ml-2 flex-shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium mb-1 text-muted-foreground truncate">
                      {conv.subject}
                    </div>
                    {/* Enhanced property inquiry display */}
                    {conv.property && (
                      <div className="text-xs text-blue-600 mb-1 truncate">
                        📍 {conv.property.title}
                      </div>
                    )}
                    {/* Show multiple inquiries indicator - only in agent mode */}
                    {viewMode === 'agent' && getClientInquiryCount(conv.client_profile?.full_name) > 1 && (
                      <div className="text-xs text-pickfirst-yellow mb-1">
                        🏠 {getClientInquiryCount(conv.client_profile?.full_name)} properties inquired
                      </div>
                    )}
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
            )}
          </div>
        </div>

        {/* Main Content - Messages */}
        <div className={`${isMobile ? (!showConversations ? 'flex' : 'hidden') : 'flex'} flex-col flex-1 min-h-0 min-w-0 h-full`}>
          {selectedConversation ? (
            <>
              <div className="border-b border-border px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between bg-white flex-shrink-0 min-h-[56px] sm:min-h-[64px] sticky top-0 z-10 shadow-sm">
                <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleBackToConversations}
                    className="lg:hidden flex-shrink-0 h-10 w-10 touch-manipulation"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <button
                    type="button"
                    className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowBuyerProfile(true);
                    }}
                  >
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 ring-2 ring-primary/10">
                      <AvatarImage src={getOtherPartyProfile(selectedConversation)?.avatar_url} />
                      <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                        {getOtherPartyProfile(selectedConversation)?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                        {getOtherPartyProfile(selectedConversation)?.full_name || (viewMode === 'agent' ? 'Unknown Client' : 'Unknown Agent')}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {selectedConversation.property?.title || 'New conversation'}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setShowBuyerProfile(true)} className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation">
                    <User className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation">
                    <Phone className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Container */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 min-h-0 bg-gradient-to-b from-gray-50/30 to-white"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-xs md:max-w-[70%] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl break-words shadow-sm ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-white text-foreground rounded-bl-md border border-border'
                      }`}
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                      <div className={`text-[10px] sm:text-xs mt-1.5 ${
                        msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-border p-3 sm:p-4 bg-white flex-shrink-0 h-auto safe-area-inset-bottom">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 min-h-[44px] max-h-32 resize-none bg-card border-border text-foreground placeholder:text-muted-foreground text-sm sm:text-base rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/20"
                    rows={1}
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-primary text-primary-foreground hover:bg-pickfirst-amber flex-shrink-0 h-11 w-11 sm:h-10 sm:w-10 rounded-xl shadow-sm touch-manipulation"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2 max-w-md p-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground">No conversation selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a conversation or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="pickfirst-glass bg-card text-card-foreground border border-pickfirst-yellow/30">
          <DialogHeader>
            <DialogTitle className="text-foreground">Send New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientEmail" className="text-foreground">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={newMessageForm.clientEmail}
                onChange={(e) => setNewMessageForm({...newMessageForm, clientEmail: e.target.value})}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <Label htmlFor="subject" className="text-foreground">Subject</Label>
              <Input
                id="subject"
                placeholder="Message subject"
                value={newMessageForm.subject}
                onChange={(e) => setNewMessageForm({...newMessageForm, subject: e.target.value})}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <Label htmlFor="content" className="text-foreground">Message</Label>
              <Textarea
                id="content"
                placeholder="Type your message..."
                className="min-h-[100px] bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
                value={newMessageForm.content}
                onChange={(e) => setNewMessageForm({...newMessageForm, content: e.target.value})}
              />
            </div>
            <Button onClick={handleNewMessage} className="w-full bg-primary text-primary-foreground hover:bg-pickfirst-amber">
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Profile Dialog - Show buyer profile in agent mode, agent profile in buyer mode */}
      {selectedConversation && viewMode === 'agent' && selectedConversation.client_id && (
        <BuyerProfileView
          buyerId={selectedConversation.client_id}
          isOpen={showBuyerProfile}
          onClose={() => setShowBuyerProfile(false)}
        />
      )}
      {selectedConversation && viewMode === 'buyer' && selectedConversation.agent_id && (
        <AgentProfileView
          agentId={selectedConversation.agent_id}
          isOpen={showBuyerProfile}
          onClose={() => setShowBuyerProfile(false)}
        />
      )}
    </div>
  );
};
