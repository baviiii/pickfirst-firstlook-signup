import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Settings, Maximize2, Minimize2, List, Map as MapIcon, Phone, Mail, Calendar, MapPin, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { googleMapsService } from '@/services/googleMapsService';
import { toast } from "sonner";

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  latitude?: number;
  longitude?: number;
  images?: string[];
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  property_type?: string;
}

interface PropertyMapProps {
  properties?: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  showControls?: boolean;
  className?: string;
}

const PropertyMap: React.FC<PropertyMapProps> = ({
  properties = [],
  selectedProperty,
  onPropertySelect,
  showControls = true,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMapView, setShowMapView] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const [mapZoom, setMapZoom] = useState(12);
  const isMobile = useIsMobile();

  // Generate interactive map display
  const generateMap = useCallback(async () => {
    if (!mapContainer.current) return;

    try {
      setIsMapLoading(true);
      setError('');

      const validProperties = properties.filter(p => p.latitude && p.longitude);
      
      if (validProperties.length === 0) {
        // Show default map if no properties
        setMapCenter({ lat: 40.7128, lng: -74.0060 });
        setIsMapLoading(false);
        setIsLoaded(true);
        return;
      }

      // Calculate bounds for all properties
      const bounds = {
        north: Math.max(...validProperties.map(p => p.latitude!)),
        south: Math.min(...validProperties.map(p => p.latitude!)),
        east: Math.max(...validProperties.map(p => p.longitude!)),
        west: Math.min(...validProperties.map(p => p.longitude!))
      };

      // Calculate center and zoom
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      setMapCenter({ lat: centerLat, lng: centerLng });

      // Create interactive map display
      const mapDisplay = `
        <div class="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg relative overflow-hidden">
          <!-- Map Background with Grid -->
          <div class="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100">
            <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(circle at 1px 1px, #3B82F6 1px, transparent 0); background-size: 20px 20px;"></div>
          </div>
          
          <!-- Map Container -->
          <div class="absolute inset-4 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
            <!-- Map Header -->
            <div class="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 z-10">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Interactive Property Map</span>
                <span class="text-xs bg-blue-500 px-2 py-1 rounded">${validProperties.length} Properties</span>
              </div>
            </div>
            
            <!-- Property Markers -->
            ${validProperties.map((property, index) => {
              // Calculate position based on coordinates (simplified positioning)
              const latDiff = property.latitude! - bounds.south;
              const lngDiff = property.longitude! - bounds.west;
              const latRange = bounds.north - bounds.south;
              const lngRange = bounds.east - bounds.west;
              
              const top = 15 + (latDiff / latRange) * 60; // 15% to 75% of map height
              const left = 10 + (lngDiff / lngRange) * 70; // 10% to 80% of map width
              
              return `
                <div 
                  class="absolute w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-all duration-200 hover:shadow-xl"
                  style="top: ${top}%; left: ${left}%; z-index: 20;"
                  data-property-id="${property.id}"
                  title="${property.title} - $${property.price.toLocaleString()}"
                >
                  <div class="flex items-center justify-center h-full text-white text-xs font-bold">${index + 1}</div>
                  
                  <!-- Property Info on Hover -->
                  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div class="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                      <div class="font-semibold">${property.title}</div>
                      <div class="text-gray-300">$${property.price.toLocaleString()}</div>
                    </div>
                    <div class="w-2 h-2 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2"></div>
                  </div>
                </div>
              `;
            }).join('')}
            
            <!-- Map Legend -->
            <div class="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 border border-gray-200 shadow-lg">
              <div class="text-xs text-gray-600 space-y-1">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Property Location</span>
                </div>
                <div class="text-xs text-gray-500">
                  ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}
                </div>
              </div>
            </div>
            
            <!-- Zoom Controls -->
            <div class="absolute top-16 right-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg">
              <div class="p-1 space-y-1">
                <button class="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors" onclick="window.zoomIn()">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
                <button class="w-8 h-8 bg-white hover:bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors" onclick="window.zoomOut()">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      if (mapContainer.current) {
        mapContainer.current.innerHTML = mapDisplay;
      }

      // Add click handlers for property markers
      const markerElements = mapContainer.current?.querySelectorAll('[data-property-id]');
      markerElements?.forEach(marker => {
        marker.addEventListener('click', (e) => {
          const propertyId = (e.currentTarget as HTMLElement).getAttribute('data-property-id');
          const property = validProperties.find(p => p.id === propertyId);
          if (property && onPropertySelect) {
            onPropertySelect(property);
            toast.success(`Selected: ${property.title}`);
          }
        });
      });

      // Add zoom functions to window
      (window as any).zoomIn = () => {
        setMapZoom(prev => Math.min(prev + 2, 20));
        toast.info('Zoomed in');
      };
      
      (window as any).zoomOut = () => {
        setMapZoom(prev => Math.max(prev - 2, 8));
        toast.info('Zoomed out');
      };

      setIsMapLoading(false);
      setIsLoaded(true);

    } catch (err) {
      console.error('Error generating map:', err);
      setError('Failed to generate map');
      setIsMapLoading(false);
    }
  }, [properties, onPropertySelect]);

  // Initialize map when properties change
  useEffect(() => {
    generateMap();
  }, [generateMap]);

  // Handle selected property
  useEffect(() => {
    if (selectedProperty && selectedProperty.latitude && selectedProperty.longitude) {
      // Center map on selected property
      setMapCenter({ lat: selectedProperty.latitude, lng: selectedProperty.longitude });
      setMapZoom(16);
      generateMap();
      toast.info(`Focused on: ${selectedProperty.title}`);
    }
  }, [selectedProperty, generateMap]);

  // Handle location search using Supabase edge function
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await googleMapsService.geocodeAddress(searchQuery);
      if (results.length > 0) {
        const location = results[0].geometry.location;
        setMapCenter(location);
        setMapZoom(15);
        generateMap();
        toast.success(`Found: ${results[0].formatted_address}`);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const refreshMap = () => {
    generateMap();
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''} ${className}`}>
      {/* Mobile View Toggle */}
      {isMobile && (
        <div className="flex mb-4 bg-gray-700 rounded-lg p-1">
          <Button
            variant={showMapView ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowMapView(true)}
            className="flex-1"
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Map
          </Button>
          <Button
            variant={!showMapView ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowMapView(false)}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search for locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-10"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          onClick={refreshMap}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Map View */}
      {(showMapView || !isMobile) && (
        <div className={`relative ${isFullscreen ? 'h-full' : 'h-[400px] md:h-[600px]'} rounded-lg overflow-hidden bg-gray-800`}>
          {/* Map Container */}
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Loading Overlay */}
          {isMapLoading && (
            <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2" />
                <p className="text-sm text-gray-400">Generating interactive map...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 bg-muted/80 flex items-center justify-center">
              <div className="text-center p-6">
                <MapPin className="h-16 w-16 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Map Error</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={refreshMap} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* No Properties Message */}
          {isLoaded && properties.length === 0 && (
            <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center">
              <div className="text-center p-6">
                <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Properties Available</h3>
                <p className="text-sm text-gray-400">No properties have been added to the system yet.</p>
              </div>
            </div>
          )}

          {/* No Coordinates Message */}
          {isLoaded && properties.length > 0 && properties.filter(p => p.latitude && p.longitude).length === 0 && (
            <div className="absolute inset-0 bg-gray-800/80 flex items-center justify-center">
              <div className="text-center p-6">
                <MapPin className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Properties Need Coordinates</h3>
                <p className="text-sm text-gray-400 mb-4">Your properties need latitude and longitude coordinates to appear on the map.</p>
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-left">
                  <div className="text-sm text-yellow-300 mb-2">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Coordinates are automatically added when you create properties
                  </div>
                  <div className="text-xs text-yellow-400">
                    The form automatically finds coordinates using Google Maps Geocoding API
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Controls */}
          {showControls && !isMobile && (
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="shadow-lg"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleFullscreen}
                className="shadow-lg"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Mobile Controls */}
          {showControls && isMobile && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="shadow-lg"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="absolute top-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg max-w-xs">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Map Settings</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>✓ Secure API key handling via Supabase</p>
                    <p>✓ Edge function integration</p>
                    <p>✓ Interactive property markers</p>
                    <p>✓ Auto-coordinate generation</p>
                    <p>✓ Mobile responsive</p>
                  </div>
                </div>
                <Button onClick={() => setShowSettings(false)} variant="outline" size="sm" className="w-full">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View (Mobile) */}
      {!showMapView && isMobile && (
        <div className="space-y-4">
          {properties.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Properties Available</h3>
              <p className="text-sm text-muted-foreground">No properties have been added to the system yet.</p>
            </div>
          ) : (
            properties.map((property) => (
              <Card key={property.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => onPropertySelect?.(property)}>
                <CardContent className="p-4">
                  {property.images && property.images.length > 0 && (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-foreground mb-1">{property.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}
                  </p>
                  <p className="text-lg font-bold text-primary mb-2">${property.price.toLocaleString()}</p>
                  {(property.bedrooms || property.bathrooms || property.square_feet) && (
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      {property.bedrooms && <span>{property.bedrooms} bed</span>}
                      {property.bathrooms && <span>{property.bathrooms} bath</span>}
                      {property.square_feet && <span>{property.square_feet.toLocaleString()} sqft</span>}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      Tour
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyMap;