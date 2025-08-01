import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Filter, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PropertyMapPage = () => {
  const navigate = useNavigate();

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Property Map</h1>
        </div>

        {/* Map Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search location..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button variant="outline" className="text-gray-300 hover:text-primary">
            <Filter className="h-4 w-4 mr-2" />
            Map Filters
          </Button>
        </div>

        {/* Map Container */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardContent className="p-0">
            <div className="h-[600px] bg-gray-800 rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Map Placeholder */}
              <div className="text-center text-gray-400">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2 text-white">Interactive Property Map</h3>
                <p className="text-gray-300 mb-4">Explore properties in your area with our interactive map</p>
                <Button variant="outline" className="text-gray-300 hover:text-primary">
                  Enable Map View
                </Button>
              </div>
              
              {/* Map overlay with sample pins */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-20 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                <div className="absolute top-32 right-32 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute bottom-20 left-1/3 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute bottom-32 right-20 w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Legend and Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
            <CardHeader>
              <CardTitle className="text-white">Map Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-gray-300 text-sm">Available Properties</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm">Saved Properties</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm">Recently Viewed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300 text-sm">Under Contract</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
            <CardHeader>
              <CardTitle className="text-white">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Properties in View</span>
                  <span className="text-white font-semibold">47</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Average Price</span>
                  <span className="text-white font-semibold">$625K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Price Range</span>
                  <span className="text-white font-semibold">$350K - $1.2M</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
            <CardHeader>
              <CardTitle className="text-white">Map Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full text-gray-300 hover:text-primary">
                  Switch to Satellite View
                </Button>
                <Button variant="outline" size="sm" className="w-full text-gray-300 hover:text-primary">
                  Show School Districts
                </Button>
                <Button variant="outline" size="sm" className="w-full text-gray-300 hover:text-primary">
                  Traffic & Transit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PropertyMapPage;