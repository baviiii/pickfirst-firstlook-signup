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
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
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
    <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-green-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-green-500 text-lg">Inquiry Sent</CardTitle>
          </div>
          <Badge className="bg-green-500/10 text-green-500">
            {inquiry.agent_response ? 'Responded' : 'Pending'}
          </Badge>
        </div>
        <CardDescription className="text-gray-300">
          Your inquiry about {inquiry.property?.title} has been sent to the agent.
        </CardDescription>
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
        </div>

        {/* Your Message */}
        <div>
          <div className="text-white font-medium text-sm mb-2">Your Message:</div>
          <div className="text-gray-300 text-sm bg-white/5 p-2 rounded">
            {inquiry.message}
          </div>
        </div>

        {/* Agent Response if exists */}
        {inquiry.agent_response && (
          <div>
            <div className="text-white font-medium text-sm mb-2">Agent's Response:</div>
            <div className="text-gray-300 text-sm bg-green-500/10 p-2 rounded">
              {inquiry.agent_response}
            </div>
          </div>
        )}

        {/* Timing */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Sent: {new Date(inquiry.created_at).toLocaleDateString()} at {new Date(inquiry.created_at).toLocaleTimeString()}
          {inquiry.responded_at && (
            <>
              <span className="mx-2">•</span>
              Responded: {new Date(inquiry.responded_at).toLocaleDateString()}
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
            <div className="text-gray-400 text-sm">
              The agent will respond to your inquiry soon.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const InquiryStatus = withErrorBoundary(InquiryStatusComponent); 