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
    console.log('=== GENERATING MAP ===');
    console.log('Properties received:', properties);
    console.log('Map container exists:', !!mapContainer.current);
    
    if (!mapContainer.current) {
      console.log('No map container, returning');
      return;
    }

    try {
      setIsMapLoading(true);
      setError('');

      const validProperties = properties.filter(p => p.latitude && p.longitude);
      
      console.log(`Map Debug: Total properties: ${properties.length}, With coordinates: ${validProperties.length}`);
      console.log('Valid properties:', validProperties);
      
      if (validProperties.length === 0) {
        // Show default map if no properties have coordinates
        console.log('No properties with coordinates found, showing default map');
        setMapCenter({ lat: 40.7128, lng: -74.0060 });
        
        // Show empty state message
        const emptyDisplay = `
          <div class="w-full h-full bg-slate-800 rounded-lg relative overflow-hidden flex items-center justify-center">
            <div class="text-center p-6">
              <div class="text-yellow-400 mb-4">
                <svg class="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-white mb-2">No Properties with Coordinates</h3>
              <p class="text-gray-300">${properties.length} properties need location data to appear on the map</p>
            </div>
          </div>
        `;
        
        if (mapContainer.current) {
          mapContainer.current.innerHTML = emptyDisplay;
        }
        
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

      console.log('Calculated bounds:', bounds);

      // Calculate center and zoom
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      setMapCenter({ lat: centerLat, lng: centerLng });
      
      console.log('Map center:', { lat: centerLat, lng: centerLng });

      // Create interactive map display
      const mapDisplay = `
        <div class="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg relative overflow-hidden shadow-2xl">
          <!-- Map Background with Grid -->
          <div class="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
            <div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 1px 1px, hsl(45 100% 51%) 1px, transparent 0); background-size: 20px 20px;"></div>
          </div>
          
          <!-- Map Container -->
          <div class="absolute inset-4 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 shadow-xl overflow-hidden">
            <!-- Map Header -->
            <div class="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-black p-3 z-10 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold">Interactive Property Map</span>
                <span class="text-xs bg-black/20 px-3 py-1 rounded-full font-medium">${validProperties.length} Properties</span>
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
                  class="absolute w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full border-3 border-white shadow-xl cursor-pointer transform hover:scale-125 transition-all duration-300 hover:shadow-2xl animate-pulse"
                  style="top: ${top}%; left: ${left}%; z-index: 20; animation: pulse 2s infinite;"
                  data-property-id="${property.id}"
                  title="${property.title} - $${property.price.toLocaleString()}"
                >
                  <div class="flex items-center justify-center h-full text-black text-sm font-bold">${index + 1}</div>
                  
                  <!-- Property Info on Hover -->
                  <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 hover:opacity-100 transition-all duration-300 pointer-events-none z-30">
                    <div class="bg-slate-900/95 backdrop-blur-sm text-white text-sm rounded-xl px-4 py-3 whitespace-nowrap shadow-2xl border border-yellow-400/30">
                      <div class="font-bold text-yellow-400">${property.title}</div>
                      <div class="text-gray-200 text-xs mt-1">$${property.price.toLocaleString()}</div>
                      ${property.bedrooms ? `<div class="text-gray-300 text-xs">${property.bedrooms}bd ${property.bathrooms}ba</div>` : ''}
                    </div>
                    <div class="w-3 h-3 bg-slate-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 border-r border-b border-yellow-400/30"></div>
                  </div>
                </div>
              `;
            }).join('')}
            
            <!-- Map Legend -->
            <div class="absolute bottom-3 left-3 bg-slate-800/95 backdrop-blur-sm rounded-xl p-3 border border-yellow-400/30 shadow-2xl">
              <div class="text-sm text-gray-200 space-y-2">
                <div class="flex items-center gap-3">
                  <div class="w-4 h-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full border border-white"></div>
                  <span class="font-medium">Property Location</span>
                </div>
                <div class="text-xs text-gray-400 font-mono">
                  ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}
                </div>
                <div class="text-xs text-yellow-400">
                  Click markers to view details
                </div>
              </div>
            </div>
            
            <!-- Zoom Controls -->
            <div class="absolute top-20 right-3 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-yellow-400/30 shadow-2xl overflow-hidden">
              <div class="p-1 space-y-1">
                <button class="w-10 h-10 bg-slate-700 hover:bg-yellow-500 border border-slate-600 hover:border-yellow-400 rounded-lg flex items-center justify-center text-gray-200 hover:text-black transition-all duration-200" onclick="window.zoomIn()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
                <button class="w-10 h-10 bg-slate-700 hover:bg-yellow-500 border border-slate-600 hover:border-yellow-400 rounded-lg flex items-center justify-center text-gray-200 hover:text-black transition-all duration-200" onclick="window.zoomOut()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      if (mapContainer.current) {
        console.log('Setting map container innerHTML');
        mapContainer.current.innerHTML = mapDisplay;
        console.log('Map container innerHTML set successfully');
      } else {
        console.error('Map container not found when trying to set innerHTML');
      }

      // Add click handlers for property markers
      const markerElements = mapContainer.current?.querySelectorAll('[data-property-id]');
      console.log('Found marker elements:', markerElements?.length);
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
      console.log('=== MAP GENERATION COMPLETE ===');

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
            <div className="absolute inset-0 bg-slate-800/90 flex items-center justify-center">
              <div className="text-center p-6 max-w-md">
                <MapPin className="h-16 w-16 mx-auto text-yellow-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Properties Need Coordinates</h3>
                <p className="text-sm text-gray-300 mb-4">Your {properties.length} properties need location coordinates to appear on the map.</p>
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-left space-y-2">
                  <div className="text-sm text-yellow-300">
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Coordinates are automatically added when creating properties
                  </div>
                  <div className="text-xs text-yellow-400">
                    Edit existing properties to add missing coordinates
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Partial Coordinates Message */}
          {isLoaded && properties.length > 0 && properties.filter(p => p.latitude && p.longitude).length > 0 && properties.filter(p => p.latitude && p.longitude).length < properties.length && (
            <div className="absolute top-4 right-4 bg-yellow-900/90 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-3 max-w-xs">
              <div className="text-xs text-yellow-300">
                <div className="font-medium mb-1">⚠️ Partial Coverage</div>
                <div>{properties.filter(p => p.latitude && p.longitude).length} of {properties.length} properties have coordinates</div>
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