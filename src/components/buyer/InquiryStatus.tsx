import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Home, 
  Clock, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { PropertyService, PropertyInquiry } from '@/services/propertyService';
import { useAuth } from '@/hooks/useAuth';
import { withErrorBoundary } from '@/components/ui/error-boundary';

interface InquiryStatusProps {
  propertyId: string;
  onNavigateToMessages?: (conversationId: string) => void;
}

interface ExtendedPropertyInquiry extends PropertyInquiry {
  property?: {
    title: string;
    address: string;
    price: number;
  };
  conversation?: {
    id: string;
    subject: string;
  };
}

export const InquiryStatusComponent = ({ propertyId, onNavigateToMessages }: InquiryStatusProps) => {
  const { profile } = useAuth();
  const [inquiry, setInquiry] = useState<ExtendedPropertyInquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInquiryStatus();
  }, [propertyId]);

  const checkInquiryStatus = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data } = await PropertyService.hasInquired(propertyId);
      if (data) {
        // Get property details
        const { data: propertyData } = await PropertyService.getListingById(propertyId);
        setInquiry({
          ...data,
          property: propertyData ? {
            title: propertyData.title,
            address: propertyData.address,
            price: propertyData.price
          } : undefined
        });
      }
    } catch (error) {
      console.error('Error checking inquiry status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConversation = () => {
    if (inquiry?.conversation?.id && onNavigateToMessages) {
      onNavigateToMessages(inquiry.conversation.id);
    }
  };

  if (loading) {
    return (
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
        <CardContent className="p-4">
          <div className="text-gray-300">Checking inquiry status...</div>
        </CardContent>
      </Card>
    );
  }

  if (!inquiry) {
    return null;
  }

  return (
    <Card className="bg-white border border-green-500/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent border-b border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-600 text-lg font-bold">Inquiry Sent</CardTitle>
          </div>
          <Badge className="bg-green-500/10 text-green-600 border border-green-500/30 font-semibold">
            {inquiry.agent_response ? 'Responded' : 'Pending'}
          </Badge>
        </div>
        <CardDescription className="text-foreground mt-2">
          Your inquiry about <span className="font-semibold">{inquiry.property?.title}</span> has been sent to the agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Property Details */}
        <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-primary" />
            <span className="text-foreground font-semibold text-sm">
              {inquiry.property?.title}
            </span>
          </div>
          <div className="text-muted-foreground text-xs">
            {inquiry.property?.address}
          </div>
        </div>

        {/* Your Message */}
        <div>
          <div className="text-foreground font-semibold text-sm mb-2">Your Message:</div>
          <div className="text-foreground text-sm bg-muted/50 p-3 rounded border border-border">
            {inquiry.message}
          </div>
        </div>

        {/* Agent Response if exists */}
        {inquiry.agent_response && (
          <div>
            <div className="text-foreground font-semibold text-sm mb-2">Agent's Response:</div>
            <div className="text-foreground text-sm bg-green-500/10 p-3 rounded border border-green-500/20">
              {inquiry.agent_response}
            </div>
          </div>
        )}

        {/* Timing */}
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-foreground">
            Sent: {(() => {
              try {
                const date = new Date(inquiry.created_at);
                if (isNaN(date.getTime())) return 'Recently';
                return date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                }) + ' at ' + date.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });
              } catch {
                return 'Recently';
              }
            })()}
          </span>
          {inquiry.responded_at && (
            <>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-foreground">
                Responded: {(() => {
                  try {
                    const date = new Date(inquiry.responded_at);
                    if (isNaN(date.getTime())) return 'Recently';
                    return date.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  } catch {
                    return 'Recently';
                  }
                })()}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {inquiry.conversation?.id ? (
            <Button
              onClick={handleOpenConversation}
              className="flex-1 bg-green-500 text-black hover:bg-green-600"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Continue Conversation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="text-muted-foreground text-sm bg-muted/30 p-3 rounded border border-border">
              The agent will respond to your inquiry soon.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const InquiryStatus = withErrorBoundary(InquiryStatusComponent); 