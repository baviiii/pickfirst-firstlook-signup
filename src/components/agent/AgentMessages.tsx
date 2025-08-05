import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Search, 
  Phone, 
  Video, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Star,
  Archive,
  Flag,
  Users,
  Plus,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  subject: string;
  preview: string;
  content: string;
  timestamp: string;
  unread: boolean;
  priority: 'low' | 'medium' | 'high';
  type: 'inquiry' | 'follow_up' | 'appointment' | 'contract' | 'general';
  attachments?: string[];
}

interface ConversationMessage {
  id: string;
  sender: 'agent' | 'client';
  content: string;
  timestamp: string;
  attachments?: string[];
}

export const AgentMessages = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      clientId: '1',
      clientName: 'Sarah Johnson',
      clientAvatar: '',
      subject: 'Property Inquiry - 123 Oak Street',
      preview: 'Hi, I\'m interested in scheduling a viewing for the property at 123 Oak Street...',
      content: 'Hi, I\'m interested in scheduling a viewing for the property at 123 Oak Street. Could we arrange something for this weekend? I\'m available Saturday morning or Sunday afternoon.',
      timestamp: '2024-01-24T10:30:00Z',
      unread: true,
      priority: 'high',
      type: 'inquiry',
      attachments: []
    },
    {
      id: '2',
      clientId: '2',
      clientName: 'Mike Chen',
      clientAvatar: '',
      subject: 'Contract Questions',
      preview: 'I have a few questions about the purchase agreement we discussed...',
      content: 'I have a few questions about the purchase agreement we discussed. Could you clarify the closing timeline and inspection contingencies?',
      timestamp: '2024-01-24T09:15:00Z',
      unread: true,
      priority: 'medium',
      type: 'contract',
      attachments: ['purchase_agreement.pdf']
    },
    {
      id: '3',
      clientId: '3',
      clientName: 'Lisa Rodriguez',
      clientAvatar: '',
      subject: 'Thank you for the showing',
      preview: 'Thank you for showing us the property yesterday. We loved it!',
      content: 'Thank you for showing us the property yesterday. We loved it and would like to make an offer. What\'s the next step?',
      timestamp: '2024-01-23T16:45:00Z',
      unread: false,
      priority: 'high',
      type: 'follow_up',
      attachments: []
    },
    {
      id: '4',
      clientId: '4',
      clientName: 'David Wilson',
      clientAvatar: '',
      subject: 'Market Update Request',
      preview: 'Could you send me the latest market analysis for the downtown area?',
      content: 'Could you send me the latest market analysis for the downtown area? I\'m considering listing my condo.',
      timestamp: '2024-01-23T14:20:00Z',
      unread: false,
      priority: 'low',
      type: 'general',
      attachments: []
    }
  ]);

  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      sender: 'client',
      content: 'Hi, I\'m interested in scheduling a viewing for the property at 123 Oak Street. Could we arrange something for this weekend?',
      timestamp: '2024-01-24T10:30:00Z'
    },
    {
      id: '2',
      sender: 'agent',
      content: 'Hi Sarah! I\'d be happy to arrange a viewing. I have availability on Saturday at 10 AM or Sunday at 2 PM. Which works better for you?',
      timestamp: '2024-01-24T10:35:00Z'
    },
    {
      id: '3',
      sender: 'client',
      content: 'Saturday at 10 AM would be perfect! Should I bring anything specific?',
      timestamp: '2024-01-24T10:37:00Z'
    }
  ]);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(messages[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUnread, setFilterUnread] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || message.type === filterType;
    const matchesUnread = !filterUnread || message.unread;
    return matchesSearch && matchesType && matchesUnread;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inquiry': return '🏠';
      case 'follow_up': return '📞';
      case 'appointment': return '📅';
      case 'contract': return '📄';
      default: return '💬';
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ConversationMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setConversation([...conversation, message]);
    setNewMessage('');
    
    // Mark message as read if responding
    if (selectedMessage?.unread) {
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id ? { ...msg, unread: false } : msg
      ));
    }

    toast.success('Message sent successfully');
  };

  const handleMarkAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, unread: false } : msg
    ));
  };

  const handleStarMessage = (messageId: string) => {
    toast.success('Message starred');
  };

  const handleArchiveMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
    toast.success('Message archived');
  };

  const unreadCount = messages.filter(m => m.unread).length;

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
          <Dialog open={isComposing} onOpenChange={setIsComposing}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
                <DialogDescription>Send a message to your clients</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarah">Sarah Johnson</SelectItem>
                    <SelectItem value="mike">Mike Chen</SelectItem>
                    <SelectItem value="lisa">Lisa Rodriguez</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Subject" />
                <Textarea placeholder="Type your message..." rows={6} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsComposing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsComposing(false)}>
                    Send Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
        {/* Messages List */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Inbox</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFilterUnread(!filterUnread)}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="inquiry">Inquiries</SelectItem>
                  <SelectItem value="follow_up">Follow-ups</SelectItem>
                  <SelectItem value="appointment">Appointments</SelectItem>
                  <SelectItem value="contract">Contracts</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-y-auto h-[600px]">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                    selectedMessage?.id === message.id ? 'bg-gray-800' : ''
                  } ${message.unread ? 'bg-pickfirst-yellow/10' : ''}`}
                  onClick={() => {
                    setSelectedMessage(message);
                    handleMarkAsRead(message.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={message.clientAvatar} />
                      <AvatarFallback>{message.clientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium truncate ${message.unread ? 'text-pickfirst-yellow' : 'text-white'}`}>
                          {message.clientName}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{getTypeIcon(message.type)}</span>
                          <Badge className={getPriorityColor(message.priority)} variant="secondary">
                            {message.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className={`text-sm truncate ${message.unread ? 'font-medium text-white' : 'text-gray-400'}`}>
                        {message.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {message.preview}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleDateString()}
                        </span>
                        {message.unread && (
                          <div className="w-2 h-2 bg-pickfirst-yellow rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Message Content */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
          {selectedMessage ? (
            <>
              <CardHeader className="border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedMessage.clientAvatar} />
                      <AvatarFallback>{selectedMessage.clientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedMessage.clientName}</CardTitle>
                      <CardDescription>{selectedMessage.subject}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleStarMessage(selectedMessage.id)}>
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleArchiveMessage(selectedMessage.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-900/50">
                  {conversation.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        msg.sender === 'agent' 
                          ? 'bg-pickfirst-yellow text-black' 
                          : 'bg-gray-800'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-2 ${
                          msg.sender === 'agent' ? 'text-black/70' : 'text-gray-400'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-gray-700 p-4">
                  <div className="flex items-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 min-h-[40px] max-h-[120px]"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white">Select a message</h3>
                <p className="text-gray-400">Choose a conversation to view the message thread</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};