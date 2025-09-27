import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2 } from 'lucide-react';
import { googleMapsService } from '@/services/googleMapsService';
import { loadGoogleMapsAPI, getGoogleMapsAPIKey, isGoogleMapsLoaded } from '@/utils/googleMapsLoader';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  countryCode?: string;
  types?: string[];
}

// Australian fallback data for fast initial response
const AUSTRALIAN_LOCATIONS = [
  'Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA',
  'Gold Coast, QLD', 'Newcastle, NSW', 'Canberra, ACT', 'Sunshine Coast, QLD',
  'Wollongong, NSW', 'Geelong, VIC', 'Hobart, TAS', 'Townsville, QLD',
  'Cairns, QLD', 'Toowoomba, QLD', 'Darwin, NT', 'Ballarat, VIC', 'Bendigo, VIC',
  'Albury, NSW', 'Launceston, TAS', 'Mackay, QLD', 'Rockhampton, QLD',
  'Bunbury, WA', 'Bundaberg, QLD', 'Coffs Harbour, NSW', 'Wagga Wagga, NSW',
  'Hervey Bay, QLD', 'Mildura, VIC', 'Shepparton, VIC', 'Port Macquarie, NSW',
  'Orange, NSW', 'Dubbo, NSW', 'Geraldton, WA', 'Kalgoorlie, WA', 'Mount Gambier, SA',
  'Warrnambool, VIC', 'Gladstone, QLD', 'Tamworth, NSW', 'Traralgon, VIC', 'Nowra, NSW'
];

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter location...",
  className,
  disabled = false,
  countryCode = 'AU',
  types = ['(regions)']
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapsMethod, setMapsMethod] = useState<'client' | 'server' | 'fallback'>('fallback');
  const [clientMapsReady, setClientMapsReady] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const requestCacheRef = useRef<Map<string, { suggestions: LocationSuggestion[]; timestamp: number }>>(new Map());

  // Initialize Google Maps client-side if available
  useEffect(() => {
    const initializeClientMaps = async () => {
      try {
        if (isGoogleMapsLoaded()) {
          setClientMapsReady(true);
          setMapsMethod('client');
          return;
        }

        const apiKey = getGoogleMapsAPIKey();
        if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
          await loadGoogleMapsAPI(apiKey);
          setClientMapsReady(true);
          setMapsMethod('client');
          // Client-side Google Maps loaded successfully
        } else {
          // Falling back to server-side Google Maps
          setMapsMethod('server');
        }
      } catch (error) {
        console.warn('⚠️ Client-side Google Maps failed, using server-side');
        setMapsMethod('server');
      }
    };

    initializeClientMaps();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cache management
  const getCachedSuggestions = (query: string): LocationSuggestion[] | null => {
    const cached = requestCacheRef.current.get(query.toLowerCase());
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached.suggestions;
    }
    return null;
  };

  const setCachedSuggestions = (query: string, suggestions: LocationSuggestion[]) => {
    requestCacheRef.current.set(query.toLowerCase(), {
      suggestions,
      timestamp: Date.now()
    });
    
    // Clean old entries if cache gets too large
    if (requestCacheRef.current.size > 100) {
      const entries = Array.from(requestCacheRef.current.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      requestCacheRef.current.clear();
      entries.slice(0, 50).forEach(([key, value]) => {
        requestCacheRef.current.set(key, value);
      });
    }
  };

  // Fast fallback search
  const getFallbackSuggestions = (query: string): LocationSuggestion[] => {
    const filtered = AUSTRALIAN_LOCATIONS
      .filter(location => location.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map((location, index) => {
        const parts = location.split(', ');
        return {
          place_id: `fallback_${index}_${location.replace(/\s+/g, '_')}`,
          description: location,
          main_text: parts[0] || location,
          secondary_text: parts[1] || ''
        };
      });
    return filtered;
  };

  // Client-side Google Maps autocomplete
  const getClientSideSuggestions = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places?.AutocompleteService) {
        resolve([]);
        return;
      }

      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions({
        input: query,
        types: types,
        componentRestrictions: { country: countryCode.toLowerCase() }
      }, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestions = predictions.slice(0, 8).map(p => ({
            place_id: p.place_id,
            description: p.description,
            main_text: p.structured_formatting.main_text,
            secondary_text: p.structured_formatting.secondary_text || ''
          }));
          resolve(suggestions);
        } else {
          resolve([]);
        }
      });
    });
  }, [countryCode, types]);

  // Server-side Google Maps autocomplete
  const getServerSideSuggestions = useCallback(async (query: string): Promise<LocationSuggestion[]> => {
    try {
      const results = await googleMapsService.searchPlaces(query, countryCode.toUpperCase());
      
      return results.slice(0, 8).map(result => ({
        place_id: result.place_id,
        description: result.description,
        main_text: result.structured_formatting.main_text,
        secondary_text: result.structured_formatting.secondary_text || ''
      }));
    } catch (error) {
      console.error('Server-side autocomplete error:', error);
      return [];
    }
  }, [countryCode]);

  // Main search function with multi-method approach
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Check cache first
    const cached = getCachedSuggestions(query);
    if (cached) {
      setSuggestions(cached);
      setIsOpen(cached.length > 0);
      return;
    }

    setIsLoading(true);
    
    try {
      let results: LocationSuggestion[] = [];
      
      // Try multiple methods concurrently for maximum speed
      const promises: Promise<LocationSuggestion[]>[] = [];
      
      // Always include fallback for instant response
      const fallbackResults = getFallbackSuggestions(query);
      if (fallbackResults.length > 0) {
        promises.push(Promise.resolve(fallbackResults));
      }
      
      // Add Google Maps methods
      if (mapsMethod === 'client' && clientMapsReady) {
        promises.push(getClientSideSuggestions(query));
      } else if (mapsMethod === 'server') {
        promises.push(getServerSideSuggestions(query));
      }
      
      // Race the promises for fastest response
      if (promises.length > 0) {
        const allResults = await Promise.allSettled(promises);
        
        // Merge results, preferring Google Maps over fallback
        const googleResults = allResults
          .filter((result, index) => result.status === 'fulfilled' && index > 0) // Skip fallback
          .flatMap(result => result.status === 'fulfilled' ? result.value : []);
          
        if (googleResults.length > 0) {
          results = googleResults;
        } else {
          // Use fallback if Google Maps failed
          results = fallbackResults;
        }
        
        // Remove duplicates and limit results
        const uniqueResults = results
          .filter((item, index, arr) => 
            arr.findIndex(other => other.description.toLowerCase() === item.description.toLowerCase()) === index
          )
          .slice(0, 6);
          
        setSuggestions(uniqueResults);
        setCachedSuggestions(query, uniqueResults);
        setIsOpen(uniqueResults.length > 0);
      }
    } catch (error) {
      console.error('Location search error:', error);
      // Always provide fallback
      const fallbackResults = getFallbackSuggestions(query);
      setSuggestions(fallbackResults);
      setIsOpen(fallbackResults.length > 0);
    } finally {
      setIsLoading(false);
    }
  }, [mapsMethod, clientMapsReady, getClientSideSuggestions, getServerSideSuggestions]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Immediate response for short queries or empty
    if (newValue.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    
    // For longer queries, use debouncing but with shorter delay for responsiveness
    timeoutRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, newValue.length < 4 ? 200 : 100); // Faster response for longer queries
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onChange(suggestion.description);
    setIsOpen(false);
    onLocationSelect?.(suggestion);
  };

  const clearInput = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10",
            isLoading && "opacity-75"
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
            onClick={clearInput}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border last:border-b-0 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {suggestion.main_text}
                  </div>
                  {suggestion.secondary_text && (
                    <div className="text-sm text-muted-foreground truncate">
                      {suggestion.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {/* Method indicator */}
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
            {mapsMethod === 'client' && clientMapsReady && '🚀 Fast client-side search'}
            {mapsMethod === 'server' && '🌐 Server-side search'}
            {mapsMethod === 'fallback' && '⚡ Local fallback search'}
          </div>
        </div>
      )}
    </div>
  );
};