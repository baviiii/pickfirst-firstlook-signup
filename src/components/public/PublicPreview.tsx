import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, DollarSign, Eye, Lock, Search, MessageSquare } from 'lucide-react';

// Mock data for public preview
const mockProperties = [
  {
    id: 1,
    title: "Modern Downtown Condo",
    price: 450000,
    location: "Downtown, City Center",
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    image: "/placeholder.svg",
    featured: true
  },
  {
    id: 2,
    title: "Family Suburban Home",
    price: 675000,
    location: "Oak Valley, Suburbs",
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    image: "/placeholder.svg",
    featured: false
  },
  {
    id: 3,
    title: "Luxury Waterfront Villa",
    price: 1200000,
    location: "Waterfront District",
    bedrooms: 5,
    bathrooms: 4,
    sqft: 3800,
    image: "/placeholder.svg",
    featured: true
  }
];

interface PublicPreviewProps {
  onSignUpClick: () => void;
  onSignInClick: () => void;
}

const PublicPreview = ({ onSignUpClick, onSignInClick }: PublicPreviewProps) => {
  const [viewedProperties, setViewedProperties] = useState(0);

  useEffect(() => {
    // Simulate increasing view count for engagement
    const interval = setInterval(() => {
      setViewedProperties(prev => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Enhanced Hero Section */}
      <div className="text-center space-y-6 py-8 sm:py-12">
        <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
          PickFirst
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Discover premium real estate opportunities with our curated selection of properties
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 w-fit mx-auto border border-yellow-400/20">
          <Eye className="h-4 w-4 text-yellow-400" />
          <span>{1247 + viewedProperties} people viewed properties today</span>
        </div>
      </div>

      {/* Enhanced Preview Properties */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Featured Properties</h2>
          <Badge className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/30">
            Preview Mode
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProperties.map((property, index) => (
            <Card key={property.id} className="group bg-black/40 backdrop-blur-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-400/20 overflow-hidden">
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-amber-500/10"></div>
                  <Home className="h-12 w-12 text-yellow-400/70 relative z-10" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,204,0,0.1),transparent_70%)]"></div>
                </div>
                
                {property.featured && (
                  <Badge className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold border-0 shadow-lg">
                    Featured
                  </Badge>
                )}
                
                {index > 0 && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-yellow-400/20 flex items-center justify-center border border-yellow-400/30">
                        <Lock className="h-8 w-8 text-yellow-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-300">Sign up to view</p>
                    </div>
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white group-hover:text-yellow-400 transition-colors">
                  {property.title}
                </CardTitle>
                <div className="flex items-center gap-1 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{property.location}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-yellow-400" />
                    <span className="text-lg font-bold text-yellow-400">
                      ${property.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span>{property.bedrooms} bed</span>
                  <span>{property.bathrooms} bath</span>
                  <span>{property.sqft.toLocaleString()} sqft</span>
                </div>
                
                <Button 
                  className={`w-full transition-all duration-300 ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400 shadow-lg hover:shadow-yellow-400/30" 
                      : "bg-black/40 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/10 hover:border-yellow-400/50"
                  }`}
                  onClick={index === 0 ? undefined : onSignUpClick}
                  disabled={index === 0}
                >
                  {index === 0 ? "Preview Available" : "Sign Up to View"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Enhanced Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        <Card className="text-center bg-black/40 backdrop-blur-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-400/10">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 flex items-center justify-center border border-yellow-400/30">
              <Search className="h-6 w-6 text-yellow-400" />
            </div>
            <CardTitle className="text-white">Advanced Search</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-300">
              Filter properties by location, price, size, and dozens of other criteria
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center bg-black/40 backdrop-blur-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-400/10">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 flex items-center justify-center border border-yellow-400/30">
              <MessageSquare className="h-6 w-6 text-yellow-400" />
            </div>
            <CardTitle className="text-white">Direct Messaging</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-300">
              Connect directly with property owners and real estate agents
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center bg-black/40 backdrop-blur-lg border border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-400/10">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 flex items-center justify-center border border-yellow-400/30">
              <Home className="h-6 w-6 text-yellow-400" />
            </div>
            <CardTitle className="text-white">Premium Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-300">
              Access exclusive properties not available on other platforms
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Call to Action */}
      <Card className="text-center p-8 bg-gradient-to-r from-black/60 to-black/40 backdrop-blur-lg border border-yellow-400/30 shadow-2xl shadow-yellow-400/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 to-amber-500/5"></div>
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-yellow-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-yellow-400/10 rounded-full blur-lg"></div>
        
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl sm:text-3xl text-white mb-2">
            Ready to Get Started?
          </CardTitle>
          <CardDescription className="text-lg text-gray-300">
            Join thousands of users who trust PickFirst for their real estate needs
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <Button 
            size="lg" 
            onClick={onSignUpClick} 
            className="text-lg px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400 font-bold shadow-xl hover:shadow-2xl hover:shadow-yellow-400/30 transition-all duration-300 transform hover:scale-105"
          >
            Sign Up Free Today
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export { PublicPreview };