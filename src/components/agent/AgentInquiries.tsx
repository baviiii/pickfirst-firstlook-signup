import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
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
  ArrowUpCircle,
  CalendarCheck,
  CalendarX,
  CalendarClock
} from 'lucide-react';
import { toast } from 'sonner';
import { PropertyService, PropertyInquiry } from '@/services/propertyService';
import { useAuth } from '@/hooks/useAuth';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { LeadConversionDialog } from './LeadConversionDialog';
import { supabase } from '@/integrations/supabase/client';

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
  appointment?: {
    id: string;
    date: string;
    time: string;
    appointment_type: string;
    status: string;
    duration: number;
  };
  client?: {
    id: string;
    name: string;
    status: string;
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchInquiries();
    
    // Subscribe to real-time updates for new inquiries
    const channel = supabase
      .channel('property_inquiries_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'property_inquiries'
        },
        (payload) => {
          console.log('New inquiry received:', payload.new);
          // Refresh inquiries when a new one is created
          fetchInquiries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'property_inquiries'
        },
        (payload) => {
          console.log('Inquiry updated:', payload.new);
          // Refresh inquiries when one is updated
          fetchInquiries();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile]);

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
        const { data: propertyInquiries, error: inquiryError } = await PropertyService.getPropertyInquiries(listing.id);
        if (inquiryError) {
          console.error(`Error fetching inquiries for property ${listing.id}:`, inquiryError);
          continue;
        }
        if (propertyInquiries && propertyInquiries.length > 0) {
          // For each inquiry, fetch related appointment and client data
          for (const inquiry of propertyInquiries) {
            const inquiryWithData: ExtendedPropertyInquiry = {
              ...inquiry,
              property: {
                title: listing.title,
                address: listing.address,
                price: listing.price
              }
            };

            // Fetch appointment data for this inquiry
            const { data: appointment } = await supabase
              .from('appointments')
              .select('id, date, time, appointment_type, status, duration')
              .eq('inquiry_id', inquiry.id)
              .eq('agent_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (appointment) {
              inquiryWithData.appointment = appointment;
            }

            // Fetch conversation data - check both inquiry_id and conversation_id
            const conversationId = (inquiry as any).conversation_id;
            if (conversationId) {
              const { data: conversation } = await supabase
                .from('conversations')
                .select('id, subject')
                .eq('id', conversationId)
                .maybeSingle();

              if (conversation) {
                inquiryWithData.conversation = conversation;
              }
            } else {
              // Fallback: check by inquiry_id (for old inquiries)
              const { data: conversation } = await supabase
                .from('conversations')
                .select('id, subject')
                .eq('inquiry_id', inquiry.id)
                .maybeSingle();

              if (conversation) {
                inquiryWithData.conversation = conversation;
              }
            }

            // Fetch client data if buyer exists as a client
            const { data: client } = await supabase
              .from('clients')
              .select('id, name, status')
              .eq('id', inquiry.buyer_id)
              .eq('agent_id', profile.id)
              .maybeSingle();

            if (client) {
              inquiryWithData.client = client;
            }

            allInquiries.push(inquiryWithData);
          }
        }
      }

      // Sort by created_at descending
      allInquiries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.log(`[AgentInquiries] Loaded ${allInquiries.length} inquiries from ${myListings.length} listings`);
      setInquiries(allInquiries);
    } catch (error) {
      toast.error('Failed to fetch inquiries');
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToInquiry = async (inquiry: ExtendedPropertyInquiry) => {
    // Mark inquiry as viewed when agent opens it
    await PropertyService.markInquiryAsViewed(inquiry.id);
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

  // Mark inquiry as viewed when agent opens conversation
  await PropertyService.markInquiryAsViewed(inquiry.id);

  // Check if conversation_id exists on the inquiry (from immediate creation)
  const conversationId = (inquiry as any).conversation_id || inquiry.conversation?.id;

  // If a conversation already exists, navigate to it
  if (conversationId) {
    navigate(`/agent-messages?conversation=${conversationId}`);
    return;
  }

  // If no conversation exists, create a new one
  try {
    const { data: conversation, error } = await supabase.functions.invoke('messaging', {
      body: { 
        action: 'createConversation',
        agentId: profile.id,
        clientId: inquiry.buyer_id,
        subject: `Property Inquiry: ${inquiry.property?.title}`,
        inquiryId: inquiry.id,
        propertyId: inquiry.property_id
      }
    });

    if (conversation?.id && !error) {
      // Update inquiry with conversation_id
      await supabase
        .from('property_inquiries')
        .update({ conversation_id: conversation.id })
        .eq('id', inquiry.id);

      toast.success('Conversation started! Redirecting to messages...');
      navigate(`/agent-messages?conversation=${conversation.id}`);
    } else {
      // Check for existing conversation in case of a race condition
      const existing = error?.details?.existing;
      if (existing) {
        navigate(`/agent-messages?conversation=${existing.id || conversationId}`);
      } else {
        toast.error(error?.details?.message || 'Failed to start conversation');
      }
    }
  } catch (error) {
    toast.error('An unexpected error occurred.');
  }
};

  const handleConvertLead = (inquiry: ExtendedPropertyInquiry) => {
    setSelectedInquiryForConversion(inquiry);
    setIsConversionDialogOpen(true);
  };

  const getInquiryStatusColor = (inquiry: ExtendedPropertyInquiry) => {
    if (inquiry.appointment) {
      switch (inquiry.appointment.status) {
        case 'confirmed':
          return 'bg-green-500/10 text-green-500';
        case 'scheduled':
          return 'bg-blue-500/10 text-blue-500';
        case 'completed':
          return 'bg-purple-500/10 text-purple-500';
        case 'cancelled':
          return 'bg-red-500/10 text-red-500';
        default:
          return 'bg-blue-500/10 text-blue-500';
      }
    }
    if (inquiry.client) {
      return 'bg-yellow-500/10 text-yellow-500';
    }
    if (inquiry.agent_response) {
      return 'bg-green-500/10 text-green-500';
    }
    return 'bg-blue-500/10 text-blue-500';
  };

  const getInquiryStatusText = (inquiry: ExtendedPropertyInquiry) => {
    if (inquiry.appointment) {
      switch (inquiry.appointment.status) {
        case 'confirmed':
          return 'Appointment Confirmed';
        case 'scheduled':
          return 'Appointment Scheduled';
        case 'completed':
          return 'Appointment Completed';
        case 'cancelled':
          return 'Appointment Cancelled';
        default:
          return 'Appointment Scheduled';
      }
    }
    if (inquiry.client) {
      return 'Client Added';
    }
    if (inquiry.agent_response) {
      return 'Responded';
    }
    return 'New';
  };

  const getInquiryStatusIcon = (inquiry: ExtendedPropertyInquiry) => {
    if (inquiry.appointment) {
      switch (inquiry.appointment.status) {
        case 'confirmed':
          return <CalendarCheck className="h-3 w-3" />;
        case 'scheduled':
          return <Calendar className="h-3 w-3" />;
        case 'completed':
          return <CheckCircle className="h-3 w-3" />;
        case 'cancelled':
          return <CalendarX className="h-3 w-3" />;
        default:
          return <CalendarClock className="h-3 w-3" />;
      }
    }
    if (inquiry.client) {
      return <UserPlus className="h-3 w-3" />;
    }
    if (inquiry.agent_response) {
      return <CheckCircle className="h-3 w-3" />;
    }
    return <Clock className="h-3 w-3" />;
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
      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-white font-medium mb-1">Start Conversations with Buyers</div>
              <div className="text-gray-300 text-sm">
                Click "Start Chat" on any inquiry to open a conversation. Buyers will be notified when you start chatting with them.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-blue-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{inquiries.length}</div>
            <div className="text-sm text-gray-300">Total Inquiries</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-green-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {inquiries.filter(i => i.appointment).length}
            </div>
            <div className="text-sm text-gray-300">Appointments</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {inquiries.filter(i => i.client && !i.appointment).length}
            </div>
            <div className="text-sm text-gray-300">Clients Added</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-gray-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-500">
              {inquiries.filter(i => !i.agent_response && !i.client && !i.appointment).length}
            </div>
            <div className="text-sm text-gray-300">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Inquiries List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {inquiries.map((inquiry) => {
          // Check if inquiry is new/unviewed
          const isNew = !(inquiry as any).viewed_at && !inquiry.agent_response;
          return (
          <Card 
            key={inquiry.id} 
            className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 hover:shadow-lg hover:shadow-pickfirst-yellow/10 transition-all ${
              isNew ? 'animate-pulse-border border-yellow-400/50' : ''
            }`}
          >
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
                  <div className="flex items-center gap-1">
                    {getInquiryStatusIcon(inquiry)}
                    {getInquiryStatusText(inquiry)}
                  </div>
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

              {/* Appointment Information */}
              {inquiry.appointment && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-white font-medium text-sm">Appointment Scheduled</span>
                  </div>
                  <div className="text-gray-300 text-xs space-y-1">
                    <div><strong>Date:</strong> {new Date(inquiry.appointment.date).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {inquiry.appointment.time}</div>
                    <div><strong>Type:</strong> {inquiry.appointment.appointment_type.replace('_', ' ').toUpperCase()}</div>
                    <div><strong>Duration:</strong> {inquiry.appointment.duration} minutes</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-1 ${
                        inquiry.appointment.status === 'confirmed' ? 'text-green-400' :
                        inquiry.appointment.status === 'scheduled' ? 'text-blue-400' :
                        inquiry.appointment.status === 'completed' ? 'text-purple-400' :
                        inquiry.appointment.status === 'cancelled' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {inquiry.appointment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Information */}
              {inquiry.client && !inquiry.appointment && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="h-4 w-4 text-yellow-400" />
                    <span className="text-white font-medium text-sm">Client Added</span>
                  </div>
                  <div className="text-gray-300 text-xs">
                    <div><strong>Name:</strong> {inquiry.client.name}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-1 ${
                        inquiry.client.status === 'active' ? 'text-green-400' :
                        inquiry.client.status === 'lead' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {inquiry.client.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
              <div className="flex flex-wrap gap-2 pt-2">
                {!inquiry.agent_response && !inquiry.appointment && (
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
                  onClick={() => handleStartConversation(inquiry)}
                  className={`flex-1 ${
                    inquiry.conversation?.id 
                      ? 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {inquiry.conversation?.id ? 'Open Chat' : 'Start Chat'}
                </Button>
                
                {!inquiry.appointment && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConvertLead(inquiry)}
                    className={`flex-1 ${
                      inquiry.client 
                        ? 'text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10' 
                        : 'text-green-500 border-green-500/20 hover:bg-green-500/10'
                    }`}
                  >
                    {inquiry.client ? (
                      <>
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                        Convert
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {/* Status Summary */}
              <div className="space-y-2">
                {inquiry.conversation?.id && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 p-2 rounded">
                    <CheckCircle className="h-3 w-3" />
                    Active conversation available
                  </div>
                )}
                
                {inquiry.appointment && (
                  <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 p-2 rounded">
                    <Calendar className="h-3 w-3" />
                    Appointment scheduled for {new Date(inquiry.appointment.date).toLocaleDateString()} at {inquiry.appointment.time}
                  </div>
                )}
                
                {inquiry.client && !inquiry.appointment && (
                  <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                    <UserPlus className="h-3 w-3" />
                    Client added - ready to schedule appointment
                  </div>
                )}
                
                {!inquiry.agent_response && !inquiry.client && !inquiry.appointment && (
                  <div className={`flex items-center gap-2 text-xs p-2 rounded ${
                    isNew 
                      ? 'text-yellow-400 bg-yellow-500/20 animate-pulse' 
                      : 'text-gray-400 bg-gray-500/10'
                  }`}>
                    <Clock className="h-3 w-3" />
                    {isNew ? '🆕 New inquiry - awaiting response' : 'New inquiry - awaiting response'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
        })}
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