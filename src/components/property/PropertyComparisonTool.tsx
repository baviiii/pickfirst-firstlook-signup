import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  GitCompare, 
  Home, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  X,
  Plus,
  TrendingUp,
  Star
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { toast } from 'sonner';

interface PropertyComparisonToolProps {
  className?: string;
}

export const PropertyComparisonTool: React.FC<PropertyComparisonToolProps> = ({ className }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedProperties, setSelectedProperties] = useState<PropertyListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(false);

  const MAX_COMPARISONS = 4;

  const searchProperties = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await PropertyService.getApprovedListings({
        city: term
      });
      
      if (error) throw error;
      // Limit results to 10 items for search
      setSearchResults((data || []).slice(0, 10));
    } catch (error) {
      console.error('Error searching properties:', error);
      toast.error('Failed to search properties');
    } finally {
      setLoading(false);
    }
  };

  const addPropertyToComparison = (property: PropertyListing) => {
    if (selectedProperties.length >= MAX_COMPARISONS) {
      toast.error(`You can compare up to ${MAX_COMPARISONS} properties at once`);
      return;
    }

    if (selectedProperties.find(p => p.id === property.id)) {
      toast.error('Property already added to comparison');
      return;
    }

    setSelectedProperties(prev => [...prev, property]);
    setSearchTerm('');
    setSearchResults([]);
    toast.success('Property added to comparison');
  };

  const removePropertyFromComparison = (propertyId: string) => {
    setSelectedProperties(prev => prev.filter(p => p.id !== propertyId));
    toast.success('Property removed from comparison');
  };

  const clearComparison = () => {
    setSelectedProperties([]);
    toast.success('Comparison cleared');
  };

  const getComparisonValue = (property: PropertyListing, field: keyof PropertyListing) => {
    const value = property[field];
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number' && field === 'price') {
      return `$${value.toLocaleString()}`;
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getBestValue = (field: keyof PropertyListing, isHigherBetter: boolean = false) => {
    const values = selectedProperties
      .map(p => p[field])
      .filter(v => v !== null && v !== undefined && typeof v === 'number') as number[];
    
    if (values.length === 0) return null;
    return isHigherBetter ? Math.max(...values) : Math.min(...values);
  };

  const isHighlighted = (property: PropertyListing, field: keyof PropertyListing, isHigherBetter: boolean = false) => {
    const value = property[field];
    if (typeof value !== 'number') return false;
    const bestValue = getBestValue(field, isHigherBetter);
    return bestValue !== null && value === bestValue;
  };

  return (
    <div className={className}>
      <FeatureGate 
        feature="property_comparison"
        title="Property Comparison Tool"
        description="Compare multiple properties side by side to make informed decisions"
      >
        <div className="space-y-6">
          {/* Search and Add Properties */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                Property Comparison Tool
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Compare up to {MAX_COMPARISONS} properties side by side
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search properties to add to comparison..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    searchProperties(e.target.value);
                  }}
                  className="flex-1"
                />
                {selectedProperties.length > 0 && (
                  <Button variant="outline" onClick={clearComparison}>
                    Clear All
                  </Button>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between p-3 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{property.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {property.city}, {property.state}
                          <DollarSign className="h-3 w-3 ml-2" />
                          ${property.price.toLocaleString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addPropertyToComparison(property)}
                        disabled={selectedProperties.length >= MAX_COMPARISONS}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparison Table */}
          {selectedProperties.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
              <CardHeader>
                <CardTitle className="text-foreground">Property Comparison</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Comparing {selectedProperties.length} properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-muted-foreground">Feature</th>
                        {selectedProperties.map((property) => (
                          <th key={property.id} className="text-left p-3 min-w-[200px]">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground truncate">
                                  {property.title}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removePropertyFromComparison(property.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {property.city}, {property.state}
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Price */}
                      <tr className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">Price</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className={`font-bold text-lg ${isHighlighted(property, 'price', false) ? 'text-green-400' : 'text-foreground'}`}>
                              {getComparisonValue(property, 'price')}
                              {isHighlighted(property, 'price', false) && (
                                <Star className="h-4 w-4 inline ml-1 text-green-400" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Bedrooms */}
                      <tr className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">Bedrooms</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className={`flex items-center gap-1 ${isHighlighted(property, 'bedrooms', true) ? 'text-green-400' : 'text-foreground'}`}>
                              <Bed className="h-4 w-4" />
                              {getComparisonValue(property, 'bedrooms')}
                              {isHighlighted(property, 'bedrooms', true) && (
                                <Star className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Bathrooms */}
                      <tr className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">Bathrooms</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className={`flex items-center gap-1 ${isHighlighted(property, 'bathrooms', true) ? 'text-green-400' : 'text-foreground'}`}>
                              <Bath className="h-4 w-4" />
                              {getComparisonValue(property, 'bathrooms')}
                              {isHighlighted(property, 'bathrooms', true) && (
                                <Star className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Square Feet */}
                      <tr className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">Square Feet</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className={`flex items-center gap-1 ${isHighlighted(property, 'square_feet', true) ? 'text-green-400' : 'text-foreground'}`}>
                              <Square className="h-4 w-4" />
                              {getComparisonValue(property, 'square_feet')}
                              {isHighlighted(property, 'square_feet', true) && (
                                <Star className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Year Built */}
                      <tr className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">Year Built</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className={`flex items-center gap-1 ${isHighlighted(property, 'year_built', true) ? 'text-green-400' : 'text-foreground'}`}>
                              <Calendar className="h-4 w-4" />
                              {getComparisonValue(property, 'year_built')}
                              {isHighlighted(property, 'year_built', true) && (
                                <Star className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Property Type */}
                      <tr className="border-b border-border/50">
                        <td className="p-3 font-medium text-foreground">Property Type</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className="flex items-center gap-1 text-foreground">
                              <Home className="h-4 w-4" />
                              {getComparisonValue(property, 'property_type')}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Actions */}
                      <tr>
                        <td className="p-3 font-medium text-foreground">Actions</td>
                        {selectedProperties.map((property) => (
                          <td key={property.id} className="p-3">
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => navigate(`/property/${property.id}`)}
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => navigate(`/property/${property.id}?action=inquiry`)}
                              >
                                Contact Agent
                              </Button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedProperties.length === 0 && (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
              <CardContent className="text-center py-12">
                <GitCompare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Start Comparing Properties</h3>
                <p className="text-muted-foreground mb-4">
                  Search and add properties above to see a detailed side-by-side comparison
                </p>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Premium Feature
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </FeatureGate>
    </div>
  );
};
