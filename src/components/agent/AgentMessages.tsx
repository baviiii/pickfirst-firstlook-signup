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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BuyerProfileView } from '@/components/buyer/BuyerProfileView';
import { enhancedConversationService } from '@/services/enhancedConversationService';
import type { EnhancedConversation } from '@/services/enhancedConversationService';
import { useSearchParams } from 'react-router-dom';

export const AgentMessages = () => {
  const { user, profile } = useAuth();
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

  // Prevent body scrolling when messages page is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
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
        unread_only: filterStatus === 'unread'
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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden min-h-0" style={{ height: '100vh' }}>
        {/* Sidebar - Conversations List */}
        <div 
          className={`${showConversations ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r pickfirst-glass bg-card/90 min-w-0 h-full`}
        >
          <div className="p-4 border-b border-border flex-shrink-0">
            <h2 className="text-xl font-semibold text-foreground">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0" style={{ height: 'calc(100vh - 80px)' }}>
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedConversation?.id === conv.id 
                    ? 'bg-primary/20 border-primary shadow-md' 
                    : 'border-border hover:bg-card/80 hover:border-pickfirst-yellow/40'
                }`}
                onClick={() => handleConversationSelect(conv)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={conv.client_profile?.avatar_url} />
                    <AvatarFallback>
                      {conv.client_profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-foreground text-sm truncate">
                        {conv.client_profile?.full_name || 'Unknown User'}
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
                    {/* Show multiple inquiries indicator */}
                    {getClientInquiryCount(conv.client_profile?.full_name) > 1 && (
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
        </div>

        {/* Main Content - Messages */}
        <div className={`${!showConversations ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-h-0 min-w-0 h-full`}>
          {selectedConversation ? (
            <>
              <div className="border-b border-border p-4 flex items-center justify-between pickfirst-glass bg-card/90 flex-shrink-0 h-16">
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
                      <AvatarImage src={selectedConversation.client_profile?.avatar_url} />
                      <AvatarFallback>
                        {selectedConversation.client_profile?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {selectedConversation.client_profile?.full_name || 'Unknown Client'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.property?.title || 'New conversation'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => setShowBuyerProfile(true)}>
                    <User className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Phone className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Container */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
                style={{ height: 'calc(100vh - 180px)' }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl break-words ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card/80 text-foreground rounded-bl-md border border-border'
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
                      <div className={`text-xs mt-1 ${
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
              <div className="border-t border-border p-4 pickfirst-glass bg-card/90 flex-shrink-0 h-auto">
                <div className="flex items-end space-x-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 min-h-[40px] max-h-32 resize-none bg-card border-border text-foreground placeholder:text-muted-foreground"
                    rows={1}
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-primary text-primary-foreground hover:bg-pickfirst-amber flex-shrink-0 h-10 w-10"
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
      
      {/* Buyer Profile Dialog */}
      {selectedConversation?.client_profile && (
        <BuyerProfileView
          buyerId={selectedConversation.client_id}
          isOpen={showBuyerProfile}
          onClose={() => setShowBuyerProfile(false)}
        />
      )}
    </div>
  );
};
