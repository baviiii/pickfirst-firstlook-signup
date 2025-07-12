
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, DollarSign, Eye, Lock } from 'lucide-react';

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
}

export const PublicPreview = ({ onSignUpClick }: PublicPreviewProps) => {
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
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8 sm:py-12">
        <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          PickFirst
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover premium real estate opportunities with our curated selection of properties
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{1247 + viewedProperties} people viewed properties today</span>
        </div>
      </div>

      {/* Preview Properties */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Properties</h2>
          <Badge variant="secondary">Preview Mode</Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProperties.map((property, index) => (
            <Card key={property.id} className="group hover:shadow-lg transition-all">
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center">
                  <Home className="h-12 w-12 text-muted-foreground" />
                </div>
                {property.featured && (
                  <Badge className="absolute top-3 left-3 bg-primary">Featured</Badge>
                )}
                {index > 0 && (
                  <div className="absolute inset-0 bg-black/60 rounded-t-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Lock className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">Sign up to view</p>
                    </div>
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{property.title}</CardTitle>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{property.location}</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-lg font-bold text-primary">
                      {property.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{property.bedrooms} bed</span>
                  <span>{property.bathrooms} bath</span>
                  <span>{property.sqft.toLocaleString()} sqft</span>
                </div>
                
                <Button 
                  className="w-full" 
                  variant={index === 0 ? "default" : "secondary"}
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

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Advanced Search</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Filter properties by location, price, size, and dozens of other criteria
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-secondary" />
            </div>
            <CardTitle>Direct Messaging</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Connect directly with property owners and real estate agents
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Home className="h-6 w-6 text-accent" />
            </div>
            <CardTitle>Premium Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Access exclusive properties not available on other platforms
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <Card className="text-center p-8 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">Ready to Get Started?</CardTitle>
          <CardDescription className="text-lg">
            Join thousands of users who trust PickFirst for their real estate needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={onSignUpClick} className="text-lg px-8">
            Sign Up Free Today
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
