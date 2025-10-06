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
  Home,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { InquiryStatus } from '@/components/buyer/InquiryStatus';
import { PageWrapper } from '@/components/ui/page-wrapper';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

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
      navigate('/');
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
      toast.error('You have already inquired about this property. Check your messages to continue the conversation with the agent.');
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

      toast.success('Inquiry sent successfully! A conversation has been created. Check your messages to continue talking with the agent.');
      setIsInquiryDialogOpen(false);
      setInquiryMessage('');
      
      checkExistingInquiry();
    } catch (error) {
      toast.error('Failed to send inquiry');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (!property?.images?.length) return;
    
    if (direction === 'prev') {
      setCurrentImageIndex(prev => 
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    } else {
      setCurrentImageIndex(prev => 
        prev === property.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `Check out this property: ${property?.title}`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Property Details" showBackButton={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-white">Loading property details...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!property) {
    return (
      <PageWrapper title="Property Details" showBackButton={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-white">Property not found</h2>
            <Button onClick={() => navigate('/browse-properties')}>
              Browse Properties
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const hasImages = property.images && property.images.length > 0;

  return (
    <PageWrapper 
      title={property.title} 
      showBackButton={true} 
      backTo="/browse"
      backText="Back to Properties"
    >
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleToggleFavorite}
            className={`rounded-full hover:bg-yellow-400/10 ${isFavorited ? 'text-yellow-400' : 'text-gray-400'}`}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleShare}
            className="text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        {/* Image Gallery */}
        <div className="relative">
          <div className="aspect-video w-full bg-gradient-to-br from-gray-800/90 to-black/90 backdrop-blur-xl rounded-xl border border-yellow-400/20 shadow-2xl overflow-hidden">
            {hasImages ? (
              <div className="relative w-full h-full">
                <img 
                  src={property.images[currentImageIndex]} 
                  alt={`${property.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowImageModal(true)}
                />
                
                {/* Image Navigation */}
                {property.images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => handleImageNavigation('prev')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => handleImageNavigation('next')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {property.images.length}
                    </div>
                  </>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <Badge className={`font-medium ${
                    property.status === 'sold' 
                      ? 'bg-red-500/90 hover:bg-red-500 text-white' 
                      : property.status === 'available' 
                        ? 'bg-green-500/90 hover:bg-green-500 text-white'
                        : 'bg-yellow-400/90 hover:bg-yellow-400 text-black'
                  }`}>
                    {property.status === 'sold' ? 'SOLD' : property.status === 'available' ? 'Available' : 'Under Contract'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Camera className="w-16 h-16 mb-4" />
                <span className="text-lg">No images available</span>
              </div>
            )}
          </div>
          
          {/* Thumbnail Strip - Hidden on mobile, visible on larger screens */}
          {hasImages && property.images.length > 1 && (
            <div className="hidden md:flex mt-4 gap-2 overflow-x-auto pb-2">
              {property.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex 
                      ? 'border-yellow-400 opacity-100' 
                      : 'border-transparent opacity-60 hover:opacity-80'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`${property.title} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Property Details - Mobile-First Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Header */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center text-yellow-400/80 mb-4">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm lg:text-base">{property.address}</span>
                </div>
                
                {/* Price and Stats */}
                <div className="bg-yellow-400/5 p-4 rounded-lg border border-yellow-400/20">
                  <div className="text-3xl font-bold text-yellow-400 mb-3">
                    {property.status === 'sold' && property.sold_price ? (
                      <>
                        <span className="text-xl text-gray-400 line-through">${property.price?.toLocaleString()}</span>
                        <br />
                        <span className="text-red-400">Sold: ${property.sold_price.toLocaleString()}</span>
                        {property.sold_date && (
                          <div className="text-sm text-gray-400 mt-1">
                            Sold on {new Date(property.sold_date).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        ${property.price?.toLocaleString()}
                        <span className="text-lg font-normal text-yellow-400/70 ml-1">
                          {property.property_type === 'weekly' ? '/week' : property.property_type === 'monthly' ? '/month' : ''}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Property Stats */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {property.bedrooms !== null && (
                      <div className="flex items-center gap-2">
                        <Bed className="w-5 h-5 text-yellow-400" />
                        <span className="text-gray-300">{property.bedrooms} Bed{property.bedrooms !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {property.bathrooms !== null && (
                      <div className="flex items-center gap-2">
                        <Bath className="w-5 h-5 text-yellow-400" />
                        <span className="text-gray-300">{property.bathrooms} Bath{property.bathrooms !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {property.square_feet !== null && (
                      <div className="flex items-center gap-2">
                        <Square className="w-5 h-5 text-yellow-400" />
                        <span className="text-gray-300">{property.square_feet.toLocaleString()} sq ft</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Description */}
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <Home className="w-5 h-5 mr-2 text-yellow-400" />
                  Property Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  {property.description}
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Key Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-gray-300 group">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 mr-3 group-hover:animate-pulse flex-shrink-0"></div>
                        <span className="group-hover:text-yellow-400/90 transition-colors text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Panel - Sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {existingInquiry ? 'Your Inquiry' : 'Contact Agent'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingInquiry ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-400/5 p-4 rounded-lg border border-yellow-400/20">
                      <InquiryStatus propertyId={id} />
                      <p className="text-sm text-yellow-400/80 mt-2">
                        Submitted {new Date(existingInquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Check your messages to continue the conversation with the agent.
                    </p>
                  </div>
                ) : property.status === 'sold' ? (
                  <div className="space-y-3">
                    <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/20 text-center">
                      <p className="text-red-400 font-medium mb-2">Property Sold</p>
                      <p className="text-gray-400 text-sm">
                        This property is no longer available for inquiries.
                      </p>
                      {property.sold_date && (
                        <p className="text-gray-500 text-xs mt-2">
                          Sold on {new Date(property.sold_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      onClick={handleInquire}
                      className="w-full bg-yellow-400 hover:bg-amber-500 text-black font-medium py-4 text-base transition-all duration-300 hover:scale-[1.02] shadow-lg"
                      size="lg"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Make an Inquiry
                    </Button>
                    <p className="text-gray-400 text-xs text-center">
                      Connect directly with the listing agent
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && hasImages && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.title} - Image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {property.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {property.images.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inquiry Dialog */}
      <Dialog open={isInquiryDialogOpen} onOpenChange={setIsInquiryDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-yellow-400/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Inquire About Property</DialogTitle>
            <DialogDescription className="text-gray-300">
              Send a message to the agent about {property.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inquiry-message" className="text-white">Your Message</Label>
              <Textarea
                id="inquiry-message"
                placeholder="I'm interested in this property. Could you provide more information about viewing times, additional features, or next steps?"
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 mt-2 min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInquiryDialogOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInquiry}
                disabled={submittingInquiry || !inquiryMessage.trim()}
                className="flex-1 bg-yellow-400 hover:bg-amber-500 text-black"
              >
                {submittingInquiry ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Sending...
                  </span>
                ) : (
                  'Send Inquiry'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
};

const PropertyDetails = withErrorBoundary(PropertyDetailsComponent);

export default PropertyDetails;
