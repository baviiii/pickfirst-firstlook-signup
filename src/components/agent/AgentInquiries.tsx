import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Home, 
  Clock, 
  User, 
  Mail,
  Phone,
  Reply,
  UserPlus,
  CheckCircle,
  Calendar,
  ArrowUpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { PropertyService, PropertyInquiry } from '@/services/propertyService';
import { messageService } from '@/services/messageService';
import { conversationService } from '@/services/conversationService';
import { useAuth } from '@/hooks/useAuth';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { LeadConversionDialog } from './LeadConversionDialog';

interface ExtendedPropertyInquiry extends PropertyInquiry {
  property?: {
    title: string;
    address: string;
    price: number;
  };
  buyer?: {
    full_name: string;
    email: string;
  };
  conversation?: {
    id: string;
    subject: string;
  };
}

export const AgentInquiriesComponent = () => {
  const { profile } = useAuth();
  const [inquiries, setInquiries] = useState<ExtendedPropertyInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<ExtendedPropertyInquiry | null>(null);
  const [response, setResponse] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false);
  const [selectedInquiryForConversion, setSelectedInquiryForConversion] = useState<ExtendedPropertyInquiry | null>(null);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Get all inquiries for properties owned by this agent
      const { data: myListings } = await PropertyService.getMyListings();
      if (!myListings) {
        setLoading(false);
        return;
      }

      const allInquiries: ExtendedPropertyInquiry[] = [];
      
      for (const listing of myListings) {
        const { data: propertyInquiries } = await PropertyService.getPropertyInquiries(listing.id);
        if (propertyInquiries) {
          const inquiriesWithProperty = propertyInquiries.map(inquiry => ({
            ...inquiry,
            property: {
              title: listing.title,
              address: listing.address,
              price: listing.price
            }
          }));
          allInquiries.push(...inquiriesWithProperty);
        }
      }

      // Sort by created_at descending
      allInquiries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInquiries(allInquiries);
    } catch (error) {
      toast.error('Failed to fetch inquiries');
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToInquiry = (inquiry: ExtendedPropertyInquiry) => {
    setSelectedInquiry(inquiry);
    setIsResponseDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedInquiry || !response.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setSubmittingResponse(true);
    try {
      const { error } = await PropertyService.respondToInquiry(
        selectedInquiry.id,
        response.trim()
      );

      if (error) throw error;

      toast.success('Response sent successfully');
      setIsResponseDialogOpen(false);
      setResponse('');
      setSelectedInquiry(null);
      
      // Refresh inquiries
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to send response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleStartConversation = async (inquiry: ExtendedPropertyInquiry) => {
    if (!profile || !inquiry.buyer_id) return;

    try {
      // If there's already a conversation, navigate to it
      if (inquiry.conversation_id) {
        toast.success('Opening existing conversation...');
        // Navigate to the conversation - you can implement this based on your routing
        // For now, we'll just show a success message
        return;
      }

      // Create new conversation if none exists
      const { data: conversation, error } = await conversationService.getOrCreateConversation(
        profile.id,
        inquiry.buyer_id,
        `Property Inquiry: ${inquiry.property?.title}`
      );

      if (conversation && !error) {
        toast.success('Conversation started! You can now message this buyer.');
        // Refresh inquiries to get the updated conversation data
        fetchInquiries();
      } else {
        toast.error('Failed to start conversation');
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const handleConvertLead = (inquiry: ExtendedPropertyInquiry) => {
    setSelectedInquiryForConversion(inquiry);
    setIsConversionDialogOpen(true);
  };

  const getInquiryStatusColor = (inquiry: ExtendedPropertyInquiry) => {
    if (inquiry.agent_response) {
      return 'bg-green-500/10 text-green-500';
    }
    return 'bg-blue-500/10 text-blue-500';
  };

  const getInquiryStatusText = (inquiry: ExtendedPropertyInquiry) => {
    if (inquiry.agent_response) {
      return 'Responded';
    }
    return 'New';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-300">Loading inquiries...</div>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Inquiries Yet</h3>
        <p className="text-gray-400">Property inquiries from buyers will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{inquiries.length}</div>
            <div className="text-sm text-gray-300">Total Inquiries</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-green-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {inquiries.filter(i => i.agent_response).length}
            </div>
            <div className="text-sm text-gray-300">Responded</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {inquiries.filter(i => !i.agent_response).length}
            </div>
            <div className="text-sm text-gray-300">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Inquiries List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {inquiries.map((inquiry) => (
          <Card key={inquiry.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 hover:shadow-lg hover:shadow-pickfirst-yellow/10 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {inquiry.buyer?.full_name?.split(' ').map(n => n[0]).join('') || 'B'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-white text-sm">
                      {inquiry.buyer?.full_name || 'Unknown Buyer'}
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-xs">
                      {inquiry.buyer?.email}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getInquiryStatusColor(inquiry)}>
                  {getInquiryStatusText(inquiry)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Property Details */}
              <div className="bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4 text-pickfirst-yellow" />
                  <span className="text-white font-medium text-sm">
                    {inquiry.property?.title}
                  </span>
                </div>
                <div className="text-gray-300 text-xs">
                  {inquiry.property?.address}
                </div>
                <div className="text-pickfirst-yellow font-bold text-sm">
                  ${inquiry.property?.price?.toLocaleString()}
                </div>
              </div>

              {/* Inquiry Message */}
              <div>
                <div className="text-white font-medium text-sm mb-2">Buyer's Message:</div>
                <div className="text-gray-300 text-sm bg-white/5 p-2 rounded">
                  {inquiry.message}
                </div>
              </div>

              {/* Response if exists */}
              {inquiry.agent_response && (
                <div>
                  <div className="text-white font-medium text-sm mb-2">Your Response:</div>
                  <div className="text-gray-300 text-sm bg-green-500/10 p-2 rounded">
                    {inquiry.agent_response}
                  </div>
                </div>
              )}

              {/* Timing */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                Received: {new Date(inquiry.created_at).toLocaleDateString()} at {new Date(inquiry.created_at).toLocaleTimeString()}
                {inquiry.responded_at && (
                  <>
                    <span className="mx-2">•</span>
                    Responded: {new Date(inquiry.responded_at).toLocaleDateString()}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!inquiry.agent_response && (
                  <Button
                    size="sm"
                    onClick={() => handleRespondToInquiry(inquiry)}
                    className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    Respond
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartConversation(inquiry)}
                  className={`flex-1 ${
                    inquiry.conversation_id 
                      ? 'text-green-500 border-green-500/20 hover:bg-green-500/10' 
                      : 'text-blue-500 border-blue-500/20 hover:bg-blue-500/10'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {inquiry.conversation_id ? 'Open Chat' : 'Start Chat'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConvertLead(inquiry)}
                  className="flex-1 text-green-500 border-green-500/20 hover:bg-green-500/10"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  Convert
                </Button>
              </div>
              
              {/* Conversation Status */}
              {inquiry.conversation_id && (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 p-2 rounded">
                  <CheckCircle className="h-3 w-3" />
                  Active conversation available
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-pickfirst-yellow/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-pickfirst-yellow">Respond to Inquiry</DialogTitle>
            <DialogDescription className="text-gray-300">
              Send a response to {selectedInquiry?.buyer?.full_name} about {selectedInquiry?.property?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium">Your Response</label>
              <Textarea
                placeholder="Thank you for your interest in this property. I'd be happy to provide more information..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsResponseDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={submittingResponse || !response.trim()}
                className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
              >
                {submittingResponse ? 'Sending...' : 'Send Response'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Conversion Dialog */}
      <LeadConversionDialog
        inquiry={selectedInquiryForConversion}
        open={isConversionDialogOpen}
        onOpenChange={setIsConversionDialogOpen}
        onSuccess={fetchInquiries}
      />
    </div>
  );
};

export const AgentInquiries = withErrorBoundary(AgentInquiriesComponent);