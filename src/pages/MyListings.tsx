import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit, Eye, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PropertyListingForm } from '@/components/property/PropertyListingForm';

const parseSoldPriceInput = (value?: string | number | null): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const input = value.toString().trim();
  if (!input) return null;

  const cleaned = input.replace(/[,$\s]/g, '').toLowerCase();

  if (cleaned.includes('k')) {
    const num = parseFloat(cleaned.replace('k', ''));
    if (Number.isFinite(num)) return num * 1000;
  }

  if (cleaned.includes('m')) {
    const num = parseFloat(cleaned.replace('m', ''));
    if (Number.isFinite(num)) return num * 1000000;
  }

  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const MyListingsPage = () => {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [editingListing, setEditingListing] = useState<PropertyListing | null>(null);
  const [soldListing, setSoldListing] = useState<PropertyListing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [soldForm, setSoldForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const navigate = useNavigate();

  const refreshListings = async () => {
    const { data } = await PropertyService.getMyListings();
    setListings(data || []);
  };

  useEffect(() => {
    setLoadingListings(true);
    refreshListings().finally(() => setLoadingListings(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    const { error } = await PropertyService.deleteListing(id);
    if (error) {
      toast.error(error.message || 'Failed to delete listing');
    } else {
      toast.success('Listing deleted.');
      setListings(listings => listings.filter(l => l.id !== id));
    }
  };

  const handleViewDetails = (listing: PropertyListing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);
  };

  const handleEditListing = (listing: PropertyListing) => {
    setEditingListing(listing);
  };

  const handleMarkAsSold = (listing: PropertyListing) => {
    setSoldListing(listing);
    setSoldForm({
      sold_price: listing.price ? listing.price.toString() : '',
      sold_date: new Date().toISOString().split('T')[0],
      sold_to_client_id: 'none'
    });
    fetchClients();
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, email')
      .order('name');
    setClients(data || []);
  };

  const handleSoldSubmit = async () => {
    if (!soldListing) return;
    
    setIsUpdating(true);
    try {
      const parsedSoldPrice = parseSoldPriceInput(soldForm.sold_price);
      const trimmedNote = typeof soldForm.sold_price === 'string' ? soldForm.sold_price.trim() : soldForm.sold_price?.toString().trim();
      const updates: any = {
        status: 'sold',
        sold_date: soldForm.sold_date,
        sold_to_client_id: soldForm.sold_to_client_id === 'none' ? null : soldForm.sold_to_client_id || null
      };
      if (parsedSoldPrice !== null) {
        updates.sold_price = parsedSoldPrice;
      } else if ('sold_price' in soldForm) {
        updates.sold_price = null;
      }
      if (trimmedNote && parsedSoldPrice === null) {
        updates.sold_price_note = trimmedNote;
      } else if ('sold_price_note' in soldForm || (soldForm.sold_price && typeof soldForm.sold_price === 'string')) {
        updates.sold_price_note = null;
      }

      const { error } = await PropertyService.updateListing(soldListing.id, updates);
      
      if (error) {
        toast.error(error.message || 'Failed to mark as sold');
      } else {
        toast.success('Property marked as sold!');
        setSoldListing(null);
        await refreshListings();
      }
    } finally {
      setIsUpdating(false);
    }
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

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-yellow-400 hover:text-amber-500">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white">My Property Listings</h1>
        </div>

        {loadingListings ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-yellow-400/20">
            <CardContent className="py-12 text-center text-gray-300 text-lg">Loading your listings...</CardContent>
          </Card>
        ) : listings.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-yellow-400/20">
            <CardContent className="py-12 text-center text-gray-400 text-lg">You have no property listings yet.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <Card key={listing.id} className="bg-white/5 border border-yellow-400/10 flex flex-col h-full">
                <CardHeader className="pb-2 border-b border-white/10">
                  <div className="aspect-video bg-gray-700 rounded-md mb-3 overflow-hidden">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gray-700 flex items-center justify-center ${listing.images && listing.images.length > 0 ? 'hidden' : ''}`}>
                      <span className="text-gray-500 text-sm">No Image</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg text-yellow-400 mb-1">{listing.title}</CardTitle>
                  <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between py-4">
                  <div>
                    <div className="text-white font-bold text-xl mb-2">
                      {PropertyService.getDisplayPrice(listing)}
                    </div>
                    <div className="text-gray-400 text-sm mb-2">{listing.property_type.replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {listing.bedrooms !== null && <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded">{listing.bedrooms} Bed</span>}
                      {listing.bathrooms !== null && <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded">{listing.bathrooms} Bath</span>}
                      {listing.square_feet !== null && <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded">{listing.square_feet} Sq Ft</span>}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">Status: <span className={
                      listing.status === 'approved' ? 'text-green-400' :
                      listing.status === 'pending' ? 'text-yellow-400' :
                      listing.status === 'rejected' ? 'text-red-400' :
                      listing.status === 'sold' ? 'text-blue-400' :
                      'text-gray-400'
                    }>{listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}</span></div>
                    {listing.status === 'rejected' && listing.rejection_reason && (
                      <div className="text-xs text-red-400">Reason: {listing.rejection_reason}</div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button size="sm" variant="outline" className="text-blue-500 border-blue-500 hover:bg-blue-500/10 flex items-center" onClick={() => handleViewDetails(listing)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {listing.status !== 'sold' && (
                      <>
                        <Button size="sm" variant="outline" className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10 flex items-center" onClick={() => handleEditListing(listing)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-green-500 border-green-500 hover:bg-green-500/10 flex items-center" onClick={() => handleMarkAsSold(listing)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Mark Sold
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10 flex items-center" onClick={() => handleDelete(listing.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900/95 to-black/95 border border-yellow-400/20">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 text-xl">{selectedListing?.title}</DialogTitle>
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
                </div>
              )}
              
              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Basic Information</h3>
                    <div className="space-y-2 text-gray-300">
                      <p><span className="text-gray-400">Address:</span> {selectedListing?.address}</p>
                      <p><span className="text-gray-400">City:</span> {selectedListing?.city}</p>
                      <p><span className="text-gray-400">State:</span> {selectedListing?.state}</p>
                      <p><span className="text-gray-400">ZIP:</span> {selectedListing?.zip_code}</p>
                      <p><span className="text-gray-400">Property Type:</span> {selectedListing?.property_type?.replace(/\b\w/g, l => l.toUpperCase())}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Pricing & Details</h3>
                    <div className="space-y-2 text-gray-300">
                      <p>
                        <span className="text-gray-400">Price:</span>{' '}
                        <span className="text-white font-bold text-xl">
                          {PropertyService.getDisplayPrice(selectedListing)}
                        </span>
                      </p>
                      {selectedListing?.bedrooms !== null && <p><span className="text-gray-400">Bedrooms:</span> {selectedListing.bedrooms}</p>}
                      {selectedListing?.bathrooms !== null && <p><span className="text-gray-400">Bathrooms:</span> {selectedListing.bathrooms}</p>}
                      {selectedListing?.square_feet !== null && <p><span className="text-gray-400">Square Metres:</span> {selectedListing.square_feet.toLocaleString()}</p>}
                      {selectedListing?.lot_size !== null && <p><span className="text-gray-400">Lot Size:</span> {selectedListing.lot_size.toLocaleString()} sq metres</p>}
                      {selectedListing?.year_built !== null && <p><span className="text-gray-400">Year Built:</span> {selectedListing.year_built}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Status & Contact</h3>
                    <div className="space-y-2 text-gray-300">
                      <p><span className="text-gray-400">Status:</span> <span className={`font-semibold ${
                        selectedListing?.status === 'approved' ? 'text-green-400' :
                        selectedListing?.status === 'pending' ? 'text-yellow-400' :
                        selectedListing?.status === 'rejected' ? 'text-red-400' :
                        selectedListing?.status === 'sold' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>{selectedListing?.status?.charAt(0).toUpperCase() + selectedListing?.status?.slice(1)}</span></p>
                      {selectedListing?.status === 'rejected' && selectedListing?.rejection_reason && (
                        <p><span className="text-gray-400">Rejection Reason:</span> <span className="text-red-400">{selectedListing.rejection_reason}</span></p>
                      )}
                      {selectedListing?.contact_phone && <p><span className="text-gray-400">Phone:</span> {selectedListing.contact_phone}</p>}
                      {selectedListing?.contact_email && <p><span className="text-gray-400">Email:</span> {selectedListing.contact_email}</p>}
                    </div>
                  </div>
                  
                  {selectedListing?.features && selectedListing.features.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-400 mb-2">Features</h3>
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
              
              {selectedListing?.description && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Description</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedListing.description}</p>
                </div>
              )}
              
              {selectedListing?.showing_instructions && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Showing Instructions</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedListing.showing_instructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Listing Modal */}
      <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-900/95 to-black/95 border border-yellow-400/20 p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-yellow-400 text-xl">
              {editingListing ? `Edit Listing: ${editingListing.title}` : 'Edit Listing'}
            </DialogTitle>
          </DialogHeader>
          
          {editingListing && (
            <div className="p-6">
              <PropertyListingForm
                mode="edit"
                listing={editingListing}
                onCancel={() => setEditingListing(null)}
                onSuccess={async () => {
                  await refreshListings();
                  setEditingListing(null);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Sold Modal */}
      <Dialog open={!!soldListing} onOpenChange={() => setSoldListing(null)}>
        <DialogContent className="max-w-md bg-white text-foreground border border-pickfirst-yellow/30 shadow-xl shadow-yellow-500/20">
          <DialogHeader>
            <DialogTitle className="text-yellow-600 text-xl">Mark Property as Sold</DialogTitle>
          </DialogHeader>
          
          {soldListing && (
            <div className="space-y-4">
              <div className="text-muted-foreground text-sm">
                <strong className="text-foreground">{soldListing.title}</strong><br />
                {soldListing.address}, {soldListing.city}
              </div>
              
              <div>
                <Label htmlFor="sold_price" className="text-foreground font-medium">Sale Price / Notes *</Label>
                <Input
                  id="sold_price"
                  type="text"
                  value={soldForm.sold_price || ''}
                  placeholder="e.g. 1,250,000 or Contracted to Best Buyer"
                  onChange={(e) => setSoldForm({...soldForm, sold_price: e.target.value})}
                  className="bg-white border border-gray-200 text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a numeric value to feed analytics; enter text to describe the result without affecting revenue.
                </p>
              </div>
              
              <div>
                <Label htmlFor="sold_date" className="text-foreground font-medium">Sale Date *</Label>
                <Input
                  id="sold_date"
                  type="date"
                  value={soldForm.sold_date || ''}
                  onChange={(e) => setSoldForm({...soldForm, sold_date: e.target.value})}
                  className="bg-white border border-gray-200 text-foreground"
                />
              </div>
              
              <div>
                <Label htmlFor="sold_to_client" className="text-foreground font-medium">Sold to Client (Optional)</Label>
                <Select value={soldForm.sold_to_client_id} onValueChange={(value) => setSoldForm({...soldForm, sold_to_client_id: value})}>
                  <SelectTrigger className="bg-white border border-gray-200 text-foreground">
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client selected</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4 flex-wrap">
                <Button 
                  onClick={handleSoldSubmit} 
                  disabled={isUpdating || !soldForm.sold_price?.toString().trim() || !soldForm.sold_date}
                  className="bg-primary text-primary-foreground hover:bg-pickfirst-amber"
                >
                  {isUpdating ? 'Marking as Sold...' : 'Mark as Sold'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSoldListing(null)}
                  className="text-muted-foreground border-border hover:bg-muted"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyListingsPage;