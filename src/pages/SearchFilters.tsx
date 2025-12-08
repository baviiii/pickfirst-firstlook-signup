import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Zap, TrendingUp, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import ProductionFilterSystem from '@/components/property/ProductionFilterSystem';
import { FilterResult } from '@/services/filterService';
import PropertyInsights from '@/components/property/PropertyInsights';
import { useSubscription } from '@/hooks/useSubscription';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const EnhancedSearchFiltersPage = () => {
  const navigate = useNavigate();
  const { canUseAdvancedSearch, canUseMarketInsights } = useSubscription();
  
  const [results, setResults] = useState<FilterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  const handleResultsChange = (newResults: FilterResult) => {
    setResults(newResults);
    setShowResults(true);
  };

  const handleLoadingChange = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  const PropertyCard = ({ property, showInsights }: { property: PropertyListing; showInsights?: boolean }) => {
    const isExpanded = expandedPropertyId === property.id;
    const displayPrice = PropertyService.getDisplayPrice(property);
    const rentalSuffix =
      property.property_type === 'weekly'
        ? '/week'
        : property.property_type === 'monthly'
          ? '/month'
          : '';
    const showRentalSuffix = rentalSuffix && property.status !== 'sold';
    
    return (
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 transition-all duration-300">
        <div 
          className="relative aspect-video overflow-hidden rounded-t-lg cursor-pointer group"
          onClick={() => navigate(`/property/${property.id}`)}
        >
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center">
              <span className="text-muted-foreground">No Image</span>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 
              className="text-lg font-bold text-foreground line-clamp-1 cursor-pointer hover:text-pickfirst-yellow transition-colors"
              onClick={() => navigate(`/property/${property.id}`)}
            >
              {property.title}
            </h3>
            <p className="text-pickfirst-yellow/90 text-sm line-clamp-1 font-medium">{property.address}, {property.city}</p>
            <div className="flex items-center justify-between pt-2">
              <div className="text-xl font-bold text-pickfirst-yellow">
                {displayPrice}
                {showRentalSuffix && (
                  <span className="text-sm font-normal text-pickfirst-yellow/80 ml-1">{rentalSuffix}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                {property.bedrooms && <span>{property.bedrooms} bed</span>}
                {property.bathrooms && <span>{property.bathrooms} bath</span>}
                {property.square_feet && <span>{property.square_feet.toLocaleString()} sqft</span>}
              </div>
            </div>
          </div>

          {showInsights && canUseMarketInsights && (
            <Collapsible open={isExpanded} onOpenChange={() => setExpandedPropertyId(isExpanded ? null : property.id)}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full mt-3 text-pickfirst-yellow border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {isExpanded ? 'Hide' : 'Show'} Neighborhood Insights
                  {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 animate-accordion-down">
                <PropertyInsights
                  address={property.address}
                  latitude={property.latitude}
                  longitude={property.longitude}
                  propertyId={property.id}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-yellow-400 hover:bg-yellow-400/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-yellow-400">Advanced Search</h1>
            <p className="text-sm text-gray-400">
              Find properties with intelligent insights and ratings
            </p>
          </div>
        </div>
        
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

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Production Filter System */}
          <FeatureGate 
            feature="advanced_search_filters"
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
            <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-black flex items-center gap-2">
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
                    <div className="mb-6 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                      <p className="text-black text-center font-medium">
                        Found <span className="text-yellow-600 font-bold text-lg">{results.filterStats.matchingProperties}</span> of <span className="text-yellow-600 font-semibold">{results.filterStats.totalProperties}</span> properties
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {results.properties.map(property => (
                        <PropertyCard 
                          key={property.id} 
                          property={property} 
                          showInsights={true}
                        />
                      ))}
                    </div>

                    {!canUseMarketInsights && (
                      <div className="mt-8 bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border border-yellow-400/30 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <Lock className="h-8 w-8 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                              Unlock Neighborhood Insights
                            </h3>
                            <p className="text-gray-300 mb-4">
                              Upgrade to Premium to access detailed neighborhood data, including schools, restaurants, transit, and more for each property.
                            </p>
                            <Button 
                              onClick={() => navigate('/subscription')}
                              className="bg-yellow-400 hover:bg-amber-500 text-black"
                            >
                              <Zap className="w-4 h-4 mr-2" />
                              Upgrade Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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