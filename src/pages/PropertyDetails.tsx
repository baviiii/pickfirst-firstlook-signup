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
  X,
  Clock,
  User,
  FileText,
  Shield
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { InquiryStatus } from '@/components/buyer/InquiryStatus';
import { VendorDetails } from '@/components/property/VendorDetails';
import { useSubscription } from '@/hooks/useSubscription';
import PropertyInsights from '@/components/property/PropertyInsights';

const PropertyDetailsComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { canViewVendorDetails, isFeatureEnabled } = useSubscription();
  
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
  const [agentDetails, setAgentDetails] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const displayPrice = property ? PropertyService.getDisplayPrice(property) : '';
  const numericSoldPrice = property?.sold_price !== undefined && property?.sold_price !== null
    ? (typeof property.sold_price === 'string' ? parseFloat(property.sold_price) : property.sold_price)
    : null;
  const numericOriginalPrice = property?.price !== undefined && property?.price !== null
    ? (typeof property.price === 'string' ? parseFloat(property.price) : property.price)
    : null;
  const hasSoldPrice = property?.status === 'sold' && numericSoldPrice !== null && Number.isFinite(numericSoldPrice) && (numericSoldPrice as number) > 0;
  const priceSuffix = property && ['weekly', 'monthly'].includes((property.property_type || '').toLowerCase())
    ? (property.property_type.toLowerCase() === 'weekly' ? '/week' : '/month')
    : '';
  const propertySquareFeet = property
    ? (typeof property.square_feet === 'string' ? parseFloat(property.square_feet) : property.square_feet)
    : null;

  useEffect(() => {
    if (id) {
      fetchProperty();
      if (profile?.role === 'buyer') {
        checkIfFavorited();
        checkExistingInquiry();
      }
    }
  }, [id, profile]);

  const fetchAgentDetails = async (agentId: string) => {
    setLoadingAgent(true);
    try {
      const { data, error } = await PropertyService.getAgentDetails(agentId);
      if (error) throw error;
      setAgentDetails(data);
    } catch (error) {
      console.error('Error fetching agent details:', error);
    } finally {
      setLoadingAgent(false);
    }
  };

  useEffect(() => {
    if (property?.agent_id) {
      fetchAgentDetails(property.agent_id);
    }
  }, [property?.agent_id]);

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

  const handleEnquire = () => {
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

      if (error) {
        // Check if this is a duplicate inquiry with a conversation link
        if ((error as any).conversationLink) {
          toast.error('You have already inquired about this property', {
            description: 'You can continue the conversation in your messages.',
            duration: 6000,
            action: {
              label: 'View Conversation',
              onClick: () => window.location.href = (error as any).conversationLink
            }
          });
        } else {
          throw error;
        }
        return;
      }

      toast.success('Inquiry sent successfully!', {
        description: data?.conversation_id 
          ? 'A conversation has been created. You can view it in your messages.'
          : 'The agent has been notified and will respond soon. You\'ll receive a notification when they respond.',
        duration: 6000,
        ...(data?.conversation_id && {
          action: {
            label: 'View Conversation',
            onClick: () => window.location.href = `/buyer-messages?conversation=${data.conversation_id}`
          }
        })
      });
      setIsInquiryDialogOpen(false);
      setInquiryMessage('');
      
      checkExistingInquiry();
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to send inquiry. Please try again.');
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-foreground">Property not found</h2>
            <Button
              onClick={() => navigate('/browse-properties')}
              className="bg-primary hover:bg-pickfirst-amber text-primary-foreground"
            >
              Back to Browse
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasImages = property.images && property.images.length > 0;
  const floorPlans = Array.isArray((property as any).floor_plans) ? (property as any).floor_plans as string[] : [];
  const hasFloorPlans = floorPlans.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleToggleFavorite}
            className={`rounded-full hover:bg-primary/10 ${
              isFavorited ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleShare}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
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
            <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="flex items-center text-primary">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm lg:text-base text-foreground">{property.address}</span>
                  </div>
                  {property.created_at && (
                    <div className="flex items-center text-muted-foreground text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Posted {new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                {/* Price and Stats */}
                <div className="bg-yellow-400/5 p-4 rounded-lg border border-yellow-400/20">
                  <div className="text-3xl font-bold text-primary mb-3">
                    {hasSoldPrice ? (
                      <>
                        {numericOriginalPrice && Number.isFinite(numericOriginalPrice) && (numericOriginalPrice as number) > 0 && (
                          <>
                            <span className="text-xl text-muted-foreground line-through">
                              {`$${(numericOriginalPrice as number).toLocaleString()}`}
                            </span>
                            <br />
                          </>
                        )}
                        <span className="text-red-400">
                          Sold: ${ (numericSoldPrice as number).toLocaleString() }
                        </span>
                        {property.sold_date && (
                          <div className="text-sm text-gray-400 mt-1">
                            Sold on {new Date(property.sold_date).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <span>{displayPrice || 'Contact Agent'}</span>
                        {priceSuffix && displayPrice.startsWith('$') && (
                          <span className="text-lg font-normal text-yellow-400/70 ml-1">
                            {priceSuffix}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Property Stats */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {property.bedrooms !== null && (
                      <div className="flex items-center gap-2">
                        <Bed className="w-5 h-5 text-yellow-400" />
                        <span className="text-muted-foreground">{property.bedrooms} Bed{property.bedrooms !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {property.bathrooms !== null && (
                      <div className="flex items-center gap-2">
                        <Bath className="w-5 h-5 text-yellow-400" />
                        <span className="text-muted-foreground">{property.bathrooms} Bath{property.bathrooms !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {propertySquareFeet !== null && propertySquareFeet !== undefined && !Number.isNaN(propertySquareFeet) && (
                      <div className="flex items-center gap-2">
                        <Square className="w-5 h-5 text-yellow-400" />
                        <span className="text-muted-foreground">{propertySquareFeet.toLocaleString()} sq ft</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Description */}
            <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
              <CardHeader>
                <CardTitle className="text-foreground text-lg flex items-center">
                  <Home className="w-5 h-5 mr-2 text-yellow-400" />
                  Property Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {property.description}
                </p>
              </CardContent>
            </Card>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg">Key Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-muted-foreground group">
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

            {/* Inspection Times */}
            {property.showing_instructions && (
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-yellow-400" />
                    Open Inspection Times
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {property.showing_instructions}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Floor Plans */}
            {(property as any).floor_plans && Array.isArray((property as any).floor_plans) && (property as any).floor_plans.length > 0 && (
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg flex items-center">
                    <Home className="w-5 h-5 mr-2 text-yellow-400" />
                    Floor Plans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(property as any).floor_plans.map((floorPlan: string, index: number) => (
                      <div key={index} className="relative group">
                        <a
                          href={floorPlan}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-yellow-400/20 hover:border-yellow-400/60 transition-all"
                        >
                          {floorPlan.toLowerCase().endsWith('.pdf') ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <div className="text-center">
                                <FileText className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
                                <p className="text-white text-sm font-medium">Floor Plan {index + 1}</p>
                                <p className="text-gray-400 text-xs mt-1">Click to view PDF</p>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={floorPlan}
                              alt={`Floor Plan ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                              View Full Size
                            </span>
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agent Details */}
            {agentDetails && (
              <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg flex items-center">
                    <User className="w-5 h-5 mr-2 text-yellow-400" />
                    Listing Agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {agentDetails.avatar_url ? (
                        <img 
                          src={agentDetails.avatar_url} 
                          alt={agentDetails.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400/20"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-yellow-400/10 border-2 border-yellow-400/20 flex items-center justify-center">
                          <User className="w-8 h-8 text-yellow-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-foreground font-semibold text-lg">{agentDetails.full_name}</h3>
                        {agentDetails.company && (
                          <p className="text-muted-foreground text-sm">{agentDetails.company}</p>
                        )}
                      </div>
                    </div>
                    
                    {agentDetails.bio && (
                      <p className="text-muted-foreground text-sm leading-relaxed">{agentDetails.bio}</p>
                    )}
                    
                    <div className="space-y-2">
                      {agentDetails.phone && (
                        <div className="flex items-center text-muted-foreground text-sm">
                          <Phone className="w-4 h-4 mr-2 text-yellow-400" />
                          <a href={`tel:${agentDetails.phone}`} className="hover:text-yellow-400 transition-colors">
                            {agentDetails.phone}
                          </a>
                        </div>
                      )}
                      {agentDetails.email && (
                        <div className="flex items-center text-muted-foreground text-sm">
                          <Mail className="w-4 h-4 mr-2 text-yellow-400" />
                          <a href={`mailto:${agentDetails.email}`} className="hover:text-yellow-400 transition-colors">
                            {agentDetails.email}
                          </a>
                        </div>
                      )}
                      {agentDetails.location && (
                        <div className="flex items-center text-muted-foreground text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-yellow-400" />
                          <span>{agentDetails.location}</span>
                        </div>
                      )}
                    </div>
                    {agentDetails.email && agentDetails.phone && (
                      <p className="text-xs text-muted-foreground/80">
                        Prefer email or phone? Reach out using whichever suits you best.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Property Insights */}
            {property.latitude && property.longitude && (
              <PropertyInsights
                address={property.address}
                latitude={property.latitude}
                longitude={property.longitude}
                propertyId={property.id}
              />
            )}

            {/* Vendor Details - Premium Feature */}
            {canViewVendorDetails() ? (
              <VendorDetails
                propertyId={property.id}
                ownershipDuration={(property as any).vendor_ownership_duration}
                specialConditions={(property as any).vendor_special_conditions}
                favorableContracts={(property as any).vendor_favorable_contracts}
                motivation={(property as any).vendor_motivation}
              />
            ) : ((property as any).vendor_ownership_duration || (property as any).vendor_special_conditions) ? (
              <>
                <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-foreground">
                      <Shield className="w-5 h-5 mr-2 text-primary" />
                      Vendor Insights (Premium)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Get access to ownership duration, motivation, and special conditions for this property.</p>
                    {!isFeatureEnabled('vendor_details') && (
                      <div className="text-xs">
                        Upgrade your plan to unlock detailed vendor insights and negotiate with confidence.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Action Panel - Sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg">
              <CardHeader>
              <CardTitle className="text-lg text-foreground">
                  {existingInquiry ? 'Your Inquiry' : 'Contact Agent'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingInquiry ? (
                  <div className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/25">
                      <InquiryStatus propertyId={id} />
                    <p className="text-sm text-primary/90 mt-2">
                        Submitted {new Date(existingInquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {hasFloorPlans && (
                      <Button 
                        variant="outline"
                        className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => window.open(floorPlans[0], '_blank', 'noopener')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Floor Plan
                      </Button>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Check your messages to continue the conversation with the agent.
                    </p>
                  </div>
                ) : property.status === 'sold' ? (
                  <div className="space-y-3">
                    <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/30 text-center">
                      <p className="text-red-600 font-medium mb-2">Property Sold</p>
                      <p className="text-sm text-muted-foreground">
                        This property is no longer available for inquiries.
                      </p>
                      {property.sold_date && (
                        <p className="text-xs mt-2 text-muted-foreground/80">
                          Sold on {new Date(property.sold_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {hasFloorPlans && (
                      <Button 
                        variant="outline"
                        className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => window.open(floorPlans[0], '_blank', 'noopener')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Floor Plan
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hasFloorPlans && (
                      <Button 
                        variant="outline"
                        className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => window.open(floorPlans[0], '_blank', 'noopener')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Floor Plan
                      </Button>
                    )}
                    <Button 
                      onClick={handleEnquire}
                      className="w-full bg-primary hover:bg-pickfirst-amber text-primary-foreground font-medium py-4 text-base transition-all duration-300 hover:scale-[1.02] shadow-lg"
                      size="lg"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Make an Enquiry
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
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
        <DialogContent className="w-full max-w-[95vw] sm:max-w-lg pickfirst-glass bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Enquire About Property</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Send a message to the agent about {property.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inquiry-message" className="text-foreground">Your Message</Label>
              <Textarea
                id="inquiry-message"
                placeholder="I'm interested in this property. Could you provide more information about viewing times, additional features, or next steps?"
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="mt-2 min-h-[100px] bg-card border border-border text-foreground placeholder:text-muted-foreground"
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInquiryDialogOpen(false)}
                className="flex-1 border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInquiry}
                disabled={submittingInquiry || !inquiryMessage.trim()}
                className="flex-1 bg-primary hover:bg-pickfirst-amber text-primary-foreground"
              >
                {submittingInquiry ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
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
    </div>
  );
};

const PropertyDetails = withErrorBoundary(PropertyDetailsComponent);

export default PropertyDetails;
