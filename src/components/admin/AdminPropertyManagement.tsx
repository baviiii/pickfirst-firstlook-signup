import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Trash2 } from 'lucide-react';

export const AdminPropertyManagement = () => {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const navigate = useNavigate();

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
    const { error } = await PropertyService.approveListing(id);
    if (error) {
      toast.error(error.message || 'Failed to approve listing');
    } else {
      toast.success('Listing approved!');
      setListings(listings => listings.map(l => l.id === id ? { ...l, status: 'approved' } : l));
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    const { error } = await PropertyService.rejectListing(id, reason);
    if (error) {
      toast.error(error.message || 'Failed to reject listing');
    } else {
      toast.success('Listing rejected.');
      setListings(listings => listings.map(l => l.id === id ? { ...l, status: 'rejected', rejection_reason: reason } : l));
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-pickfirst-yellow/20 flex items-center px-4 py-3 gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-white hover:text-pickfirst-yellow">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text ml-2">All Property Listings</h1>
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
            {listings.map(listing => (
              <Card key={listing.id} className="bg-white/5 border border-pickfirst-yellow/10 flex flex-col h-full">
                <CardHeader className="pb-2 border-b border-white/10">
                  <CardTitle className="text-lg text-pickfirst-yellow mb-1">{listing.title}</CardTitle>
                  <CardDescription className="text-gray-300">{listing.address}, {listing.city}, {listing.state}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between py-4">
                  <div>
                    <div className="text-white font-bold text-xl mb-2">${listing.price.toLocaleString()}</div>
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
                      'text-gray-400'
                    }>{listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}</span></div>
                    {listing.status === 'rejected' && listing.rejection_reason && (
                      <div className="text-xs text-red-400">Reason: {listing.rejection_reason}</div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {listing.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-500 text-white hover:bg-green-600" onClick={() => handleApprove(listing.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10" onClick={() => handleReject(listing.id)}>
                          Reject
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
    </div>
  );
}; 