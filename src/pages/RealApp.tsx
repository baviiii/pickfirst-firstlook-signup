import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdvancedSearchDropdown } from '@/components/search/AdvancedSearchDropdown';
import { User, LogIn, Menu, X } from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { Square, Bed, Bath } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<PropertyListing[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    let isMounted = true;
    const loadListings = async () => {
      setFeaturedLoading(true);
      const { data, error } = await PropertyService.getApprovedListings(undefined, { includeOffMarket: true });
      if (isMounted) {
        if (data && data.length > 0) {
          // Separate off-market and regular properties
          const offMarketProperties = data.filter((p: any) => p.listing_source === 'agent_posted');
          const regularProperties = data.filter((p: any) => p.listing_source !== 'agent_posted');
          
          // Ensure at least 3 off-market properties if available, then fill with regular properties
          let featuredProperties: PropertyListing[] = [];
          
          // Add up to 3 off-market properties (or all if less than 3)
          const offMarketCount = Math.min(3, offMarketProperties.length);
          featuredProperties.push(...offMarketProperties.slice(0, offMarketCount));
          
          // Fill remaining slots (up to 6 total) with regular properties
          const remainingSlots = 6 - featuredProperties.length;
          if (remainingSlots > 0 && regularProperties.length > 0) {
            featuredProperties.push(...regularProperties.slice(0, remainingSlots));
          }
          
          setFeatured(featuredProperties);
        } else {
          setFeatured([]);
        }
        setFeaturedLoading(false);
      }
      if (error) {
        console.error('Failed to load featured listings:', error);
      }
    };
    loadListings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen pickfirst-bg-enhanced flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pickfirst-yellow"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-pickfirst-yellow/30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pickfirst-bg-enhanced relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full pickfirst-gradient-yellow-amber opacity-20 blur-3xl animate-pulse"></div>
        
        {/* Secondary glow */}
        <div className="absolute bottom-32 left-16 w-80 h-80 rounded-full pickfirst-gradient-yellow-amber opacity-15 blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* Accent glow */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pickfirst-yellow opacity-10 blur-xl animate-bounce" style={{animationDuration: '4s'}}></div>
        
        {/* Moving orbs */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full pickfirst-yellow opacity-5 blur-lg animate-pulse" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 rounded-full pickfirst-amber opacity-8 blur-md animate-pulse" style={{animationDuration: '2s', animationDelay: '0.5s'}}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      {/* Enhanced Navigation with Mobile Optimization */}
      <nav className="relative z-10 pickfirst-glass border-b border-pickfirst-yellow/20 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo Section */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/20 border border-pickfirst-yellow/30 flex items-center justify-center shadow-xl shadow-pickfirst-yellow/20 transition-all duration-300 hover:shadow-pickfirst-yellow/40 hover:scale-105 hover:border-pickfirst-yellow/50 p-2">
                <img 
                  src="https://pickfirst.com.au/logo.jpg" 
                  alt="PickFirst Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/logo.jpg') {
                      target.src = '/logo.jpg';
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold pickfirst-gradient-yellow-amber-text">
                  PickFirst
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Off-Market Property Access</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/about')}
                className="text-gray-900 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-transparent hover:border-pickfirst-yellow/30 rounded-lg"
              >
                About Us
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate('/pricing')}
                className="text-gray-900 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-transparent hover:border-pickfirst-yellow/30 rounded-lg"
              >
                Pricing
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSignInClick}
                className="text-white bg-pickfirst-yellow/20 border-2 border-pickfirst-yellow hover:bg-pickfirst-yellow/30 hover:border-pickfirst-yellow hover:text-white font-bold transition-all duration-300 rounded-lg shadow-xl shadow-pickfirst-yellow/30 px-5 py-2.5"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
              
              <Button
                onClick={handleSignUpClick}
                className="pickfirst-gradient-yellow-amber text-black font-bold transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-pickfirst-yellow/50 hover:shadow-pickfirst-yellow/70 rounded-xl border-0 hover:pickfirst-yellow-hover px-6 py-2.5"
              >
                <User className="h-4 w-4 mr-2" />
                Sign Up
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 p-2"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 pickfirst-glass border-b border-pickfirst-yellow/20 shadow-xl">
              <div className="px-4 py-4 space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/about');
                    closeMobileMenu();
                  }}
                  className="w-full text-left justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
                >
                  About Us
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/pricing');
                    closeMobileMenu();
                  }}
                  className="w-full text-left justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
                >
                  Pricing
                </Button>
                
                <div className="border-t border-pickfirst-yellow/20 pt-3 mt-3 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/terms');
                      closeMobileMenu();
                    }}
                    className="w-full text-left justify-start text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 text-sm"
                  >
                    Terms and Conditions
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/privacy');
                      closeMobileMenu();
                    }}
                    className="w-full text-left justify-start text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 text-sm"
                  >
                    Privacy Policy
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    handleSignInClick();
                    closeMobileMenu();
                  }}
                  className="w-full justify-start text-white bg-pickfirst-yellow/20 border-2 border-pickfirst-yellow hover:bg-pickfirst-yellow/30 hover:border-pickfirst-yellow hover:text-white font-bold transition-all duration-300 shadow-lg shadow-pickfirst-yellow/20"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                
                <Button
                  onClick={() => {
                    handleSignUpClick();
                    closeMobileMenu();
                  }}
                  className="w-full justify-start pickfirst-gradient-yellow-amber text-black font-bold transition-all duration-300 shadow-xl shadow-pickfirst-yellow/40 hover:shadow-2xl hover:shadow-pickfirst-yellow/60 rounded-lg border-0"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Enhanced Main Content */}
      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 shadow-2xl shadow-yellow-500/15 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0">
              <img
                src="https://www.pickfirst.com.au/background.jpg"
                alt="Sydney Harbour"
                className="w-full h-full object-cover object-center brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/60 to-transparent"></div>
              <div className="absolute -top-16 right-6 h-28 w-28 rounded-full bg-pickfirst-yellow/40 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-primary/30 blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-4 px-6 py-10 lg:px-12 lg:py-16 items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-600">
                Explore Without Limits
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 max-w-3xl">
                Discover Hidden Gems Before They Hit the Market
              </h2>
              <p className="max-w-2xl text-base text-gray-700 leading-relaxed">
                Experience the power of our intelligent search platform. Browse exclusive off-market properties and public listings in real-time—no login required. See what professional buyers see.
              </p>
              <div className="w-full max-w-4xl rounded-2xl border border-pickfirst-yellow/40 bg-white p-3 shadow-lg shadow-yellow-500/10 overflow-visible">
                <AdvancedSearchDropdown />
              </div>
            </div>
          </div>

          <section className="mx-auto max-w-6xl px-4 pb-16 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-600 font-semibold">Featured properties</p>
                <h3 className="text-2xl font-semibold text-gray-900">Explore what's available</h3>
              </div>
              <Button variant="ghost" className="text-gray-700 border border-gray-300 hover:border-pickfirst-yellow/50 hover:bg-pickfirst-yellow/5" onClick={() => navigate('/browse-properties')}>
                View all properties
              </Button>
            </div>
            {featuredLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="rounded-2xl bg-card/80 border border-pickfirst-yellow/20 shadow-xl h-72 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.slice(0, 6).map((property) => {
                const isOffMarket = (property as any).listing_source === 'agent_posted';
                return (
                  <Card key={property.id} className="relative group pickfirst-glass bg-card/95 text-foreground border border-pickfirst-yellow/30 shadow-xl overflow-hidden transition-all duration-300">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-pickfirst-yellow/0 transition duration-500 group-hover:bg-pickfirst-yellow/15" />
                      {isOffMarket && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Badge className="bg-pickfirst-yellow text-black">Off-market</Badge>
                            <p className="text-sm text-muted-foreground">Locked for premium members</p>
                          </div>
                        </div>
                      )}
                      <CardHeader className="p-0 relative z-10">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="h-36 w-full object-cover"
                          />
                        ) : (
                          <div className="h-36 w-full bg-muted flex items-center justify-center">
                            <Square className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4 p-5 relative z-10 flex flex-col">
                        <div>
                          <p className="text-foreground font-semibold text-lg leading-tight line-clamp-2 mb-1">{property.title}</p>
                          <p className="text-sm text-muted-foreground">{property.address}, {property.city}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {property.bedrooms !== null && (
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                              <Bed className="h-3 w-3" />
                              {property.bedrooms} beds
                            </div>
                          )}
                          {property.bathrooms !== null && (
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                              <Bath className="h-3 w-3" />
                              {property.bathrooms} baths
                            </div>
                          )}
                          {property.square_feet !== null && (
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                              <Square className="h-3 w-3" />
                              {property.square_feet.toLocaleString()} sq m
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                          <p className="text-xl font-semibold text-foreground">
                            {PropertyService.getDisplayPrice(property)}
                          </p>
                          <Button
                            variant="outline"
                            disabled={isOffMarket}
                            className={`w-full sm:w-auto text-sm ${isOffMarket ? 'text-muted-foreground border-border' : 'text-primary border-primary hover:bg-primary/10 hover:text-primary'}`}
                            onClick={() => navigate(`/property/${property.id}`)}
                          >
                            {isOffMarket ? 'Unlock in Premium' : 'View details'}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                          Log in to enquire with the agent or upgrade to premium for off-market access.
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Feature Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/95 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-pickfirst-yellow/40">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-pickfirst-yellow/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-pickfirst-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Advanced Search</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Filter properties by location, price, size, and dozens of other criteria to find your perfect match
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-pickfirst-yellow/40">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-pickfirst-yellow/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-pickfirst-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Direct Messaging</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Connect directly with property owners and real estate agents for quick responses and personalized service
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-pickfirst-yellow/40">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-pickfirst-yellow/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-pickfirst-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Premium Listings</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Access exclusive off-market properties not available on other platforms before they go public
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action Section */}
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/90 shadow-2xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-pickfirst-yellow/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-pickfirst-amber/20 blur-2xl" />
            </div>
            <div className="relative z-10 px-6 py-12 lg:px-12 lg:py-16 text-center space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Ready to Get Started?
              </h2>
              <p className="max-w-2xl mx-auto text-lg text-gray-700">
                Join thousands of users who trust PickFirst for their real estate needs
              </p>
              <Button 
                onClick={handleSignUpClick}
                className="pickfirst-gradient-yellow-amber text-black font-bold text-lg px-8 py-6 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-pickfirst-yellow/50 rounded-xl"
              >
                <User className="h-5 w-5 mr-2" />
                Sign Up Free Today
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer with Terms and Privacy */}
      <footer className="relative z-10 border-t-2 border-pickfirst-yellow/40 bg-white/95 backdrop-blur-lg mt-16 shadow-lg shadow-pickfirst-yellow/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-700">
              © {new Date().getFullYear()} PickFirst. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/terms')}
                className="text-sm font-medium text-gray-700 hover:text-pickfirst-yellow transition-colors underline-offset-4 hover:underline"
              >
                Terms and Conditions
              </button>
              <button
                onClick={() => navigate('/privacy')}
                className="text-sm font-medium text-gray-700 hover:text-pickfirst-yellow transition-colors underline-offset-4 hover:underline"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;