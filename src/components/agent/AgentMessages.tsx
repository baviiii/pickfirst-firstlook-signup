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

export const AgentMessages = () => {
  const { user, profile } = useAuth();
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
        toast.error('Failed to load messages');
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
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
        toast.error('Client not found');
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

      if (conversationError || !conversation) {
        toast.error('Failed to create conversation');
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
      toast.error('Failed to send message');
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
    <div className="h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col md:flex-row overflow-hidden">
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
                  <AvatarImage src={selectedConversation.client_profile?.avatar_url} />
                  <AvatarFallback className="bg-pickfirst-yellow text-black text-xs">
                    {selectedConversation.client_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium text-sm truncate">
                    {selectedConversation.client_profile?.full_name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {selectedConversation.subject}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
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
              <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 mx-4 rounded-lg">
                  <DialogHeader>
                    <DialogTitle className="text-white">Send New Message</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="clientEmail" className="text-white text-sm">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        placeholder="client@example.com"
                        value={newMessageForm.clientEmail}
                        onChange={(e) => setNewMessageForm({...newMessageForm, clientEmail: e.target.value})}
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject" className="text-white text-sm">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Message subject"
                        value={newMessageForm.subject}
                        onChange={(e) => setNewMessageForm({...newMessageForm, subject: e.target.value})}
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content" className="text-white text-sm">Message</Label>
                      <Textarea
                        id="content"
                        placeholder="Type your message..."
                        className="min-h-[80px] bg-gray-800 border-gray-700 text-white mt-1 resize-none"
                        value={newMessageForm.content}
                        onChange={(e) => setNewMessageForm({...newMessageForm, content: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleNewMessage} className="w-full bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90">
                      Send Message
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Conversations</h2>
              <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90">
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20">
                  <DialogHeader>
                    <DialogTitle className="text-white">Send New Message</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="clientEmail" className="text-white">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        placeholder="client@example.com"
                        value={newMessageForm.clientEmail}
                        onChange={(e) => setNewMessageForm({...newMessageForm, clientEmail: e.target.value})}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject" className="text-white">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Message subject"
                        value={newMessageForm.subject}
                        onChange={(e) => setNewMessageForm({...newMessageForm, subject: e.target.value})}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content" className="text-white">Message</Label>
                      <Textarea
                        id="content"
                        placeholder="Type your message..."
                        className="min-h-[100px] bg-gray-800 border-gray-700 text-white resize-none"
                        value={newMessageForm.content}
                        onChange={(e) => setNewMessageForm({...newMessageForm, content: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleNewMessage} className="w-full bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90">
                      Send Message
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter conversations" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Conversations</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="recent">Recent (24h)</SelectItem>
                </SelectContent>
              </Select>
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
                const otherUser = profile?.role === 'agent' ? conv.client_profile : conv.agent_profile;
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
                        <AvatarImage src={otherUser?.avatar_url} />
                        <AvatarFallback className="bg-pickfirst-yellow text-black text-sm">
                          {otherUser?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-white text-sm truncate">
                            {otherUser?.full_name || 'Unknown User'}
                          </div>
                          {conv.unread_count && conv.unread_count > 0 && (
                            <Badge className="bg-pickfirst-yellow text-black text-xs ml-2 flex-shrink-0">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium mb-1 text-gray-300 truncate">
                          {conv.subject}
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
            {/* Mobile Header */}
            <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-700 p-3">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-pickfirst-yellow"
                    onClick={handleBackToConversations}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={selectedConversation.client_profile?.avatar_url}
                    alt={selectedConversation.client_profile?.full_name || 'Client'}
                  />
                  <AvatarFallback className="bg-pickfirst-yellow text-black">
                    {selectedConversation.client_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">
                    {selectedConversation.client_profile?.full_name || 'Client'}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {selectedConversation.client_profile?.email}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-pickfirst-yellow"
                    onClick={() => setShowBuyerProfile(true)}
                    title="View Profile"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-400 hover:text-pickfirst-yellow"
                    title="Video Call"
                  >
                    <Video className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {selectedConversation.property && (
                <div className="text-xs text-pickfirst-yellow mt-1 bg-pickfirst-yellow/10 px-2 py-1 rounded truncate">
                  🏠 {selectedConversation.property.title} - ${selectedConversation.property.price?.toLocaleString()}
                </div>
              )}
            </div>
            
            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
              {messages.map((msg) => {
                const isCurrentUser = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl break-words ${
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
                      <div className={`text-xs mt-1 ${
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
            
            {/* Message Input */}
            <div className="border-t border-gray-700 p-3 md:p-4">
              <div className="flex gap-2 items-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-pickfirst-yellow flex-shrink-0 mb-1"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
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
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="text-gray-400">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Buyer Profile Modal */}
      {selectedConversation?.client_profile && (
        <Dialog open={showBuyerProfile} onOpenChange={setShowBuyerProfile}>
          <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:max-w-lg bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Buyer Profile</DialogTitle>
            </DialogHeader>
            <BuyerProfileView
              buyerId={selectedConversation.client_id}
              isOpen={showBuyerProfile}
              onClose={() => setShowBuyerProfile(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
