import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, MessageCircle, Users, Building, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ExistingConversation {
  id: string;
  subject: string;
  property?: {
    id: string;
    title: string;
    address: string;
  };
  created_at: string;
  last_message_at: string;
  status: string;
}

interface ConversationManagerProps {
  clientId: string;
  propertyId?: string;
  onConversationSelected?: (conversationId: string) => void;
  onNewConversation?: (conversationId?: string) => void;
}

export const ConversationManager: React.FC<ConversationManagerProps> = ({
  clientId,
  propertyId,
  onConversationSelected,
  onNewConversation
}) => {
  const { user } = useAuth();
  const [existingConversations, setExistingConversations] = useState<ExistingConversation[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user && clientId) {
      checkExistingConversations();
    }
  }, [user, clientId, propertyId]);

  const checkExistingConversations = async () => {
    if (!user || !clientId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select(`
          id,
          subject,
          created_at,
          last_message_at,
          status,
          metadata,
          property_inquiries!conversations_inquiry_id_fkey(
            property_id,
            property_listings(id, title, address)
          )
        `)
        .eq('agent_id', user.id)
        .eq('client_id', clientId)
        .order('last_message_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const conversations = (data || []).map(conv => ({
        id: conv.id,
        subject: conv.subject || 'General Conversation',
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        status: conv.status || 'active',
        property: conv.property_inquiries?.[0]?.property_listings || 
                 (conv.metadata && typeof conv.metadata === 'object' && !Array.isArray(conv.metadata) &&
                  (conv.metadata as Record<string, any>).property_id ? { 
                   id: (conv.metadata as Record<string, any>).property_id, 
                   title: 'Property', 
                   address: 'Address not available' 
                 } : undefined)
      }));

      setExistingConversations(conversations);
      
      // If there are existing conversations and we're trying to start a new one, show dialog
      if (conversations.length > 0) {
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error checking existing conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async () => {
    if (!user || !clientId) return;

    setCreating(true);
    try {
      // Check if there's already a conversation for this specific property
      if (propertyId) {
        const existingForProperty = existingConversations.find(
          conv => conv.property?.id === propertyId
        );
        
        if (existingForProperty) {
          toast.info('A conversation already exists for this property');
          onConversationSelected?.(existingForProperty.id);
          setShowDialog(false);
          setCreating(false);
          return;
        }
      }

      const subject = propertyId 
        ? `Property Inquiry - ${new Date().toLocaleDateString()}`
        : `General Conversation - ${new Date().toLocaleDateString()}`;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: user.id,
          client_id: clientId,
          subject: subject,
          metadata: propertyId ? { property_id: propertyId } : {}
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('New conversation started');
      onConversationSelected?.(data.id);
      onNewConversation?.(data.id);
      setShowDialog(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const selectExistingConversation = (conversationId: string) => {
    onConversationSelected?.(conversationId);
    setShowDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-pulse text-gray-400">Checking conversations...</div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pickfirst-yellow">
              <MessageCircle className="h-5 w-5" />
              Existing Conversations Found
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              You have {existingConversations.length} existing conversation{existingConversations.length !== 1 ? 's' : ''} with this client. 
              Would you like to continue an existing conversation or start a new one?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing Conversations */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Existing Conversations
              </h3>
              
              {existingConversations.map((conversation) => (
                <Card 
                  key={conversation.id}
                  className="bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => selectExistingConversation(conversation.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white text-sm">
                            {conversation.subject}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              conversation.status === 'active' 
                                ? 'border-green-400/30 text-green-400'
                                : 'border-gray-400/30 text-gray-400'
                            }`}
                          >
                            {conversation.status}
                          </Badge>
                        </div>
                        
                        {conversation.property && (
                          <div className="flex items-center gap-1 text-xs text-blue-400 mb-1">
                            <Building className="h-3 w-3" />
                            {conversation.property.title} - {conversation.property.address}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400">
                          Last activity: {formatDate(conversation.last_message_at)}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectExistingConversation(conversation.id);
                        }}
                      >
                        Continue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Property-specific warning */}
            {propertyId && existingConversations.some(conv => conv.property?.id === propertyId) && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-yellow-500 font-medium">Property Conversation Exists</p>
                    <p className="text-yellow-200">
                      You already have a conversation about this specific property. 
                      Consider continuing the existing conversation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={createNewConversation}
                disabled={creating}
                className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
              >
                {creating ? (
                  'Creating...'
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Start New Conversation
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success feedback when no existing conversations */}
      {existingConversations.length === 0 && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="h-4 w-4" />
          Ready to start conversation
        </div>
      )}
    </>
  );
};
