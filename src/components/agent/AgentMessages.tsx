import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Star, Archive, Plus, Send, Paperclip, Filter, MoreVertical, Phone, Video, MessageSquare } from 'lucide-react';
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
import { messageService, Conversation, Message } from '@/services/messageService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const AgentMessages = () => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'recent'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<{ unsubscribe: () => void } | null>(null);

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
        messageService.markMessagesAsRead(selectedConversation.id).catch(console.error);
      }
    }
  }, [selectedConversation, user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    // Temporarily disable real-time subscriptions until Edge Function is fixed
    console.log('Real-time subscriptions temporarily disabled - fixing Edge Function first');
    
    // TODO: Re-enable after Edge Function is deployed
    /*
    // Subscribe to conversation updates
    const conversationSub = messageService.subscribeToConversations(
      (updatedConversation) => {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === updatedConversation.id ? updatedConversation : conv
          )
        );
      },
      (error) => {
        console.error('Conversation subscription error:', error);
        toast.error('Connection error. Please refresh the page.');
      }
    );

    // Subscribe to message updates for selected conversation
    if (selectedConversation) {
      const messageSub = messageService.subscribeToMessages(
        selectedConversation.id,
        (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          // Mark as read if it's from the client
          if (newMessage.sender_id !== user.id) {
            messageService.markMessagesAsRead(selectedConversation.id).catch(console.error);
          }
        },
        (error) => {
          console.error('Message subscription error:', error);
        }
      );

      unsubscribeRef.current = messageSub;
    }

    return () => {
      conversationSub.unsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current.unsubscribe();
      }
    };
    */
  }, [user, selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const data = await messageService.getConversations();
      setConversations(data);
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
      const message = await messageService.sendMessage(
        selectedConversation.id,
        newMessage.trim()
      );
      
      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        // Refresh conversations to update last message
        loadConversations();
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

      const conversationId = await messageService.getOrCreateConversation(
        clientData.id,
        newMessageForm.subject
      );

      if (conversationId) {
        await messageService.sendMessage(
          conversationId,
          newMessageForm.content
        );

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
    const matchesSearch = 
      conv.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.client_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.client_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'unread' && (conv.unread_count || 0) > 0) ||
      (filterStatus === 'recent' && new Date(conv.last_message_at) > new Date(Date.now() - 24 * 60 * 60 * 1000));

    return matchesSearch && matchesFilter;
  });

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
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Conversations List */}
      <Card className="w-1/3 flex flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Conversations</CardTitle>
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
                      className="min-h-[100px] bg-gray-800 border-gray-700 text-white"
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
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
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
                const otherUser = profile?.role === 'agent' ? conv.client_profile : conv.agent_profile;
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
                      <div className="font-medium text-white">{otherUser?.full_name || 'Unknown User'}</div>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <Badge className="bg-pickfirst-yellow text-black text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium mb-1 text-gray-300">{conv.subject}</div>
                    {conv.last_message && (
                      <div className="text-sm text-gray-400 line-clamp-2 mb-2">
                        {conv.last_message.content}
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
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedConversation.client_profile?.avatar_url} />
                    <AvatarFallback className="bg-pickfirst-yellow text-black">
                      {selectedConversation.client_profile?.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg text-white">{selectedConversation.client_profile?.full_name}</CardTitle>
                    <div className="text-sm text-gray-400">{selectedConversation.subject}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                        className={`max-w-[70%] p-3 rounded-lg ${
                          isCurrentUser
                            ? 'bg-pickfirst-yellow text-black'
                            : 'bg-gray-800 text-white'
                        }`}
                      >
                        <div className="text-sm">{msg.content}</div>
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
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-pickfirst-yellow">
                    <Paperclip className="h-4 w-4" />
                  </Button>
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
                    className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90 disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">Select a conversation</div>
              <div className="text-sm">Choose a conversation to view messages</div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};