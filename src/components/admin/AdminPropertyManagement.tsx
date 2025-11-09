import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminPropertyManagementComponent = () => {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const selectedListingPriceDisplay = selectedListing ? PropertyService.getDisplayPrice(selectedListing) : '';
  const selectedListingIsOffMarket = selectedListing ? ((selectedListing as any).listing_source === 'agent_posted') : false;
  const selectedListingSquareFeet = selectedListing
    ? (typeof selectedListing.square_feet === 'string'
      ? parseFloat(selectedListing.square_feet)
      : selectedListing.square_feet)
    : null;

  useEffect(() => {
    const fetchListings = async () => {
      setLoadingListings(true);
      const { data } = await PropertyService.getAllListings();
      setListings(data || []);
      setLoadingListings(false);
    };
    fetchListings();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      // Optimistically update the UI first
      setListings(prevListings => 
        prevListings.map(listing => 
          listing.id === id 
            ? { ...listing, status: 'approved', approved_at: new Date().toISOString() }
            : listing
        )
      );

      const { data, error } = await PropertyService.approveListing(id);
      
      if (error) {
        // Revert optimistic update on error
        setListings(prevListings => 
          prevListings.map(listing => 
            listing.id === id 
              ? { ...listing, status: 'pending', approved_at: null }
              : listing
          )
        );
        toast.error(error.message || 'Failed to approve listing');
      } else {
        toast.success('Listing approved successfully!');
        // Force a fresh fetch to ensure data consistency
        setTimeout(async () => {
          const { data: freshData } = await PropertyService.getAllListings();
          if (freshData) {
            setListings(freshData);
          }
        }, 500);
      }
    } catch (error) {
      // Revert optimistic update on error
      setListings(prevListings => 
        prevListings.map(listing => 
          listing.id === id 
            ? { ...listing, status: 'pending', approved_at: null }
            : listing
        )
      );
      toast.error('An unexpected error occurred while approving the listing');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const { data, error } = await PropertyService.rejectListing(id, reason);
      
      if (error) {
        toast.error(error.message || 'Failed to reject listing');
      } else {
        if (data) {
          toast.success('Listing rejected.');
          // Refresh the listings to get updated data
          await handleRefresh();
        } else {
          toast.warning('Rejection completed but no data returned');
          await handleRefresh();
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred while rejecting the listing');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    const { error } = await PropertyService.deleteListing(id);
    if (error) {
      toast.error(error.message || 'Failed to delete listing');
    } else {
      toast.success('Listing deleted.');
      // Refresh the listings to get updated data
      await handleRefresh();
    }
  };

  const handleViewDetails = (listing: PropertyListing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedListing?.images && selectedListing.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedListing.images.length);
    }
  };

  const prevImage = () => {
    if (selectedListing?.images && selectedListing.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedListing.images.length) % selectedListing.images.length);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await PropertyService.getAllListings();
      
      if (error) {
        toast.error('Failed to refresh listings');
      } else {
        setListings(data || []);
        toast.success('Listings refreshed successfully');
      }
    } catch (error) {
      toast.error('Failed to refresh listings');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-pickfirst-yellow/20 flex items-center px-4 py-3 gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-white hover:text-pickfirst-yellow">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text ml-2">All Property Listings</h1>
        <div className="ml-auto flex items-center gap-4">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400">
              Total: {listings.length} | 
              Pending: {listings.filter(l => l.status === 'pending').length} | 
              Approved: {listings.filter(l => l.status === 'approved').length} | 
              Rejected: {listings.filter(l => l.status === 'rejected').length}
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={loadingListings || refreshing} 
            className="text-white hover:text-pickfirst-yellow border-pickfirst-yellow/30"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {loadingListings ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardContent className="py-12 text-center text-gray-300 text-lg">Loading property listings...</CardContent>
          </Card>
        ) : listings.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardContent className="py-12 text-center text-gray-400 text-lg">No property listings found.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => {
              const displayPrice = PropertyService.getDisplayPrice(listing);
              const isOffMarket = (listing as any).listing_source === 'agent_posted';
              const numericBedrooms = typeof listing.bedrooms === 'string' ? parseFloat(listing.bedrooms) : listing.bedrooms;
              const numericBathrooms = typeof listing.bathrooms === 'string' ? parseFloat(listing.bathrooms) : listing.bathrooms;
              const numericSquareFeet = typeof listing.square_feet === 'string' ? parseFloat(listing.square_feet) : listing.square_feet;
              return (
              <Card key={listing.id} className="bg-white/5 border border-pickfirst-yellow/10 flex flex-col h-full">
                <CardHeader className="pb-2 border-b border-white/10">
                  <div className="aspect-video bg-gray-700 rounded-md mb-3 overflow-hidden relative">
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded z-10">
                        Images: {listing.images ? listing.images.length : 'null'}
                      </div>
                    )}
                    
                    {listing.images && Array.isArray(listing.images) && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', listing.images[0], 'for listing:', listing.title);
                          // Fallback to placeholder if image fails to load
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) {
                            placeholder.classList.remove('hidden');
                          }
                        }}
                        onLoad={() => {
                          // Image loaded successfully
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-gray-500 text-sm block">No Image Available</span>
                          {process.env.NODE_ENV === 'development' && (
                            <span className="text-gray-600 text-xs block mt-1">
                              Status: {listing.status} | Images: {JSON.stringify(listing.images)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback placeholder that shows when image fails to load */}
                    <div className="hidden w-full h-full bg-gray-700 flex items-center justify-center absolute inset-0">
                      <div className="text-center">
                        <span className="text-gray-500 text-sm block">Image Failed to Load</span>
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-gray-600 text-xs block mt-1">
                            URL: {listing.images?.[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg text-pickfirst-yellow mb-1">{listing.title}</CardTitle>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`text-xs ${
                        listing.status === 'approved' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        listing.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                        listing.status === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {listing.status?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      {isOffMarket && (
                        <Badge className="text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30">
                          OFF-MARKET
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between py-4">
                  <div>
                    <div className="text-white font-bold text-xl mb-2">{displayPrice}</div>
                    <div className="text-gray-400 text-sm mb-2">{listing.property_type.replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {numericBedrooms !== null && numericBedrooms !== undefined && !Number.isNaN(numericBedrooms) && (
                        <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded">{numericBedrooms} Bed</span>
                      )}
                      {numericBathrooms !== null && numericBathrooms !== undefined && !Number.isNaN(numericBathrooms) && (
                        <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{numericBathrooms} Bath</span>
                      )}
                      {numericSquareFeet !== null && numericSquareFeet !== undefined && !Number.isNaN(numericSquareFeet) && (
                        <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded">{numericSquareFeet.toLocaleString()} Sq Ft</span>
                      )}
                      <span className="bg-gray-500/10 text-gray-300 px-2 py-1 rounded">
                        {isOffMarket ? 'Off-Market' : 'On-Market'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      Status: <span className={
                        listing.status === 'approved' ? 'text-green-400' :
                        listing.status === 'pending' ? 'text-yellow-400' :
                        listing.status === 'rejected' ? 'text-red-400' :
                        'text-gray-400'
                      }>{listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}</span>
                      {process.env.NODE_ENV === 'development' && (
                        <span className="ml-2 text-gray-500">ID: {listing.id.substring(0, 8)}...</span>
                      )}
                    </div>
                    {listing.status === 'rejected' && listing.rejection_reason && (
                      <div className="text-xs text-red-400">Reason: {listing.rejection_reason}</div>
                    )}
                    {listing.status === 'approved' && listing.approved_at && (
                      <div className="text-xs text-green-400">
                        Approved: {new Date(listing.approved_at).toLocaleDateString()}
                        {process.env.NODE_ENV === 'development' && listing.approved_by && (
                          <span className="ml-2 text-gray-500">by: {listing.approved_by.substring(0, 8)}...</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {listing.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-500 text-white hover:bg-green-600" 
                          onClick={() => handleApprove(listing.id)}
                        >
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10" onClick={() => handleReject(listing.id)}>
                          Reject
                        </Button>
                      </>
                    )}
                    {listing.status === 'approved' && (
                      <div className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                        ✓ Approved
                      </div>
                    )}
                    {listing.status === 'rejected' && (
                      <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                        ✗ Rejected
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="text-blue-500 border-blue-500 hover:bg-blue-500/10 flex items-center" onClick={() => handleViewDetails(listing)}>
                      <Eye className="h-4 w-4 mr-1" /> View Details
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10 flex items-center" onClick={() => handleDelete(listing.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900/95 to-black/95 border border-pickfirst-yellow/20">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-pickfirst-yellow text-xl">{selectedListing?.title}</DialogTitle>
              {selectedListingIsOffMarket && (
                <Badge className="text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  OFF-MARKET
                </Badge>
              )}
            </div>
          </DialogHeader>
          
          {selectedListing && (
            <div className="space-y-6">
              {/* Image Gallery */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div className="relative">
                  <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden">
                    <img
                      src={selectedListing.images[currentImageIndex]}
                      alt={`${selectedListing.title} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  </div>
                  
                  {selectedListing.images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 border-white/20 text-white hover:bg-black/70"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                        {currentImageIndex + 1} / {selectedListing.images.length}
                      </div>
                    </>
                  )}
                  
                  {/* Image thumbnails for better navigation */}
                  {selectedListing.images.length > 1 && (
                    <div className="flex gap-2 mt-4 justify-center">
                      {selectedListing.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-16 h-16 rounded border-2 overflow-hidden ${
                            index === currentImageIndex 
                              ? 'border-pickfirst-yellow' 
                              : 'border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Basic Information</h3>
                    <div className="space-y-2 text-gray-300">
                      <p><span className="text-gray-400">Address:</span> {selectedListing.address}</p>
                      <p><span className="text-gray-400">City:</span> {selectedListing.city}</p>
                      <p><span className="text-gray-400">State:</span> {selectedListing.state}</p>
                      <p><span className="text-gray-400">ZIP:</span> {selectedListing.zip_code}</p>
                      <p><span className="text-gray-400">Property Type:</span> {selectedListing.property_type?.replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Pricing & Details</h3>
                    <div className="space-y-2 text-gray-300">
                      <p><span className="text-gray-400">Price:</span> <span className="text-white font-bold text-xl">{selectedListingPriceDisplay || 'Contact Agent'}</span></p>
                      <p><span className="text-gray-400">Listing Type:</span> {selectedListingIsOffMarket ? 'Off-Market (Agent Posted)' : 'Public Feed'}</p>
                      {selectedListing.bedrooms !== null && <p><span className="text-gray-400">Bedrooms:</span> {selectedListing.bedrooms}</p>}
                      {selectedListing.bathrooms !== null && <p><span className="text-gray-400">Bathrooms:</span> {selectedListing.bathrooms}</p>}
                      {selectedListingSquareFeet !== null && selectedListingSquareFeet !== undefined && !Number.isNaN(selectedListingSquareFeet) && (
                        <p><span className="text-gray-400">Square Feet:</span> {selectedListingSquareFeet.toLocaleString()}</p>
                      )}
                      {selectedListing.lot_size !== null && <p><span className="text-gray-400">Lot Size:</span> {selectedListing.lot_size.toLocaleString()} sq ft</p>}
                      {selectedListing.year_built !== null && <p><span className="text-gray-400">Year Built:</span> {selectedListing.year_built}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Status & Contact</h3>
                    <div className="space-y-2 text-gray-300">
                      <p><span className="text-gray-400">Status:</span> <span className={`font-semibold ${
                        selectedListing.status === 'approved' ? 'text-green-400' :
                        selectedListing.status === 'pending' ? 'text-yellow-400' :
                        selectedListing.status === 'rejected' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>{selectedListing.status?.charAt(0).toUpperCase() + selectedListing.status?.slice(1)}</span></p>
                      {selectedListing.status === 'rejected' && selectedListing.rejection_reason && (
                        <p><span className="text-gray-400">Rejection Reason:</span> <span className="text-red-400">{selectedListing.rejection_reason}</span></p>
                      )}
                      {selectedListing.contact_phone && <p><span className="text-gray-400">Phone:</span> {selectedListing.contact_phone}</p>}
                      {selectedListing.contact_email && <p><span className="text-gray-400">Email:</span> {selectedListing.contact_email}</p>}
                    </div>
                  </div>
                  
                  {selectedListing.features && selectedListing.features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Features</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedListing.features.map((feature, index) => (
                          <span key={index} className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-sm">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedListing.description && (
                <div>
                  <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Description</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedListing.description}</p>
                </div>
              )}

              {(selectedListing.vendor_ownership_duration || selectedListing.vendor_special_conditions || selectedListing.vendor_favorable_contracts || selectedListing.vendor_motivation) && (
                <div>
                  <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Vendor Insights</h3>
                  <div className="space-y-1 text-gray-300 text-sm">
                    {selectedListing.vendor_ownership_duration && (
                      <p><span className="text-gray-400">Ownership Duration:</span> {selectedListing.vendor_ownership_duration}</p>
                    )}
                    {selectedListing.vendor_special_conditions && (
                      <p><span className="text-gray-400">Special Conditions:</span> {selectedListing.vendor_special_conditions}</p>
                    )}
                    {selectedListing.vendor_favorable_contracts && (
                      <p><span className="text-gray-400">Favorable Contract Terms:</span> {selectedListing.vendor_favorable_contracts}</p>
                    )}
                    {selectedListing.vendor_motivation && (
                      <p><span className="text-gray-400">Vendor Motivation:</span> {selectedListing.vendor_motivation}</p>
                    )}
                  </div>
                </div>
              )}
              
              {selectedListing.showing_instructions && (
                <div>
                  <h3 className="text-lg font-semibold text-pickfirst-yellow mb-2">Showing Instructions</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedListing.showing_instructions}</p>
                </div>
              )}
              
              {/* Admin Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                {selectedListing.status === 'pending' && (
                  <>
                    <Button className="bg-green-500 text-white hover:bg-green-600" onClick={() => { handleApprove(selectedListing.id); setSelectedListing(null); }}>
                      Approve Listing
                    </Button>
                    <Button variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10" onClick={() => { handleReject(selectedListing.id); setSelectedListing(null); }}>
                      Reject Listing
                    </Button>
                  </>
                )}
                <Button variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10" onClick={() => { handleDelete(selectedListing.id); setSelectedListing(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Listing
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export with error boundary
export const AdminPropertyManagement = withErrorBoundary(AdminPropertyManagementComponent);