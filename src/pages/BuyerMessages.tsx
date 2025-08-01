import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, Send, Search, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const BuyerMessagesPage = () => {
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');

  // Mock conversations data
  const conversations = [
    {
      id: '1',
      agentName: 'Sarah Johnson',
      agentImage: null,
      lastMessage: 'I found some great properties that match your criteria!',
      timestamp: '10:30 AM',
      unread: 2,
      isOnline: true
    },
    {
      id: '2',
      agentName: 'Mike Chen',
      agentImage: null,
      lastMessage: 'When would you like to schedule the viewing?',
      timestamp: 'Yesterday',
      unread: 0,
      isOnline: false
    },
    {
      id: '3',
      agentName: 'Emily Davis',
      agentImage: null,
      lastMessage: 'The seller has accepted your offer!',
      timestamp: '2 days ago',
      unread: 1,
      isOnline: true
    }
  ];

  // Mock messages for selected conversation
  const messages = [
    {
      id: '1',
      senderId: 'agent',
      senderName: 'Sarah Johnson',
      content: 'Hi! I saw you\'re interested in properties in the downtown area. I have some great options to show you.',
      timestamp: '9:45 AM',
      isAgent: true
    },
    {
      id: '2',
      senderId: 'buyer',
      senderName: 'You',
      content: 'Yes, I\'m looking for a 2-3 bedroom place with good access to public transport.',
      timestamp: '9:50 AM',
      isAgent: false
    },
    {
      id: '3',
      senderId: 'agent',
      senderName: 'Sarah Johnson',
      content: 'Perfect! I found some great properties that match your criteria. Would you like to schedule a viewing this weekend?',
      timestamp: '10:30 AM',
      isAgent: true
    }
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Add message logic here
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-primary border-white/20 hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Messages</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Conversations
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {conversations.map(conversation => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-gray-800 ${
                      selectedConversation === conversation.id ? 'bg-primary/10 border-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {conversation.agentName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        {conversation.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-medium truncate">{conversation.agentName}</h3>
                          <span className="text-xs text-gray-400">{conversation.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{conversation.lastMessage}</p>
                      </div>
                      {conversation.unread > 0 && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-semibold">{conversation.unread}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">SJ</span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Sarah Johnson</h3>
                        <p className="text-sm text-green-400">Online</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-gray-300 hover:text-primary">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-gray-300 hover:text-primary">
                        <Video className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.isAgent ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.isAgent
                              ? 'bg-gray-800 text-white'
                              : 'bg-primary text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-xl font-semibold mb-2 text-white">Select a Conversation</h3>
                  <p className="text-gray-300">Choose a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BuyerMessagesPage;