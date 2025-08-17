import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Bed, 
  Bath, 
  Square, 
  MapPin, 
  Heart, 
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Share2,
  Camera,
  Home
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { withErrorBoundary } from '@/components/ui/error-boundary';

const PropertyDetailsComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isInquiryDialogOpen, setIsInquiryDialogOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [existingInquiry, setExistingInquiry] = useState<any>(null);
  const [checkingInquiry, setCheckingInquiry] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProperty();
      if (profile?.role === 'buyer') {
        checkIfFavorited();
        checkExistingInquiry();
      }
    }
  }, [id, profile]);

  const fetchProperty = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await PropertyService.getListingById(id);
      if (error) throw error;
      setProperty(data);
    } catch (error) {
      toast.error('Failed to load property details');
      navigate('/browse-properties');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!id || !profile) return;
    
    try {
      const { data } = await PropertyService.isFavorited(id);
      setIsFavorited(data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const checkExistingInquiry = async () => {
    if (!id || !profile) return;
    
    setCheckingInquiry(true);
    try {
      const { data } = await PropertyService.hasInquired(id);
      setExistingInquiry(data);
    } catch (error) {
      console.error('Error checking inquiry status:', error);
    } finally {
      setCheckingInquiry(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!property || !profile) {
      toast.error('Please log in to save properties');
      navigate('/auth');
      return;
    }

    try {
      if (isFavorited) {
        await PropertyService.removeFromFavorites(property.id);
        setIsFavorited(false);
        toast.success('Property removed from favorites');
      } else {
        await PropertyService.addToFavorites(property.id);
        setIsFavorited(true);
        toast.success('Property saved to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleInquire = () => {
    if (!profile) {
      toast.error('Please log in to inquire about properties');
      navigate('/auth');
      return;
    }

    if (profile.role !== 'buyer') {
      toast.error('Only buyers can inquire about properties');
      return;
    }

    if (existingInquiry) {
      toast.error('You have already inquired about this property');
      return;
    }

    setIsInquiryDialogOpen(true);
  };

  const handleSubmitInquiry = async () => {
    if (!property || !inquiryMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSubmittingInquiry(true);
    try {
      const { data, error } = await PropertyService.createInquiry(
        property.id,
        inquiryMessage.trim()
      );

      if (error) throw error;

      toast.success('Inquiry sent successfully! The agent will contact you soon.');
      setIsInquiryDialogOpen(false);
      setInquiryMessage('');
      
      // Refresh inquiry status
      checkExistingInquiry();
    } catch (error) {
      toast.error('Failed to send inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading property details...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-xl mb-4">Property not found</h2>
          <Button onClick={() => navigate('/browse-properties')}>
            Browse Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/browse-properties')}
            className="text-gray-300 hover:text-primary border-white/20 hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
        </div>

        {/* Property Images */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden">
              {property.images && property.images.length > 0 ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="h-12 w-12 text-gray-500" />
                </div>
              )}
            </div>
            {property.images && property.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {property.images.slice(1, 5).map((image, index) => (
                  <div key={index} className="aspect-square bg-gray-700 rounded overflow-hidden">
                    <img
                      src={image}
                      alt={`${property.title} ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-white">{property.title}</CardTitle>
                    <CardDescription className="text-gray-300 flex items-center gap-1 mt-2">
                      <MapPin className="h-4 w-4" />
                      {property.address}, {property.city}, {property.state} {property.zip_code}
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500">
                    {property.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-primary">
                  ${property.price.toLocaleString()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {property.bedrooms !== null && (
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <Bed className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <div className="text-white font-bold">{property.bedrooms}</div>
                      <div className="text-gray-400 text-sm">Bedrooms</div>
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <Bath className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                      <div className="text-white font-bold">{property.bathrooms}</div>
                      <div className="text-gray-400 text-sm">Bathrooms</div>
                    </div>
                  )}
                  {property.square_feet !== null && (
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <Square className="h-6 w-6 text-green-500 mx-auto mb-2" />
                      <div className="text-white font-bold">{property.square_feet.toLocaleString()}</div>
                      <div className="text-gray-400 text-sm">Sq Ft</div>
                    </div>
                  )}
                </div>

                {/* Property Type */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-5 w-5 text-primary" />
                    <span className="text-white font-medium">Property Type</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {property.property_type.replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>

                {/* Description */}
                {property.description && (
                  <div>
                    <h3 className="text-white font-medium mb-2">Description</h3>
                    <p className="text-gray-300 leading-relaxed">{property.description}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {profile?.role === 'buyer' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {existingInquiry ? (
                      <div className="flex-1 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-medium">Inquiry Sent</span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {existingInquiry.responded_at 
                            ? `Agent responded on ${new Date(existingInquiry.responded_at).toLocaleDateString()}`
                            : 'Waiting for agent response...'
                          }
                        </p>
                        {existingInquiry.agent_response && (
                          <div className="mt-2 p-2 bg-white/5 rounded text-sm text-gray-300">
                            <strong>Agent Response:</strong> {existingInquiry.agent_response}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={handleInquire}
                        className="flex-1"
                        disabled={checkingInquiry}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {checkingInquiry ? 'Checking...' : 'Inquire Now'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleToggleFavorite}
                      className={`${
                        isFavorited 
                          ? 'text-red-500 border-red-500 hover:bg-red-500/10' 
                          : 'text-gray-400 border-gray-400 hover:bg-gray-400/10'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                    </Button>
                    <Button variant="outline" className="text-gray-400 border-gray-400 hover:bg-gray-400/10">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Inquiry Dialog */}
      <Dialog open={isInquiryDialogOpen} onOpenChange={setIsInquiryDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-primary/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-primary">Inquire About Property</DialogTitle>
            <DialogDescription className="text-gray-300">
              Send a message to the agent about {property.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inquiry-message" className="text-white">Your Message</Label>
              <Textarea
                id="inquiry-message"
                placeholder="I'm interested in this property. Could you provide more information about..."
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 mt-2"
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInquiryDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInquiry}
                disabled={submittingInquiry || !inquiryMessage.trim()}
                className="flex-1"
              >
                {submittingInquiry ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PropertyDetails = withErrorBoundary(PropertyDetailsComponent);

export default PropertyDetails;