import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Zap, TrendingUp, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';
import ProductionFilterSystem from '@/components/property/ProductionFilterSystem';
import { AdvancedPropertyFilters, FilterResult } from '@/services/filterService';
import PropertyInsights from '@/components/property/PropertyInsights';
import { useSubscription } from '@/hooks/useSubscription';
import { FeatureGate } from '@/components/ui/FeatureGate';

const EnhancedSearchFiltersPage = () => {
  const navigate = useNavigate();
  const { isFeatureEnabled } = useSubscription();
  
  const [results, setResults] = useState<FilterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleResultsChange = (newResults: FilterResult) => {
    setResults(newResults);
    setShowResults(true);
  };

  const handleLoadingChange = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  const PropertyCard = ({ property }: { property: PropertyListing }) => (
    <Card 
      className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={() => navigate(`/property/${property.id}`)}
    >
      <div className="relative aspect-video overflow-hidden rounded-t-lg">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white line-clamp-1">{property.title}</h3>
          <p className="text-yellow-400/80 text-sm">{property.address}, {property.city}</p>
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-yellow-400">
              ${property.price.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              {property.bedrooms && <span>{property.bedrooms} bed</span>}
              {property.bathrooms && <span>{property.bathrooms} bath</span>}
              {property.square_feet && <span>{property.square_feet.toLocaleString()} sqft</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 rounded-full bg-gradient-to-r from-yellow-400/15 to-amber-500/15 opacity-15 blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-yellow-400/10 opacity-10 blur-xl animate-bounce" style={{animationDuration: '4s'}}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-yellow-400/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                  Advanced Property Search with Insights
                </h1>
                <p className="text-sm text-yellow-400/80">
                  Find properties with intelligent insights and ratings
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResults(!showResults)}
                className="text-gray-300 hover:text-yellow-400 border-gray-600"
              >
                <Search className="h-4 w-4 mr-2" />
                {showResults ? 'Hide Results' : 'View Results'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          
          {/* Production Filter System */}
          <FeatureGate 
            feature="advanced_property_search"
            title="Advanced Search"
            description="Upgrade to Premium to unlock advanced search filters and in-depth property insights."
          >
            <ProductionFilterSystem
              onResultsChange={handleResultsChange}
              onLoadingChange={handleLoadingChange}
              showResults={showResults}
            />
          </FeatureGate>

          {/* Results Section */}
          {showResults && (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-yellow-400" />
                    Search Results
                  </CardTitle>
                  <Button
                    onClick={() => setShowResults(!showResults)}
                    disabled={loading}
                    className="bg-yellow-400 hover:bg-amber-500 text-black"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {showResults ? 'Hide Results' : 'Show Results'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-400">Searching properties...</div>
                  </div>
                ) : results && results.properties.length > 0 ? (
                  <>
                    <div className="mb-6">
                      <p className="text-gray-300">
                        Found <span className="text-yellow-400 font-semibold">{results.filterStats.matchingProperties}</span> of <span className="text-yellow-400 font-semibold">{results.filterStats.totalProperties}</span> properties matching your criteria
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {results.properties.map(property => (
                        <div key={property.id} className="space-y-4">
                          <PropertyCard property={property} />
                          {/* Property Insights for filtered results */}
                          <FeatureGate 
                            feature="advanced_property_search"
                            fallback={
                              <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                <Lock className="w-4 h-4 mr-2" />
                                Show Basic Results
                              </Button>
                            }
                          >
                            <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                              <TrendingUp className="w-4 h-4 mr-2" />
                              View Advanced Insights
                            </Button>
                          </FeatureGate>
                          <FeatureGate 
                            feature="advanced_property_search"
                            fallback={
                              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                <div className="flex">
                                  <div className="flex-shrink-0">
                                    <Zap className="h-5 w-5 text-yellow-400" />
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                      Upgrade to Premium to unlock advanced property insights, in-depth analytics, and personalized recommendations.
                                    </p>
                                    <div className="mt-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => navigate('/subscription')}
                                        className="mt-2"
                                      >
                                        Upgrade Now
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            }
                          >
                            <PropertyInsights
                              address={property.address}
                              latitude={property.latitude}
                              longitude={property.longitude}
                              propertyId={property.id}
                            />
                          </FeatureGate>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">No properties found matching your criteria</div>
                    <Button
                      variant="outline"
                      onClick={() => setShowResults(false)}
                      className="text-yellow-400 border-yellow-400/40 hover:bg-yellow-400/10"
                    >
                      Hide Results
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedSearchFiltersPage;