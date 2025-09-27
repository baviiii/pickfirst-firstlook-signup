import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Building } from 'lucide-react';
import { ConversationManager } from './ConversationManager';
import { messageService } from '@/services/messageService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PropertyConversationStarterProps {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  buyerId: string;
  onConversationStarted?: (conversationId: string) => void;
  className?: string;
}

export const PropertyConversationStarter: React.FC<PropertyConversationStarterProps> = ({
  propertyId,
  propertyTitle,
  propertyAddress,
  buyerId,
  onConversationStarted,
  className
}) => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleStartConversation = async () => {
    if (!user || !message.trim()) return;

    setLoading(true);
    try {
      // Determine the correct participant IDs based on user role
      const targetUserId = profile?.role === 'buyer' ? buyerId : user.id;
      const conversationSubject = `Property Inquiry: ${propertyTitle}`;

      // Create or get conversation with property ID for property-specific conversation
      const conversationId = await messageService.getOrCreateConversation(
        targetUserId, 
        conversationSubject,
        undefined, // inquiry ID
        propertyId // property ID to ensure separate conversations per property
      );

      if (!conversationId) {
        throw new Error('Failed to create conversation');
      }

      // Send the initial message
      await messageService.sendMessage(
        conversationId,
        `I'm interested in this property:\n\n${propertyTitle}\n${propertyAddress}\n\n${message.trim()}`
      );

      toast.success('Message sent successfully');
      onConversationStarted?.(conversationId);
      setMessage('');
      setOpen(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelected = async (conversationId: string) => {
    if (message.trim()) {
      setLoading(true);
      try {
        await messageService.sendMessage(conversationId, message.trim());
        toast.success('Message sent to existing conversation');
        onConversationStarted?.(conversationId);
        setMessage('');
        setOpen(false);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      } finally {
        setLoading(false);
      }
    } else {
      onConversationStarted?.(conversationId);
      setOpen(false);
    }
    setShowManager(false);
  };

  const handleNewConversation = () => {
    setShowManager(false);
    // Continue with new conversation flow
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`bg-pickfirst-yellow text-black hover:bg-pickfirst-amber ${className}`}>
          <MessageCircle className="h-4 w-4 mr-2" />
          {profile?.role === 'buyer' ? 'Contact Agent' : 'Message Buyer'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pickfirst-yellow">
            <Building className="h-5 w-5" />
            Contact About Property
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Send a message about: {propertyTitle}
          </DialogDescription>
        </DialogHeader>

        {showManager ? (
          <ConversationManager
            clientId={profile?.role === 'buyer' ? user?.id || '' : buyerId}
            propertyId={propertyId}
            onConversationSelected={handleConversationSelected}
            onNewConversation={handleNewConversation}
          />
        ) : (
          <div className="space-y-4">
            {/* Property Info */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="font-medium text-white mb-1">{propertyTitle}</h3>
              <p className="text-sm text-gray-400">{propertyAddress}</p>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Your Message</label>
              <Textarea
                placeholder={profile?.role === 'buyer' 
                  ? "I'm interested in this property. Could you provide more information about..." 
                  : "I'd like to discuss this property with you..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 min-h-24"
                rows={4}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              
              {profile?.role === 'agent' && (
                <Button
                  variant="outline"
                  onClick={() => setShowManager(true)}
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  Check Existing
                </Button>
              )}
              
              <Button
                onClick={handleStartConversation}
                disabled={loading || !message.trim()}
                className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
              >
                {loading ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};