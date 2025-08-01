import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SavedPropertiesPage = () => {
  const navigate = useNavigate();

  // Mock saved properties data
  const savedProperties = [
    {
      id: '1',
      title: 'Modern Downtown Condo',
      address: '123 Main St',
      city: 'Downtown',
      state: 'CA',
      price: 650000,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1200,
      savedDate: '2024-01-15',
      image: null
    },
    {
      id: '2',
      title: 'Family Home with Garden',
      address: '456 Oak Ave',
      city: 'Suburbia',
      state: 'CA',
      price: 850000,
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 2400,
      savedDate: '2024-01-12',
      image: null
    },
    {
      id: '3',
      title: 'Luxury Waterfront Villa',
      address: '789 Beach Blvd',
      city: 'Coastal',
      state: 'CA',
      price: 1200000,
      bedrooms: 5,
      bathrooms: 4,
      squareFeet: 3200,
      savedDate: '2024-01-10',
      image: null
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-primary border-white/20 hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Saved Properties</h1>
        </div>

        {/* Saved Properties Stats */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Saved Properties
            </CardTitle>
            <CardDescription className="text-gray-300">
              You have {savedProperties.length} properties saved
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Saved Properties Grid */}
        <div className="space-y-6">
          {savedProperties.length === 0 ? (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
              <CardContent className="text-center py-12">
                <Heart className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <div className="text-gray-400 mb-2">No saved properties yet</div>
                <div className="text-gray-500 text-sm">Start browsing to save properties you love</div>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/browse-properties')}
                >
                  Browse Properties
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProperties.map(property => (
                <Card key={property.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20 hover:border-primary/40 transition-all hover:scale-105">
                  <CardHeader>
                    <div className="aspect-video bg-gray-700 rounded-md mb-3 relative">
                      <div className="absolute top-2 right-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-500/10 p-2"
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg text-primary">{property.title}</CardTitle>
                    <CardDescription className="text-gray-300">
                      {property.address}, {property.city}, {property.state}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white font-bold text-xl mb-2">${property.price.toLocaleString()}</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-sm">{property.bedrooms} Bed</span>
                      <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded text-sm">{property.bathrooms} Bath</span>
                      <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-sm">{property.squareFeet} Sq Ft</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-4">
                      Saved on {new Date(property.savedDate).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPropertiesPage;