import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Maximize2, 
  Minimize2, 
  Search, 
  MapPin, 
  Loader2, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut,
  Home,
  DollarSign,
  Bed,
  Bath,
  Square,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Filter,
  Eye,
  MousePointer2,
  Zap,
  Star,
  Calendar,
  Users
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { googleMapsService } from '@/services/googleMapsService';
import { loadGoogleMapsAPI, getGoogleMapsAPIKey } from '@/utils/googleMapsLoader';
import { toast } from "sonner";
import { Tables } from '@/integrations/supabase/types';
import { MapAnalyticsService, AreaAnalytics } from '@/services/mapAnalyticsService';

// Use real database types
type PropertyListing = Tables<'property_listings'>;

interface PropertyMapProps {
  properties?: PropertyListing[];
  selectedProperty?: PropertyListing | null;
  onPropertySelect?: (property: PropertyListing) => void;
  showControls?: boolean;
  className?: string;
}

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

const PropertyMap: React.FC<PropertyMapProps> = ({
  properties = [],
  selectedProperty,
  onPropertySelect,
  showControls = true,
  className = ""
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const analyticsCircleRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: -34.9285, lng: 138.6007 });
  const [mapZoom, setMapZoom] = useState(12);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [areaAnalytics, setAreaAnalytics] = useState<AreaAnalytics | null>(null);
  const [analyticsMode, setAnalyticsMode] = useState(false);
  const [cursorMode, setCursorMode] = useState<'normal' | 'analytics'>('normal');
  const [mapStyle, setMapStyle] = useState<'satellite' | 'roadmap' | 'terrain'>('roadmap');
  const [showPriceRanges, setShowPriceRanges] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAreaAnalytics, setSelectedAreaAnalytics] = useState<AreaAnalytics | null>(null);
  const [analyticsView, setAnalyticsView] = useState<'overall' | 'area'>('overall');
  const isMobile = useIsMobile();

  // Calculate area analytics with better debugging
  const calculateAreaAnalytics = useCallback((center: { lat: number; lng: number }, radiusKm: number = 2): AreaAnalytics | null => {
    return MapAnalyticsService.calculateAreaAnalytics(properties, center, radiusKm);
  }, [properties]);

  // Distance calculation helper
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Initialize Google Maps with advanced styling
  const initializeMap = useCallback(() => {
    if (!mapContainer.current || !window.google || mapRef.current) {
      return;
    }

    try {
      console.log('🗺️ Initializing Advanced Property Map...');
      
      // Premium dark yellow/black map style
      const mapStyles = {
        roadmap: [
          { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#fbbf24" }] },
          { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#f59e0b" }] },
          { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#f59e0b" }] },
          { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
          { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
          { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f59e0b" }] },
          { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2937" }] },
          { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f9fafb" }] },
          { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
          { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
          { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
          { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
          { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#f59e0b", weight: 0.6 }] }
        ],
        satellite: [],
        terrain: []
      };
      
      const map = new window.google.maps.Map(mapContainer.current, {
        center: mapCenter,
        zoom: mapZoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        gestureHandling: 'cooperative',
        styles: mapStyles.roadmap,
        restriction: {
          latLngBounds: {
            north: -25.0,
            south: -45.0,
            west: 110.0,
            east: 160.0,
          },
        },
      });

      mapRef.current = map;
      
      // Add click listener for analytics
      map.addListener('click', (event: any) => {
        if (analyticsMode) {
          handleMapClick(event);
        }
      });

      // Add cursor style change
      map.addListener('mousemove', () => {
        if (analyticsMode) {
          map.getDiv().style.cursor = 'crosshair';
        } else {
          map.getDiv().style.cursor = '';
        }
      });

      setIsMapLoading(false);
      setIsLoaded(true);
      
      console.log('✅ Advanced Property Map initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
      setError('Failed to load map');
      setIsMapLoading(false);
    }
  }, [mapCenter, mapZoom, analyticsMode]);

  // Handle map click for analytics
  const handleMapClick = (event: any) => {
    const clickedLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    const analytics = calculateAreaAnalytics(clickedLocation, 2);
    
    if (analytics) {
      setAreaAnalytics(analytics);
      setShowAnalytics(true);
      
      // Remove existing circle
      if (analyticsCircleRef.current) {
        analyticsCircleRef.current.setMap(null);
      }
      
      // Add analytics circle
      const circle = new window.google.maps.Circle({
        strokeColor: '#f59e0b',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#fbbf24',
        fillOpacity: 0.1,
        map: mapRef.current,
        center: clickedLocation,
        radius: 2000, // 2km radius
      });
      
      analyticsCircleRef.current = circle;
      
      toast.success(`Found ${analytics.propertyCount} properties in this area`);
    } else {
      toast.error('No properties found in this area');
    }
  };

  // Create advanced property markers
  const addPropertyMarkers = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const validProperties = properties.filter(p => p.latitude && p.longitude);
    
    if (validProperties.length === 0) {
      console.log('No properties with coordinates to display');
      return;
    }

    // Calculate price ranges for color coding
    const prices = validProperties.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    const getPriceColor = (price: number) => {
      const ratio = (price - minPrice) / priceRange;
      if (ratio > 0.7) return '#ef4444'; // High - Red
      if (ratio > 0.4) return '#f59e0b'; // Medium - Yellow
      return '#10b981'; // Low - Green
    };

    validProperties.forEach((property, index) => {
      const isSelected = selectedPropertyId === property.id;
      const priceColor = getPriceColor(property.price);
      const priceK = Math.round(property.price / 1000);
      
      // Advanced marker with animations and effects
      const marker = new window.google.maps.Marker({
        position: { lat: property.latitude!, lng: property.longitude! },
        map: mapRef.current,
        title: property.title,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:${priceColor};stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:1" />
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
                </filter>
              </defs>
              
              ${isSelected ? '<circle cx="30" cy="30" r="28" fill="#f59e0b" opacity="0.3" filter="url(#glow)"/>' : ''}
              
              <circle cx="30" cy="30" r="22" fill="url(#grad1)" filter="url(#shadow)"/>
              <circle cx="30" cy="30" r="19" fill="rgba(0,0,0,0.8)"/>
              <circle cx="30" cy="30" r="16" fill="${priceColor}"/>
              
              <text x="30" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8" font-weight="bold">$${priceK}K</text>
              <text x="30" y="36" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="6">${property.property_type?.substring(0,4) || 'HOME'}</text>
              
              ${isSelected ? '<circle cx="30" cy="30" r="22" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.8"/>' : ''}
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(60, 60),
          anchor: new window.google.maps.Point(30, 30)
        },
        animation: isSelected ? window.google.maps.Animation.BOUNCE : null,
        zIndex: isSelected ? 1000 : 100
      });

      // Premium info window with advanced analytics
      const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(price);
      };

      const daysOnMarket = property.created_at 
        ? Math.floor((Date.now() - new Date(property.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor(Math.random() * 90) + 1; // Fallback for demo
      const marketStatus = daysOnMarket < 14 ? 'Hot' : daysOnMarket < 30 ? 'Active' : 'Extended';
      const statusColor = daysOnMarket < 14 ? '#ef4444' : daysOnMarket < 30 ? '#f59e0b' : '#6b7280';
      
      const nearbyProps = calculateAreaAnalytics({ lat: property.latitude!, lng: property.longitude! }, 1);

      // Get property image (first image or placeholder)
      const propertyImage = property.images && property.images.length > 0 
        ? property.images[0] 
        : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop';

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="property-info-window max-w-sm bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-200">
            <!-- Property Image -->
            <div class="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
              <img src="${propertyImage}" alt="${property.title}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop'"/>
              <div class="absolute top-3 right-3">
                <span class="bg-white/90 backdrop-blur-sm text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  ${property.property_type || 'Property'}
                </span>
              </div>
              <div class="absolute bottom-3 left-3">
                <span class="bg-white/90 backdrop-blur-sm text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg" style="color: ${statusColor}">
                  ${marketStatus}
                </span>
              </div>
            </div>

            <!-- Content -->
            <div class="p-4">
              <!-- Title & Address -->
              <h3 class="font-bold text-gray-900 text-lg leading-tight mb-1">${property.title}</h3>
              <p class="text-gray-600 text-sm mb-3 flex items-center gap-1">
                <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                </svg>
                ${property.address}
              </p>

              <!-- Price -->
              <div class="mb-3">
                <span class="text-2xl font-bold text-gray-900">${formatPrice(property.price)}</span>
              </div>
              
              <!-- Property Details -->
              ${property.bedrooms || property.bathrooms || property.square_feet ? `
                <div class="flex items-center justify-between text-gray-600 text-sm mb-4 p-3 bg-gray-50 rounded-lg">
                  ${property.bedrooms ? `<div class="flex items-center gap-1"><svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5z"/></svg> ${property.bedrooms} bed${property.bedrooms > 1 ? 's' : ''}</div>` : ''}
                  ${property.bathrooms ? `<div class="flex items-center gap-1"><svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2V4z"/></svg> ${property.bathrooms} bath${property.bathrooms > 1 ? 's' : ''}</div>` : ''}
                  ${property.square_feet ? `<div class="flex items-center gap-1"><svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z"/></svg> ${property.square_feet.toLocaleString()}sq ft</div>` : ''}
                </div>
              ` : ''}

              <!-- Market Analytics -->
              ${nearbyProps ? `
                <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div class="text-xs text-blue-700 font-bold mb-2">📊 Neighborhood Insights</div>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-white p-2 rounded border">
                      <div class="text-gray-600">Avg Nearby</div>
                      <div class="text-gray-900 font-bold">${formatPrice(nearbyProps.averagePrice)}</div>
                    </div>
                    <div class="bg-white p-2 rounded border">
                      <div class="text-gray-600">Market Trend</div>
                      <div class="text-gray-900 font-bold flex items-center gap-1">
                        ${nearbyProps.marketTrend === 'up' ? '📈 Rising' : nearbyProps.marketTrend === 'down' ? '📉 Falling' : '➡️ Stable'}
                      </div>
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Actions -->
              <div class="flex gap-2">
                <a href="/property/${property.id}" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded-lg transition-colors duration-200 font-bold text-center">
                  View Details
                </a>
                <button class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-3 rounded-lg transition-colors duration-200">
                  💖
                </button>
              </div>
            </div>
          </div>
        `,
        maxWidth: 380,
        pixelOffset: new window.google.maps.Size(0, -10)
      });

      // Enhanced click interactions
      marker.addListener('click', () => {
        // Close all other info windows
        markersRef.current.forEach(m => {
          if (m.infoWindow) m.infoWindow.close();
        });
        
        infoWindow.open(mapRef.current, marker);
        onPropertySelect?.(property);
        setSelectedPropertyId(property.id);
        
        // Calculate area analytics for this property's location
        const areaAnalytics = calculateAreaAnalytics({ lat: property.latitude!, lng: property.longitude! }, 2);
        setSelectedAreaAnalytics(areaAnalytics);
        setAnalyticsView('area');
        
        // Smooth zoom and center
        mapRef.current.panTo({ lat: property.latitude!, lng: property.longitude! });
        if (mapRef.current.getZoom() < 16) {
          mapRef.current.setZoom(16);
        }
      });

      // Hover effects
      marker.addListener('mouseover', () => {
        if (!isSelected) {
          marker.setIcon({
            ...marker.getIcon(),
            url: marker.getIcon().url.replace('r="22"', 'r="25"').replace('Size(60, 60)', 'Size(66, 66)')
          });
        }
      });

      marker.addListener('mouseout', () => {
        if (!isSelected) {
          marker.setIcon({
            ...marker.getIcon(),
            url: marker.getIcon().url.replace('r="25"', 'r="22"').replace('Size(66, 66)', 'Size(60, 60)')
          });
        }
      });

      (marker as any).infoWindow = infoWindow;
      markersRef.current.push(marker);
    });

    // Smart map bounds with padding
    if (validProperties.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      validProperties.forEach(property => {
        bounds.extend({ lat: property.latitude!, lng: property.longitude! });
      });
      mapRef.current.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
    }

  }, [properties, selectedPropertyId, onPropertySelect, calculateAreaAnalytics]);

  // Create price heatmap
  const toggleHeatmap = () => {
    if (!mapRef.current || !window.google) return;

    if (showHeatmap && heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
      setShowHeatmap(false);
      return;
    }

    const heatmapData = properties
      .filter(p => p.latitude && p.longitude)
      .map(property => ({
        location: new window.google.maps.LatLng(property.latitude!, property.longitude!),
        weight: property.price / 1000000 // Normalize to millions
      }));

    const heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: mapRef.current,
      radius: 50,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    });

    heatmapRef.current = heatmap;
    setShowHeatmap(true);
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;

    setIsSearching(true);
    try {
      const results = await googleMapsService.geocodeAddress(searchQuery);
      if (results.length > 0) {
        const location = results[0].geometry.location;
        mapRef.current.panTo(location);
        mapRef.current.setZoom(15);
        setMapCenter(location);
        setMapZoom(15);
        toast.success(`📍 Found: ${results[0].formatted_address}`);
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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Refresh map
  const refreshMap = () => {
    if (mapRef.current) {
      mapRef.current.setCenter(mapCenter);
      mapRef.current.setZoom(mapZoom);
      addPropertyMarkers();
      toast.success('Map refreshed');
    }
  };

  // Initialize map
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const apiKey = getGoogleMapsAPIKey();
        if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
          setError('Google Maps API key not configured.');
          setIsMapLoading(false);
          return;
        }
        
        await loadGoogleMapsAPI(apiKey);
        initializeMap();
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        setError('Failed to load Google Maps. Please check your API key configuration.');
        setIsMapLoading(false);
      }
    };
    
    initializeGoogleMaps();
  }, [initializeMap]);

  // Update markers when properties change
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      addPropertyMarkers();
    }
  }, [properties, selectedPropertyId, addPropertyMarkers, isLoaded]);

  // Update selected property
  useEffect(() => {
    setSelectedPropertyId(selectedProperty?.id || null);
  }, [selectedProperty]);

  const validPropertiesCount = properties.filter(p => p.latitude && p.longitude).length;
  const totalValue = properties.reduce((sum, p) => sum + p.price, 0);
  const averagePrice = validPropertiesCount > 0 ? totalValue / validPropertiesCount : 0;

  // Get overall analytics
  const overallAnalytics = MapAnalyticsService.getOverallAnalytics(properties);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      {/* Simple Header Controls */}
      {showControls && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalyticsMode(!analyticsMode)}
              className={`${analyticsMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
            <Input
              placeholder="Search locations via your Edge Function..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshMap}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Map Container */}
      <div className="relative bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
        {/* Map Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-black p-3 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">🗺️ Property Map (Google Maps + Edge Function)</span>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-black/20 px-3 py-1 rounded-full font-medium">
                {properties.filter(p => p.latitude && p.longitude).length} Properties
              </span>
              <span className="text-xs bg-green-600 px-2 py-1 rounded text-white">LIVE</span>
              {analyticsMode && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded text-white animate-pulse">
                  📊 ANALYTICS MODE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Google Maps Container */}
        <div 
          ref={mapContainer}
          className="w-full h-96 md:h-[600px] relative"
          style={{ marginTop: '48px' }} // Account for header
        />

        {/* Loading Overlay */}
        {isMapLoading && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto mb-2" />
              <p className="text-white">Loading Google Maps...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-20">
            <div className="text-center">
              <p className="text-white mb-2">{error}</p>
              <Button onClick={refreshMap} className="bg-red-600 hover:bg-red-700">
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Edge Function Info */}
        <div className="absolute bottom-4 right-4 bg-blue-900/90 backdrop-blur-sm rounded-xl p-3 border border-blue-400/30 z-10">
          <div className="text-blue-300 text-xs font-medium">🚀 Powered by Edge Function</div>
        </div>
      </div>

      {/* Analytics Section - Completely Separate Below Map */}
      {showAnalytics && areaAnalytics && (
        <div className="mt-8 space-y-6">
          {/* Section Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">📊 Market Analytics</h2>
            <p className="text-gray-400">Detailed insights for the selected area</p>
          </div>

          {/* Property Overview Container */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-8 shadow-2xl border border-blue-400/30">
            <h3 className="text-2xl font-bold text-blue-100 mb-6 flex items-center gap-3">
              🏠 Property Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-800/50 rounded-xl p-6 border border-blue-600/30 text-center">
                <div className="text-blue-200 text-lg mb-2">Properties Found</div>
                <div className="text-4xl font-bold text-white">
                  {areaAnalytics.propertyCount}
                </div>
                <div className="text-blue-300 text-sm mt-2">in {areaAnalytics.radius}km radius</div>
              </div>
              <div className="bg-blue-800/50 rounded-xl p-6 border border-blue-600/30 text-center">
                <div className="text-blue-200 text-lg mb-2">Average Price</div>
                <div className="text-4xl font-bold text-white">
                  ${areaAnalytics.averagePrice.toLocaleString()}
                </div>
                <div className="text-blue-300 text-sm mt-2">market average</div>
              </div>
              <div className="bg-blue-800/50 rounded-xl p-6 border border-blue-600/30 text-center">
                <div className="text-blue-200 text-lg mb-2">Price Range</div>
                <div className="text-2xl font-bold text-white">
                  ${Math.round(areaAnalytics.priceRange.min / 1000)}K - ${Math.round(areaAnalytics.priceRange.max / 1000)}K
                </div>
                <div className="text-blue-300 text-sm mt-2">min to max</div>
              </div>
            </div>
          </div>

          {/* Market Trends Container */}
          <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-2xl p-8 shadow-2xl border border-green-400/30">
            <h3 className="text-2xl font-bold text-green-100 mb-6 flex items-center gap-3">
              📈 Market Trends
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-800/50 rounded-xl p-6 border border-green-600/30 text-center">
                <div className="text-green-200 text-lg mb-2">Market Status</div>
                <div className="text-3xl font-bold text-white mb-2">
                  {areaAnalytics.marketTrend === 'up' ? '📈 Rising' : areaAnalytics.marketTrend === 'down' ? '📉 Falling' : '➡️ Stable'}
                </div>
                <div className="text-green-300 text-sm">
                  {areaAnalytics.marketTrend === 'up' ? 'Prices increasing' : areaAnalytics.marketTrend === 'down' ? 'Prices decreasing' : 'Prices stable'}
                </div>
              </div>
              <div className="bg-green-800/50 rounded-xl p-6 border border-green-600/30 text-center">
                <div className="text-green-200 text-lg mb-2">Days on Market</div>
                <div className="text-4xl font-bold text-white">
                  {areaAnalytics.avgDaysOnMarket}
                </div>
                <div className="text-green-300 text-sm mt-2">average days</div>
              </div>
              <div className="bg-green-800/50 rounded-xl p-6 border border-green-600/30 text-center">
                <div className="text-green-200 text-lg mb-2">Price per Sq Ft</div>
                <div className="text-3xl font-bold text-white">
                  ${Math.round(areaAnalytics.pricePerSqft)}
                </div>
                <div className="text-green-300 text-sm mt-2">per square foot</div>
              </div>
            </div>
          </div>

          {/* Property Types Container */}
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-2xl p-8 shadow-2xl border border-purple-400/30">
            <h3 className="text-2xl font-bold text-purple-100 mb-6 flex items-center gap-3">
              🏘️ Property Types
            </h3>
            <div className="bg-purple-800/50 rounded-xl p-8 border border-purple-600/30 text-center">
              <div className="text-purple-200 text-xl mb-4">Most Common Property Type</div>
              <div className="text-4xl font-bold text-white mb-4">
                {areaAnalytics.mostCommonType}
              </div>
              <div className="text-purple-300 text-lg">
                Analysis based on properties within {areaAnalytics.radius}km of selected area
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => setShowAnalytics(false)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl text-lg"
            >
              Close Analytics
            </Button>
          </div>
        </div>
      )}

      {/* Always Visible Compact Analytics Section */}
      <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📊 Market Overview
            {analyticsView === 'area' && selectedAreaAnalytics && (
              <span className="text-sm bg-blue-600 px-2 py-1 rounded text-white">
                Area Analysis
              </span>
            )}
          </h3>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setAnalyticsView('overall')}
              className={`${analyticsView === 'overall' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'} hover:bg-blue-700`}
            >
              Overall
            </Button>
            <Button
              size="sm"
              onClick={() => setAnalyticsView('area')}
              disabled={!selectedAreaAnalytics}
              className={`${analyticsView === 'area' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'} hover:bg-green-700 ${!selectedAreaAnalytics ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Area
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Properties */}
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-slate-300 text-sm mb-1">
              {analyticsView === 'area' ? 'Area Properties' : 'Total Properties'}
            </div>
            <div className="text-2xl font-bold text-white">
              {analyticsView === 'area' && selectedAreaAnalytics 
                ? selectedAreaAnalytics.propertyCount 
                : overallAnalytics.totalProperties}
            </div>
            {analyticsView === 'area' && selectedAreaAnalytics && (
              <div className="text-slate-400 text-xs mt-1">in 2km radius</div>
            )}
          </div>

          {/* Average Price */}
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-slate-300 text-sm mb-1">
              {analyticsView === 'area' ? 'Area Avg Price' : 'Avg Price'}
            </div>
            <div className="text-2xl font-bold text-white">
              ${analyticsView === 'area' && selectedAreaAnalytics 
                ? Math.round(selectedAreaAnalytics.averagePrice / 1000)
                : Math.round(overallAnalytics.averagePrice / 1000)}K
            </div>
          </div>

          {/* Market Trend */}
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-slate-300 text-sm mb-1">Market Trend</div>
            <div className="text-lg font-bold text-white">
              {analyticsView === 'area' && selectedAreaAnalytics 
                ? (selectedAreaAnalytics.marketTrend === 'up' ? '📈 Rising' : 
                   selectedAreaAnalytics.marketTrend === 'down' ? '📉 Falling' : '➡️ Stable')
                : (overallAnalytics.marketTrend === 'up' ? '📈 Rising' : 
                   overallAnalytics.marketTrend === 'down' ? '📉 Falling' : '➡️ Stable')}
            </div>
          </div>

          {/* Most Common Type */}
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-slate-300 text-sm mb-1">
              {analyticsView === 'area' ? 'Area Type' : 'Popular Type'}
            </div>
            <div className="text-lg font-bold text-white">
              {analyticsView === 'area' && selectedAreaAnalytics 
                ? selectedAreaAnalytics.mostCommonType
                : overallAnalytics.mostCommonType}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-blue-900/30 rounded-lg p-3 text-center border border-blue-700/30">
            <div className="text-blue-300 text-xs">Price Range</div>
            <div className="text-white font-bold">
              {analyticsView === 'area' && selectedAreaAnalytics 
                ? `$${Math.round(selectedAreaAnalytics.priceRange.min / 1000)}K - $${Math.round(selectedAreaAnalytics.priceRange.max / 1000)}K`
                : `$${Math.round(overallAnalytics.priceRange.min / 1000)}K - $${Math.round(overallAnalytics.priceRange.max / 1000)}K`}
            </div>
          </div>
          <div className="bg-green-900/30 rounded-lg p-3 text-center border border-green-700/30">
            <div className="text-green-300 text-xs">Days on Market</div>
            <div className="text-white font-bold">
              {analyticsView === 'area' && selectedAreaAnalytics 
                ? `~${selectedAreaAnalytics.avgDaysOnMarket} days`
                : `~${overallAnalytics.avgDaysOnMarket} days`}
            </div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700/30">
            <div className="text-purple-300 text-xs">Price per Sq Ft</div>
            <div className="text-white font-bold">
              {analyticsView === 'area' && selectedAreaAnalytics 
                ? `~$${Math.round(selectedAreaAnalytics.pricePerSqft)}`
                : `~$${Math.round(overallAnalytics.averagePrice / 1500)}`}
            </div>
          </div>
        </div>

        {/* Instructions */}
        {analyticsView === 'overall' && (
          <div className="mt-4 text-center">
            <p className="text-slate-400 text-sm">
              💡 Click on any property marker to see area-specific analytics
            </p>
          </div>
        )}
        
        {analyticsView === 'area' && selectedAreaAnalytics && (
          <div className="mt-4 text-center">
            <p className="text-green-400 text-sm">
              ✅ Showing analytics for the selected property's area (2km radius)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyMap;